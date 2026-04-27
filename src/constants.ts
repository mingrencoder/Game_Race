import { Track, Point } from './types';

export const TRACKS: Track[] = [
  {
    id: 'oval',
    name: '椭圆赛道',
    width: 220, // narrowed
    laps: 3,
    waypoints: [
      { x: 800, y: 160 }, // Midpoint of straight
      { x: 1300, y: 160 },
      { x: 1440, y: 300 },
      { x: 1440, y: 900 },
      { x: 1300, y: 1040 },
      { x: 300, y: 1040 },
      { x: 160, y: 900 },
      { x: 160, y: 300 },
      { x: 300, y: 160 },
    ],
  },
  {
    id: 'figure8',
    name: '八字狂飙',
    width: 200, // narrowed
    laps: 2,
    waypoints: [
      { x: 160, y: 600 },  // Midpoint of vertical straight
      { x: 160, y: 900 },
      { x: 300, y: 1040 },
      { x: 800, y: 600 },
      { x: 1300, y: 160 },
      { x: 1440, y: 300 },
      { x: 1440, y: 900 },
      { x: 1300, y: 1040 },
      { x: 800, y: 600 },
      { x: 300, y: 160 },
      { x: 160, y: 300 },
    ],
  },
  {
    id: 'technical',
    name: '技术迷宫',
    width: 200, // Widened
    laps: 2,
    waypoints: [
      { x: 360, y: 160 }, // Midpoint of straight, moved left for better launch
      { x: 800, y: 160 },
      { x: 800, y: 500 },
      { x: 400, y: 500 },
      { x: 400, y: 800 },
      { x: 1100, y: 800 },
      { x: 1100, y: 160 },
      { x: 1440, y: 160 },
      { x: 1440, y: 1040 },
      { x: 160, y: 1040 },
      { x: 160, y: 160 },
    ],
  },
  {
    id: 'speed',
    name: '极速环形',
    width: 240, // Widened
    laps: 2,
    waypoints: [
      { x: 800, y: 160 }, // Midpoint of straight
      { x: 1100, y: 160 },
      { x: 1440, y: 600 },
      { x: 1100, y: 1040 },
      { x: 500, y: 1040 },
      { x: 160, y: 600 },
      { x: 500, y: 160 },
    ],
  },
  {
    id: 'serpent',
    name: '蛇形隘口',
    width: 210, // Widened
    laps: 2,
    waypoints: [
      { x: 200, y: 150 },
      { x: 1400, y: 150 },
      { x: 1400, y: 450 },
      { x: 400, y: 450 },
      { x: 400, y: 750 },
      { x: 1400, y: 750 },
      { x: 1400, y: 1050 },
      { x: 200, y: 1050 },
    ],
  },
  {
    id: 'grandprix',
    name: '霓虹大奖赛',
    width: 220, // Reduced to avoid overlap
    laps: 3,
    waypoints: [
      { x: 200, y: 1050 },
      { x: 200, y: 150 },
      { x: 600, y: 150 },
      { x: 600, y: 500 },
      { x: 1000, y: 500 },
      { x: 1000, y: 150 },
      { x: 1400, y: 150 },
      { x: 1400, y: 1050 },
      { x: 1000, y: 1050 },
      { x: 1000, y: 750 },
      { x: 600, y: 750 },
      { x: 600, y: 1050 },
    ],
  },
  {
    id: 'drift_peanut',
    name: '漂移花生',
    width: 250,
    laps: 3,
    waypoints: [
      { x: 1400, y: 600 },
      { x: 1300, y: 900 },
      { x: 1100, y: 1000 },
      { x: 800, y: 900 },
      { x: 500, y: 1000 },
      { x: 300, y: 900 },
      { x: 200, y: 600 },
      { x: 300, y: 300 },
      { x: 500, y: 200 },
      { x: 800, y: 300 },
      { x: 1100, y: 200 },
      { x: 1300, y: 300 },
    ],
  },
  {
    id: 'snake_drift',
    name: '灵蛇漂移',
    width: 240,
    laps: 2,
    waypoints: [
      { x: 200, y: 200 },
      { x: 600, y: 200 },
      { x: 800, y: 450 },
      { x: 1000, y: 450 },
      { x: 1300, y: 200 },
      { x: 1400, y: 600 },
      { x: 1300, y: 1000 },
      { x: 900, y: 1000 },
      { x: 700, y: 750 },
      { x: 500, y: 750 },
      { x: 300, y: 1000 },
      { x: 200, y: 600 },
    ],
  }
];

export const PHYSICS = {
  ACCELERATION: 0.15,
  BRAKE: 0.3,
  FRICTION: 0.03,
  MAX_SPEED: 9,
  STEER_SPEED: 0.025,
  CAR_SIZE: 40, // Collision radius
  GRIP: 0.15,
  DRIFT_GRIP: 0.03,
};

