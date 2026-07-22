import type { BoardSize, Coord, Difficulty, EdgeConstraint, Grid, Puzzle, Sym } from './types';
import { half } from './types';
import { cloneGrid, emptyGrid, gridsEqual, isValidSolution } from './rules';
import { allRowVariants } from './patterns';
import { logicReaches, solveLogic } from './logicSolver';
import { countSolutions } from './solver';

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function colOk(g: Grid, rowsPlaced: number): boolean {
  const n = g.length;
  const h = half(n);
  for (let c = 0; c < n; c++) {
    let bees = 0, flowers = 0;
    for (let r = 0; r < rowsPlaced; r++) {
      if (g[r][c] === 'bee') bees++;
      else flowers++;
    }
    if (bees > h || flowers > h) return false;
    for (let r = 0; r + 2 < rowsPlaced; r++) {
      if (g[r][c] === g[r + 1][c] && g[r + 1][c] === g[r + 2][c]) return false;
    }
  }
  // unique rows among placed
  const seen = new Set<string>();
  for (let r = 0; r < rowsPlaced; r++) {
    const key = g[r].join(',');
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

function colsUnique(g: Grid): boolean {
  const n = g.length;
  const seen = new Set<string>();
  for (let c = 0; c < n; c++) {
    const key = g.map((row) => row[c]).join(',');
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}

/** Step 1: build a complete solution from row patterns. */
export function generateSolution(size: BoardSize = 6, rnd: () => number = Math.random): Grid {
  const variants = allRowVariants(size);
  const attempt = (): Grid | null => {
    const g = emptyGrid(size);
    const pool = shuffle(variants, rnd);
    const dfs = (r: number): boolean => {
      if (r === size) return colsUnique(g) && isValidSolution(g, []);
      for (const row of shuffle(pool, rnd)) {
        g[r] = row.slice() as Sym[];
        if (!colOk(g, r + 1)) continue;
        if (dfs(r + 1)) return true;
      }
      g[r] = Array(size).fill(null);
      return false;
    };
    return dfs(0) ? g : null;
  };
  for (let i = 0; i < 40; i++) {
    const sol = attempt();
    if (sol) return sol;
  }
  throw new Error(`generateSolution failed for size ${size}`);
}

function deriveConstraints(sol: Grid, density: number, rnd: () => number): EdgeConstraint[] {
  const n = sol.length;
  const edges: EdgeConstraint[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (c + 1 < n && rnd() < density) {
        edges.push({ a: [r, c], b: [r, c + 1], kind: sol[r][c] === sol[r][c + 1] ? '=' : 'x' });
      }
      if (r + 1 < n && rnd() < density) {
        edges.push({ a: [r, c], b: [r + 1, c], kind: sol[r][c] === sol[r + 1][c] ? '=' : 'x' });
      }
    }
  }
  return edges;
}

function allCoords(size: number): Coord[] {
  const cells: Coord[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push([r, c]);
  return cells;
}

/** Modifier density by size + difficulty (Step 2). */
function modifierDensity(size: BoardSize, difficulty: Difficulty): number {
  const base: Record<BoardSize, number> = { 4: 0.22, 6: 0.28, 8: 0.32, 10: 0.36 };
  const mult: Record<Difficulty, number> = { easy: 1.15, medium: 1.0, hard: 0.85 };
  return base[size] * mult[difficulty];
}

/** Score bands per size (Step 4). */
function inBand(size: BoardSize, difficulty: Difficulty, score: number): boolean {
  // Higher score ⇒ harder. Easy prefers low scores.
  const bands: Record<BoardSize, Record<Difficulty, [number, number]>> = {
    4: { easy: [0, 12], medium: [6, 30], hard: [12, 999] },
    6: { easy: [0, 15], medium: [8, 40], hard: [18, 999] },
    8: { easy: [0, 20], medium: [10, 50], hard: [22, 999] },
    10: { easy: [0, 25], medium: [12, 60], hard: [25, 999] },
  };
  const [lo, hi] = bands[size][difficulty];
  return score >= lo && score <= hi;
}

let seq = 0;

function unsolve(sol: Grid, constraints: EdgeConstraint[], difficulty: Difficulty, size: BoardSize, rnd: () => number): Grid {
  const clues = cloneGrid(sol);
  for (const [r, c] of shuffle(allCoords(size), rnd)) {
    if (clues[r][c] === null) continue;
    const saved = clues[r][c];
    clues[r][c] = null;
    const puzzle: Puzzle = { id: 't', size, clues, constraints, difficulty };
    if (logicReaches(puzzle, sol)) {
      // keep blank
    } else {
      clues[r][c] = saved;
    }
  }
  return clues;
}

/**
 * Four-step pipeline: pattern solution → truthful modifiers → logic unsolve → score.
 */
export function generatePuzzle(
  size: BoardSize,
  difficulty: Difficulty,
  rnd: () => number = Math.random,
): Puzzle {
  let best: Puzzle | null = null;
  let bestDist = Infinity;

  for (let attempt = 0; attempt < 24; attempt++) {
    const sol = generateSolution(size, rnd);
    const constraints = deriveConstraints(sol, modifierDensity(size, difficulty), rnd);
    const clues = unsolve(sol, constraints, difficulty, size, rnd);
    const puzzle: Puzzle = {
      id: `p${Date.now()}-${seq++}`,
      size,
      clues,
      constraints,
      difficulty,
    };

    if (!logicReaches(puzzle, sol)) continue;
    if (countSolutions(puzzle, 2) !== 1) continue;

    const { score, grid, complete } = solveLogic(puzzle);
    if (!complete || !gridsEqual(grid, sol)) continue;

    if (inBand(size, difficulty, score)) return puzzle;

    // Track closest band miss
    const bands: Record<Difficulty, [number, number]> = {
      easy: [0, 15], medium: [8, 40], hard: [18, 999],
    };
    const [lo, hi] = bands[difficulty];
    const dist = score < lo ? lo - score : score > hi ? score - hi : 0;
    if (dist < bestDist) {
      bestDist = dist;
      best = puzzle;
    }
  }

  if (best) return best;

  // Last resort: full clues (still fair / unique)
  const sol = generateSolution(size, rnd);
  const constraints = deriveConstraints(sol, modifierDensity(size, difficulty), rnd);
  return {
    id: `p${Date.now()}-${seq++}`,
    size,
    clues: cloneGrid(sol),
    constraints,
    difficulty,
  };
}
