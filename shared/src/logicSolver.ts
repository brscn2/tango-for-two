import type { Cell, Coord, EdgeConstraint, Grid, Puzzle, Sym } from './types';
import { half } from './types';
import { cloneGrid, gridsEqual, isComplete, opposite } from './rules';

export interface LogicSolveResult {
  grid: Grid;
  complete: boolean;
  score: number;
}

type RuleFn = (g: Grid, constraints: EdgeConstraint[]) => number;

/** Returns true only when a blank cell was newly filled. */
function trySet(g: Grid, r: number, c: number, v: Sym): boolean {
  if (g[r][c] !== null) return false;
  g[r][c] = v;
  return true;
}

/** Clue Propagation (1). */
function cluePropagation(g: Grid, constraints: EdgeConstraint[]): number {
  let filled = 0;
  for (const { a, b, kind } of constraints) {
    const va = g[a[0]][a[1]];
    const vb = g[b[0]][b[1]];
    if (va !== null && vb === null) {
      const want = kind === '=' ? va : opposite(va);
      if (trySet(g, b[0], b[1], want)) filled++;
    } else if (vb !== null && va === null) {
      const want = kind === '=' ? vb : opposite(vb);
      if (trySet(g, a[0], a[1], want)) filled++;
    }
  }
  return filled;
}

/** Almost Full (1). */
function almostFull(g: Grid, _constraints: EdgeConstraint[]): number {
  const n = g.length;
  const h = half(n);
  let filled = 0;
  const fillLine = (get: (i: number) => Cell, set: (i: number, v: Sym) => void) => {
    for (const s of ['bee', 'flower'] as Sym[]) {
      let count = 0;
      const empties: number[] = [];
      for (let i = 0; i < n; i++) {
        const v = get(i);
        if (v === s) count++;
        else if (v === null) empties.push(i);
      }
      if (count === h && empties.length > 0) {
        const other = opposite(s);
        for (const i of empties) {
          set(i, other);
          filled++;
        }
      }
    }
  };
  for (let r = 0; r < n; r++) {
    fillLine((c) => g[r][c], (c, v) => { g[r][c] = v; });
  }
  for (let c = 0; c < n; c++) {
    fillLine((r) => g[r][c], (r, v) => { g[r][c] = v; });
  }
  return filled;
}

/** Triple Prevention (1): AA_ / _AA → force opposite. */
function triplePrevention(g: Grid, _constraints: EdgeConstraint[]): number {
  const n = g.length;
  let filled = 0;
  const scan = (get: (i: number) => Cell, set: (i: number, v: Sym) => void) => {
    for (let i = 0; i + 1 < n; i++) {
      const a = get(i);
      const b = get(i + 1);
      if (a !== null && a === b) {
        if (i - 1 >= 0 && get(i - 1) === null) {
          set(i - 1, opposite(a));
          filled++;
        }
        if (i + 2 < n && get(i + 2) === null) {
          set(i + 2, opposite(a));
          filled++;
        }
      }
    }
  };
  for (let r = 0; r < n; r++) scan((c) => g[r][c], (c, v) => { g[r][c] = v; });
  for (let c = 0; c < n; c++) scan((r) => g[r][c], (r, v) => { g[r][c] = v; });
  return filled;
}

/** Gap Fill (2): A _ A → middle opposite. */
function gapFill(g: Grid, _constraints: EdgeConstraint[]): number {
  const n = g.length;
  let filled = 0;
  const scan = (get: (i: number) => Cell, set: (i: number, v: Sym) => void) => {
    for (let i = 0; i + 2 < n; i++) {
      const a = get(i);
      const mid = get(i + 1);
      const b = get(i + 2);
      if (a !== null && b === a && mid === null) {
        set(i + 1, opposite(a));
        filled++;
      }
    }
  };
  for (let r = 0; r < n; r++) scan((c) => g[r][c], (c, v) => { g[r][c] = v; });
  for (let c = 0; c < n; c++) scan((r) => g[r][c], (r, v) => { g[r][c] = v; });
  return filled;
}

