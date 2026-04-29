import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Pause, Play } from 'lucide-react';
import { GameSettings, CarState, Point, Track, AIDifficulty, GarageData } from '../types';
import { TRACKS, PHYSICS, AI_CONFIG, BASIC_COLORS, VEHICLES_DB, ITEMS_DB, LIVERIES_DB } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { audioService } from '../services/audioService';

interface GameCanvasProps {
  settings: GameSettings;
  garage: GarageData;
  onFinish: (results: CarState[]) => void;
  onExit: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ settings, garage, onFinish, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [matchId, setMatchId] = useState(0);
  const [cars, setCars] = useState<CarState[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [gameTime, setGameTime] = useState(0);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const firstFinishTimeRef = useRef<number | null>(null);
  const hasCalledFinishRef = useRef<boolean>(false);

  const track = TRACKS.find((t) => t.id === settings.trackId) || TRACKS[0];

  // AI Roster Seeds are now passed from App.tsx via settings.aiRosterSeeds
  const aiRosterSeeds = settings.aiRosterSeeds || [];

  // Initialize cars
  useEffect(() => {
    lastTimeRef.current = 0;
    firstFinishTimeRef.current = null;
    hasCalledFinishRef.current = false;
    setGameTime(0);
    setCountdown(3);
    keysPressed.current.clear();
    const initialCars: CarState[] = [];
    const startPoint = track.waypoints[0];
    const nextPoint = track.waypoints[1];
    const startAngle = Math.atan2(nextPoint.y - startPoint.y, nextPoint.x - startPoint.x);
    const perpAngle = startAngle + Math.PI / 2;

    const getStartPos = (index: number, total: number) => {
      // 1xN side-by-side grid
      const trackDirOffset = 0; 
      // Space them side-by-side along the perpendicular line.
      const spacing = 40;
      const startPerpOffset = -((total - 1) * spacing) / 2;
      const perpOffset = startPerpOffset + index * spacing;
      
      return {
        x: startPoint.x + Math.cos(startAngle) * trackDirOffset + Math.cos(perpAngle) * perpOffset,
        y: startPoint.y + Math.sin(startAngle) * trackDirOffset + Math.sin(perpAngle) * perpOffset,
      };
    };

    let usedColors: string[] = [];
    const getUniqueColor = (preferred?: string) => {
      if (preferred && !usedColors.includes(preferred) && BASIC_COLORS.includes(preferred)) {
        usedColors.push(preferred);
        return preferred;
      }
      const avail = BASIC_COLORS.filter(c => !usedColors.includes(c));
      const color = avail.length > 0 ? avail[0] : '#ffffff';
      usedColors.push(color);
      return color;
    };

    // Calculate P1 Stats based on garage (Only applies in SINGLE/TEAM mode)
    const isSingleOrTeam = settings.mode === 'SINGLE' || settings.mode === 'TEAM';
    const p1Vehicle = isSingleOrTeam ? (VEHICLES_DB.find(v => v.id === garage.equippedVehicle) || VEHICLES_DB[0]) : VEHICLES_DB[0];
    let p1MaxSpeed = isSingleOrTeam ? p1Vehicle.baseSpeed : VEHICLES_DB[0].baseSpeed;
    let p1Grip = isSingleOrTeam ? p1Vehicle.baseGrip : VEHICLES_DB[0].baseGrip;
    let p1Launch = 0; // Initialize launch to 0, only items add launch boost
    let p1DriftSpeed = isSingleOrTeam ? p1Vehicle.baseDriftSpeed : VEHICLES_DB[0].baseDriftSpeed;
    let p1Acceleration = isSingleOrTeam ? (p1Vehicle.baseAcceleration || PHYSICS.ACCELERATION) : PHYSICS.ACCELERATION;
    
    // Player selects own stats, only livery is changed in elite mode
    if (isSingleOrTeam && garage.equippedItems.engine) {
      p1MaxSpeed += ITEMS_DB.find(i => i.id === garage.equippedItems.engine)?.speedBoost || ITEMS_DB.find(i => i.id === garage.equippedItems.engine)?.boostValue || 0;
    }
    if (isSingleOrTeam && garage.equippedItems.tires) {
      p1Grip += ITEMS_DB.find(i => i.id === garage.equippedItems.tires)?.gripBoost || ITEMS_DB.find(i => i.id === garage.equippedItems.tires)?.boostValue || 0;
    }
    if (isSingleOrTeam && garage.equippedItems.launch) {
      p1Launch += ITEMS_DB.find(i => i.id === garage.equippedItems.launch)?.launchBoost || 0;
    }
    if (isSingleOrTeam && garage.equippedItems.drift) {
      p1DriftSpeed += ITEMS_DB.find(i => i.id === garage.equippedItems.drift)?.driftSpeedBoost || 0;
    }
    if (isSingleOrTeam && garage.equippedItems.acceleration) {
      p1Acceleration += p1Acceleration * (ITEMS_DB.find(i => i.id === garage.equippedItems.acceleration)?.accelerationBoost || 0);
    }

    const p1LiveryData = (settings.mode === 'TEAM' && settings.isEliteMode) ? { isGradient: true, colors: ['#ff0055', '#ffaa00', '#ff0055'] } : (isSingleOrTeam ? LIVERIES_DB.find(l => l.id === garage.equippedLivery) : undefined);
    const preferredColor = isSingleOrTeam ? (p1LiveryData ? undefined : garage.equippedLivery) : BASIC_COLORS[0];
    const p1Color = p1LiveryData ? '#ffffff' : getUniqueColor(preferredColor);

    // Total cars calculation
    let totalCars = 1;
    if (settings.mode === 'DOUBLE') totalCars = 2 + settings.aiCount;
    else if (settings.mode === 'TEAM') totalCars = settings.teamRoster.length + 1; // P1 + roster
    else totalCars = 1 + settings.aiCount;

    // Player 1
    const p1Pos = getStartPos(0, totalCars);
    initialCars.push({
      id: 'p1',
      name: '玩家1',
      isAI: false,
      playerIndex: 0,
      x: p1Pos.x,
      y: p1Pos.y,
      angle: startAngle,
      moveAngle: startAngle,
      speed: 0,
      color: p1Color,
      lap: 0,
      currentWaypointIndex: 0,
      finished: false,
      lapStartTime: 0,
      bestLapTime: Infinity,
      maxSpeed: p1MaxSpeed,
      grip: p1Grip,
      driftGrip: p1Grip * 0.2,
      launch: p1Launch,
      driftSpeed: p1DriftSpeed,
      acceleration: p1Acceleration,
      vehicleType: isSingleOrTeam ? p1Vehicle.type : 'standard',
      vehicleName: isSingleOrTeam ? p1Vehicle.name : VEHICLES_DB[0].name,
      liveryData: p1LiveryData ? { isGradient: p1LiveryData.isGradient, colors: p1LiveryData.colors } : undefined,
      team: settings.mode === 'TEAM' ? 'RED' : undefined,
    });

    // Player 2
    if (settings.mode === 'DOUBLE') {
      const p2Pos = getStartPos(1, totalCars);
      initialCars.push({
        id: 'p2',
        name: '玩家2',
        isAI: false,
        playerIndex: 1,
        x: p2Pos.x,
        y: p2Pos.y,
        angle: startAngle,
        moveAngle: startAngle,
        speed: 0,
        color: getUniqueColor(BASIC_COLORS[1]),
        lap: 0,
        currentWaypointIndex: 0,
        finished: false,
        lapStartTime: 0,
        bestLapTime: Infinity,
        maxSpeed: VEHICLES_DB[0].baseSpeed,
        grip: VEHICLES_DB[0].baseGrip,
        driftGrip: VEHICLES_DB[0].baseGrip * 0.2,
        launch: 0,
        driftSpeed: VEHICLES_DB[0].baseDriftSpeed,
        acceleration: VEHICLES_DB[0].baseAcceleration || PHYSICS.ACCELERATION,
        vehicleType: 'standard',
        vehicleName: VEHICLES_DB[0].name
      });
    }

    // AI Opponents
    if (settings.mode === 'TEAM') {
      settings.teamRoster.forEach((rosterAI, i) => {
        const aiPos = getStartPos(1 + i, totalCars);
        const baseV = VEHICLES_DB.find(v => v.id === rosterAI.vehicleId) || VEHICLES_DB[0];
        const engine = ITEMS_DB.find(item => item.id === rosterAI.engineId);
        const tire = ITEMS_DB.find(item => item.id === rosterAI.tiresId);
        const livery = LIVERIES_DB.find(l => l.id === rosterAI.liveryId);

        let aiMaxSpeed = baseV.baseSpeed + (engine?.speedBoost || engine?.boostValue || 0);
        let aiGrip = baseV.baseGrip + (tire?.gripBoost || tire?.boostValue || 0);
        let aiLaunch = baseV.baseLaunch || 0;
        let aiDriftSpeed = baseV.baseDriftSpeed;
        let aiAcceleration = baseV.baseAcceleration || PHYSICS.ACCELERATION;
        let aiLiveryData = livery ? { isGradient: livery.isGradient, colors: livery.colors } : undefined;

        if (settings.isEliteMode) {
          aiLiveryData = rosterAI.team === 'RED' 
            ? { isGradient: true, colors: ['#ff0055', '#ffaa00', '#ff0055'] }
            : { isGradient: true, colors: ['#00f0ff', '#0055ff', '#00f0ff'] };
          rosterAI.style = 'OPTIMAL'; // Force optimal driving behavior
        }
        
        // Add tiny variance to prevent exactly identical performances
        aiMaxSpeed += (Math.random() - 0.5) * 0.3;
        aiGrip += (Math.random() - 0.5) * 0.02;

        initialCars.push({
          id: rosterAI.id,
          name: rosterAI.team === 'BLUE' ? `[蓝]${rosterAI.name}` : `[红]${rosterAI.name}`,
          isAI: true,
          x: aiPos.x,
          y: aiPos.y,
          angle: startAngle,
          moveAngle: startAngle,
          speed: 0,
          color: aiLiveryData ? '#ffffff' : getUniqueColor(),
          lap: 0,
          currentWaypointIndex: 0,
          finished: false,
          lapStartTime: 0,
          bestLapTime: Infinity,
          maxSpeed: aiMaxSpeed,
          grip: aiGrip,
          driftGrip: aiGrip * 0.3,
          launch: aiLaunch,
          driftSpeed: aiDriftSpeed,
          acceleration: aiAcceleration,
          vehicleType: baseV.type,
          vehicleName: baseV.name,
          liveryData: aiLiveryData,
          team: rosterAI.team,
          aiStyle: rosterAI.style,
        });
      });
    } else {
      for (let i = 0; i < settings.aiCount; i++) {
        const aiPos = getStartPos(settings.mode === 'DOUBLE' ? i + 2 : i + 1, totalCars);
        const seed = aiRosterSeeds[i] as any;
        const randomBaseVehicle = seed.randomBaseVehicle;
        const randomEngine = seed.randomEngine;
        const randomTire = seed.randomTire;
        const randomLivery = seed.randomLivery;
        
        let aiMaxSpeed = randomBaseVehicle.baseSpeed + (randomEngine?.speedBoost || randomEngine?.boostValue || 0);
        
        let aiGrip = randomBaseVehicle.baseGrip + (randomTire?.gripBoost || randomTire?.boostValue || 0);
        aiGrip += seed.gripVar;

        let aiLaunch = randomBaseVehicle.baseLaunch || 0;
        let aiDriftSpeed = randomBaseVehicle.baseDriftSpeed;
        let aiAcceleration = randomBaseVehicle.baseAcceleration || PHYSICS.ACCELERATION;

        // Ensure AI gets a base speed boost depending on difficulty level
        if (settings.aiDifficulty === 3) aiMaxSpeed += 1.0;
        if (settings.aiDifficulty === 4) {
          aiMaxSpeed += 2.0;
          aiGrip += 0.05;
          aiAcceleration += 0.02;
        }

        // Add tiny variance to prevent exactly identical performances
        aiMaxSpeed += seed.speedVar;
        
        if (settings.isEliteMode) {
          aiMaxSpeed += 2.5; 
          aiGrip += 0.05;
          aiAcceleration += 0.05;
          aiLaunch += 1.0;
        }
        
        const pColor = seed.pColor || (randomLivery ? '#ffffff' : getUniqueColor());

        initialCars.push({
          id: `ai${i}`,
          name: seed.name || `AI ${i+1}`,
          isAI: true,
          x: aiPos.x,
          y: aiPos.y,
          angle: startAngle,
          moveAngle: startAngle,
          speed: 0,
          color: pColor,
          lap: 0,
          currentWaypointIndex: 0,
          finished: false,
          lapStartTime: 0,
          bestLapTime: Infinity,
          maxSpeed: aiMaxSpeed,
          grip: aiGrip,
          driftGrip: aiGrip * 0.2,
          launch: aiLaunch,
          driftSpeed: aiDriftSpeed,
          acceleration: aiAcceleration,
          vehicleType: randomBaseVehicle.type,
          vehicleName: randomBaseVehicle.name,
          liveryData: randomLivery ? { isGradient: randomLivery.isGradient, colors: randomLivery.colors } : undefined,
          aiStyle: seed.aiStyle || 'OPTIMAL'
        });
      }
    }

    setCars(initialCars);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      audioService.stopAll();
    };
  }, [settings, track, matchId, garage]);

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      audioService.init();
      if (e.code === 'Escape') {
        setIsPaused(p => !p);
      }
      keysPressed.current.add(e.code);
    };
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.code);
    const handleBlur = () => {
      keysPressed.current.clear();
      setIsPaused(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const getClosestPointOnTrack = (p: Point, track: Track, currentIndex?: number) => {
    let minDistance = Infinity;
    let closestPoint = { x: 0, y: 0 };
    let minLineIndex = 0;

    let pointsToCheck: number[] = [];
    if (currentIndex !== undefined) {
      // Check previous, current, and next 2 segments strictly.
      for(let offset = -1; offset <= 2; offset++) {
        pointsToCheck.push((currentIndex + offset + track.waypoints.length) % track.waypoints.length);
      }
    } else {
      for (let i = 0; i < track.waypoints.length; i++) {
        pointsToCheck.push(i);
      }
    }

    for (let j = 0; j < pointsToCheck.length; j++) {
      const i = pointsToCheck[j];
      const p1 = track.waypoints[i];
      const p2 = track.waypoints[(i + 1) % track.waypoints.length];
      
      const l2 = (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
      if (l2 === 0) continue;
      let t = ((p.x - p1.x) * (p2.x - p1.x) + (p.y - p1.y) * (p2.y - p1.y)) / l2;
      t = Math.max(0, Math.min(1, t));
      const projX = p1.x + t * (p2.x - p1.x);
      const projY = p1.y + t * (p2.y - p1.y);
      const dist = Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = { x: projX, y: projY };
        minLineIndex = i;
      }
    }
    return { distance: minDistance, point: closestPoint, minLineIndex };
  };

  const updatePhysics = (deltaTime: number) => {
    if (countdown > 0 || isPaused) return;

    setGameTime((prev) => prev + deltaTime);

    const dtScale = Math.min(4, Math.max(0.1, deltaTime / 16.666));

    setCars((prevCars) => {
      const newCars = prevCars.map((car) => {
        if (car.finished) return car;

        let { x, y, angle, moveAngle, speed, currentWaypointIndex, lap } = car;

        // Controls
        let accelerate = false;
        let brake = false;
        let pureBrake = false;
        let left = false;
        let right = false;
        let drift = false;
        let currentStuckFrames = car.stuckFrames || 0;
        let isDriftingFlag = false;

        if (!car.isAI) {
          if (car.playerIndex === 0) {
            accelerate = keysPressed.current.has('ArrowUp');
            brake = keysPressed.current.has('ArrowDown');
            left = keysPressed.current.has('ArrowLeft');
            right = keysPressed.current.has('ArrowRight');
            drift = keysPressed.current.has('ShiftLeft') || keysPressed.current.has('ShiftRight');
            pureBrake = keysPressed.current.has('Enter') || keysPressed.current.has('Space');
            
            // Allow WASD for Player 1 if not in DOUBLE mode
            if (settings.mode !== 'DOUBLE') {
              accelerate = accelerate || keysPressed.current.has('KeyW');
              brake = brake || keysPressed.current.has('KeyS');
              left = left || keysPressed.current.has('KeyA');
              right = right || keysPressed.current.has('KeyD');
              // Q or E or Shift for drift in WASD single
              drift = drift || keysPressed.current.has('KeyQ') || keysPressed.current.has('KeyE');
            }
          } else {
            // Player 2 controls (WASD)
            accelerate = keysPressed.current.has('KeyW');
            brake = keysPressed.current.has('KeyS');
            left = keysPressed.current.has('KeyA');
            right = right || keysPressed.current.has('KeyD');
            pureBrake = keysPressed.current.has('Space');
            drift = keysPressed.current.has('KeyQ') || keysPressed.current.has('KeyE');
          }
        } else {
          // AI Logic
          const effDiff = (settings.mode === 'TEAM' && settings.isEliteMode) ? 4 : settings.aiDifficulty;
          const aiCfg = AI_CONFIG[effDiff as AIDifficulty];
          
          const targetIdx = (currentWaypointIndex + 1) % track.waypoints.length;
          const p0 = track.waypoints[currentWaypointIndex];
          const p1 = track.waypoints[targetIdx];
          const p2 = track.waypoints[(targetIdx + 1) % track.waypoints.length];

          const lenIn = Math.hypot(p1.x - p0.x, p1.y - p0.y);
          const dirInX = lenIn > 0 ? (p1.x - p0.x) / lenIn : 0;
          const dirInY = lenIn > 0 ? (p1.y - p0.y) / lenIn : 0;

          const lenOut = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const dirOutX = lenOut > 0 ? (p2.x - p1.x) / lenOut : 0;
          const dirOutY = lenOut > 0 ? (p2.y - p1.y) / lenOut : 0;

          let cornerDirX = dirOutX - dirInX;
          let cornerDirY = dirOutY - dirInY;
          const cornerLen = Math.hypot(cornerDirX, cornerDirY);
          
          if (cornerLen > 0.01) {
              cornerDirX /= cornerLen;
              cornerDirY /= cornerLen;
          }

          let apexFactor = 0;
          if (car.aiStyle === 'AGGRESSIVE') apexFactor = 0.35; // Hug inside wall closely
          else if (car.aiStyle === 'OPTIMAL') apexFactor = 0.25;
          else if (car.aiStyle === 'DRIFTER') apexFactor = 0.25;
          else if (car.aiStyle === 'CAUTIOUS') apexFactor = 0.05; // Stay mostly near center

          // The target point is the apex offset from the waypoint
          let tX = p1.x + cornerDirX * track.width * apexFactor;
          let tY = p1.y + cornerDirY * track.width * apexFactor;

          // Look ahead to smooth out turns
          const distToNext = Math.hypot(p1.x - x, p1.y - y);
          
          let lookaheadMultiplier = aiCfg.lookAhead / 40; // Balanced anticipation (was 35, too twitchy)
          if (car.aiStyle === 'AGGRESSIVE') lookaheadMultiplier += 0.8;
          else if (car.aiStyle === 'OPTIMAL') lookaheadMultiplier += 0.4;
          
          // Speed proportionality: faster speed = look further ahead
          const speedRatio = Math.max(0.3, speed / car.maxSpeed);
          // Grip inversely proportional: less grip = need to look further ahead to start turning earlier
          const gripFactor = Math.max(0.5, 0.15 / car.grip);
          
          const distThreshold = track.width * lookaheadMultiplier * speedRatio * gripFactor;
          
          if (distToNext < distThreshold) {
              const blend = Math.pow(1 - (distToNext / distThreshold), 2); // Ease in the lookahead
              
              // Target for the NEXT waypoint (p2) apex
              const p3 = track.waypoints[(targetIdx + 2) % track.waypoints.length];
              const lenIn2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
              const dirIn2X = lenIn2 > 0 ? (p2.x - p1.x) / lenIn2 : 0;
              const dirIn2Y = lenIn2 > 0 ? (p2.y - p1.y) / lenIn2 : 0;
              const lenOut2 = Math.hypot(p3.x - p2.x, p3.y - p2.y);
              const dirOut2X = lenOut2 > 0 ? (p3.x - p2.x) / lenOut2 : 0;
              const dirOut2Y = lenOut2 > 0 ? (p3.y - p2.y) / lenOut2 : 0;
              let cornerDir2X = dirOut2X - dirIn2X;
              let cornerDir2Y = dirOut2Y - dirIn2Y;
              const cornerLen2 = Math.hypot(cornerDir2X, cornerDir2Y);
              if (cornerLen2 > 0.01) { cornerDir2X /= cornerLen2; cornerDir2Y /= cornerLen2; }
              const t2X = p2.x + cornerDir2X * track.width * apexFactor;
              const t2Y = p2.y + cornerDir2Y * track.width * apexFactor;

              tX = tX * (1 - blend) + t2X * blend;
              tY = tY * (1 - blend) + t2Y * blend;
          }

          if (currentStuckFrames > 20) {
            // Fallback: target absolute center of track to get unstuck
            tX = p1.x;
            tY = p1.y;
            
            // Magic rotation and pull to help unstuck from walls
            if (currentStuckFrames > 30) {
               let angleDiffToTarget = Math.atan2(tY - y, tX - x) - angle;
               while (angleDiffToTarget > Math.PI) angleDiffToTarget -= Math.PI * 2;
               while (angleDiffToTarget < -Math.PI) angleDiffToTarget += Math.PI * 2;
               angle += Math.sign(angleDiffToTarget) * 0.08 * dtScale;
               
               // Magically pull the car towards the center of the track (p1) to detach from wall
               x += Math.cos(Math.atan2(tY - y, tX - x)) * 2 * dtScale;
               y += Math.sin(Math.atan2(tY - y, tX - x)) * 2 * dtScale;
            }
          }

          // Complete stuck reset
          if (currentStuckFrames > 120) {
            // Hard reset to the START of the current segment instead of the next one to avoid "flash" forward
            x = p0.x; 
            y = p0.y;
            angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
            speed = 0;
            currentStuckFrames = 0;
          }

          let targetAngle = Math.atan2(tY - y, tX - x);

          let angleDiff = targetAngle - angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          let steerThreshold = aiCfg.steerAccuracy;
          if (car.aiStyle === 'OPTIMAL') steerThreshold *= 0.8; 
          else if (car.aiStyle === 'DRIFTER') steerThreshold *= 1.2;

          if (Math.abs(angleDiff) > steerThreshold) {
            if (angleDiff > 0) right = true;
            else left = true;
          }

          let brakingAngle = 0.6; 
          let driftAngle = 0.8; 
          let driftSpeedRate = 0.6;
             
             if (car.aiStyle === 'AGGRESSIVE') {
                brakingAngle = 0.8;
                driftAngle = 0.7;
                driftSpeedRate = 0.5;
             } else if (car.aiStyle === 'CAUTIOUS') {
                brakingAngle = 0.4;
                driftAngle = 1.2;
                driftSpeedRate = 0.8;
             } else if (car.aiStyle === 'DRIFTER') {
                brakingAngle = 0.75;
                driftAngle = 0.6;
                driftSpeedRate = 0.45;
             } else if (car.aiStyle === 'OPTIMAL') {
                brakingAngle = 0.65;
                driftAngle = 0.8;
                driftSpeedRate = 0.55;
             }

             // AI drifting based on style & difficulty
             const canDrift = effDiff >= 3 || car.aiStyle === 'DRIFTER';
             if (canDrift && Math.abs(angleDiff) > driftAngle && speed > (car.maxSpeed * driftSpeedRate) && distToNext < (track.width * 0.9)) {
                 drift = true;
             } else {
                 drift = false;
             }

             // Logic: Accelerate by default
             accelerate = true;
             brake = false;

             // Only brake if facing completely the wrong way OR need to slow down for sharp corner
             if (Math.abs(angleDiff) > 1.4) {
                accelerate = false;
                pureBrake = true;
             }

             // Extra braking for sharp turns when not drifting
             if (!drift && Math.abs(angleDiff) > brakingAngle && speed > 4.5) {
                accelerate = false;
                pureBrake = true;
             }
        }

        // Apply state stats
        let fatigueFactor = 1.0;

        let currentMaxSpeed = car.maxSpeed * fatigueFactor;
        let currentAcceleration = car.acceleration * fatigueFactor;

        // Slightly lower acceleration if starting to simulate stall/heat
        if (car.isAI && settings.isEliteMode && gameTime > 30000) {
           currentAcceleration *= 0.95;
        }

        let currentGrip = drift ? car.grip * 0.3 : car.grip;

        // Apply Physics
        if (accelerate) {
          speed += currentAcceleration * dtScale;
          // Start acceleration bonus for the first 1.5 seconds
          if (gameTime < 1500) {
              speed += (car.launch * 0.05) * dtScale;
          }
        }

        if (brake) {
          speed -= PHYSICS.BRAKE * dtScale;
        }

        if (pureBrake) {
          if (speed > 0) {
            // Brake smoothly to 0
            const brakePower = Math.max(0.05, speed * 0.05); // Gradual slow down
            speed = Math.max(0, speed - brakePower * dtScale);
          } else if (speed < 0) {
            const brakePower = Math.max(0.05, Math.abs(speed) * 0.05);
            speed = Math.min(0, speed + brakePower * dtScale);
          }
        }

        // Friction
        if (speed > 0) {
          speed = Math.max(0, speed - PHYSICS.FRICTION * dtScale);
        } else if (speed < 0) {
          speed = Math.min(0, speed + PHYSICS.FRICTION * dtScale);
        }
        
        // Allow reversing up to 1/3 of max speed
        speed = Math.max(-currentMaxSpeed / 3, Math.min(speed, currentMaxSpeed));

        // Steering
        let currentSteerSpeed = PHYSICS.STEER_SPEED * dtScale;
        // When reversing, steering feels reversed relative to moving forward, 
        // to keep simple arcade controls, we flip steering if speed is negative
        const steerDir = speed < -0.1 ? -1 : 1;

        if (drift) {
          isDriftingFlag = true;
          currentSteerSpeed *= 1.8; // Turn faster while drifting
          const driftRetention = Math.min(1.0, 0.97 + (car.driftSpeed * 0.002));
          speed *= Math.pow(driftRetention, dtScale); // Use drift retention stat
        } else if (car.isAI && speed > PHYSICS.MAX_SPEED * 0.7 && Math.abs(angle - moveAngle) > 0.4) {
          speed *= Math.pow(0.99, dtScale); // Slight penalty for messy turning if not drifting
        }
        
        const steerFactor = Math.max(0.2, 1 - (Math.abs(speed) / currentMaxSpeed) * 0.5);
        if (left) angle -= currentSteerSpeed * steerFactor * steerDir;
        if (right) angle += currentSteerSpeed * steerFactor * steerDir;

        // Move Angle (Drift mechanics)
        let angleDiffMove = angle - moveAngle;
        while (angleDiffMove > Math.PI) angleDiffMove -= Math.PI * 2;
        while (angleDiffMove < -Math.PI) angleDiffMove += Math.PI * 2;
        moveAngle += angleDiffMove * Math.min(1, currentGrip * dtScale);

        // Move
        let nextX = x + Math.cos(moveAngle) * speed * dtScale;
        let nextY = y + Math.sin(moveAngle) * speed * dtScale;

        // Off-track detection & Wall Collision
        const { distance: mainDist, point: mainClosestCenter, minLineIndex } = getClosestPointOnTrack({ x: nextX, y: nextY }, track, currentWaypointIndex);
        
        const p0x = track.waypoints[0].x;
        const p0y = track.waypoints[0].y;
        const p1x = track.waypoints[1].x;
        const p1y = track.waypoints[1].y;
        const segDx = p1x - p0x;
        const segDy = p1y - p0y;
        const segLen = Math.hypot(segDx, segDy);
        const wideLength = Math.min(250, segLen);
        const endX = p0x + (segDx / segLen) * wideLength;
        const endY = p0y + (segDy / segLen) * wideLength;

        const capDx = endX - p0x;
        const capDy = endY - p0y;
        const l2 = capDx * capDx + capDy * capDy;
        let t = 0;
        if (l2 > 0) {
           t = Math.max(0, Math.min(1, ((nextX - p0x) * capDx + (nextY - p0y) * capDy) / l2));
        }
        const projX = p0x + t * capDx;
        const projY = p0y + t * capDy;
        const distToCap = Math.hypot(nextX - projX, nextY - projY);
        
        const capMaxDist = (track.width + 160) / 2 - PHYSICS.CAR_SIZE / 2;
        const mainMaxDist = track.width / 2 - PHYSICS.CAR_SIZE / 2;

        let isHittingWall = mainDist > mainMaxDist && distToCap > capMaxDist;

        if (isHittingWall) {
          const overflowMain = mainDist - mainMaxDist;
          const overflowCap = distToCap - capMaxDist;

          if (overflowCap < overflowMain) {
            const dx = nextX - projX;
            const dy = nextY - projY;
            const len = Math.hypot(dx, dy);
            if (len > 0) {
               nextX = projX + (dx / len) * capMaxDist;
               nextY = projY + (dy / len) * capMaxDist;
            }
          } else {
            const dx = nextX - mainClosestCenter.x;
            const dy = nextY - mainClosestCenter.y;
            const len = Math.hypot(dx, dy);
            if (len > 0) {
              nextX = mainClosestCenter.x + (dx / len) * mainMaxDist;
              nextY = mainClosestCenter.y + (dy / len) * mainMaxDist;
            }
          }
          speed *= Math.pow(0.96, dtScale); 
        }

        // Accurate stuck detection: Check if car actually moved
        let actualMoveDist = Math.hypot(nextX - car.x, nextY - car.y);
        if (car.isAI) {
           // Only count as stuck if we are trying to accelerate but not moving
           if (accelerate && actualMoveDist < 0.5) {
              currentStuckFrames += 1;
           } else if (actualMoveDist > 1.0) {
              currentStuckFrames = Math.max(0, currentStuckFrames - 2); // Fast recovery
           }
        }

        // Waypoint tracking using absolute closest segment
        let newBestLapTime = car.bestLapTime;
        let newLapStartTime = car.lapStartTime;
        let newLapTimes = car.lapTimes ? [...car.lapTimes] : [];
        
        let diff = (minLineIndex - currentWaypointIndex + track.waypoints.length) % track.waypoints.length;
        
        // If diff > 0 and <= 3, car has advanced to a new segment (allowing slight skips/cuts).
        if (diff > 0 && diff <= 3) {
            // Did we wrap around the finish line?
            if (currentWaypointIndex + diff >= track.waypoints.length) {
              // Crossed finish line
              if (lap > 0) {
                const currentLapTime = gameTime - car.lapStartTime;
                newLapTimes.push(currentLapTime);
                if (currentLapTime < car.bestLapTime) {
                  newBestLapTime = currentLapTime;
                }
              }
              newLapStartTime = gameTime;
              
              lap += 1;
              if (lap >= settings.laps) {
                if (firstFinishTimeRef.current === null) {
                  firstFinishTimeRef.current = gameTime;
                }
                let finalState = { ...car, x: nextX, y: nextY, speed: 0, finished: true, finishTime: gameTime, bestLapTime: newBestLapTime, lapTimes: newLapTimes, stuckFrames: currentStuckFrames, reversingFrames: 0 };
                finalState.lap = settings.laps;
                return finalState;
              }
            }
            currentWaypointIndex = minLineIndex;
        }

        return {
          ...car,
          x: nextX,
          y: nextY,
          angle,
          moveAngle,
          speed,
          currentWaypointIndex,
          lap,
          lapStartTime: newLapStartTime,
          bestLapTime: newBestLapTime,
          lapTimes: newLapTimes,
          stuckFrames: currentStuckFrames,
          reversingFrames: 0,
          isDriftingFlag,
        };
      });

      // Check if timeout reached (10 seconds after first finish)
      if (firstFinishTimeRef.current !== null && gameTime - firstFinishTimeRef.current > 10000) {
        // Force finish DNF
        let changed = false;
        const dnfCars = newCars.map(c => {
          if (!c.finished) {
            changed = true;
            return { ...c, finished: true, finishTime: Infinity, dnf: true, lap: settings.laps };
          }
          return c;
        });
        if (changed) return dnfCars;
      }

      // Check if all finished
      if (newCars.every((c) => c.finished)) {
        // onFinish is handled in useEffect now
      }

      // Car-to-Car Collisions
      for (let i = 0; i < newCars.length; i++) {
        for (let j = i + 1; j < newCars.length; j++) {
          const c1 = newCars[i];
          const c2 = newCars[j];
          if (c1.finished || c2.finished) continue;

          const dx = c2.x - c1.x;
          const dy = c2.y - c1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = PHYSICS.CAR_SIZE;

          if (dist < minDist && dist > 0) {
            const overlap = minDist - dist;
            // Fully separate them: each moves by half the overlap
            const pushDirX = dx / dist;
            const pushDirY = dy / dist;
            const pushAmt = overlap / 2.0;

            c1.x -= pushDirX * pushAmt;
            c1.y -= pushDirY * pushAmt;
            c2.x += pushDirX * pushAmt;
            c2.y += pushDirY * pushAmt;

            // Bounce impulse to separate quickly
            const bounce = 0.5 * dtScale;
            c1.speed *= 0.98;
            c2.speed *= 0.98;
            
            // Add jitter to prevent permanent alignment
            const jitter = 1.8;
            c1.x += (Math.random() - 0.5) * jitter;
            c1.y += (Math.random() - 0.5) * jitter;
          }
        }
      }

      if (typeof window !== 'undefined' && newCars.some(c => !c.finished && c.isDriftingFlag)) {
         audioService.playDrift();
      }

      return newCars;
    });
  };

  // Check for finish condition
  useEffect(() => {
    if (!hasCalledFinishRef.current && cars.length > 0 && cars.every(c => c.finished)) {
      hasCalledFinishRef.current = true;
      audioService.stopAll();
      audioService.playFinish();
      onFinish([...cars].sort((a, b) => (a.finishTime || 0) - (b.finishTime || 0)));
    }
  }, [cars, onFinish]);

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#050508'; // Dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Track Edge ( kerbs / neon glow )
    ctx.beginPath();
    ctx.strokeStyle = '#00f2ff'; // Cyan edge
    ctx.lineWidth = track.width + 8; // 4px border each side
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    track.waypoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();

    // Draw wide start area edge
    ctx.beginPath();
    const p0 = track.waypoints[0];
    const p1_pt = track.waypoints[1];
    const segDx = p1_pt.x - p0.x;
    const segDy = p1_pt.y - p0.y;
    const segLen = Math.hypot(segDx, segDy);
    const wideLength = Math.min(250, segLen);
    const endX = p0.x + (segDx / segLen) * wideLength;
    const endY = p0.y + (segDy / segLen) * wideLength;
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = track.width + 160 + 8;
    ctx.lineCap = 'round';
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw Track Body
    ctx.beginPath();
    ctx.strokeStyle = '#151623'; // Dark track
    ctx.lineWidth = track.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    track.waypoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();

    // Draw wide start area body
    ctx.beginPath();
    ctx.strokeStyle = '#151623';
    ctx.lineWidth = track.width + 160;
    ctx.lineCap = 'round';
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw Track Center Line (dashed)
    ctx.beginPath();
    ctx.strokeStyle = '#00f2ff'; // Cyan glow
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    track.waypoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Start/Finish Line
    const p1 = track.waypoints[0];
    const p2 = track.waypoints[1];
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    ctx.save();
    ctx.translate(p1.x, p1.y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = '#ff00ea'; // Magenta
    ctx.fillRect(-track.width / 2, -10, track.width, 20);
    // Neon pattern
    ctx.fillStyle = '#00f2ff';
    for (let i = 0; i < track.width; i += 40) {
      ctx.fillRect(-track.width / 2 + i, -10, 20, 20);
    }
    ctx.restore();

    // Draw Cars
    cars.forEach((car) => {
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);

      let fillStyle: string | CanvasGradient = car.color;
      if (car.liveryData && car.liveryData.isGradient) {
        const grad = ctx.createLinearGradient(-30, -16, 30, 16);
        const colors = car.liveryData.colors;
        colors.forEach((c, idx) => {
          grad.addColorStop(idx / (colors.length - 1 || 1), c);
        });
        fillStyle = grad;
      }

      ctx.shadowColor = car.liveryData ? car.liveryData.colors[0] : car.color;
      ctx.shadowBlur = 15;

      const drawWheels = () => {
        ctx.fillStyle = '#111';
        ctx.shadowBlur = 0;
        ctx.fillRect(-24, -20, 12, 8);
        ctx.fillRect(12, -20, 12, 8);
        ctx.fillRect(-24, 12, 12, 8);
        ctx.fillRect(12, 12, 12, 8);
      };

      if (car.vehicleType === 'f1') {
        drawWheels();
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(-40, -10);
        ctx.lineTo(-10, -10);
        ctx.lineTo(40, -4);
        ctx.lineTo(40, 4);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-40, 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, -8, 12, 16);
      } else if (car.vehicleType === 'muscle') {
        drawWheels();
        ctx.fillStyle = fillStyle;
        ctx.fillRect(-35, -14, 70, 28);
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(5, -10, 20, 20);
      } else if (car.vehicleType === 'tank') {
        drawWheels();
        ctx.fillStyle = fillStyle;
        ctx.fillRect(-40, -20, 80, 40);
        ctx.fillStyle = '#111';
        ctx.fillRect(-15, -10, 30, 20);
        ctx.fillRect(15, -4, 30, 8);
      } else if (car.vehicleType === 'ninja') {
        // Ninja: Sleek, stealthy, narrow
        ctx.fillStyle = '#0a0a0a';
        ctx.shadowBlur = 0;
        ctx.fillRect(-22, -18, 10, 6);
        ctx.fillRect(14, -18, 10, 6);
        ctx.fillRect(-22, 12, 10, 6);
        ctx.fillRect(14, 12, 10, 6);
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(-35, -5);
        ctx.lineTo(-10, -12);
        ctx.lineTo(35, -4);
        ctx.lineTo(45, 0); // sharp nose
        ctx.lineTo(35, 4);
        ctx.lineTo(-10, 12);
        ctx.lineTo(-35, 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#111';
        ctx.fillRect(-10, -6, 15, 12); // cockpit
      } else if (car.vehicleType === 'cyber') {
        // Cyber: angular, neon lines
        drawWheels();
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(-35, -16);
        ctx.lineTo(10, -16);
        ctx.lineTo(30, -10);
        ctx.lineTo(35, -6);
        ctx.lineTo(35, 6);
        ctx.lineTo(30, 10);
        ctx.lineTo(10, 16);
        ctx.lineTo(-35, 16);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0ff';
        ctx.shadowColor = '#0ff';
        ctx.shadowBlur = 10;
        ctx.fillRect(-30, -8, 15, 16);
        ctx.shadowBlur = 0;
      } else if (car.vehicleType === 'boss') {
        // Boss: Huge hover/tank hybrid
        ctx.fillStyle = '#222';
        ctx.fillRect(-45, -25, 90, 50); // Under chassis
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(-40, -15);
        ctx.lineTo(-20, -25);
        ctx.lineTo(20, -25);
        ctx.lineTo(45, -10);
        ctx.lineTo(45, 10);
        ctx.lineTo(20, 25);
        ctx.lineTo(-20, 25);
        ctx.lineTo(-40, 15);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = car.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(10, 0, 6, 0, Math.PI * 2);
        ctx.fill(); // glowing core
        ctx.shadowBlur = 0;
      } else if (car.vehicleType === 'legend') {
        // Legend: futuristic F1
        ctx.fillStyle = '#111';
        ctx.fillRect(-28, -24, 14, 10);
        ctx.fillRect(16, -22, 12, 8);
        ctx.fillRect(-28, 14, 14, 10);
        ctx.fillRect(16, 14, 12, 8);
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(-45, -8);
        ctx.lineTo(-15, -8);
        ctx.lineTo(50, -3);
        ctx.lineTo(50, 3);
        ctx.lineTo(-15, 8);
        ctx.lineTo(-45, 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(-45, -20, 8, 40); // Rear spoiler
        ctx.fillRect(40, -15, 6, 30); // Front wing
        ctx.fillStyle = '#ffb700'; // gold tint cockpit
        ctx.fillRect(-5, -6, 16, 12);
      } else {
        // Standard
        drawWheels();
        ctx.fillStyle = fillStyle;
        ctx.fillRect(-30, -16, 60, 32);
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(10, -12, 10, 24);
        
        ctx.fillStyle = fillStyle;
        ctx.fillRect(-26, -12, 6, 24);
      }

      // Label
      ctx.restore();
      ctx.fillStyle = '#fff';
      if (car.team === 'RED') ctx.fillStyle = '#ef4444';
      if (car.team === 'BLUE') ctx.fillStyle = '#3b82f6';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(car.team ? `${car.name || car.id.toUpperCase()} (${car.team === 'RED' ? '红' : '蓝'})` : (car.name || car.id.toUpperCase()), car.x, car.y - 40);
    });
  };

  useEffect(() => {
    if (isPaused) {
      lastTimeRef.current = 0;
    }
  }, [isPaused]);

  const animate = (time: number) => {
    if (lastTimeRef.current !== 0 && lastTimeRef.current !== undefined) {
      const deltaTime = time - lastTimeRef.current;
      updatePhysics(deltaTime);
    }
    lastTimeRef.current = time;
    render();
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [countdown, isPaused, cars]);

  return (
    <div className="relative w-full h-[100dvh] flex flex-col items-center bg-bg overflow-hidden p-0">
      <div className="w-full 2xl:w-auto 2xl:absolute 2xl:top-4 2xl:left-4 z-10 flex flex-row 2xl:flex-col 2xl:gap-2 p-1 px-2 2xl:p-4 bg-black/50 2xl:bg-black/80 backdrop-blur-sm border-b 2xl:border border-white/10 2xl:rounded-md text-white font-mono pointer-events-none 2xl:max-w-none shadow-none opacity-80 2xl:opacity-100 shrink-0 items-center 2xl:items-start justify-between min-h-[28px]">
        
        <div className="flex 2xl:flex-col gap-2 2xl:gap-4 items-center 2xl:items-start shrink-0">
          <div className="text-accent-magenta font-bold uppercase tracking-wider hidden 2xl:block border-b border-white/10 pb-1 w-full text-sm">比赛数据</div>
          <div className="flex gap-2 2xl:justify-between 2xl:w-full text-[10px] 2xl:text-sm">
            <span className="opacity-60 hidden 2xl:inline">赛道:</span>
            <span className="text-accent-cyan truncate max-w-[80px] 2xl:max-w-none">{track.name}</span>
          </div>
          <div className="flex gap-2 2xl:justify-between 2xl:w-full text-[10px] 2xl:text-sm">
            <span className="opacity-60 hidden 2xl:inline">时间:</span>
            <span className="text-accent-yellow">{(gameTime / 1000).toFixed(2)}s</span>
          </div>
        </div>
        
        <div className="flex 2xl:flex-col gap-3 2xl:gap-0 2xl:mt-2 2xl:space-y-1 overflow-x-auto 2xl:overflow-visible pr-16 2xl:pr-0 items-center w-full justify-end 2xl:justify-start">
          {cars.map(car => (
            <div key={car.id} className="flex items-center justify-between gap-1 2xl:gap-4 flex-shrink-0">
              <div className="flex items-center gap-1 2xl:gap-2">
                <div className="w-1.5 h-1.5 2xl:w-2 2xl:h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: car.team === 'RED' ? '#ef4444' : car.team === 'BLUE' ? '#3b82f6' : car.color, color: car.team === 'RED' ? '#ef4444' : car.team === 'BLUE' ? '#3b82f6' : car.color }} />
                <span className={`text-[10px] hidden sm:inline uppercase ${car.team === 'RED' ? 'text-red-400' : car.team === 'BLUE' ? 'text-blue-400' : 'text-white'}`}>{car.name || car.id}</span>
              </div>
              <span className="text-[10px] opacity-60">圈数{car.lap + 1}/{settings.laps} {car.finished ? '完成' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-14 left-2 2xl:top-[420px] 2xl:left-4 z-30 flex flex-col gap-2 pointer-events-none items-start">
        {cars.filter(car => !car.isAI).map(car => (
          <div key={`lap-${car.id}`} className="bg-black/60 backdrop-blur-md border border-white/10 rounded p-2 text-white font-mono shadow-lg opacity-90 min-w-[120px] 2xl:min-w-[160px]">
             <div className="text-accent-cyan text-[10px] 2xl:text-xs mb-1 font-bold">{car.name} 圈速</div>
             {car.lapTimes && car.lapTimes.map((time, idx) => (
               <div key={idx} className="text-[10px] 2xl:text-xs flex justify-between gap-3">
                 <span className="opacity-60">第{idx + 1}圈</span>
                 <span className="text-accent-yellow">{(time / 1000).toFixed(2)}s</span>
               </div>
             ))}
             {car.lapTimes && car.lapTimes.length > 0 && (
               <div className="text-[10px] 2xl:text-xs flex justify-between gap-3 mt-1 border-t border-white/10 pt-1">
                 <span className="opacity-80 text-accent-cyan">最快</span>
                 <span className="text-accent-cyan font-bold">{(Math.min(...car.lapTimes) / 1000).toFixed(2)}s</span>
               </div>
             )}
             {!car.finished && (
               <div className="text-[10px] 2xl:text-xs flex justify-between gap-3 mt-1 border-t border-white/10 pt-1">
                 <span className="opacity-60">当前圈</span>
                 <span className="text-white">{((gameTime - car.lapStartTime) / 1000).toFixed(2)}s</span>
               </div>
             )}
          </div>
        ))}
      </div>

      <div className="absolute top-16 right-4 lg:top-20 lg:right-4 z-40 flex flex-col gap-4 pointer-events-none items-end">
        <button 
          onClick={() => setIsPaused(!isPaused)}
          className="w-12 h-12 md:w-16 md:h-16 bg-black/80 hover:bg-accent-cyan/20 text-white hover:text-accent-cyan rounded-full border-2 border-white/20 hover:border-accent-cyan transition-all backdrop-blur-xl pointer-events-auto flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.8)] group"
          title={isPaused ? '继续' : '暂停'}
        >
          {isPaused ? <Play size={28} className="translate-x-0.5 group-hover:scale-110 transition-transform" /> : <Pause size={28} className="group-hover:scale-110 transition-transform" />}
        </button>
        {firstFinishTimeRef.current !== null && (
           <div className="bg-red-500/90 text-white font-black px-4 py-2 rounded-lg text-center text-sm md:text-xl animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.6)] backdrop-blur-md">
             结束倒数: {Math.max(0, Math.ceil((10000 - (gameTime - firstFinishTimeRef.current)) / 1000))}
           </div>
        )}
      </div>

      <div className="flex-1 w-full flex items-center justify-center p-2 2xl:p-8 min-h-0 relative">
        <canvas
          ref={canvasRef}
          width={1600}
          height={1200}
          style={{ objectFit: 'contain' }}
          className="w-full h-full max-w-[1200px] max-h-full aspect-[4/3] rounded-xl 2xl:rounded-2xl shadow-[0_0_50px_rgba(0,242,255,0.15)] border-2 2xl:border-4 border-white/5 bg-black"
        />
      </div>

      <AnimatePresence>
        {countdown > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
          >
            <span className="text-9xl font-black text-white italic drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
              {countdown}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Touch Controls - visible on devices that support touch (simulated with standard media queries/pointer events) */}
      <div className="absolute bottom-2 sm:bottom-4 2xl:bottom-8 left-2 right-2 sm:left-4 sm:right-4 z-20 flex 2xl:hidden justify-between pointer-events-none select-none opacity-60 hover:opacity-100 transition-opacity">
        
        {/* Left Side: Steering */}
        <div className="flex gap-2 sm:gap-4 pointer-events-auto items-end">
          <button 
            className="w-14 h-14 sm:w-20 sm:h-20 bg-black/40 backdrop-blur active:bg-accent-cyan/60 rounded-full flex items-center justify-center text-white border-2 border-white/20 select-none touch-none text-xl sm:text-2xl"
            onPointerDown={(e) => { e.preventDefault(); keysPressed.current.add('ArrowLeft'); }}
            onPointerUp={(e) => { e.preventDefault(); keysPressed.current.delete('ArrowLeft'); }}
            onPointerCancel={(e) => { e.preventDefault(); keysPressed.current.delete('ArrowLeft'); }}
            onPointerOut={(e) => { e.preventDefault(); keysPressed.current.delete('ArrowLeft'); }}
          >
            ←
          </button>
          <button 
            className="w-14 h-14 sm:w-20 sm:h-20 bg-black/40 backdrop-blur active:bg-accent-cyan/60 rounded-full flex items-center justify-center text-white border-2 border-white/20 select-none touch-none text-xl sm:text-2xl"
            onPointerDown={(e) => { e.preventDefault(); keysPressed.current.add('ArrowRight'); }}
            onPointerUp={(e) => { e.preventDefault(); keysPressed.current.delete('ArrowRight'); }}
            onPointerCancel={(e) => { e.preventDefault(); keysPressed.current.delete('ArrowRight'); }}
            onPointerOut={(e) => { e.preventDefault(); keysPressed.current.delete('ArrowRight'); }}
          >
            →
          </button>
        </div>

        {/* Right Side: Actions */}
        <div className="flex gap-2 sm:gap-4 pointer-events-auto items-end">
          <button 
            className="w-12 h-12 sm:w-16 sm:h-16 mb-2 sm:mb-4 bg-black/40 backdrop-blur active:bg-accent-yellow/60 rounded-full flex items-center justify-center text-white border-2 border-white/20 select-none touch-none text-[10px] sm:text-sm font-bold"
            onPointerDown={(e) => { e.preventDefault(); keysPressed.current.add('ShiftLeft'); keysPressed.current.add('ShiftRight'); }}
            onPointerUp={(e) => { e.preventDefault(); keysPressed.current.delete('ShiftLeft'); keysPressed.current.delete('ShiftRight'); }}
            onPointerCancel={(e) => { e.preventDefault(); keysPressed.current.delete('ShiftLeft'); keysPressed.current.delete('ShiftRight'); }}
            onPointerOut={(e) => { e.preventDefault(); keysPressed.current.delete('ShiftLeft'); keysPressed.current.delete('ShiftRight'); }}
          >
            漂移
          </button>
          <div className="flex flex-col gap-2 sm:gap-4">
            <button 
              className="w-14 h-14 sm:w-20 sm:h-20 bg-black/40 backdrop-blur active:bg-accent-cyan/60 rounded-full flex items-center justify-center text-white border-2 border-white/20 select-none touch-none font-bold text-xs sm:text-base"
              onPointerDown={(e) => { e.preventDefault(); keysPressed.current.add('ArrowUp'); }}
              onPointerUp={(e) => { e.preventDefault(); keysPressed.current.delete('ArrowUp'); }}
              onPointerCancel={(e) => { e.preventDefault(); keysPressed.current.delete('ArrowUp'); }}
              onPointerOut={(e) => { e.preventDefault(); keysPressed.current.delete('ArrowUp'); }}
            >
              加速
            </button>
            <button 
              className="w-14 h-14 sm:w-20 sm:h-20 bg-black/40 backdrop-blur active:bg-accent-magenta/60 rounded-full flex items-center justify-center text-white border-2 border-white/20 select-none touch-none font-bold text-xs sm:text-base"
              onPointerDown={(e) => { e.preventDefault(); keysPressed.current.add('ArrowDown'); }}
              onPointerUp={(e) => { e.preventDefault(); keysPressed.current.delete('ArrowDown'); }}
              onPointerCancel={(e) => { e.preventDefault(); keysPressed.current.delete('ArrowDown'); }}
              onPointerOut={(e) => { e.preventDefault(); keysPressed.current.delete('ArrowDown'); }}
            >
              刹车
            </button>
          </div>
        </div>
      </div>

      {isPaused && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-zinc-900 p-8 rounded-3xl border border-white/10 text-center flex flex-col gap-4">
            <h2 className="text-4xl font-black text-white mb-4 italic">已暂停</h2>
            <button 
              onClick={() => {
                setIsPaused(false);
                setMatchId(prev => prev + 1);
              }}
              className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all transform hover:scale-105"
            >
              重新比赛
            </button>
            <button 
              onClick={() => setIsPaused(false)}
              className="px-8 py-3 bg-accent-cyan hover:bg-accent-cyan/80 text-black font-bold rounded-xl transition-all transform hover:scale-105"
            >
              继续比赛
            </button>
            <button 
              onClick={onExit}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all transform hover:scale-105"
            >
              返回主菜单
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
