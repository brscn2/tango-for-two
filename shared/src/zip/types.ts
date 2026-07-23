import type { Difficulty } from '../types';

export type { Difficulty };

export type ZipSize = 6 | 7 | 8;

export const ZIP_SIZES: ZipSize[] = [6, 7, 8];

export interface ZipCoord {
  r: number;
  c: number;
}

export interface ZipWaypoint {
  n: number; // 1..K in visit order
  r: number;
  c: number;
}

/** Orthogonal wall between two adjacent cells; store with canonical order (r1,c1) < (r2,c2) lexicographically. */
export interface ZipWall {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

export interface ZipPuzzle {
  id: string;
  size: ZipSize;
  waypoints: ZipWaypoint[];
  walls: ZipWall[];
  difficulty: Difficulty;
}

/** Full generated artifact (solution kept server-side later). */
export interface ZipGenerated {
  puzzle: ZipPuzzle;
  solutionPath: ZipCoord[];
}
