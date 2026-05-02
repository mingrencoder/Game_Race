import { Track, Point } from './types';

const RAW_TRACKS: Track[] = [
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
  },
  {
    id: 'crossover_bridge',
    name: '极速外环',
    width: 140,
    laps: 2,
    waypoints: [
      { x: 200, y: 600 },
      { x: 300, y: 200 },
      { x: 1300, y: 200 },
      { x: 1400, y: 600 },
      { x: 1300, y: 1000 },
      { x: 300, y: 1000 },
    ],
  },
  {
    id: 'neon_labyrinth',
    name: '霓虹回廊',
    width: 140,
    laps: 2,
    waypoints: [
      { x: 200, y: 200 },
      { x: 1400, y: 200 },
      { x: 1400, y: 500 },
      { x: 400, y: 500 },
      { x: 400, y: 800 },
      { x: 1400, y: 800 },
      { x: 1400, y: 1050 },
      { x: 200, y: 1050 },
    ]
  },
  {
    id: 'star_breaker',
    name: '尖角峡谷',
    width: 150,
    laps: 3,
    waypoints: [
      { x: 800, y: 150 },
      { x: 1100, y: 400 },
      { x: 1450, y: 300 },
      { x: 1200, y: 700 },
      { x: 1400, y: 1050 },
      { x: 800, y: 800 },
      { x: 200, y: 1050 },
      { x: 400, y: 700 },
      { x: 150, y: 300 },
      { x: 500, y: 400 }
    ]
  },
  {
    id: 'vortex',
    name: '深渊U谷',
    width: 140,
    laps: 2,
    waypoints: [
      { x: 200, y: 200 },
      { x: 1400, y: 200 },
      { x: 1400, y: 1000 },
      { x: 1000, y: 1000 },
      { x: 1000, y: 600 },
      { x: 600, y: 600 },
      { x: 600, y: 1000 },
      { x: 200, y: 1000 },
    ]
  },
  {
    id: 'butterfly',
    name: '云端双翼',
    width: 140,
    laps: 2,
    waypoints: [
      { x: 800, y: 400 },
      { x: 1300, y: 200 },
      { x: 1400, y: 600 },
      { x: 1300, y: 1000 },
      { x: 800, y: 800 }, 
      { x: 300, y: 1000 },
      { x: 200, y: 600 },
      { x: 300, y: 200 },
    ]
  },
  {
    id: 'zenith_loop',
    name: '天顶之环',
    width: 150,
    laps: 3,
    waypoints: [
      { x: 800, y: 1050 },
      { x: 1400, y: 600 },
      { x: 1100, y: 200 },
      { x: 800, y: 500 }, 
      { x: 500, y: 200 },
      { x: 200, y: 600 },
    ]
  }
];

const bevelCorners = (waypoints: Point[]): Point[] => {
  const newPts: Point[] = [];
  for (let i = 0; i < waypoints.length; i++) {
    // Preserve start/finish line exactly to avoid breaking the grid spawning logic
    // The starting grid needs a long straight segment
    if (i === 0) {
       newPts.push(waypoints[0]);
       continue;
    }

    const p0 = waypoints[(i - 1 + waypoints.length) % waypoints.length];
    const p1 = waypoints[i];
    const p2 = waypoints[(i + 1) % waypoints.length];

    const d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    const cut1 = Math.min(60, d1 * 0.25);
    const cut2 = Math.min(60, d2 * 0.25);

    const q1 = {
      x: p1.x + (p0.x - p1.x) * (cut1 / d1),
      y: p1.y + (p0.y - p1.y) * (cut1 / d1)
    };
    const q2 = {
      x: p1.x + (p2.x - p1.x) * (cut2 / d2),
      y: p1.y + (p2.y - p1.y) * (cut2 / d2)
    };

    newPts.push(q1);
    newPts.push(q2);
  }
  return newPts;
};

export const TRACKS: Track[] = RAW_TRACKS.map(t => {
  if (t.id === 'star_breaker' || t.id === 'crossover_bridge' || t.id === 'neon_labyrinth') {
    return { ...t, waypoints: bevelCorners(t.waypoints) };
  }
  return t;
});

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
  1: { maxSpeed: 5.0, steerAccuracy: 0.1, lookAhead: 120 }, // Easy
  2: { maxSpeed: 7.0, steerAccuracy: 0.05, lookAhead: 160 }, // Medium
  3: { maxSpeed: 9.0, steerAccuracy: 0.02, lookAhead: 220 }, // Hard
  4: { maxSpeed: 11.5, steerAccuracy: 0.01, lookAhead: 260 }, // Expert
  5: { maxSpeed: 13.5, steerAccuracy: 0.005, lookAhead: 300 }, // Elite
};