/** Touching Pair (4): blank–blank with = between; or known–blank with =. */
function touchingPair(g: Grid, constraints: EdgeConstraint[]): number {
  let filled = 0;
  // Known + blank already handled by cluePropagation; focus on = forcing pair from neighbor context.
  for (const { a, b, kind } of constraints) {
    if (kind !== '=') continue;
    const va = g[a[0]][a[1]];
    const vb = g[b[0]][b[1]];
    if (va === null && vb === null) {
      // Look at cells adjacent to the pair for a forced value via almost-full / triple — skip if none.
      // If one orthogonal neighbor of either cell is known and creates a forced double, apply.
      const n = g.length;
      const neighbors = (r: number, c: number): Coord[] => {
        const out: Coord[] = [];
        if (r > 0) out.push([r - 1, c]);
        if (r + 1 < n) out.push([r + 1, c]);
        if (c > 0) out.push([r, c - 1]);
        if (c + 1 < n) out.push([r, c + 1]);
        return out;
      };
      // If both blanks sit in a line that already has h-1 of a symbol and only these two empties left in that line for that count...
      // Simpler useful case: adjacent cell outside the pair equals something that forbids one symbol for the pair.
      for (const [r, c] of [...neighbors(a[0], a[1]), ...neighbors(b[0], b[1])]) {
        if ((r === a[0] && c === a[1]) || (r === b[0] && c === b[1])) continue;
        const nv = g[r][c];
        if (nv === null) continue;
        // If (r,c) is adjacent to a and placing nv on a would make a triple with another neighbor, force opposite on the pair.
      }
    }
  }
  // Also: blank = known is cluePropagation. Extra: two blanks with = where a flanking cell forces.
  // Implement flanking: for horizontal = at (r,c)-(r,c+1), if g[r][c-1]==g[r][c+2]==S then pair must be opposite(S) (gap across pair).
  const n = g.length;
  for (const { a, b, kind } of constraints) {
    if (kind !== '=') continue;
    if (g[a[0]][a[1]] !== null || g[b[0]][b[1]] !== null) continue;
    if (a[0] === b[0]) {
      const r = a[0];
      const c0 = Math.min(a[1], b[1]);
      const c1 = Math.max(a[1], b[1]);
      if (c1 !== c0 + 1) continue;
      if (c0 - 1 >= 0 && c1 + 1 < n) {
        const left = g[r][c0 - 1];
        const right = g[r][c1 + 1];
        if (left !== null && left === right) {
          const want = opposite(left);
          trySet(g, r, c0, want);
          trySet(g, r, c1, want);
          filled += 2;
        }
      }
    } else if (a[1] === b[1]) {
      const c = a[1];
      const r0 = Math.min(a[0], b[0]);
      const r1 = Math.max(a[0], b[0]);
      if (r1 !== r0 + 1) continue;
      if (r0 - 1 >= 0 && r1 + 1 < n) {
        const up = g[r0 - 1][c];
        const down = g[r1 + 1][c];
        if (up !== null && up === down) {
          const want = opposite(up);
          trySet(g, r0, c, want);
          trySet(g, r1, c, want);
          filled += 2;
        }
      }
    }
  }
  return filled;
}

/** Edge Pair / Big Gap (6): first and last cell same → force near-edge patterns on size≥6. */
function edgePairBigGap(g: Grid, _constraints: EdgeConstraint[]): number {
  const n = g.length;
  if (n < 6) return 0;
  let filled = 0;
  const scan = (get: (i: number) => Cell, set: (i: number, v: Sym) => void) => {
    const first = get(0);
    const last = get(n - 1);
    if (first !== null && first === last) {
      // Cannot place first at index 1 (would start triple potential with more); classic: positions 1 and n-2 opposite of ends when both ends match and middles empty-ish.
      if (get(1) === null) {
        set(1, opposite(first));
        filled++;
      }
      if (get(n - 2) === null) {
        set(n - 2, opposite(first));
        filled++;
      }
    }
  };
  for (let r = 0; r < n; r++) scan((c) => g[r][c], (c, v) => { g[r][c] = v; });
  for (let c = 0; c < n; c++) scan((r) => g[r][c], (r, v) => { g[r][c] = v; });
  return filled;
}

/** Equal-Gap (7): blank = at edge of line forced by opposite end. */
function equalGap(g: Grid, constraints: EdgeConstraint[]): number {
  let filled = 0;
  const n = g.length;
  for (const { a, b, kind } of constraints) {
    if (kind !== '=') continue;
    if (g[a[0]][a[1]] !== null || g[b[0]][b[1]] !== null) continue;
    // Horizontal pair at start of row: (r,0)-(r,1) and g[r][n-1] known → sometimes force via balance.
    if (a[0] === b[0]) {
      const r = a[0];
      const c0 = Math.min(a[1], b[1]);
      const c1 = Math.max(a[1], b[1]);
      if (c0 === 0 && c1 === 1) {
        const end = g[r][n - 1];
        if (end !== null) {
          // Pair cannot be `end` if that would over-count with end patterns — use: if already h-1 of end in rest, pair is opposite.
          let count = 0;
          for (let c = 2; c < n; c++) if (g[r][c] === end) count++;
          if (count === half(n) - 0 && count >= half(n) - 1) {
            /* fall through */
          }
          if (count === half(n)) {
            // impossible; skip
          } else if (count === half(n) - 1) {
            // one more `end` allowed in pair → both can't be end, so pair is opposite(end)
            // actually pair is TWO cells; if count is h-1, at most one end in pair; with = both same so both opposite(end)
            const want = opposite(end);
            trySet(g, r, 0, want);
            trySet(g, r, 1, want);
            filled += 2;
          }
        }
      }
      if (c0 === n - 2 && c1 === n - 1) {
        const start = g[r][0];
        if (start !== null) {
          let count = 0;
          for (let c = 0; c < n - 2; c++) if (g[r][c] === start) count++;
          if (count === half(n) - 1) {
            const want = opposite(start);
            trySet(g, r, n - 2, want);
            trySet(g, r, n - 1, want);
            filled += 2;
          }
        }
      }
    }
  }
  return filled;
}

