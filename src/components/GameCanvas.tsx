import React, { useEffect, useRef, useState } from 'react';
import { GameSettings, CarState, Point, Track, AIDifficulty } from '../types';
import { TRACKS, PHYSICS, AI_CONFIG, COLORS } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

interface GameCanvasProps {
  settings: GameSettings;
  upgrades: { speed: number; grip: number; color: string };
  onFinish: (results: CarState[]) => void;
  onExit: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ settings, upgrades, onFinish, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cars, setCars] = useState<CarState[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [gameTime, setGameTime] = useState(0);
  const requestRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(0);
  const keysPressed = useRef<Set<string>>(new Set());

  const track = TRACKS.find((t) => t.id === settings.trackId) || TRACKS[0];

  // Initialize cars
  useEffect(() => {
    const initialCars: CarState[] = [];
    const startPoint = track.waypoints[0];
    const nextPoint = track.waypoints[1];
    const startAngle = Math.atan2(nextPoint.y - startPoint.y, nextPoint.x - startPoint.x);
    const perpAngle = startAngle + Math.PI / 2;

    const getStartPos = (index: number) => {
      const row = Math.floor(index / 2);
      const col = index % 2 === 0 ? -1 : 1;
      const trackDirOffset = -row * 80; // distance behind start line
      const perpOffset = col * 30; // distance from center
      return {
        x: startPoint.x + Math.cos(startAngle) * trackDirOffset + Math.cos(perpAngle) * perpOffset,
        y: startPoint.y + Math.sin(startAngle) * trackDirOffset + Math.sin(perpAngle) * perpOffset,
      };
    };

    // Player 1
    const p1Pos = getStartPos(0);
    initialCars.push({
      id: 'p1',
      isAI: false,
      playerIndex: 0,
      x: p1Pos.x,
      y: p1Pos.y,
      angle: startAngle,
      moveAngle: startAngle,
      speed: 0,
      color: upgrades.color || COLORS.PLAYER1,
      lap: 0,
      currentWaypointIndex: 0,
      finished: false,
    });

    // Player 2
    if (settings.mode === 'DOUBLE') {
      const p2Pos = getStartPos(1);
      initialCars.push({
        id: 'p2',
        isAI: false,
        playerIndex: 1,
        x: p2Pos.x,
        y: p2Pos.y,
        angle: startAngle,
        moveAngle: startAngle,
        speed: 0,
        color: COLORS.PLAYER2,
        lap: 0,
        currentWaypointIndex: 0,
        finished: false,
      });
    }

    // AI Opponents
    for (let i = 0; i < settings.aiCount; i++) {
      const aiPos = getStartPos(settings.mode === 'DOUBLE' ? i + 2 : i + 1);
      initialCars.push({
        id: `ai${i}`,
        isAI: true,
        x: aiPos.x,
        y: aiPos.y,
        angle: startAngle,
        moveAngle: startAngle,
        speed: 0,
        color: i === 0 ? COLORS.AI1 : COLORS.AI2,
        lap: 0,
        currentWaypointIndex: 0,
        finished: false,
      });
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

    return () => clearInterval(timer);
  }, [settings, track]);

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => keysPressed.current.add(e.code);
    const handleKeyUp = (e: KeyboardEvent) => keysPressed.current.delete(e.code);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const getClosestPointOnTrack = (p: Point, track: Track) => {
    let minDistance = Infinity;
    let closestPoint = { x: 0, y: 0 };
    for (let i = 0; i < track.waypoints.length; i++) {
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
      }
    }
    return { distance: minDistance, point: closestPoint };
  };

  const updatePhysics = (deltaTime: number) => {
    if (countdown > 0 || isPaused) return;

    setGameTime((prev) => prev + deltaTime);

    setCars((prevCars) => {
      const newCars = prevCars.map((car) => {
        if (car.finished) return car;

        let { x, y, angle, moveAngle, speed, currentWaypointIndex, lap } = car;

        // Controls
        let accelerate = false;
        let brake = false;
        let left = false;
        let right = false;
        let drift = false;

        if (!car.isAI) {
          if (car.playerIndex === 0) {
            accelerate = keysPressed.current.has('ArrowUp');
            brake = keysPressed.current.has('ArrowDown');
            left = keysPressed.current.has('ArrowLeft');
            right = keysPressed.current.has('ArrowRight');
            drift = keysPressed.current.has('ShiftLeft') || keysPressed.current.has('ShiftRight');
          } else {
            // Player 2 controls (WASD)
            accelerate = keysPressed.current.has('KeyW');
            brake = keysPressed.current.has('KeyS');
            left = keysPressed.current.has('KeyA');
            right = keysPressed.current.has('KeyD');
            drift = keysPressed.current.has('Space');
          }
        } else {
          // AI Logic
          const aiCfg = AI_CONFIG[settings.aiDifficulty as AIDifficulty];
          const targetWaypoint = track.waypoints[(currentWaypointIndex + 1) % track.waypoints.length];
          const targetAngle = Math.atan2(targetWaypoint.y - y, targetWaypoint.x - x);
          
          let angleDiff = targetAngle - angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          if (Math.abs(angleDiff) > aiCfg.steerAccuracy) {
            if (angleDiff > 0) right = true;
            else left = true;
          }

          if (speed < aiCfg.maxSpeed) accelerate = true;
          // AI brakes if turn is too sharp
          if (Math.abs(angleDiff) > 0.5 && speed > 3) {
            accelerate = false;
            brake = true;
          }
          
          // AI drifts if turn is sharp and speed is high
          drift = Math.abs(angleDiff) > 0.6 && speed > PHYSICS.MAX_SPEED * 0.6;
        }

        // Apply Upgrades for Player 1
        let currentMaxSpeed = PHYSICS.MAX_SPEED;
        let currentGrip = drift ? PHYSICS.DRIFT_GRIP : PHYSICS.GRIP;
        
        if (car.id === 'p1') {
          currentMaxSpeed += upgrades.speed * 0.5; // +0.5 max speed per level
          currentGrip += upgrades.grip * 0.02; // +0.02 grip per level
        }

        // Apply Physics
        if (accelerate) speed += PHYSICS.ACCELERATION;
        if (brake) speed -= PHYSICS.BRAKE;
        speed -= PHYSICS.FRICTION;
        speed = Math.max(0, Math.min(speed, currentMaxSpeed));

        // Steering
        let currentSteerSpeed = PHYSICS.STEER_SPEED;
        if (drift) {
          currentSteerSpeed *= 1.5; // Turn faster while drifting
          speed *= 0.98; // Lose some speed while drifting
        }
        const steerFactor = Math.max(0.2, 1 - (speed / currentMaxSpeed) * 0.5);
        if (left) angle -= currentSteerSpeed * steerFactor;
        if (right) angle += currentSteerSpeed * steerFactor;

        // Move Angle (Drift mechanics)
        let angleDiffMove = angle - moveAngle;
        while (angleDiffMove > Math.PI) angleDiffMove -= Math.PI * 2;
        while (angleDiffMove < -Math.PI) angleDiffMove += Math.PI * 2;
        moveAngle += angleDiffMove * currentGrip;

        // Move
        let nextX = x + Math.cos(moveAngle) * speed;
        let nextY = y + Math.sin(moveAngle) * speed;

        // Off-track detection & Wall Collision
        const { distance, point: closestCenter } = getClosestPointOnTrack({ x: nextX, y: nextY }, track);
        const maxDist = track.width / 2 - PHYSICS.CAR_SIZE / 2;

        if (distance > maxDist) {
          // Push back to maxDist
          const dx = nextX - closestCenter.x;
          const dy = nextY - closestCenter.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            nextX = closestCenter.x + (dx / len) * maxDist;
            nextY = closestCenter.y + (dy / len) * maxDist;
          }
          // Reduce speed heavily due to wall friction
          speed *= 0.85; 
        }

        // Waypoint tracking
        const targetIdx = (currentWaypointIndex + 1) % track.waypoints.length;
        const targetWP = track.waypoints[targetIdx];
        const nextWP = track.waypoints[(targetIdx + 1) % track.waypoints.length];
        
        const dirX = nextWP.x - targetWP.x;
        const dirY = nextWP.y - targetWP.y;
        
        const vx = nextX - targetWP.x;
        const vy = nextY - targetWP.y;
        
        const dot = vx * dirX + vy * dirY;
        const distToNext = Math.sqrt(vx * vx + vy * vy);
        
        if (distToNext < track.width * 2 && dot >= 0) {
          currentWaypointIndex = targetIdx;
          if (currentWaypointIndex === 0) {
            lap += 1;
            if (lap >= track.laps) {
              return { ...car, x: nextX, y: nextY, speed: 0, finished: true, finishTime: gameTime };
            }
          }
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
        };
      });

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
            const pushX = (dx / dist) * (overlap / 2);
            const pushY = (dy / dist) * (overlap / 2);

            c1.x -= pushX;
            c1.y -= pushY;
            c2.x += pushX;
            c2.y += pushY;

            // Simple momentum exchange without speed penalty
            const tempSpeed = c1.speed;
            c1.speed = c2.speed;
            c2.speed = tempSpeed;
          }
        }
      }

      return newCars;
    });
  };

  // Check for finish condition
  useEffect(() => {
    if (cars.length > 0 && cars.every(c => c.finished)) {
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

    // Draw Track
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

    // Draw Track Glow
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 242, 255, 0.1)';
    ctx.lineWidth = track.width + 10;
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
      
      // Car Body
      ctx.fillStyle = car.color;
      ctx.fillRect(-30, -16, 60, 32);
      
      // Windshield
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(10, -12, 10, 24);
      
      // Wheels
      ctx.fillStyle = '#000';
      ctx.fillRect(-24, -20, 12, 8);
      ctx.fillRect(-24, 12, 12, 8);
      ctx.fillRect(12, -20, 12, 8);
      ctx.fillRect(12, 12, 12, 8);

      // Label
      ctx.restore();
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(car.id.toUpperCase(), car.x, car.y - 30);
    });
  };

  const animate = (time: number) => {
    if (lastTimeRef.current !== undefined) {
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
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-bg overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 p-4 neon-panel backdrop-blur-md text-white font-mono text-sm">
        <div className="text-accent-magenta font-bold uppercase tracking-wider mb-1 border-b border-white/10 pb-1">Race Telemetry</div>
        <div className="flex justify-between gap-4">
          <span>Track:</span>
          <span className="text-accent-cyan">{track.name}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Time:</span>
          <span className="text-accent-yellow">{(gameTime / 1000).toFixed(2)}s</span>
        </div>
        <div className="mt-2 space-y-1">
          {cars.map(car => (
            <div key={car.id} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: car.color, color: car.color }} />
                <span className="text-[10px]">{car.id.toUpperCase()}</span>
              </div>
              <span className="text-[10px] opacity-60">L{car.lap + 1}/{track.laps} {car.finished ? 'FIN' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button 
          onClick={() => setIsPaused(!isPaused)}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-colors text-xs uppercase tracking-widest font-bold"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={1600}
        height={1200}
        className="w-full max-w-[1200px] aspect-[4/3] rounded-2xl shadow-[0_0_50px_rgba(0,242,255,0.15)] border-4 border-white/5 bg-black object-contain"
      />

      <AnimatePresence>
        {countdown > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span className="text-9xl font-black text-white italic drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]">
              {countdown}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {isPaused && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
          <div className="bg-zinc-900 p-8 rounded-3xl border border-white/10 text-center flex flex-col gap-4">
            <h2 className="text-4xl font-black text-white mb-4 italic">PAUSED</h2>
            <button 
              onClick={() => setIsPaused(false)}
              className="px-8 py-3 bg-accent-cyan hover:bg-accent-cyan/80 text-black font-bold rounded-xl transition-all transform hover:scale-105"
            >
              RESUME RACE
            </button>
            <button 
              onClick={onExit}
              className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all transform hover:scale-105"
            >
              RETURN TO HOME
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;