export const AI_NAMES = ['影风', '雷霆', '闪电', '狂飙', '夜煞', '暗影', '破空', '逐风', '极光', '魅影', '战神', '飞火', '龙卷', '星火', '陨石', '白虎', '青龙', '朱雀', '玄武'];

export const BASIC_COLORS = ['#00f2ff', '#ff00ea', '#f4ff40', '#00ff00', '#ff2222'];

export const VEHICLES_DB = [
  { id: 'car_basic', name: '新星-V1', type: 'standard', price: 0, baseSpeed: 9.0, baseGrip: 0.15, baseLaunch: 2.0, baseDriftSpeed: 6.0, baseAcceleration: 0.15 },
  { id: 'car_speed', name: '极速先锋', type: 'f1', price: 800, baseSpeed: 10.5, baseGrip: 0.13, baseLaunch: 2.5, baseDriftSpeed: 5.5, baseAcceleration: 0.18 },
  { id: 'car_drift', name: '漂移幽灵', type: 'muscle', price: 1000, baseSpeed: 9.5, baseGrip: 0.18, baseLaunch: 1.8, baseDriftSpeed: 8.0, baseAcceleration: 0.14 },
  { id: 'car_tank', name: '重装铠甲', type: 'tank', price: 1200, baseSpeed: 8.5, baseGrip: 0.22, baseLaunch: 3.5, baseDriftSpeed: 5.0, baseAcceleration: 0.12 },
  { id: 'car_ninja', name: '暗影忍者', type: 'ninja', price: 1500, baseSpeed: 11.0, baseGrip: 0.12, baseLaunch: 2.8, baseDriftSpeed: 6.5, baseAcceleration: 0.20 },
  { id: 'car_cyber', name: '赛博狂潮', type: 'cyber', price: 2000, baseSpeed: 10.0, baseGrip: 0.17, baseLaunch: 2.2, baseDriftSpeed: 9.5, baseAcceleration: 0.16 },
  { id: 'car_boss', name: '机械领主', type: 'boss', price: 3000, baseSpeed: 11.5, baseGrip: 0.25, baseLaunch: 4.0, baseDriftSpeed: 7.0, baseAcceleration: 0.19 },
  { id: 'car_legend', name: '不朽传说', type: 'legend', price: 5000, baseSpeed: 13.0, baseGrip: 0.20, baseLaunch: 3.0, baseDriftSpeed: 8.5, baseAcceleration: 0.22 }
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

export type LiveryTier = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';

export const LIVERIES_DB: { id: string, name: string, price: number, isGradient: boolean, colors: string[], tier: LiveryTier }[] = [
  { id: 'liv_silver', name: '液态白银', price: 400, isGradient: true, colors: ['#ffffff', '#888888'], tier: 'INTERMEDIATE' },
  { id: 'liv_gold', name: '尊贵土豪金', price: 800, isGradient: true, colors: ['#ffdf00', '#d4af37'], tier: 'INTERMEDIATE' },
  { id: 'liv_orange', name: '风暴赛道橙', price: 600, isGradient: false, colors: ['#ff4500'], tier: 'INTERMEDIATE' },
  { id: 'liv_magma', name: '地狱岩浆', price: 1000, isGradient: true, colors: ['#ff0000', '#ff8800', '#ffff00'], tier: 'ADVANCED' },
  { id: 'liv_neon_pink', name: '荧光霓虹粉', price: 1200, isGradient: false, colors: ['#ff00ff'], tier: 'ADVANCED' },
  { id: 'liv_cyan_pulse', name: '赛博脉冲蓝', price: 1200, isGradient: false, colors: ['#00ffff'], tier: 'ADVANCED' },
  { id: 'liv_toxic_green', name: '生化辐射绿', price: 1200, isGradient: false, colors: ['#ccff00'], tier: 'ADVANCED' },
  { id: 'liv_prism', name: '全息折射', price: 1500, isGradient: true, colors: ['#ff0000', '#00ff00', '#0000ff', '#ff00ff'], tier: 'ELITE' },
  { id: 'liv_flare_red', name: '烈焰猩红', price: 1800, isGradient: false, colors: ['#ff0033'], tier: 'ELITE' },
  { id: 'liv_royal_purple', name: '皇家暗紫', price: 1800, isGradient: false, colors: ['#bf00ff'], tier: 'ELITE' },
  { id: 'liv_neon_yellow', name: '炫彩电光黄', price: 1800, isGradient: false, colors: ['#ffff00'], tier: 'ELITE' },
  { id: 'liv_galaxy', name: '深邃星空', price: 2000, isGradient: true, colors: ['#0b0033', '#4b0082', '#000000'], tier: 'ELITE' }
];
