import { Track, Point } from './types';

export const TRACKS: Track[] = [
  {
    id: 'oval',
    name: 'Oval Circuit',
    width: 160,
    laps: 3,
    waypoints: [
      { x: 300, y: 160 },
      { x: 1300, y: 160 },
      { x: 1440, y: 300 },
      { x: 1440, y: 900 },
      { x: 1300, y: 1040 },
      { x: 300, y: 1040 },
      { x: 160, y: 900 },
      { x: 160, y: 300 },
    ],
  },
  {
    id: 'figure8',
    name: 'Figure Eight',
    width: 120,
    laps: 2,
    waypoints: [
      { x: 800, y: 600 },
      { x: 1300, y: 160 },
      { x: 1440, y: 300 },
      { x: 1440, y: 900 },
      { x: 1300, y: 1040 },
      { x: 800, y: 600 },
      { x: 300, y: 1040 },
      { x: 160, y: 900 },
      { x: 160, y: 300 },
      { x: 300, y: 160 },
    ],
  },
  {
    id: 'technical',
    name: 'Technical Maze',
    width: 100,
    laps: 2,
    waypoints: [
      { x: 160, y: 160 },
      { x: 800, y: 160 },
      { x: 800, y: 500 },
      { x: 400, y: 500 },
      { x: 400, y: 800 },
      { x: 1100, y: 800 },
      { x: 1100, y: 160 },
      { x: 1440, y: 160 },
      { x: 1440, y: 1040 },
      { x: 160, y: 1040 },
    ],
  },
  {
    id: 'speed',
    name: 'Speed Circuit',
    width: 140,
    laps: 2,
    waypoints: [
      { x: 160, y: 600 },
      { x: 500, y: 160 },
      { x: 1100, y: 160 },
      { x: 1440, y: 600 },
      { x: 1100, y: 1040 },
      { x: 500, y: 1040 },
    ],
  },
  {
    id: 'serpent',
    name: 'Serpent Pass',
    width: 110,
    laps: 2,
    waypoints: [
      { x: 200, y: 200 },
      { x: 1400, y: 200 },
      { x: 1400, y: 450 },
      { x: 400, y: 450 },
      { x: 400, y: 750 },
      { x: 1400, y: 750 },
      { x: 1400, y: 1000 },
      { x: 200, y: 1000 },
    ],
  },
  {
    id: 'grandprix',
    name: 'Neon Grand Prix',
    width: 130,
    laps: 3,
    waypoints: [
      { x: 200, y: 1000 },
      { x: 200, y: 200 },
      { x: 600, y: 200 },
      { x: 600, y: 600 },
      { x: 1000, y: 600 },
      { x: 1000, y: 200 },
      { x: 1400, y: 200 },
      { x: 1400, y: 1000 },
      { x: 1000, y: 1000 },
      { x: 1000, y: 800 },
      { x: 600, y: 800 },
      { x: 600, y: 1000 },
    ],
  }
];

export const PHYSICS = {
  ACCELERATION: 0.15,
  BRAKE: 0.3,
  FRICTION: 0.03,
  MAX_SPEED: 9,
  STEER_SPEED: 0.04,
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
  { id: 'car_basic', name: '新星-V1', type: 'standard', price: 0, baseSpeed: 9.0, baseGrip: 0.15 },
  { id: 'car_speed', name: '极速先锋', type: 'f1', price: 800, baseSpeed: 10.5, baseGrip: 0.13 },
  { id: 'car_drift', name: '漂移幽灵', type: 'muscle', price: 1000, baseSpeed: 9.5, baseGrip: 0.18 },
  { id: 'car_tank', name: '重装铠甲', type: 'tank', price: 1200, baseSpeed: 8.5, baseGrip: 0.22 }
];

export const ITEMS_DB = [
  { id: 'eng_v1', name: 'V1 涡轮增压', type: 'engine', price: 300, boostValue: 0.8 },
  { id: 'eng_v2', name: 'V2 离子引擎', type: 'engine', price: 700, boostValue: 1.5 },
  { id: 'eng_v3', name: 'V3 反物质引擎', type: 'engine', price: 1500, boostValue: 2.5 },
  { id: 'tire_v1', name: '竞赛级热熔胎', type: 'tires', price: 300, boostValue: 0.02 },
  { id: 'tire_v2', name: '磁悬浮稳定器', type: 'tires', price: 700, boostValue: 0.04 },
  { id: 'tire_v3', name: '量子锚定装置', type: 'tires', price: 1500, boostValue: 0.07 }
];

export const LIVERIES_DB = [
  { id: 'liv_silver', name: '液态白银', price: 400, isGradient: true, colors: ['#ffffff', '#888888'] },
  { id: 'liv_gold', name: '尊贵土豪金', price: 800, isGradient: true, colors: ['#ffdf00', '#d4af37'] },
  { id: 'liv_magma', name: '地狱岩浆', price: 1000, isGradient: true, colors: ['#ff0000', '#ff8800', '#ffff00'] },
  { id: 'liv_prism', name: '全息折射', price: 1500, isGradient: true, colors: ['#ff0000', '#00ff00', '#0000ff', '#ff00ff'] },
  { id: 'liv_galaxy', name: '深邃星空', price: 2000, isGradient: true, colors: ['#0b0033', '#4b0082', '#000000'] }
];
