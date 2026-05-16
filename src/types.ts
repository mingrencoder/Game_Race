/** 二维坐标点 */
export type Point = { x: number; y: number };

/** 赛道定义 */
export type Track = {
  id: string;
  name: string;
  waypoints: Point[]; // 导航点路径
  width: number;      // 赛道宽度
  laps: number;       // 默认圈数
};

/** AI 难度等级 */
export enum AIDifficulty {
  EASY = 1,
  MEDIUM = 2,
  HARD = 3,
  EXPERT = 4,
  ELITE = 5,
}

/** 游戏模式 */
export type GameMode = 'SINGLE' | 'ONLINE' | 'TEAM';

/** 在线对战玩家状态 */
export type OnlinePlayer = {
  id: string; // Socket ID 或是 'ai...'
  name: string;
  isHost: boolean; // 是否是房主
  isReady: boolean; // 准备状态
  isAI: boolean;
  vehicleId: string;
  liveryId: string;
  engineId?: string;
  tiresId?: string;
  launchId?: string;
  driftId?: string;
  accelerationId?: string;
  aiDifficulty?: number;
  team?: 'RED' | 'BLUE';
  style?: string; // AI 配置风格
  score?: number; // 当前房间内的总积分
  lastFinishTime?: number; // 上一场比赛的完赛时间
};

/** 联机房间状态 */
export type RoomState = {
  roomId: string;
  hostId: string;
  players: OnlinePlayer[];
  status: 'LOBBY' | 'PLAYING';
  password?: string; // 真实的房主密码，其他人为空
  hasPassword?: boolean; // 告知所有人该房间是否有密码
  settings: {
    trackId: string;
    aiDifficulty: number; // 房主添加的 AI 的难度
    isTeamMode: boolean; // 是否是组队模式
    laps: number; // 比赛圈数
    passwordEnabled?: boolean;
    password?: string;
    roomName?: string;
  };
};

/** 单圈记录 / 完赛记录 */
export type LapRecord = {
  playerName: string;
  time: number; // 比赛总耗时
  vehicle: string;
  isTeam?: boolean;
  timestamp?: number;
};

/** AI 行为偏好风格 */
export type AIStyle = 'OPTIMAL' | 'AGGRESSIVE' | 'CAUTIOUS' | 'DRIFTER';

/** 组队模式名单队伍成员配置 */
export type TeamSetup = {
  id: string; // 'ai1', 'ai2'等
  name: string;
  vehicleId: string;
  engineId: string | null;
  tiresId: string | null;
  liveryId: string | null;
  style: AIStyle;
  team: 'RED' | 'BLUE';
};

/** 对局/房间设定 */
export type GameSettings = {
  mode: GameMode;
  aiCount: number; // AI数量
  aiDifficulty: AIDifficulty;
  trackId: string;
  teamRoster: TeamSetup[]; // 用于 TEAM 团队模式的名单
  laps: number;
  teamSize: 2 | 3;
  isCupMode?: boolean; // 是否是杯赛模式
  cupNumTracks?: number; // 杯赛包含的赛道数
  isTeamMode?: boolean; // 联机/单机是否开启组队
};

/** 车型品阶 */
export type VehicleTier = 'T0' | 'T1' | 'T2' | 'T3';

/** 车辆基础数据 */
export type Vehicle = {
  id: string;
  name: string;
  type: string;
  tier: VehicleTier;
  price: number;
  rent?: number;
  maintenanceFee: number;
  baseSpeed: number;        // 基础最高极速
  baseGrip: number;         // 基础抓地力（转向能力）
  baseLaunch: number;       // 基础起步加速
  baseDriftSpeed: number;   // 基础漂移速度保持
  baseAcceleration: number; // 基础加速能力
};

/** 升级零件/改装道具 */
export type Item = {
  id: string;
  name: string;
  type: 'engine' | 'tires' | 'launch' | 'drift' | 'acceleration' | 'special';
  price: number;
  speedBoost?: number;
  gripBoost?: number;
  launchBoost?: number;
  driftSpeedBoost?: number;
  accelerationBoost?: number;
  boostValue: number; // 保留为了兼容旧版本
  description?: string;
};

/** 车辆涂装/喷漆 */
export type Livery = {
  id: string;
  name: string;
  price: number;
  isGradient: boolean; // 是否是渐变喷漆
  colors: string[];
};

/** 玩家车库内车辆的物理状态 */
export interface GarageCar {
  carId: string;
  level: number; // 强化等级
  durability: number; // 耐久度 0-100
  isPermanent: boolean; // 是否是永久购买
  expireAt: number | null; // 租赁过期时间戳 MS
  equippedParts: { // 已装备的部件
    engine: string | null;
    tires: string | null;
    launch: string | null;
    drift: string | null;
    acceleration: string | null;
  };
  equippedPaint: string | null;
}

/** 核心持久化玩家数据结构 (SSOT) */
export interface PlayerData {
  profile: {
    uid: string;
    nickname: string;
    role: 'player' | 'admin';
    status: 'active' | 'banned';
    banReason: string;
    registerTime: number;
    activeCarId: string; // 当前出战使用的车辆的ID
  };
  wallet: {
    coins: number; // 通货：金币/代币
  };
  garage: GarageCar[]; // 个人车库
  inventory: {
    materials: {
      core_primary: number; // 初级强化石
      core_advanced: number; // 高级强化石
      core_legendary: number; // 传说强化石
    };
    protectors: {
      card_silver: number; // 防爆券
      card_gold: number; // 幸运符
    };
    specialItems: {
      rename_card: number; // 改名卡
    };
    parts: Record<string, number>; // 背包中的改装部件
    paints: string[]; // 已解锁的涂装
  };
}

/** 游戏中单辆车在当前帧的状态信息集合 */
export type CarState = {
  id: string;
  name: string;
  isAI: boolean;
  playerIndex?: number; // TODO: 双人同屏，现在默认为不启用但保留 0 or 1
  x: number;
  y: number;
  angle: number;           // 视觉朝向角
  moveAngle: number;       // 实际物理运动角
  speed: number;           // 当前瞬时速度
  color: string;
  lap: number;             // 当前圈数
  currentWaypointIndex: number; // 巡航点进度，用于排名与 AI 导航
  finished: boolean;       // 是否完赛
  finishTime?: number;     // 完赛耗时
  dnf?: boolean;           // Did Not Finish
  stuckFrames?: number;    // 计算卡住帧数，用于赛道纠回
  reversingFrames?: number; // 倒车脱困倒计时
  team?: 'RED' | 'BLUE';   // 所属阵营
  aiStyle?: AIStyle;       // 自身的 AI 偏好
  lapStartTime: number;    // 当前圈启动时间戳
  bestLapTime: number;     // 最快圈速
  lapTimes?: number[];     // 每圈的数据
  maxSpeed: number;        // 面板实时最高极速
  grip: number;            // 面板实时抓地
  driftGrip: number;       // 面板实时漂移防滑
  launch: number;          // 面板实时起步加速
  driftSpeed: number;      // 面板实时漂移速度比率
  acceleration: number;    // 面板实时加速
  vehicleType?: string;    // 车体形状分类
  vehicleName?: string;
  liveryData?: { isGradient: boolean; colors: string[] };
  isDriftingFlag?: boolean;// 是否正在进行主动漂移
  // 以下为在线对战中的插值目标状态
  targetX?: number; 
  targetY?: number;
  targetAngle?: number;
};
