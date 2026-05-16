import { Track, Point } from './types';

/**
 * 原始赛道数据定义
 * 所有的坐标 waypoint 表示赛道分段检测点，物理引擎与 AI 将基于此数据进行运动
 */
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

/**
 * 处理赛道路线直角或锐角的算法（增加切角缓冲区域）
 * 主要是为了使一些直角赛道的过弯更加平滑自然
 */
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

/** 
 * 经过圆滑插值处理后的正式游戏赛道列表 
 */
export const TRACKS: Track[] = RAW_TRACKS.map(t => {
  if (t.id === 'star_breaker' || t.id === 'crossover_bridge' || t.id === 'neon_labyrinth') {
    return { ...t, waypoints: bevelCorners(t.waypoints) };
  }
  return t;
});

/**
 * 核心基础物理常量（服务端同步基准）
 */
export const PHYSICS = {
  ACCELERATION: 0.15,      // 基础加速度
  BRAKE: 0.3,              // 基础刹车制动
  FRICTION: 0.03,          // 自然地面摩擦阻力（无操作时的减速基础）
  MAX_SPEED: 9,            // 不考虑任何外力或改装情况下的最原始极速下限
  STEER_SPEED: 0.025,      // 基础转向角速度
  CAR_SIZE: 40,            // 每辆车的碰撞半径判定
  GRIP: 0.15,              // 抓地力补偿（防止滑动的能力）
  DRIFT_GRIP: 0.03,        // 漂移时的侧向滑移允许范围
};

/** AI 在各个难度梯度面板的基础速度等属性参数加成 */
export const AI_CONFIG = {
  1: { maxSpeed: 5.0, steerAccuracy: 0.1, lookAhead: 120 }, // Easy
  2: { maxSpeed: 7.0, steerAccuracy: 0.05, lookAhead: 160 }, // Medium
  3: { maxSpeed: 9.0, steerAccuracy: 0.02, lookAhead: 220 }, // Hard
  4: { maxSpeed: 11.5, steerAccuracy: 0.01, lookAhead: 260 }, // Expert
  5: { maxSpeed: 13.5, steerAccuracy: 0.005, lookAhead: 300 }, // Elite
};

export const AI_NAMES = ['影风', '雷霆', '闪电', '狂飙', '夜煞', '暗影', '破空', '逐风', '极光', '魅影', '战神', '飞火', '龙卷', '星火', '陨石', '白虎', '青龙', '朱雀', '玄武'];

export const AI_TIER_COLORS = {
  BASIC: ['#aaaaaa', '#888888', '#666666', '#a0522d', '#4682b4', '#556b2f', '#8fbc8f', '#bc8f8f'],
  INTERMEDIATE: ['#ff4500', '#1e90ff', '#32cd32', '#ffd700', '#ff8c00', '#da70d6'],
  ADVANCED: ['#ff0055', '#00ffcc', '#bf00ff', '#ff00ea', '#00f2ff', '#ffea00', '#ff0033'],
  ELITE: ['#ff00ff', '#00ffff', '#ffff00', '#ff00aa', '#00aa00', '#ff3300', '#ccff00', '#7fff00']
};

export const BASIC_COLORS = [
  '#ffffff', // 珍珠白
  '#b0b0b0', // 普通银灰
  '#333333', // 碳黑
  '#aa0000', // 暗红
  '#0033aa', // 深蓝
  '#226622'  // 墨绿
];

export const AI_STYLE_CONFIG: Record<string, { apexFactor: number, lookaheadBonus: number, brakingAngle: number, driftAngle: number, driftSpeedRate: number, steerGrip: number }> = {
  AGGRESSIVE: { apexFactor: 0.35, lookaheadBonus: 0.8, brakingAngle: 0.8, driftAngle: 0.7, driftSpeedRate: 0.5, steerGrip: 1.0 },
  CAUTIOUS: { apexFactor: 0.05, lookaheadBonus: 0.0, brakingAngle: 0.4, driftAngle: 1.2, driftSpeedRate: 0.8, steerGrip: 0.7 },
  DRIFTER: { apexFactor: 0.25, lookaheadBonus: 0.0, brakingAngle: 0.75, driftAngle: 0.6, driftSpeedRate: 0.45, steerGrip: 1.2 },
  OPTIMAL: { apexFactor: 0.25, lookaheadBonus: 0.4, brakingAngle: 0.65, driftAngle: 0.8, driftSpeedRate: 0.55, steerGrip: 0.8 }
};

