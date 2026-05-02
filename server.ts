import express from 'express';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { TRACKS, VEHICLES_DB, LIVERIES_DB, ITEMS_DB, PHYSICS } from './src/constants';
import { updateCarPhysics, updateAICar } from './src/lib/gameEngine';
import { CarState, OnlinePlayer } from './src/types';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  // Room logic
  const rooms = new Map<string, any>(); 
  const gameIntervals = new Map<string, NodeJS.Timeout>();

  const generateRoomId = () => {
    let id;
    do {
      id = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (rooms.has(id));
    return id;
  };

  const startGameLoop = (roomId: string) => {
    if (gameIntervals.has(roomId)) return;

    let countdown = 3;
    let lastTime = Date.now();
    const room = rooms.get(roomId);
    if (!room) return;

    // Send initial countdown sync
    io.to(roomId).emit('carsUpdate', {
      cars: room.gameData.cars,
      gameTime: 0,
      countdown: countdown,
      status: 'STARTING'
    });

    const interval = setInterval(() => {
      const room = rooms.get(roomId);
      if (!room || (room.status !== 'PLAYING' && room.status !== 'STARTING' && room.status !== 'FINISHING')) {
        clearInterval(interval);
        gameIntervals.delete(roomId);
        return;
      }

      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      const dtScale = deltaTime / 16.666;
      
      const track = TRACKS.find(t => t.id === room.settings.trackId) || TRACKS[0];

      if (room.status === 'STARTING') {
        countdown -= (deltaTime / 1000); 
        if (countdown <= 0) {
          room.status = 'PLAYING';
          room.gameData.startTime = Date.now();
          countdown = 0;
        }
        io.to(roomId).emit('carsUpdate', {
          cars: room.gameData.cars,
          gameTime: 0,
          countdown: Math.max(0, Math.ceil(countdown)),
          status: room.status
        });
        return;
      }

      // Update all cars
      room.gameData.cars = room.gameData.cars.map((car: CarState) => {
        // If car already finished, just stop
        if (car.finished) {
           return { ...car, speed: 0 };
        }

        let inputs = new Set<string>();
        if (car.isAI) {
          inputs = updateAICar(car, track, room.settings.aiDifficulty || 2, deltaTime, dtScale);
        } else {
          inputs = room.gameData.playerInputs[car.id] || new Set<string>();
        }

        const nextState = updateCarPhysics(car, inputs, track, deltaTime, room.gameData.cars, dtScale);
        
        // Handle race finish
        const totalLaps = Math.max(1, room.settings.laps || track.laps || 3);
        if (nextState.lap >= totalLaps && !car.finished) {
          nextState.finished = true;
          nextState.finishTime = Date.now() - (room.gameData.startTime || Date.now());
          
          if (room.status === 'PLAYING') {
            room.status = 'FINISHING';
            room.gameData.finishCountdown = 10;
          }
        }
        return nextState;
      });

      // Handle finish logic
      if (room.status === 'FINISHING' && room.gameData.finishCountdown !== undefined) {
        room.gameData.finishCountdown -= (deltaTime / 1000);
        if (room.gameData.finishCountdown <= 0) {
          room.status = 'FINISHED';
        }
      }

      const hasCars = room.gameData.cars && room.gameData.cars.length > 0;
      const everyoneFinished = hasCars && room.gameData.cars.every((c: CarState) => c.finished); 
      if (hasCars && everyoneFinished && (room.status === 'PLAYING' || room.status === 'FINISHING')) {
        room.status = 'FINISHED';
      }

      if (room.status === 'FINISHED') {
        io.to(roomId).emit('carsUpdate', {
          cars: room.gameData.cars,
          gameTime: Date.now() - (room.gameData.startTime || Date.now()),
          countdown: 0,
          finishCountdown: 0,
          status: 'FINISHED'
        });
        io.to(roomId).emit('gameFinished', room.gameData.cars);
        clearInterval(interval);
        gameIntervals.delete(roomId);
      } else {
        // Convert input Sets to Arrays for JSON serialization
        const serializedInputs: Record<string, string[]> = {};
        if (room.gameData.playerInputs) {
          for (const [id, inputSet] of Object.entries(room.gameData.playerInputs)) {
             serializedInputs[id] = Array.from(inputSet as Set<string>);
          }
        }

        io.to(roomId).emit('carsUpdate', {
          cars: room.gameData.cars,
          inputs: serializedInputs,
          gameTime: Date.now() - (room.gameData.startTime || Date.now()),
          countdown: Math.max(0, Math.ceil(countdown)),
          finishCountdown: room.gameData.finishCountdown !== undefined ? Math.max(0, Math.ceil(room.gameData.finishCountdown)) : null,
          status: room.status
        });
      }
    }, 32); 

    gameIntervals.set(roomId, interval);
  };

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('createRoom', (playerName, callback) => {
      // Check for duplicate player name across all rooms
      for (const r of rooms.values()) {
        if (r.players.some((p: any) => p.name === playerName)) {
          return callback({ success: false, error: '此名称已在其他房间中使用，请换一个名称' });
        }
      }

      const roomId = generateRoomId();
      const newRoom = {
        roomId,
        hostId: socket.id,
        players: [{
          id: socket.id,
          name: playerName,
          isHost: true,
          isReady: false,
          isAI: false,
          vehicleId: 'car_basic',
          liveryId: 'liv_silver',
        }],
        status: 'LOBBY',
        settings: {
          trackId: 'oval',
          laps: 3,
          aiDifficulty: 2,
          isCupMode: false,
          cupNumTracks: 4,
          isTeamMode: false
        }
      };
      rooms.set(roomId, newRoom);
      socket.join(roomId);
      socket.data.roomId = roomId;
      callback({ success: true, roomId, room: newRoom });
    });

    socket.on('joinRoom', ({ roomId, playerName }, callback) => {
      const room = rooms.get(roomId);
      if (!room) {
        return callback({ success: false, error: '房间不存在' });
      }
      if (room.status !== 'LOBBY') {
        return callback({ success: false, error: '比赛已经开始' });
      }
      if (room.players.length >= 6) {
        return callback({ success: false, error: '房间已满' });
      }
      if (room.players.some((p: any) => p.name === playerName)) {
        return callback({ success: false, error: '此名称太受欢迎了，换一个吧' });
      }
      
      const newPlayer = {
        id: socket.id,
        name: playerName,
        isHost: false,
        isReady: false,
        isAI: false,
        vehicleId: 'car_basic',
        liveryId: 'liv_silver',
      };
      
      room.players.push(newPlayer);
      socket.join(roomId);
      socket.data.roomId = roomId;
      
      io.to(roomId).emit('roomUpdate', room);
      callback({ success: true, room });
    });

    socket.on('getRooms', (callback) => {
      const roomList = Array.from(rooms.values()).map((r: any) => ({
        roomId: r.roomId,
        hostName: r.players.find((p: any) => p.isHost)?.name || 'Unknown',
        playersCount: r.players.length,
        status: r.status,
      }));
      callback({ success: true, rooms: roomList });
    });

    socket.on('adminDestroyRoom', ({ roomId, password }, callback) => {
      if (password !== 'bye') {
        callback({ success: false, error: '密码错误' });
        return;
      }
      const room = rooms.get(roomId);
      if (room) {
        room.status = 'LOBBY';
        io.to(roomId).emit('returnedToLobby', room);
        io.to(roomId).emit('roomDestroyed');
        // Actually, we probably just want to kick everyone using socket disconnect or leave
        const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
        if (socketsInRoom) {
          for (const socketId of socketsInRoom) {
            const s = io.sockets.sockets.get(socketId);
            if (s) {
              s.leave(roomId);
              s.data.roomId = null;
            }
          }
        }
        rooms.delete(roomId);
        callback({ success: true });
      } else {
        callback({ success: false, error: '房间不存在' });
      }
    });

    socket.on('disbandRoom', (callback) => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);
      if (room && room.hostId === socket.id) {
        room.status = 'LOBBY';
        
        const interval = gameIntervals.get(roomId);
        if (interval) {
          clearInterval(interval);
          gameIntervals.delete(roomId);
        }

        io.to(roomId).emit('roomDestroyed');
        const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
        if (socketsInRoom) {
          for (const socketId of socketsInRoom) {
            const s = io.sockets.sockets.get(socketId);
            if (s) {
              s.leave(roomId);
              s.data.roomId = null;
            }
          }
        }
        rooms.delete(roomId);
        if (callback) callback({ success: true });
      } else {
        if (callback) callback({ success: false, error: '无权限' });
      }
    });

    socket.on('leaveRoom', () => {
      handleLeave(socket);
    });

    socket.on('transferHost', (targetPlayerId) => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);
      if (room && room.hostId === socket.id) {
        const targetPlayer = room.players.find((p: any) => p.id === targetPlayerId && !p.isAI);
        if (targetPlayer) {
          room.players.find((p: any) => p.id === socket.id).isHost = false;
          targetPlayer.isHost = true;
          room.hostId = targetPlayer.id;
          io.to(roomId).emit('roomUpdate', room);
        }
      }
    });

    socket.on('updatePlayer', (playerData) => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);
      if (room) {
        const p = room.players.find((p: any) => p.id === socket.id);
        if (p) {
          Object.assign(p, playerData);
          io.to(roomId).emit('roomUpdate', room);
        }
      }
    });

    socket.on('updateSettings', (settings) => {
       const roomId = socket.data.roomId;
       const room = rooms.get(roomId);
       if (room && room.hostId === socket.id) {
         room.settings = { ...room.settings, ...settings };
         io.to(roomId).emit('roomUpdate', room);
       }
    });

    socket.on('setReady', (isReady) => {
       const roomId = socket.data.roomId;
       const room = rooms.get(roomId);
       if (room) {
         const p = room.players.find((p: any) => p.id === socket.id);
         if (p) {
           p.isReady = isReady;
           io.to(roomId).emit('roomUpdate', room);
         }
       }
    });

    socket.on('updatePlayerByHost', (playerId, updates) => {
       const roomId = socket.data.roomId;
       const room = rooms.get(roomId);
       if (room && room.hostId === socket.id) {
         const p = room.players.find((p: any) => p.id === playerId);
         if (p && !p.isHost) {
           Object.assign(p, updates);
           io.to(roomId).emit('roomUpdate', room);
         }
       }
    });

    socket.on('addAi', (aiData) => {
      const roomId = socket.data.roomId;
      const room = rooms.get(roomId);
      if (room && room.hostId === socket.id && room.players.length < 6) {
         const aiIndex = room.players.filter((p: any) => p.isAI).length + 1;
         room.players.push({
           id: `ai_${Math.random()}`,
           name: aiData?.name || `AI 车手 ${aiIndex}`,
           isHost: false,
           isReady: true,
           isAI: true,
           vehicleId: aiData?.vehicleId || 'car_basic',
           liveryId: aiData?.liveryId || 'liv_silver',
           engineId: aiData?.engineId,
           tiresId: aiData?.tiresId,
           launchId: aiData?.launchId,
           driftId: aiData?.driftId,
           accelerationId: aiData?.accelerationId,
           style: aiData?.style
         });
         io.to(roomId).emit('roomUpdate', room);
      }
    });

    socket.on('removeAi', (aiId) => {
       const roomId = socket.data.roomId;
       const room = rooms.get(roomId);
       if (room && room.hostId === socket.id) {
         room.players = room.players.filter((p: any) => p.id !== aiId);
         io.to(roomId).emit('roomUpdate', room);
       }
    });

    socket.on('kickPlayer', (targetPlayerId) => {
       const roomId = socket.data.roomId;
       const room = rooms.get(roomId);
       if (room && room.hostId === socket.id) {
          const targetSocket = io.sockets.sockets.get(targetPlayerId);
          if (targetSocket) {
             io.to(targetPlayerId).emit('kicked');
             handleLeave(targetSocket);
          }
       }
    });

    socket.on('startGame', () => {
       const roomId = socket.data.roomId;
       const room = rooms.get(roomId);
       if (room && room.hostId === socket.id) {
         const allReady = room.players.every((p: any) => p.isReady || p.isAI);
         if (allReady) {
           room.status = 'STARTING'; // Set to STARTING first
           
           // Initialize game data for the authoritative loop
           const track = TRACKS.find(t => t.id === room.settings.trackId) || TRACKS[0];
           const startPoint = track.waypoints[0];
           const nextPoint = track.waypoints[1];
           const startAngle = Math.atan2(nextPoint.y - startPoint.y, nextPoint.x - startPoint.x);
           const perpAngle = startAngle + Math.PI / 2;

           const initialCars: CarState[] = room.players.map((p: any, i: number) => {
             const spacing = 40;
             const startPerpOffset = -((room.players.length - 1) * spacing) / 2;
             const perpOffset = startPerpOffset + i * spacing;
             
             const baseV = VEHICLES_DB.find(v => v.id === p.vehicleId) || VEHICLES_DB[0];
             const livery = LIVERIES_DB.find(l => l.id === p.liveryId);
             const engine = ITEMS_DB.find(ti => ti.id === p.engineId);
             const tires = ITEMS_DB.find(ti => ti.id === p.tiresId);
             const launchItem = ITEMS_DB.find(ti => ti.id === p.launchId);
             const driftItem = ITEMS_DB.find(ti => ti.id === p.driftId);
             const accelItem = ITEMS_DB.find(ti => ti.id === p.accelerationId);

             const colors = ['#00f2ff', '#ff00ea', '#f4ff40', '#00ff00', '#ff2222'];
             const carColor = livery ? '#ffffff' : colors[i % colors.length];

             return {
               id: p.id,
               name: p.name,
               isAI: p.isAI,
               x: startPoint.x + Math.cos(perpAngle) * perpOffset,
               y: startPoint.y + Math.sin(perpAngle) * perpOffset,
               angle: startAngle,
               moveAngle: startAngle,
               speed: 0,
               color: carColor,
               lap: 0,
               currentWaypointIndex: 0,
               finished: false,
               lapStartTime: Date.now(),
               bestLapTime: Infinity,
               maxSpeed: baseV.baseSpeed + (engine?.speedBoost || 0) + (tires?.speedBoost || 0),
               grip: baseV.baseGrip + (engine?.gripBoost || 0) + (tires?.gripBoost || 0),
               driftGrip: (baseV.baseGrip + (engine?.gripBoost || 0) + (tires?.gripBoost || 0)) * 0.2,
               launch: (baseV.baseLaunch || 0) + (engine?.launchBoost || 0) + (tires?.launchBoost || 0) + (launchItem?.launchBoost || 0),
               driftSpeed: baseV.baseDriftSpeed + (engine?.driftSpeedBoost || 0) + (tires?.driftSpeedBoost || 0) + (driftItem?.driftSpeedBoost || 0),
               acceleration: ((baseV.baseAcceleration || PHYSICS.ACCELERATION) + (engine?.accelerationBoost || 0) + (tires?.accelerationBoost || 0)) * (1 + (accelItem?.accelerationBoost || 0)),
               vehicleType: baseV.type,
               vehicleName: baseV.name,
               liveryData: livery ? { isGradient: livery.isGradient, colors: livery.colors } : undefined,
               aiStyle: p.style || 'OPTIMAL',
               team: p.team
             } as CarState;
           });

           room.gameData = {
             cars: initialCars,
             playerInputs: {},
             startTime: Date.now()
           };

           io.to(roomId).emit('gameStarted', room);
           startGameLoop(roomId);
         }
       }
    });
    
    // In-game Sync (Obsolete now, but kept for non-breaking sync if needed temporarily)
    socket.on('syncCars', (cars) => {
       // NOOP in authoritative mode
    });

    socket.on('sendInputs', (inputs) => {
       const roomId = socket.data.roomId;
       const room = rooms.get(roomId);
       if (room && room.gameData) {
          room.gameData.playerInputs[socket.id] = new Set(inputs);
       }
    });
    
    socket.on('gameFinished', (results) => {
       const roomId = socket.data.roomId;
       const room = rooms.get(roomId);
       if (room && room.hostId === socket.id) {
          io.to(roomId).emit('gameFinished', results);
       }
    });

    socket.on('returnToLobby', () => {
       const roomId = socket.data.roomId;
       const room = rooms.get(roomId);
       if (room && room.hostId === socket.id) {
          room.status = 'LOBBY';
          
          const interval = gameIntervals.get(roomId);
          if (interval) {
            clearInterval(interval);
            gameIntervals.delete(roomId);
          }

          room.players.forEach((p: any) => !p.isAI && (p.isReady = false));
          io.to(roomId).emit('returnedToLobby', room);
          io.to(roomId).emit('roomUpdate', room);
       }
    });

    const handleLeave = (s: any) => {
      const roomId = s.data.roomId;
      const room = rooms.get(roomId);
      if (room) {
        room.players = room.players.filter((p: any) => p.id !== s.id);
        s.leave(roomId);
        s.data.roomId = null;
        
        if (room.players.length === 0 || (!room.players.some((p: any) => !p.isAI))) {
          // Cleanup interval
          const interval = gameIntervals.get(roomId);
          if (interval) {
            clearInterval(interval);
            gameIntervals.delete(roomId);
          }
          rooms.delete(roomId); // cleanup
        } else if (room.hostId === s.id) {
          // reassign host
          const newHost = room.players.find((p: any) => !p.isAI);
          if (newHost) {
            newHost.isHost = true;
            room.hostId = newHost.id;
          }
        }
        
        if (rooms.has(roomId)) {
           io.to(roomId).emit('roomUpdate', room);   
        }
      }
    };

    socket.on('disconnect', () => {
      handleLeave(socket);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
