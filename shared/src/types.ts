export const SIZE = 6;
export const HALF = 3;

export type Sym = 'bee' | 'flower';
export type Cell = Sym | null;
export type Grid = Cell[][]; // SIZE rows x SIZE cols
export type Coord = [number, number]; // [row, col]
export type ConstraintKind = '=' | 'x';

export interface EdgeConstraint {
  a: Coord;
  b: Coord; // must be orthogonally adjacent to a
  kind: ConstraintKind; // '=' same symbol, 'x' different symbol
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Puzzle {
  id: string;
  clues: Grid; // fixed given cells; unknown cells are null
  constraints: EdgeConstraint[];
  difficulty: Difficulty;
}