/** Opposite Inference (9): × pair both blank; line nearly full forces them. */
function oppositeInference(g: Grid, constraints: EdgeConstraint[]): number {
  const n = g.length;
  const h = half(n);
  let filled = 0;
  for (const { a, b, kind } of constraints) {
    if (kind !== 'x') continue;
    if (g[a[0]][a[1]] !== null || g[b[0]][b[1]] !== null) continue;
    if (a[0] !== b[0] && a[1] !== b[1]) continue;
    // Same row
    if (a[0] === b[0]) {
      const r = a[0];
      let bees = 0, flowers = 0, empties = 0;
      for (let c = 0; c < n; c++) {
        if (g[r][c] === 'bee') bees++;
        else if (g[r][c] === 'flower') flowers++;
        else empties++;
      }
      // Exactly two empties — the × pair — must be one of each; but which way?
      // If bees === h-1, then one of the pair is bee and one flower; still ambiguous without more.
      // If bees === h, both empties must be flowers — contradicts ×. Skip.
      // When empties === 2 and bees === h - 1 and flowers === h - 1: pair is one each; still two assignments.
      // Need a tie-break from another constraint — leave to enumeration.
      if (empties === 2 && bees === h && flowers === h - 2) {
        // both must be flowers — impossible with ×; no fill
      }
    }
  }
  // Useful case: one side of × known via other means already in cluePropagation.
  // Another: blank × blank where row has h-1 bees and only these two empties → one bee one flower still ambiguous.
  return filled;
}

/** Inverse Big Gap (9) — stub-safe: ends differ and force inner when classic pattern matches. */
function inverseBigGap(g: Grid, _constraints: EdgeConstraint[]): number {
  const n = g.length;
  if (n < 6) return 0;
  let filled = 0;
  const scan = (get: (i: number) => Cell, set: (i: number, v: Sym) => void) => {
    const first = get(0);
    const last = get(n - 1);
    if (first !== null && last !== null && first !== last) {
      // Pattern: if positions 2..n-3 mostly empty and 1 is empty, sometimes 1 = last (common binairo/tango edge).
      if (get(1) === null && get(n - 2) === null) {
        // Conservative: only if middle has no room for another `first` at edge.
        let firstCount = 1; // position 0
        for (let i = 2; i < n - 1; i++) if (get(i) === first) firstCount++;
        if (firstCount === half(n)) {
          set(1, last);
          filled++;
        }
        let lastCount = 1;
        for (let i = 1; i < n - 2; i++) if (get(i) === last) lastCount++;
        if (lastCount === half(n)) {
          set(n - 2, first);
          filled++;
        }
      }
    }
  };
  for (let r = 0; r < n; r++) scan((c) => g[r][c], (c, v) => { g[r][c] = v; });
  for (let c = 0; c < n; c++) scan((r) => g[r][c], (r, v) => { g[r][c] = v; });
  return filled;
}

function keyOf(r: number, c: number): string {
  return `${r},${c}`;
}

function parseKey(k: string): Coord {
  const [r, c] = k.split(',').map(Number);
  return [r, c];
}

