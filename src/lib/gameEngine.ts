import { CarState, Point, Track } from '../types';
import { PHYSICS, AI_CONFIG } from '../constants';

export const updateCarPhysics = (
  car: CarState,
  inputs: Set<string>,
  track: Track,
  deltaTime: number,
  allCars: CarState[],
  dtScale: number,
  currentTimeOverride?: number
): CarState => {
  if (car.finished) return car;

  let { x, y, angle, moveAngle, speed, currentWaypointIndex, lap } = car;

  // Controls derived from inputs
  let accelerate = inputs.has('ArrowUp') || inputs.has('KeyW');
  let brake = inputs.has('ArrowDown') || inputs.has('KeyS');
  let left = inputs.has('ArrowLeft') || inputs.has('KeyA');
  let right = inputs.has('ArrowRight') || inputs.has('KeyD');
  let drift = inputs.has('ShiftLeft') || inputs.has('ShiftRight') || inputs.has('KeyQ') || inputs.has('KeyE');
  let pureBrake = inputs.has('Enter') || inputs.has('Space');
  let isDriftingFlag = false;

  // Apply Physics
  let currentMaxSpeed = car.maxSpeed;
  let currentAcceleration = car.acceleration;
  let currentGrip = drift ? car.grip * 0.3 : car.grip;

  if (accelerate) {
    speed += currentAcceleration * dtScale;
  }

  if (brake) {
    speed -= PHYSICS.BRAKE * dtScale;
  }

  if (pureBrake) {
    if (speed > 0) {
      const brakePower = Math.max(0.05, speed * 0.05);
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
  
  speed = Math.max(-currentMaxSpeed / 3, Math.min(speed, currentMaxSpeed));

  // Steering
  let currentSteerSpeed = PHYSICS.STEER_SPEED * dtScale;
  const steerDir = speed < -0.1 ? -1 : 1;
  const steerFactor = Math.max(0.2, 1 - (Math.abs(speed) / currentMaxSpeed) * 0.5);

  if (drift) {
    isDriftingFlag = true;
    currentSteerSpeed *= 1.8;
    const driftRetention = Math.min(1.0, 0.97 + (car.driftSpeed * 0.002));
    speed *= Math.pow(driftRetention, dtScale);
  }

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

  // Off-track / Wall collision (Simplified for server, but should match client)
  // 必须传入 currentIndex 以实现局部滑动窗口搜索
  const getClosestPointOnTrack = (p: Point, track: Track, currentIndex: number) => {
    let minDistance = Infinity;
    let closestPoint = { x: 0, y: 0 };
    let minLineIndex = currentIndex;
    const len = track.waypoints.length;

    // 【核心修复】：仅在当前赛车进度的 [前3, 后5] 范围内寻找最近赛道边缘
    // 彻底忽略距离相近但进度无关的交叉赛道段，完美解决八字赛道立体交叉导致的空气墙
    for (let offset = -3; offset <= 5; offset++) {
      const i = (currentIndex + offset + len) % len;
      const p1 = track.waypoints[i];
      const p2 = track.waypoints[(i + 1) % len];
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

  const { distance, point, minLineIndex } = getClosestPointOnTrack({ x: nextX, y: nextY }, track, car.currentWaypointIndex);
  
  let stuckFrames = car.stuckFrames || 0;

  if (distance > track.width / 2) {
    const angleToTrack = Math.atan2(point.y - nextY, point.x - nextX);
    const bounceForce = 0.5 * dtScale;
    speed *= Math.pow(0.8, dtScale);
    nextX += Math.cos(angleToTrack) * bounceForce;
    nextY += Math.sin(angleToTrack) * bounceForce;
    stuckFrames++;
  } else {
    stuckFrames = 0;
  }

  // Progression logic (Matching client's logic more closely)
  const currentTime = currentTimeOverride || Date.now();
  const waypointsCount = track.waypoints.length;
  // Increase allowed skip to 5 for high-speed AI
  const diff = (minLineIndex - car.currentWaypointIndex + waypointsCount) % waypointsCount;
  
  // If car advanced significantly, update waypoint.
  if (diff > 0 && diff <= 5) {
      // Did we wrap around the finish line?
      if (car.currentWaypointIndex + diff >= waypointsCount && car.currentWaypointIndex > waypointsCount * 0.7) {
          // Crossed finish line
          if (currentTime - (car.lapStartTime || 0) > 3000) { 
              car.lap += 1;
              const lapTime = currentTime - (car.lapStartTime || currentTime);
              if (!car.lapTimes) car.lapTimes = [];
              car.lapTimes.push(lapTime);
              
              if (lapTime < car.bestLapTime) {
                car.bestLapTime = lapTime;
              }
              car.lapStartTime = currentTime;
          }
      }
      car.currentWaypointIndex = minLineIndex;
  }

  return {
    ...car,
    x: nextX,
    y: nextY,
    angle,
    moveAngle,
    speed,
    currentWaypointIndex: car.currentWaypointIndex,
    lap: car.lap,
    lapTimes: car.lapTimes ? [...car.lapTimes] : [],
    lapStartTime: car.lapStartTime,
    bestLapTime: car.bestLapTime,
    stuckFrames,
    isDriftingFlag
  };
};

export const updateAICar = (
  car: CarState,
  track: Track,
  difficulty: number,
  deltaTime: number,
  dtScale: number
): Set<string> => {
  const inputs = new Set<string>();
  // Use Math.min/Math.max to bound difficulty to valid AI_CONFIG keys
  const safeDiff = Math.max(1, Math.min(5, Math.floor(difficulty))) as keyof typeof AI_CONFIG;
  const aiCfg = AI_CONFIG[safeDiff];
  
  const targetIdx = (car.currentWaypointIndex + 1) % track.waypoints.length;
  const p1 = track.waypoints[targetIdx];
  
  const targetAngle = Math.atan2(p1.y - car.y, p1.x - car.x);
  let angleDiff = targetAngle - car.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  if (Math.abs(angleDiff) > aiCfg.steerAccuracy) {
    if (angleDiff > 0) inputs.add('ArrowRight');
    else inputs.add('ArrowLeft');
  }

  inputs.add('ArrowUp');
  
  // Basic braking for sharp turns
  if (Math.abs(angleDiff) > 0.6 && car.speed > 5) {
    inputs.delete('ArrowUp');
    inputs.add('Space');
  }

  return inputs;
};
