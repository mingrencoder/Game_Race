import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { TRACKS, VEHICLES_DB, LIVERIES_DB, ITEMS_DB, PHYSICS } from './src/constants';
import { updateCarPhysics, updateAICar } from './src/lib/gameEngine';
import { CarState, OnlinePlayer } from './src/types';

// ================== 后端基建模块引入 ==================
import jwt from 'jsonwebtoken';
import { AuthService } from './server/AuthService';
import { GMController } from './server/GMController';
import { requireAuth, requireAdmin } from './server/GMMiddleware';
import { EconomyController } from './server/EconomyController';
import { ShopController } from './server/ShopController';
import { UpgradeService } from './server/UpgradeService';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET environment variable is missing.');
    process.exit(1);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // 跨域支持 (为 debug.html 本地联调使用)
  app.use(cors());

  // 必须配置 body parsing 才能解析 JSON payload
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ================== Auth & API Routes ==================
  
  // 测试验证联通性
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0' });
  });

  // 1. 获取发号器注册 API
  app.post('/api/auth/register', async (req, res) => {
      try {
          const { username, password } = req.body;
          if (!username || !password) {
              return res.status(400).json({ error: 'Missing username or password' });
          }
          const user = await AuthService.register(username, password);
          res.json({ success: true, user });
      } catch (error: any) {
          res.status(400).json({ error: error.message });
      }
  });

  // 2. 验证与生成 JWT 凭证的登录 API
  app.post('/api/auth/login', async (req, res) => {
      try {
          const identifier = req.body.identifier || req.body.username;
          const password = req.body.password;
          if (!identifier || !password) {
              return res.status(400).json({ error: 'Missing identifier/username or password' });
          }
          const user = await AuthService.login(identifier, password);
          
          // 签发 Token，1天过期
          const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1d' });
          res.json({ success: true, token, user });
      } catch (error: any) {
          res.status(401).json({ error: error.message });
      }
  });

  // 3. 挂载带 JWT 和角色验证的 GM API 专线
  app.post('/api/gm/queryPlayer', requireAuth, requireAdmin, GMController.queryPlayer);
  app.post('/api/gm/updateProfile', requireAuth, requireAdmin, GMController.updateProfile);
  app.post('/api/gm/manageVehicle', requireAuth, requireAdmin, GMController.manageVehicle);
  app.post('/api/gm/modifyInventory', requireAuth, requireAdmin, GMController.modifyInventory);

  // 4. 经济与比赛结算
  app.post('/api/economy/calculate', requireAuth, EconomyController.calculateRaceReward);
  
  // 5. 商店与车库消费
  app.post('/api/shop/buyCar', requireAuth, ShopController.buyCar);
  app.post('/api/shop/buyPart', requireAuth, ShopController.buyPart);
  app.post('/api/shop/equipPart', requireAuth, ShopController.equipPart);
  app.post('/api/shop/repairCar', requireAuth, ShopController.repairCar);
  
  // 6. 硬核强化
  app.post('/api/upgrade/car', requireAuth, UpgradeService.upgradeCar);

  // ================== WebSocket Server Setup ==================
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

  const sortRaceResults = (cars: any[]) => {
    return [...cars].sort((a, b) => {
      const aFinished = a.finished && !a.dnf;
      const bFinished = b.finished && !b.dnf;

      if (aFinished && bFinished) {
        return (a.finishTime || 0) - (b.finishTime || 0);
      }
      if (aFinished && !bFinished) return -1;
      if (!aFinished && bFinished) return 1;

      // DNF Priority: Human > AI
      if (!a.isAI && b.isAI) return -1;
      if (a.isAI && !b.isAI) return 1;

      // Same type DNF: Sort by progress
      if (a.lap !== b.lap) return b.lap - a.lap;
      if (a.currentWaypointIndex !== b.currentWaypointIndex) return b.currentWaypointIndex - a.currentWaypointIndex;

      return 0;
    });
  };

  const startGameLoop = (roomId: string) => {
    if (gameIntervals.has(roomId)) return;

    let countdown = 3;
    let lastTime = Date.now();
    const room = rooms.get(roomId);
    if (!room) return;

    // Send initial countdown sync
    io.to(roomId).emit('carsUpdate', {
      tickId: room.currentTick++,
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
      const totalLaps = Number(room.settings.laps) || 2; 

      if (room.status === 'STARTING') {
        countdown -= (deltaTime / 1000); 
        if (countdown <= 0) {
          room.status = 'PLAYING';
          room.gameData.startTime = Date.now();
          // Initialize car lap start times relative to race start
          room.gameData.cars.forEach(c => {
            c.lapStartTime = 0;
            c.lap = 0;
            c.finished = false;
            c.currentWaypointIndex = 0;
            c.lapTimes = [];
          });
          countdown = 0;
        }
        io.to(roomId).emit('carsUpdate', {
          tickId: room.currentTick++,
          cars: room.gameData.cars,
          gameTime: 0,
          countdown: Math.max(0, Math.ceil(countdown)),
          status: room.status,
          finishCountdown: null
        });
        return;
      }

      // Handle finish countdown
      const anyFinished = room.gameData.cars.some(c => c.finished);
      if (anyFinished && room.status === 'PLAYING') {
        room.status = 'FINISHING';
        room.gameData.finishCountdown = 10; 
      }

      if (room.status === 'FINISHING' && room.gameData.finishCountdown !== undefined) {
        room.gameData.finishCountdown -= (deltaTime / 1000);
        if (room.gameData.finishCountdown <= 0) {
          room.status = 'FINISHED';
        }
      }

      const hasCars = room.gameData.cars && room.gameData.cars.length > 0;
      const everyoneFinished = hasCars && room.gameData.cars.every((c: any) => c.finished); 
      if (hasCars && everyoneFinished && (room.status === 'PLAYING' || room.status === 'FINISHING')) {
        room.status = 'FINISHED';
      }

      // Update all cars
      room.gameData.cars = room.gameData.cars.map((car: any) => {
        if (room.status === 'FINISHED') {
            return { ...car, speed: 0 };
        }

        // 【关键修改】真人玩家直接跳过物理模拟，完全同步客户端坐标
        if (!car.isAI) {
            // 真人玩家的完成状态完全由 syncLocalCar 更新决定，服务端不干预。
            // 仅做全体状态检查。
            return car; 
        }

        let inputs = updateAICar(car, track, room.settings.aiDifficulty || 2, deltaTime, dtScale);
        const gameTime = Date.now() - (room.gameData.startTime || Date.now());
        const nextState = updateCarPhysics(car, inputs, track, deltaTime, room.gameData.cars, dtScale, gameTime);
        
        // Handle race finish for AI
        const totalLaps = Number(room.settings.laps) || 2;
        if (nextState.lap >= totalLaps && !car.finished) {
          nextState.finished = true;
          nextState.finishTime = Date.now() - (room.gameData.startTime || Date.now());
        }

        return nextState;
      });

      if (room.status === 'FINISHED') {
        const sortedResults = sortRaceResults(room.gameData.cars);
        io.to(roomId).emit('carsUpdate', {
          tickId: room.currentTick++,
          cars: sortedResults,
          gameTime: Date.now() - (room.gameData.startTime || Date.now()),
          countdown: 0,
          finishCountdown: 0,
          status: 'FINISHED'
        });
        io.to(roomId).emit('gameFinished', sortedResults);
        clearInterval(interval);
        gameIntervals.delete(roomId);
      } else {
        const serializedInputs: Record<string, string[]> = {};
        if (room.gameData.playerInputs) {
          for (const [id, inputSet] of Object.entries(room.gameData.playerInputs)) {
             serializedInputs[id] = Array.from(inputSet as Set<string>);
          }
        }

        io.to(roomId).emit('carsUpdate', {
          tickId: room.currentTick++,
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

    socket.on('createRoom', ({ playerName, passwordSettings }, callback) => {
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
        currentTick: 0,
        players: [{
          id: socket.id,
          name: playerName,
          isHost: true,
          isReady: false,
          isAI: false,
          vehicleId: 'car_basic',
          liveryId: 'liv_silver',
          score: 0,
          lastFinishTime: 0
        }],
        status: 'LOBBY',
        settings: {
          trackId: 'oval',
          laps: 2,
          aiDifficulty: 2,
          isCupMode: false,
          cupNumTracks: 4,
          isTeamMode: false,
          roomName: `${playerName} 的房间`,
          passwordEnabled: !!passwordSettings?.enabled,
          password: passwordSettings?.password || ''
        }
      };
      rooms.set(roomId, newRoom);
      socket.join(roomId);
      socket.data.roomId = roomId;

      // Broadcast update but hide password for non-hosts
      const sanitizedRoom = sanitizeRoomForPlayer(newRoom, socket.id);
      callback({ success: true, roomId, room: sanitizedRoom });
    });

    const sanitizeRoomForPlayer = (room: any, playerId: string) => {
      const isHost = room.hostId === playerId;
      return {
        ...room,
        password: isHost ? room.settings.password : undefined,
        hasPassword: room.settings.passwordEnabled && !!room.settings.password,
        settings: {
          ...room.settings,
          password: isHost ? room.settings.password : (room.settings.passwordEnabled ? '********' : ''),
          roomName: room.settings.roomName // Ensure roomName is always sent
        }
      };
    };

    const broadcastRoomUpdate = (roomId: string) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
      if (socketsInRoom) {
        for (const socketId of socketsInRoom) {
          const s = io.sockets.sockets.get(socketId);
          if (s) {
            s.emit('roomUpdate', sanitizeRoomForPlayer(room, socketId));
          }
        }
      }
    };

    socket.on('joinRoom', ({ roomId, playerName, password }, callback) => {
      // Find room by ID or by matching name/password (if ID is hidden, we might need a way to find it)
      let room = rooms.get(roomId);
      let foundByPassword = false;
      
      // Fallback: If roomId looks like a password, try to find room by password
      if (!room) {
        for (const r of rooms.values()) {
          if (r.settings.passwordEnabled && r.settings.password && r.settings.password === roomId) {
             room = r;
             foundByPassword = true;
             break;
          }
        }
      }

      if (!room) {
        return callback({ success: false, error: '房间不存在' });
      }
      
      const actualRoomId = room.roomId;
      if (room.status !== 'LOBBY') {
        return callback({ success: false, error: '比赛已经开始' });
      }
      if (room.players.length >= 6) {
        return callback({ success: false, error: '房间已满' });
      }
      if (room.players.some((p: any) => p.name === playerName)) {
        return callback({ success: false, error: '此名称太受欢迎了，换一个吧' });
      }

      // Password check
      if (room.settings.passwordEnabled && room.settings.password) {
        // If we found the room by its password (quick join), we treat it as authenticated
        if (!foundByPassword && password !== room.settings.password) {
          return callback({ success: false, error: '房间密码不正确', needsPassword: true });
        }
      }
      
      const newPlayer = {
        id: socket.id,
        name: playerName,
        isHost: false,
        isReady: false,
        isAI: false,
        vehicleId: 'car_basic',
        liveryId: 'liv_silver',
        score: 0,
        lastFinishTime: 0
      };
      
      room.players.push(newPlayer);
      socket.join(actualRoomId);
      socket.data.roomId = actualRoomId;
      
      broadcastRoomUpdate(actualRoomId);
      callback({ success: true, room: sanitizeRoomForPlayer(room, socket.id) });
    });

    socket.on('getRooms', (callback) => {
      const roomList = Array.from(rooms.values()).map((r: any) => ({
        roomId: r.roomId,
        roomName: r.settings.roomName || `${r.players.find((p: any) => p.isHost)?.name || 'Unknown'} 的房间`,
        hostName: r.players.find((p: any) => p.isHost)?.name || 'Unknown',
        playersCount: r.players.length,
        status: r.status,
        hasPassword: r.settings.passwordEnabled && !!r.settings.password,
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
          broadcastRoomUpdate(roomId);
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
          broadcastRoomUpdate(roomId);
        }
      }
    });

    socket.on('updateSettings', (settings) => {
       const roomId = socket.data.roomId;
       const room = rooms.get(roomId);
       if (room && room.hostId === socket.id) {
         room.settings = { ...room.settings, ...settings };
         broadcastRoomUpdate(roomId);
       }
    });

    socket.on('setReady', (isReady) => {
       const roomId = socket.data.roomId;
       const room = rooms.get(roomId);
       if (room) {
         const p = room.players.find((p: any) => p.id === socket.id);
         if (p) {
           p.isReady = isReady;
           broadcastRoomUpdate(roomId);
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
           broadcastRoomUpdate(roomId);
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
         broadcastRoomUpdate(roomId);
      }
    });

    socket.on('removeAi', (aiId) => {
       const roomId = socket.data.roomId;
       const room = rooms.get(roomId);
       if (room && room.hostId === socket.id) {
         room.players = room.players.filter((p: any) => p.id !== aiId);
         broadcastRoomUpdate(roomId);
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

             const stats = {
               maxSpeed: (baseV?.baseSpeed || 10) + (engine?.speedBoost || engine?.boostValue || 0) + (tires?.speedBoost || 0),
               grip: (baseV?.baseGrip || 0.15) + (engine?.gripBoost || engine?.boostValue || 0) + (tires?.gripBoost || 0),
               launch: (baseV?.baseLaunch || 0) + (engine?.launchBoost || 0) + (tires?.launchBoost || 0) + (launchItem?.launchBoost || 0),
               driftSpeed: (baseV?.baseDriftSpeed || 7) + (engine?.driftSpeedBoost || 0) + (tires?.driftSpeedBoost || 0) + (driftItem?.driftSpeedBoost || 0),
               acceleration: ((baseV?.baseAcceleration || PHYSICS.ACCELERATION) + (engine?.accelerationBoost || 0) + (tires?.accelerationBoost || 0)) * (1 + (accelItem?.accelerationBoost || 0)),
             };

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
               lapStartTime: 0,
               lapTimes: [],
               bestLapTime: Infinity,
               maxSpeed: isNaN(stats.maxSpeed) ? 10 : stats.maxSpeed,
               grip: isNaN(stats.grip) ? 0.15 : stats.grip,
               driftGrip: (isNaN(stats.grip) ? 0.15 : stats.grip) * 0.2,
               launch: isNaN(stats.launch) ? 0 : stats.launch,
               driftSpeed: isNaN(stats.driftSpeed) ? 7 : stats.driftSpeed,
               acceleration: isNaN(stats.acceleration) ? 0.15 : stats.acceleration,
               vehicleType: baseV?.type || 'standard',
               vehicleName: baseV?.name || 'Basic',
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
    
    socket.on('syncLocalCar', (carData: any) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !room.gameData || (room.status !== 'STARTED' && room.status !== 'PLAYING' && room.status !== 'FINISHING')) return;

      const car = room.gameData.cars.find((c: any) => c.id === socket.id && !c.isAI);
      if (car) {
        // 直接无脑信任客户端传来的数据
        car.x = carData.x;
        car.y = carData.y;
        car.angle = carData.angle;
        car.speed = carData.speed;
        car.lap = carData.lap;
        car.currentWaypointIndex = carData.currentWaypointIndex;
        if (carData.finished) {
          car.finished = carData.finished;
          car.finishTime = carData.finishTime;
          
          if (room.status === 'PLAYING') {
            room.status = 'FINISHING';
            room.gameData.finishCountdown = 10;
          }
        }
      }
    });

    socket.on('syncCars', (cars) => {
       // NOOP in authoritative mode
    });

    socket.on('sendInputs', (inputs) => {
       // CLIENT AUTHORITY: Ignored in favor of direct coordinate sync via syncLocalCar
    });
    
    socket.on('gameFinished', (unsortedResults) => {
       const roomId = socket.data.roomId;
       const room = rooms.get(roomId);
       if (room && room.hostId === socket.id) {
          const results = sortRaceResults(unsortedResults);
          // Update scores and last finish times for players in the room
          results.forEach((res: any, index: number) => {
            const player = room.players.find((p: any) => p.id === res.id);
            if (player) {
              player.lastFinishTime = res.dnf ? 999999 : res.finishTime;
              const pointsTable = [100, 80, 60, 50, 40, 30]; 
              player.score = (player.score || 0) + (res.dnf ? 0 : (pointsTable[index] || 10));
            }
          });
          io.to(roomId).emit('gameFinished', results);
          broadcastRoomUpdate(roomId);
       }
    });

    socket.on('returnToLobby', () => {
       const roomId = socket.data.roomId;
       if (!roomId) return;
       const room = rooms.get(roomId);
       if (room && room.hostId === socket.id) {
          room.status = 'LOBBY';
          
          const interval = gameIntervals.get(roomId);
          if (interval) {
            clearInterval(interval);
            gameIntervals.delete(roomId);
          }

          room.players.forEach((p: any) => {
            if (!p.isAI) p.isReady = false;
          });
          broadcastRoomUpdate(roomId);
          io.to(roomId).emit('returnedToLobby'); // Signal to client without full room state if possible, or just use roomUpdate
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
           broadcastRoomUpdate(roomId);   
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

  // Bootstrap 初始化：预加载索引并注入管理员账号
  await AuthService.bootstrap();

  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