/**
 * 共有游戏规则业务配置
 * 作为前后端 SSOT 共同依据的一些数值
 */
export const SYS_CONFIG = {
  RENTAL_DURATION_DAYS: 30,                 // 车辆租赁时长 (天)
  RENTAL_DURATION_MS: 30 * 24 * 60 * 60 * 1000, 
  PART_DEPRECIATION_RATE: 0.2,             // 卸下部件折损手续费比率
  MAX_UPGRADE_LEVEL: 5,                    // 最大可强化等级
  MAX_DURABILITY: 100,                     // 赛车最大耐久度的上限
  DURABILITY_DEBUFF_THRESHOLD: 30          // 耐久度降低性能处罚触发的阈值
};

/**
 * 游戏数值产出、门票、排位扣费等关键常量
 */
export const GAME_CONSTANTS = {
  MAX_LEADERBOARD_RECORDS: 10,
  CUP_ENTRY_FEE_PER_TRACK: 10,
  POINTS_SYSTEM: [25, 18, 15, 12, 10, 8, 6, 4],
  TEAM_RACE_POINTS: {
    2: [10, 8],
    3: [10, 8, 6],
    4: [10, 8, 6, 5],
    5: [10, 8, 6, 5, 4],
    6: [10, 8, 6, 5, 4, 3],
    7: [10, 8, 6, 5, 4, 3, 2],
    8: [10, 8, 6, 5, 4, 3, 2, 1]
  } as Record<number, number[]>,
  DEFAULT_TEAM_POINTS: [10, 8, 6, 4, 2, 1, 0, 0],
  BONUS: {
    FLAWLESS_TEAM_VICTORY: 10,
    CUP_WINNER_MULTIPLIER: 25,
    CUP_FINISH_MULTIPLIER: 15,
    CUP_P1_FIRST_PLACE: 40,
    CUP_P1_PODIUM: 15,
  },
  AI_VEHICLE_PRICE: {
    ELITE_MIN: 3000,
    EASY_MAX: 1200,
    MED_MIN: 800,
    MED_MAX: 1500,
    HARD_MIN: 1500,
    HARD_MAX: 3000,
    EXPERT_MIN: 2000,
  },
  DIFFICULTY_MULTIPLIER: {
    1: 0.8,
    2: 1.0,
    3: 1.2,
    4: 1.5,
    5: 1.8
  } as Record<number, number>
};

/** 
 * 强化与进阶系统不同层级所需的材料、消耗量、保护概率等配置 
 */
export interface UpgradeTierConfig {
  material: string;
  materialName: string;
  cost: number;
  rate: { [tier: number]: number };
  protection: string | null;
  protectionName: string | null;
  protectionCost: number;
  failDrop: number;
}

export const UPGRADE_CONFIG: Record<number, UpgradeTierConfig> = {
  0: { material: 'core_primary', materialName: '初级强化核心', cost: 1, rate: { 0: 1.0, 1: 1.0, 2: 1.0, 3: 1.0 }, protection: null, protectionName: null, protectionCost: 0, failDrop: 0 },
  1: { material: 'core_primary', materialName: '初级强化核心', cost: 3, rate: { 0: 0.8, 1: 0.8, 2: 0.7, 3: 0.6 }, protection: null, protectionName: null, protectionCost: 0, failDrop: 0 },
  2: { material: 'core_advanced', materialName: '高级强化核心', cost: 2, rate: { 0: 0.6, 1: 0.6, 2: 0.45, 3: 0.3 }, protection: null, protectionName: null, protectionCost: 0, failDrop: 0 },
  3: { material: 'core_advanced', materialName: '高级强化核心', cost: 4, rate: { 0: 0.4, 1: 0.4, 2: 0.25, 3: 0.15 }, protection: 'card_silver', protectionName: '白银保护卡', protectionCost: 1500, failDrop: 1 },
  4: { material: 'core_legendary', materialName: '传说强化核心', cost: 3, rate: { 0: 0.2, 1: 0.2, 2: 0.1, 3: 0.05 }, protection: 'card_gold', protectionName: '黄金保护卡', protectionCost: 8000, failDrop: 4 }
};
// ------------------------------------------