/** Constraint Enumeration (10) for small linked components. */
function constraintEnumeration(g: Grid, constraints: EdgeConstraint[]): number {
  const n = g.length;
  const h = half(n);
  // Build adjacency via constraints among currently blank cells (+ include filled endpoints as anchors).
  const adj = new Map<string, { other: string; kind: '=' | 'x' }[]>();
  const add = (k: string, other: string, kind: '=' | 'x') => {
    const list = adj.get(k) ?? [];
    list.push({ other, kind });
    adj.set(k, list);
  };
  for (const { a, b, kind } of constraints) {
    const ka = keyOf(a[0], a[1]);
    const kb = keyOf(b[0], b[1]);
    add(ka, kb, kind);
    add(kb, ka, kind);
  }

  const blankKeys = [...adj.keys()].filter((k) => {
    const [r, c] = parseKey(k);
    return g[r][c] === null;
  });
  if (blankKeys.length === 0) return 0;

  const visited = new Set<string>();
  let filled = 0;

  const lineOk = (grid: Grid): boolean => {
    for (let i = 0; i < n; i++) {
      let rb = 0, rf = 0, cb = 0, cf = 0;
      for (let j = 0; j < n; j++) {
        if (grid[i][j] === 'bee') rb++;
        if (grid[i][j] === 'flower') rf++;
        if (grid[j][i] === 'bee') cb++;
        if (grid[j][i] === 'flower') cf++;
      }
      if (rb > h || rf > h || cb > h || cf > h) return false;
      for (let j = 0; j + 2 < n; j++) {
        if (grid[i][j] && grid[i][j] === grid[i][j + 1] && grid[i][j + 1] === grid[i][j + 2]) return false;
        if (grid[j][i] && grid[j][i] === grid[j + 1][i] && grid[j + 1][i] === grid[j + 2][i]) return false;
      }
    }
    for (const { a, b, kind } of constraints) {
      const va = grid[a[0]][a[1]];
      const vb = grid[b[0]][b[1]];
      if (va === null || vb === null) continue;
      const same = va === vb;
      if (kind === '=' && !same) return false;
      if (kind === 'x' && same) return false;
    }
    return true;
  };

  for (const start of blankKeys) {
    if (visited.has(start)) continue;
    const comp: string[] = [];
    const stack = [start];
    visited.add(start);
    while (stack.length) {
      const k = stack.pop()!;
      comp.push(k);
      for (const { other } of adj.get(k) ?? []) {
        const [r, c] = parseKey(other);
        if (g[r][c] !== null) continue;
        if (visited.has(other)) continue;
        visited.add(other);
        stack.push(other);
      }
    }
    if (comp.length === 0 || comp.length > 10) continue;

    const assignments: Sym[][] = [];
    const cur: Sym[] = [];
    const dfs = (i: number): void => {
      if (assignments.length > 64) return;
      if (i === comp.length) {
        assignments.push(cur.slice());
        return;
      }
      for (const s of ['bee', 'flower'] as Sym[]) {
        cur.push(s);
        // partial constraint check within component
        let ok = true;
        const [r, c] = parseKey(comp[i]);
        const trial = cloneGrid(g);
        for (let j = 0; j <= i; j++) {
          const [rr, cc] = parseKey(comp[j]);
          trial[rr][cc] = cur[j];
        }
        if (!lineOk(trial)) ok = false;
        if (ok) dfs(i + 1);
        cur.pop();
      }
    };
    dfs(0);
    if (assignments.length === 0) continue;
    for (let i = 0; i < comp.length; i++) {
      const sym = assignments[0][i];
      if (assignments.every((a) => a[i] === sym)) {
        const [r, c] = parseKey(comp[i]);
        if (g[r][c] === null) {
          g[r][c] = sym;
          filled++;
        }
      }
    }
  }
  return filled;
}

const RULES: { weight: number; fn: RuleFn }[] = [
  { weight: 1, fn: cluePropagation },
  { weight: 1, fn: almostFull },
  { weight: 1, fn: triplePrevention },
  { weight: 2, fn: gapFill },
  { weight: 4, fn: touchingPair },
  { weight: 6, fn: edgePairBigGap },
  { weight: 7, fn: equalGap },
  { weight: 9, fn: oppositeInference },
  { weight: 9, fn: inverseBigGap },
  { weight: 10, fn: constraintEnumeration },
];

/**
 * Apply deduction rules to fixpoint. Score sums weights of rules that
 * successfully filled at least one cell in any pass.
 */
export function solveLogic(puzzle: Puzzle): LogicSolveResult {
  const g = cloneGrid(puzzle.clues);
  const used = new Set<number>();
  let guard = 0;
  while (guard++ < 200) {
    let progress = false;
    for (const { weight, fn } of RULES) {
      const before = g.map((row) => row.slice());
      const filled = fn(g, puzzle.constraints);
      if (filled > 0) {
        // verify we didn't write illegal overwrites
        let ok = true;
        for (let r = 0; r < g.length; r++) {
          for (let c = 0; c < g.length; c++) {
            if (before[r][c] !== null && before[r][c] !== g[r][c]) ok = false;
          }
        }
        if (!ok) {
          // rollback this rule
          for (let r = 0; r < g.length; r++) g[r] = before[r];
          continue;
        }
        used.add(weight);
        progress = true;
      }
    }
    if (!progress) break;
  }
  const score = [...used].reduce((a, b) => a + b, 0);
  return { grid: g, complete: isComplete(g), score };
}

/** True if logic reconstructs the answer key exactly. */
export function logicReaches(puzzle: Puzzle, answer: Grid): boolean {
  const { grid, complete } = solveLogic(puzzle);
  return complete && gridsEqual(grid, answer);
}
