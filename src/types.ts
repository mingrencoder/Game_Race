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
}

export type GameMode = 'SINGLE' | 'DOUBLE';

export type GameSettings = {
  mode: GameMode;
  aiCount: number;
  aiDifficulty: AIDifficulty;
  trackId: string;
};

export type CarState = {
  id: string;
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
};