import { Vehicle, Item, VehicleTier } from './types';

/** 游戏车辆资料库大全 */
export const VEHICLES_DB: Vehicle[] = [
  { id: 'car_basic', name: '新星-V1', type: 'standard', tier: 'T0', price: 0, rent: 0, maintenanceFee: 0, baseSpeed: 7.0, baseGrip: 0.12, baseLaunch: 1.5, baseDriftSpeed: 5.0, baseAcceleration: 0.10 },
  { id: 'car_speed', name: '极速先锋', type: 'f1', tier: 'T1', price: 2000, rent: 600, maintenanceFee: 30, baseSpeed: 8.0, baseGrip: 0.10, baseLaunch: 2.0, baseDriftSpeed: 4.8, baseAcceleration: 0.12 },
  { id: 'car_drift', name: '漂移幽灵', type: 'muscle', tier: 'T1', price: 2500, rent: 750, maintenanceFee: 37, baseSpeed: 7.5, baseGrip: 0.15, baseLaunch: 1.6, baseDriftSpeed: 7.0, baseAcceleration: 0.11 },
  { id: 'car_tank', name: '重装铠甲', type: 'tank', tier: 'T1', price: 3000, rent: 900, maintenanceFee: 45, baseSpeed: 6.8, baseGrip: 0.18, baseLaunch: 2.8, baseDriftSpeed: 4.5, baseAcceleration: 0.09 },
  { id: 'car_ninja', name: '暗影忍者', type: 'ninja', tier: 'T2', price: 8000, rent: 2400, maintenanceFee: 120, baseSpeed: 8.8, baseGrip: 0.10, baseLaunch: 2.5, baseDriftSpeed: 6.0, baseAcceleration: 0.15 },
  { id: 'car_cyber', name: '赛博狂潮', type: 'cyber', tier: 'T2', price: 12000, rent: 3600, maintenanceFee: 180, baseSpeed: 8.2, baseGrip: 0.14, baseLaunch: 2.0, baseDriftSpeed: 8.5, baseAcceleration: 0.13 },
  { id: 'car_boss', name: '机械领主', type: 'boss', tier: 'T3', price: 80000, rent: 24000, maintenanceFee: 1200, baseSpeed: 9.8, baseGrip: 0.24, baseLaunch: 3.8, baseDriftSpeed: 6.8, baseAcceleration: 0.19 },
  { id: 'car_legend', name: '不朽传说', type: 'legend', tier: 'T3', price: 80000, rent: 24000, maintenanceFee: 1200, baseSpeed: 10.8, baseGrip: 0.19, baseLaunch: 3.0, baseDriftSpeed: 8.0, baseAcceleration: 0.22 }
];