export const AI_CONFIG = {
  1: { maxSpeed: 4.5, steerAccuracy: 0.1, lookAhead: 100 }, // Easy
  2: { maxSpeed: 6.0, steerAccuracy: 0.05, lookAhead: 150 }, // Medium
  3: { maxSpeed: 7.5, steerAccuracy: 0.02, lookAhead: 200 }, // Hard
  4: { maxSpeed: 9.0, steerAccuracy: 0.01, lookAhead: 250 }, // Expert
};

export const BASIC_COLORS = ['#00f2ff', '#ff00ea', '#f4ff40', '#00ff00', '#ff2222'];

export const VEHICLES_DB = [
  { id: 'car_basic', name: '新星-V1', type: 'standard', price: 0, baseSpeed: 9.0, baseGrip: 0.15, baseLaunch: 2.0, baseDriftSpeed: 6.0, baseAcceleration: 0.15 },
  { id: 'car_speed', name: '极速先锋', type: 'f1', price: 800, baseSpeed: 10.5, baseGrip: 0.13, baseLaunch: 2.5, baseDriftSpeed: 5.5, baseAcceleration: 0.18 },
  { id: 'car_drift', name: '漂移幽灵', type: 'muscle', price: 1000, baseSpeed: 9.5, baseGrip: 0.18, baseLaunch: 1.8, baseDriftSpeed: 8.0, baseAcceleration: 0.14 },
  { id: 'car_tank', name: '重装铠甲', type: 'tank', price: 1200, baseSpeed: 8.5, baseGrip: 0.22, baseLaunch: 3.5, baseDriftSpeed: 5.0, baseAcceleration: 0.12 }
];

export const ITEMS_DB = [
  { id: 'eng_v1', name: 'V1 涡轮增压', type: 'engine' as const, price: 300, boostValue: 0.8, speedBoost: 0.8 },
  { id: 'eng_v2', name: 'V2 离子引擎', type: 'engine' as const, price: 700, boostValue: 1.5, speedBoost: 1.5 },
  { id: 'eng_v3', name: 'V3 反物质引擎', type: 'engine' as const, price: 1500, boostValue: 2.5, speedBoost: 2.5 },
  { id: 'tire_v1', name: '竞赛级热熔胎', type: 'tires' as const, price: 300, boostValue: 0.02, gripBoost: 0.02 },
  { id: 'tire_v2', name: '磁悬浮稳定器', type: 'tires' as const, price: 700, boostValue: 0.04, gripBoost: 0.04 },
  { id: 'tire_v3', name: '量子锚定装置', type: 'tires' as const, price: 1500, boostValue: 0.07, gripBoost: 0.07 },
  { id: 'launch_1', name: '重弹射起步模块', type: 'launch' as const, price: 400, boostValue: 0, launchBoost: 1.0 },
  { id: 'launch_2', name: '超导推进器', type: 'launch' as const, price: 800, boostValue: 0, launchBoost: 2.0 },
  { id: 'launch_3', name: '空间瞬移引力器', type: 'launch' as const, price: 1600, boostValue: 0, launchBoost: 3.5 },
  { id: 'drift_1', name: '基础氮气漂移', type: 'drift' as const, price: 400, boostValue: 0, driftSpeedBoost: 1.0 },
  { id: 'drift_2', name: '矢量动力平衡翼', type: 'drift' as const, price: 800, boostValue: 0, driftSpeedBoost: 2.0 },
  { id: 'drift_3', name: '强子对撞侧滑装置', type: 'drift' as const, price: 1600, boostValue: 0, driftSpeedBoost: 3.5 },
  { id: 'accel_1', name: '动能回收装置', type: 'acceleration' as const, price: 400, boostValue: 0, accelerationBoost: 0.05 },
  { id: 'accel_2', name: '微型核聚变核心', type: 'acceleration' as const, price: 800, boostValue: 0, accelerationBoost: 0.1 },
  { id: 'accel_3', name: '反重力加速器', type: 'acceleration' as const, price: 1600, boostValue: 0, accelerationBoost: 0.2 }
];

export const LIVERIES_DB = [
  { id: 'liv_silver', name: '液态白银', price: 400, isGradient: true, colors: ['#ffffff', '#888888'] },
  { id: 'liv_gold', name: '尊贵土豪金', price: 800, isGradient: true, colors: ['#ffdf00', '#d4af37'] },
  { id: 'liv_magma', name: '地狱岩浆', price: 1000, isGradient: true, colors: ['#ff0000', '#ff8800', '#ffff00'] },
  { id: 'liv_prism', name: '全息折射', price: 1500, isGradient: true, colors: ['#ff0000', '#00ff00', '#0000ff', '#ff00ff'] },
  { id: 'liv_galaxy', name: '深邃星空', price: 2000, isGradient: true, colors: ['#0b0033', '#4b0082', '#000000'] }
];
