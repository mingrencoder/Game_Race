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

export const COLORS = {
  PLAYER1: '#00f2ff', // cyan
  PLAYER2: '#ff00ea', // magenta
  AI1: '#f4ff40', // yellow
  AI2: '#ffffff', // white
};