/** 游戏零部件与技能改装配件大全 */
export const ITEMS_DB = [
  { id: 'rename_card', name: '改名卡', type: 'special' as const, price: 100000, boostValue: 0, description: '极其珍贵的权限卡，用于在个人信息界面修改一次车手昵称。' },
  { id: 'eng_v1', name: 'V1 涡轮增压', type: 'engine' as const, price: 300, boostValue: 0.2, speedBoost: 0.2 },
  { id: 'eng_v2', name: 'V2 离子引擎', type: 'engine' as const, price: 2500, boostValue: 0.5, speedBoost: 0.5 },
  { id: 'eng_v3', name: 'V3 反物质引擎', type: 'engine' as const, price: 12000, boostValue: 0.8, speedBoost: 0.8 },
  { id: 'tire_v1', name: '竞赛级热熔胎', type: 'tires' as const, price: 300, boostValue: 0.01, gripBoost: 0.01 },
  { id: 'tire_v2', name: '磁悬浮稳定器', type: 'tires' as const, price: 2500, boostValue: 0.02, gripBoost: 0.02 },
  { id: 'tire_v3', name: '量子锚定装置', type: 'tires' as const, price: 12000, boostValue: 0.03, gripBoost: 0.03 },
  { id: 'launch_1', name: '重弹射起步模块', type: 'launch' as const, price: 400, boostValue: 0, launchBoost: 0.3 },
  { id: 'launch_2', name: '超导推进器', type: 'launch' as const, price: 3000, boostValue: 0, launchBoost: 0.6 },
  { id: 'launch_3', name: '空间瞬移引力器', type: 'launch' as const, price: 15000, boostValue: 0, launchBoost: 1.0 },
  { id: 'drift_1', name: '基础氮气漂移', type: 'drift' as const, price: 400, boostValue: 0, driftSpeedBoost: 0.3 },
  { id: 'drift_2', name: '矢量动力平衡翼', type: 'drift' as const, price: 3000, boostValue: 0, driftSpeedBoost: 0.6 },
  { id: 'drift_3', name: '强子对撞侧滑装置', type: 'drift' as const, price: 15000, boostValue: 0, driftSpeedBoost: 1.0 },
  { id: 'accel_1', name: '动能回收装置', type: 'acceleration' as const, price: 500, boostValue: 0, accelerationBoost: 0.01 },
  { id: 'accel_2', name: '微型核聚变核心', type: 'acceleration' as const, price: 3500, boostValue: 0, accelerationBoost: 0.02 },
  { id: 'accel_3', name: '反重力加速器', type: 'acceleration' as const, price: 18000, boostValue: 0, accelerationBoost: 0.04 }
];

export type LiveryTier = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';

/** 游戏喷漆皮肤大全 */
export const LIVERIES_DB: { id: string, name: string, price: number, isGradient: boolean, colors: string[], tier: LiveryTier }[] = [
  // 中级 (物理材质，弱化发光)
  { id: 'liv_silver', name: '液态白银', price: 500, isGradient: true, colors: ['#a0a0a0', '#ffffff', '#666666'], tier: 'INTERMEDIATE' },
  { id: 'liv_orange', name: '风暴赛道橙', price: 500, isGradient: false, colors: ['#ff5500'], tier: 'INTERMEDIATE' },
  { id: 'liv_gold', name: '尊贵土豪金', price: 500, isGradient: true, colors: ['#b8860b', '#ffd700', '#8b6508'], tier: 'INTERMEDIATE' },
  { id: 'liv_matte_black', name: '哑光黑', price: 500, isGradient: false, colors: ['#181818'], tier: 'INTERMEDIATE' },
  // 高阶 (赛博霓虹，强化发光)
  { id: 'liv_magma', name: '地狱岩浆', price: 5000, isGradient: true, colors: ['#4a0000', '#ff0000', '#ff8800'], tier: 'ADVANCED' },
  { id: 'liv_neon_pink', name: '荧光霓虹粉', price: 5000, isGradient: false, colors: ['#ff00aa'], tier: 'ADVANCED' },
  { id: 'liv_cyan_pulse', name: '赛博脉冲蓝', price: 5000, isGradient: false, colors: ['#00e5ff'], tier: 'ADVANCED' },
  { id: 'liv_toxic_green', name: '生化辐射绿', price: 5000, isGradient: false, colors: ['#39ff14'], tier: 'ADVANCED' },
  // 典藏 (顶级幻彩，带有专属后处理)
  { id: 'liv_prism', name: '全息折射', price: 20000, isGradient: true, colors: ['#ff0055', '#00ffcc', '#bf00ff', '#f4ff40'], tier: 'ELITE' },
  { id: 'liv_flare_red', name: '烈焰猩红', price: 20000, isGradient: false, colors: ['#ff0000', '#ff5555', '#660000'], tier: 'ELITE' },
  { id: 'liv_neon_yellow', name: '炫彩电光黄', price: 20000, isGradient: false, colors: ['#ffff00', '#ffffff', '#cccc00'], tier: 'ELITE' },
  { id: 'liv_galaxy', name: '深邃星空', price: 20000, isGradient: true, colors: ['#050011', '#4b0082', '#ff00ff'], tier: 'ELITE' }
];
