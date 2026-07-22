# 8tango-Style Generator Pipeline

**Date:** 2026-07-22  
**Status:** Approved for planning  
**Scope:** Shared engine rewrite + protocol/UI for board size; server/client wiring

## Goals

1. Every served puzzle has a **unique** solution reachable by **logic alone** (no guessing).
2. Support board sizes **4 × 4**, **6 × 6**, **8 × 8**, and **10 × 10**.
3. Players choose **Size** and **Difficulty** (easy / medium / hard) independently before starting Race or Co-op.
4. Align generation with the 8tango four-step pipeline: pattern solution → truthful modifiers → logic unsolve → rule-based difficulty scoring.

## Non-goals

- In-game hints UI (logic solver may be reused later).
- Adaptive difficulty during a match.
- Importing or depending on 8tango proprietary code/assets.
- Changing Race / Co-op / reactions / music.
- Mobile-native apps.

## Decisions

| Topic | Choice |
|-------|--------|
| Pipeline | Full 8tango-style rebuild (Approach 1) |
| Board sizes | 4, 6, 8, 10 |
| Player UX | Two pickers: Size + Difficulty |
| Logic solver | Full hierarchy (rules 1–10, including Constraint Enumeration) |
| Default size | 6 (classic LinkedIn) |
| Win detection | Still compare player board to stored answer key + `isValidSolution` |
| Search solver | Keep `countSolutions` / `solve` as belt-and-suspenders uniqueness check and defensive fallback; **unsolving and difficulty use logic only** |

## Types and API

```ts
export type BoardSize = 4 | 6 | 8 | 10;
export type Difficulty = 'easy' | 'medium' | 'hard';

export function half(size: BoardSize): number; // size / 2

interface Puzzle {
  id: string;
  size: BoardSize;
  clues: Grid;                 // size × size
  constraints: EdgeConstraint[];
  difficulty: Difficulty;
  // optional metadata for debugging / UI later:
  // difficultyScore?: number;
}

generatePuzzle(size: BoardSize, difficulty: Difficulty, rnd?: () => number): Puzzle;
```

- Replace global `SIZE` / `HALF` constants as the sole source of truth with **per-call `size`** (keep `SIZE = 6` only as a deprecated alias or test default if needed during migration).
- Protocol: `startMatch: { mode, difficulty, size }` (`size` required from new clients; server defaults missing `size` to `6`).
- `PublicPuzzle` / `MatchState` include `puzzle.size` (via `Puzzle`).
- Rules, conflict detection, board rendering, and progress totals all use `puzzle.size` (or an explicit `size` argument).

## Pipeline

### Step 1 — Build a complete solution (row patterns)

For a given `size`:

1. Enumerate **base row patterns**: binary sequences of length `size` with exactly `half(size)` of each symbol and no three identical symbols consecutive.
2. For each base pattern, produce up to four variants: identity, reverse (reflect), color-invert, reverse+invert (dedupe).
3. Shuffle the variant pool with `rnd`.
4. Place rows one-by-one; after each row, validate columns (no triple, no count overflow) and **row uniqueness**.
5. When the grid is full, validate full LinkedIn rules (balance, no 3-in-a-row, unique rows **and** columns, no constraint issues yet).
6. Backtrack on failure; retry from a fresh shuffle if needed. In practice this should succeed quickly for supported sizes.

Document pattern counts in code comments / tests (8tango reference: 6×6 → 5 bases × 4 variants; other sizes computed, not hard-coded from memory alone).

### Step 2 — Place truthful `=` / `×` clues

- While the board is fully solved, pick random orthogonal neighbour pairs.
- If cells match → `=`; if different → `×`.
- Never invent modifiers that contradict the answer key.
- **Modifier density** is a function of `size` and `difficulty` (smaller boards fewer modifiers; exact tables tuned in implementation and locked by tests).

### Step 3 — Remove cells (logic unsolve)

