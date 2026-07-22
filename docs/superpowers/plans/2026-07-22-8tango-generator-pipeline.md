# 8tango Generator Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cell-backtracking generator with an 8tango-style pipeline (row patterns → truthful modifiers → logic unsolve → rule-scored difficulty) and support board sizes 4/6/8/10 with Size+Difficulty pickers.

**Architecture:** Parameterize the shared engine by `BoardSize`. Add `patterns.ts` and `logicSolver.ts`. Rewrite `generator.ts`. Thread `size` through protocol, RoomManager, Controls, and Board. Keep search `countSolutions` as a uniqueness safety net only.

**Tech Stack:** TypeScript, Vitest, existing React/Socket.IO stack

**Spec:** `docs/superpowers/specs/2026-07-22-8tango-generator-pipeline-design.md`

---

### Task 1: Types + size-parameterized rules

**Files:** `shared/src/types.ts`, `shared/src/rules.ts`, tests

- [ ] Add `BoardSize`, `half()`, `Puzzle.size`; `emptyGrid(size)`; derive `n` from `g.length` in rules/conflicts/validation.
- [ ] Update rules tests for dynamic size; keep 6×6 fixtures.
- [ ] Commit.

### Task 2: Row patterns

**Files:** Create `shared/src/patterns.ts`, `shared/test/patterns.test.ts`

- [ ] Enumerate valid row patterns + 4 variants per base; tests for 4/6/8/10.
- [ ] Commit.

### Task 3: Logic solver (rules 1–10)

**Files:** Create `shared/src/logicSolver.ts`, `shared/test/logicSolver.test.ts`

- [ ] `solveLogic(puzzle)` → `{ grid, complete, score }`; apply rules to fixpoint.
- [ ] Unit tests for propagation, almost-full, triples, gap-fill at minimum; integration that a generated-style puzzle completes.
- [ ] Commit.

### Task 4: Generator pipeline

**Files:** Rewrite `shared/src/generator.ts`, update `shared/test/generator.test.ts`, parameterize `solver.ts` if needed

- [ ] `generateSolution(size, rnd)` via patterns; `generatePuzzle(size, difficulty, rnd)` steps 2–4.
- [ ] Assert logic-complete + `countSolutions === 1` for all size×difficulty samples.
- [ ] Export from `index.ts`. Commit.

### Task 5: Protocol + server

**Files:** `protocol.ts`, `rooms.ts`, `socket.ts`, server tests

- [ ] `startMatch({ mode, difficulty, size })`; default size 6; progress `size²`.
- [ ] Commit.

### Task 6: Client Controls + Board

**Files:** `Controls.tsx`, `Board.tsx`, `store.ts`, `Game.tsx`, OpponentBoard if needed

- [ ] Size picker; pass size into startMatch; Board uses `puzzle.size`.
- [ ] `npm test` all workspaces + client build. Commit.
