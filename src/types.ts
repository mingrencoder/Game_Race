export type Point = { x: number; y: number };

export type Track = {
  id: string;
  name: string;
  waypoints: Point[];
  width: number;
  laps: number;
};

export enum AIDifficulty {
  EASY = 1,
  MEDIUM = 2,
  HARD = 3,
  EXPERT = 4,
  ELITE = 5,
}

export type GameMode = 'SINGLE' | 'ONLINE' | 'TEAM';

export type OnlinePlayer = {
  id: string; // socket id or 'ai...'
  name: string;
  isHost: boolean;
  isReady: boolean;
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
  style?: string; // for AI configs
  score?: number; // Total score in current room
  lastFinishTime?: number; // Finish time of the last race
};

export type RoomState = {
  roomId: string;
  hostId: string;
  players: OnlinePlayer[];
  status: 'LOBBY' | 'PLAYING';
  password?: string; // Real password for host, undefined or empty for others
  hasPassword?: boolean; // To let everyone know if password is required
  settings: {
    trackId: string;
    aiDifficulty: number; // For AI added by host
    isTeamMode: boolean;
    laps: number;
    passwordEnabled?: boolean;
    password?: string;
    roomName?: string;
  };
};


export type LapRecord = {
  playerName: string;
  time: number; // Represents total race time
  vehicle: string;
  isTeam?: boolean;
  timestamp?: number;
};

export type AIStyle = 'OPTIMAL' | 'AGGRESSIVE' | 'CAUTIOUS' | 'DRIFTER';

export type TeamSetup = {
  id: string; // ai1, ai2, ai3, etc.
  name: string;
  vehicleId: string;
  engineId: string | null;
  tiresId: string | null;
  liveryId: string | null;
  style: AIStyle;
  team: 'RED' | 'BLUE';
};

export type GameSettings = {
  mode: GameMode;
  aiCount: number;
  aiDifficulty: AIDifficulty;
  trackId: string;
  teamRoster: TeamSetup[]; // For TEAM mode
  laps: number;
  teamSize: 2 | 3;
  isCupMode?: boolean;
  cupNumTracks?: number;
  isTeamMode?: boolean;
};

export type VehicleTier = 'T0' | 'T1' | 'T2' | 'T3';

export type Vehicle = {
  id: string;
  name: string;
  type: string;
  tier: VehicleTier;
  price: number;
  rent?: number;
  maintenanceFee: number;
  baseSpeed: number;
  baseGrip: number;
  baseLaunch: number;
  baseDriftSpeed: number;
  baseAcceleration: number;
};

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
  boostValue: number; // Keep for backward compatibility temporarily
  description?: string;
};

export type Livery = {
  id: string;
  name: string;
  price: number;
  isGradient: boolean;
  colors: string[];
};

export interface GarageCar {
  carId: string;
  level: number;
  durability: number;
  isPermanent: boolean;
  expireAt: number | null;
  equippedParts: {
    engine: string | null;
    tires: string | null;
    launch: string | null;
    drift: string | null;
    acceleration: string | null;
  };
  equippedPaint: string | null;
}

export interface PlayerData {
  profile: {
    uid: string;
    nickname: string;
    role: 'player' | 'admin';
    status: 'active' | 'banned';
    banReason: string;
    registerTime: number;
    activeCarId: string;
  };
  wallet: {
    coins: number;
  };
  garage: GarageCar[];
  inventory: {
    materials: {
      core_primary: number;
      core_advanced: number;
      core_legendary: number;
    };
    protectors: {
      card_silver: number;
      card_gold: number;
    };
    specialItems: {
      rename_card: number;
    };
    parts: Record<string, number>;
    paints: string[];
  };
}

export type CarState = {
  id: string;
  name: string;
  isAI: boolean;
  playerIndex?: number; // 0 or 1
  x: number;
  y: number;
  angle: number;
  moveAngle: number;
  speed: number;
  color: string;
  lap: number;
  currentWaypointIndex: number;
  finished: boolean;
  finishTime?: number;
  dnf?: boolean;
  stuckFrames?: number;
  reversingFrames?: number;
  team?: 'RED' | 'BLUE';
  aiStyle?: AIStyle;
  lapStartTime: number;
  bestLapTime: number;
  lapTimes?: number[];
  maxSpeed: number;
  grip: number;
  driftGrip: number;
  launch: number;
  driftSpeed: number;
  acceleration: number;
  vehicleType?: string;
  vehicleName?: string;
  liveryData?: { isGradient: boolean; colors: string[] };
  isDriftingFlag?: boolean;
  // Interpolation targets for network sync
  targetX?: number;
  targetY?: number;
  targetAngle?: number;
};