- Start from the full solution as clues + Step 2 constraints.
- For each filled cell in random order:
  - Temporarily blank it.
  - Run the **logic-only** solver.
  - Keep blank **only if** the solver fully reconstructs the answer key.
  - Otherwise restore the cell.
- Repeat until a full pass removes nothing (maximum unsolve).
- Belt-and-suspenders: `countSolutions(puzzle, 2) === 1` before serving; if not, regenerate.

### Step 4 — Score difficulty

- Run the logic solver once more, recording which rules fired and their weights.
- Puzzle score = sum of rule difficulties used (as in 8tango hierarchy below).
- Map score → requested band (`easy` / `medium` / `hard`) **per size** via thresholds.
- If the board’s band ≠ requested difficulty, regenerate (retry budget, e.g. 20). If budget exhausted, accept closest band and still guarantee logic-solvability (log/metric in server later — optional).

## Logic solver rule hierarchy

Applied repeatedly to fixpoint (or until stuck). Weights:

| Rule | Weight | Summary |
|------|--------|---------|
| Clue Propagation | 1 | Filled side of `=` / `×` fills the other |
| Almost Full | 1 | Line at max of one symbol → fill rest with other |
| Triple Prevention | 1 | Two adjacent identical → neighbours opposite |
| Gap Fill | 2 | `A _ A` → middle is opposite |
| Touching Pair | 4 | Blank `=` next to known cell determines both |
| Edge Pair / Big Gap | 6 | Matching edge cells force inner cells |
| Equal-Gap | 7 | Blank `=` at end + other end determines pair |
| Opposite Inference | 9 | Unfilled `×` + near-full counts force cells |
| Inverse Big Gap | 9 | Rarer edge pattern |
| Constraint Enumeration | 10 | Enumerate valid assignments on overlapping `=`/`×` groups; keep forced agreements |

**Fairness invariant:** A puzzle is served only if the logic solver can fill every empty cell and the result equals the answer key.

## Client / server UX

- **Controls:** Size pills `4 | 6 | 8 | 10` (default 6) + Difficulty pills + Race/Co-op start.
- **Board:** CSS grid columns = `puzzle.size`; constraint overlay math uses `size`.
- **Opponent progress:** `total = size²`.
- Layout: larger boards (8/10) remain scrollable / max-width constrained so mobile stays usable; no separate “desktop only” mode.

## File structure (expected)

```
shared/src/
  types.ts           # BoardSize, half(), Puzzle.size, retire global SIZE as sole truth
  patterns.ts        # base/variant row patterns per size
  logicSolver.ts     # rules 1–10, solveLogic, scoreDifficulty
  generator.ts       # four-step pipeline
  rules.ts           # size-parameterized validation / conflicts
  solver.ts          # search countSolutions/solve (uniqueness safety net)
  protocol.ts        # startMatch.size
client/src/components/Controls.tsx  # size picker
client/src/components/Board.tsx     # dynamic size
server/src/rooms.ts / socket.ts     # pass size into generatePuzzle
```

## Testing strategy

- Unit: pattern validity and variant expansion for each size.
- Unit: each logic rule forces expected cells on small fixtures.
- Unit: `generatePuzzle(size, difficulty)` for all size×difficulty pairs — logic-solvable, unique, LinkedIn-valid answer.
- Property: 50+ random seeds per size — zero unsolvable / zero guess-required boards.
- Integration: socket `startMatch` with `size` starts a match; board cells = `size²`.
- Client: Controls emits size; Board renders N×N.

## Migration

1. Parameterize rules/grid helpers by `size`.
2. Add `patterns.ts` + `logicSolver.ts` with tests.
3. Rewrite `generator.ts` pipeline; keep public `generatePuzzle` (new signature).
4. Update protocol + server + Controls + Board.
5. Expand tests; remove obsolete clue-count-only difficulty tuning.

## Relationship to prior fix

The LinkedIn **no duplicate rows/columns** rule remains mandatory. Pattern placement + final validation continue to enforce it. This pipeline supersedes clue-count difficulty and search-only unsolving.
