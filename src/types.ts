export interface CountryData {
  id: string; // ISO 3166-1 alpha-2 (lowercase)
  name: string;
  emoji: string;
  continent: 'Asia' | 'Europe' | 'Africa' | 'Americas' | 'Oceania';
}

export interface FlagBall {
  id: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number; // circular radius for both physics and visuals
  mass: number;
  restitution: number;
  angle: number;
  angularVelocity: number;
  eliminated: boolean;
  eliminationRank?: number;
  eliminationTime?: number;
}

export interface EliminationRecord {
  countryId: string;
  countryName: string;
  emoji: string;
  rank: number; // e.g. 50 = first eliminated, 2 = runner-up
  eliminatedAt: number; // game time in seconds
  exitSide: 'left' | 'right';
}

export interface ChampionRecord {
  battleNumber: number;
  countryId: string;
  countryName: string;
  emoji: string;
  durationSeconds: number;
  totalParticipants: number;
  timestamp: number;
}

export type GameSpeed = 0.5 | 1.0 | 2.0 | 3.5;

export interface ArenaConfig {
  centerX: number;
  centerY: number;
  radius: number;
  leftOpeningAngle: number; // Math.PI
  rightOpeningAngle: number; // 0
  openingHalfAngle: number; // radians half-width
  wallThickness: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
  shape?: 'circle' | 'rect';
}
