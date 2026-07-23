import { canonicalizeWall, cellKey, orthogonalNeighbors, wallKey } from './path';
import { isValidZipSolution } from './rules';
import { countZipSolutionsBounded } from './solver';
import type {
  Difficulty,
  ZipCoord,
  ZipGenerated,
  ZipSize,
  ZipWall,
  ZipWaypoint,
} from './types';

const BANDS: Record<ZipSize, Record<Difficulty, { k: number; wallFrac: number }>> = {
  6: { easy: { k: 4, wallFrac: 0.08 }, medium: { k: 7, wallFrac: 0.14 }, hard: { k: 11, wallFrac: 0.22 } },
  7: { easy: { k: 5, wallFrac: 0.08 }, medium: { k: 8, wallFrac: 0.14 }, hard: { k: 13, wallFrac: 0.22 } },
  8: { easy: { k: 6, wallFrac: 0.08 }, medium: { k: 10, wallFrac: 0.14 }, hard: { k: 15, wallFrac: 0.22 } },
};

const UNIQUENESS_NODE_BUDGET = 8_000;

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** DFS Hamiltonian path with random neighbor order + Warnsdorff degree heuristic. */
export function generateHamiltonPath(size: ZipSize, rnd: () => number): ZipCoord[] {
  const target = size * size;
  const visited = new Set<string>();
  const path: ZipCoord[] = [];

  function degree(cell: ZipCoord): number {
    return orthogonalNeighbors(cell.r, cell.c, size).filter((n) => !visited.has(cellKey(n))).length;
  }

  function dfs(cell: ZipCoord): boolean {
    visited.add(cellKey(cell));
    path.push(cell);
    if (path.length === target) return true;
    const neighbors = shuffle(orthogonalNeighbors(cell.r, cell.c, size), rnd)
      .filter((n) => !visited.has(cellKey(n)))
      .sort((a, b) => degree(a) - degree(b));
    for (const n of neighbors) {
      if (dfs(n)) return true;
    }
    path.pop();
    visited.delete(cellKey(cell));
    return false;
  }

  for (let attempt = 0; attempt < 40; attempt++) {
    visited.clear();
    path.length = 0;
    const s = { r: Math.floor(rnd() * size), c: Math.floor(rnd() * size) };
    if (dfs(s)) return path.map((p) => ({ ...p }));
  }
  throw new Error(`failed to find Hamiltonian path on ${size}x${size}`);
}

function pickWaypoints(path: ZipCoord[], k: number): ZipWaypoint[] {
  const n = path.length;
  const indices = [0];
  for (let i = 1; i < k - 1; i++) {
    indices.push(Math.round((i * (n - 1)) / (k - 1)));
  }
  indices.push(n - 1);
  const uniq = [...new Set(indices)].sort((a, b) => a - b);
  while (uniq.length < k) {
    let best = -1;
    let bestGap = -1;
    for (let i = 0; i < uniq.length - 1; i++) {
      const gap = uniq[i + 1] - uniq[i];
      if (gap > bestGap) {
        bestGap = gap;
        best = uniq[i] + Math.floor(gap / 2);
      }
    }
    if (best < 0) break;
    uniq.push(best);
    uniq.sort((a, b) => a - b);
  }
  return uniq.slice(0, k).map((idx, i) => ({
    n: i + 1,
    r: path[idx].r,
    c: path[idx].c,
  }));
}

function nonPathEdges(path: ZipCoord[], size: number): ZipWall[] {
  const pathEdge = new Set<string>();
  for (let i = 1; i < path.length; i++) {
    pathEdge.add(wallKey({ r1: path[i - 1].r, c1: path[i - 1].c, r2: path[i].r, c2: path[i].c }));
  }
  const edges: ZipWall[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (c + 1 < size) {
        const w = canonicalizeWall({ r1: r, c1: c, r2: r, c2: c + 1 });
        if (!pathEdge.has(wallKey(w))) edges.push(w);
      }
      if (r + 1 < size) {
        const w = canonicalizeWall({ r1: r, c1: c, r2: r + 1, c2: c });
        if (!pathEdge.has(wallKey(w))) edges.push(w);
      }
    }
  }
  return edges;
}

type UniqueStatus = 'unique' | 'multi' | 'unknown';

function uniqueStatus(puzzle: {
  id: string;
  size: ZipSize;
  waypoints: ZipWaypoint[];
  walls: ZipWall[];
  difficulty: Difficulty;
}): UniqueStatus {
  const result = countZipSolutionsBounded(puzzle, 2, UNIQUENESS_NODE_BUDGET);
  if (result.aborted) return 'unknown';
  return result.count === 1 ? 'unique' : 'multi';
}

/**
 * Reverse wall pipeline: start fully walled on non-path edges, strip toward the
 * difficulty band while uniqueness stays proven. Stop stripping if a check aborts.
 */
export function generateZipPuzzle(
  size: ZipSize,
  difficulty: Difficulty,
  rnd: () => number = Math.random,
): ZipGenerated {
  const { k, wallFrac } = BANDS[size][difficulty];

  for (let attempt = 0; attempt < 16; attempt++) {
    const solutionPath = generateHamiltonPath(size, rnd);
    const waypoints = pickWaypoints(solutionPath, k);
    const candidates = nonPathEdges(solutionPath, size);
    const desired = Math.floor(candidates.length * wallFrac);

    let walls = [...candidates];
    const base = {
      id: `zip-${size}-${difficulty}-${Math.floor(rnd() * 1e9)}`,
      size,
      waypoints,
      walls,
      difficulty,
    };
    if (!isValidZipSolution(solutionPath, base)) continue;
    if (uniqueStatus(base) !== 'unique') continue;

    for (const edge of shuffle(candidates, rnd)) {
      if (walls.length <= desired) break;
      const key = wallKey(edge);
      const trial = walls.filter((w) => wallKey(w) !== key);
      const status = uniqueStatus({ ...base, walls: trial });
      if (status === 'unique') {
        walls = trial;
      } else if (status === 'unknown') {
        break;
      }
    }

    const puzzle = { ...base, walls };
    if (isValidZipSolution(solutionPath, puzzle) && uniqueStatus(puzzle) === 'unique') {
      return { puzzle, solutionPath };
    }
  }

  const solutionPath = generateHamiltonPath(size, rnd);
  const forced = solutionPath.map((p, i) => ({ n: i + 1, r: p.r, c: p.c }));
  return {
    puzzle: {
      id: `zip-${size}-${difficulty}-forced-${Math.floor(rnd() * 1e9)}`,
      size,
      waypoints: forced,
      walls: [],
      difficulty,
    },
    solutionPath,
  };
}
