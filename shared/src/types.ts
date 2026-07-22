export type BoardSize = 4 | 6 | 8 | 10;
export const BOARD_SIZES: BoardSize[] = [4, 6, 8, 10];

/** Classic LinkedIn defaults (kept for call-site convenience). */
export const SIZE: BoardSize = 6;
export const HALF = 3;

export function half(size: number): number {
  return size / 2;
}

export function isBoardSize(n: number): n is BoardSize {
  return n === 4 || n === 6 || n === 8 || n === 10;
}

export type Sym = 'bee' | 'flower';
export type Cell = Sym | null;
export type Grid = Cell[][];
export type Coord = [number, number];
export type ConstraintKind = '=' | 'x';

export interface EdgeConstraint {
  a: Coord;
  b: Coord;
  kind: ConstraintKind;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Puzzle {
  id: string;
  size: BoardSize;
  clues: Grid;
  constraints: EdgeConstraint[];
  difficulty: Difficulty;
}
