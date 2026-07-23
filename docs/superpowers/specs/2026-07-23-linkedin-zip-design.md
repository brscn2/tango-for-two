# LinkedIn Zip Multiplayer Design

**Date:** 2026-07-23  
**Status:** Approved for planning  
**Scope:** Add Zip as a second game beside Tango (Race only), with generator, path UI, and per-game scoreboard tallies

## Goals

1. Play **LinkedIn-style Zip** in the existing two-player room shell (Race, timer, reactions, music, win celebration).
2. Generate unique Zip levels via reverse pipeline: Hamiltonian path → waypoints → walls → uniqueness check.
3. Choose **Tango | Zip** at match start in Controls (same room).
4. Distinct couple-themed Zip look: **Bibi face on path tip**; waypoints as **fixed malatang ingredients + numbers**.
5. Scoreboard shows **separate** Tango vs Zip wins / streaks / best times.

## Non-goals (v1)

- Zip Co-op mode
- Other LinkedIn games (Queens, etc.) or a full game-plugin framework
- Editable malatang ingredient menu in `personal.ts`
- Importing official LinkedIn Zip puzzles
- In-game hints
- Refactoring Tango into a plugin interface (deferred until a third game)

## Decisions

| Topic | Choice |
|-------|--------|
| Architecture | Parallel Zip modules + `gameType` branching (Approach 1) |
| Modes | Race only for Zip; Tango keeps Race + Co-op |
| Sizes | 6 × 6, 7 × 7, 8 × 8 |
| Difficulty | Easy / Medium / Hard |
| Hard profile | More waypoints **and** more walls (size still sets path length = N²) |
| Walls | Included in v1 |
| Input | Drag/paint orthogonal path |
| Game selection | Controls at match start |
| Scoreboard | One UI; separate tallies per game |
| Path tip | Always Bibi’s face (both players’ boards) |
| Waypoints | Fixed curated malatang set + readable number |
| Path sync | Dedicated Zip path updates (not Tango `cellUpdate`) |

## Product scope

| | |
|---|---|
| Modes | **Race only** (no Zip co-op) |
| Sizes | **6×6, 7×7, 8×8** |
| Difficulty | **Easy / Medium / Hard** |
| Puzzle | Hamiltonian path; numbered waypoints; walls between cells |
| Input | Drag/paint the path |
| Start | Controls: game (Tango \| Zip), then Zip size/difficulty |
| Shell | Same rooms, timer, reactions, music, win celebration |
| Scores | Separate Tango vs Zip tallies |
| Look | Path tip = Bibi; waypoints = malatang ingredient + number |

Tango behavior remains unchanged (including Race + Co-op).

## Architecture

Parallel modules; shared room shell.

```
shared/src/zip/          types, rules, generator, solver, uniqueness
shared/src/protocol.ts   gameType + Zip match/path payloads
server/src/rooms.ts      branch startMatch / pathUpdate / win by gameType
client/.../zip/          ZipBoard (draw), walls, waypoints, Bibi tip
client Controls/Game     game picker; Tango Board vs ZipBoard
server/src/db.ts         per-game score fields (tango vs zip)
```

- Keep existing Tango files in place (no move-into-plugins refactor in this project).
- Match carries `gameType: 'tango' | 'zip'`.
- Zip player state is an ordered cell path, not a symbol grid.
- Win: path covers every cell, visits waypoints in order, never crosses a wall, no cell revisited.

## Zip engine

### Puzzle model

```ts
type ZipSize = 6 | 7 | 8;
type Difficulty = 'easy' | 'medium' | 'hard';

interface ZipWaypoint {
  n: number; // 1..K in visit order
  r: number;
  c: number;
}

/** Wall between two orthogonally adjacent cells (canonicalized edge). */
interface ZipWall {
  r1: number; c1: number;
  r2: number; c2: number;
}

interface ZipPuzzle {
  id: string;
  size: ZipSize;
  waypoints: ZipWaypoint[];
  walls: ZipWall[];
  difficulty: Difficulty;
}

// Server-only: solutionPath: Array<{ r, c }> covering all cells
```

Public match payload omits `solutionPath`. Waypoint **display** icons are a client cosmetic mapped from `n` via a fixed ingredient list (not stored on the puzzle).

### Generation pipeline

1. **Path generation** — Build a full continuous Hamiltonian path on the N×N grid (every cell once, orthogonal steps).
2. **Waypoint placement** — Choose coordinates along the path; label them `1, 2, …, K` in path order. `K` scales with size × difficulty (**Hard uses more waypoints**).
3. **Wall / barrier integration** — Place walls on edges that the solution path does not use, using edge lists (bitmasks acceptable internally). Density increases with difficulty (**Hard uses more walls**).
4. **Uniqueness validation** — Automated solvers must find **exactly one** path that:
   - is orthogonal and visits each cell at most once;
   - covers all cells;
   - never crosses a wall;
   - visits waypoints in increasing numerical order.
5. Retry with new path / waypoint / wall samples until unique (retry budget). If exhausted, relax (fewer walls and/or adjust waypoint count toward a still-valid hard/medium/easy band) rather than ship a multi-solution board.

### Play rules

- Orthogonal moves only (no diagonals).
- Cannot traverse a walled edge or revisit a cell.
- Valid win = full coverage + waypoint order + walls respected.

### Difficulty knobs

| | Waypoints | Walls | Path length |
|---|---|---|---|
| Easy | Fewer | Fewer | Always N² for chosen size |
| Medium | Balanced | Balanced | Always N² |
| Hard | **More** | **More** | Always N² (choose larger size for a longer trail) |

Exact numeric bands (waypoint counts, wall densities, retry limits) are set in the implementation plan / generator constants and validated by tests.

## Multiplayer & protocol

### Match start

- `startMatch` includes `gameType: 'tango' | 'zip'` (default `'tango'` for older clients).
- When `gameType === 'zip'`: force `mode` to `'race'`; `size` ∈ {6, 7, 8}; `difficulty` as usual.
- Server generates Zip puzzle, keeps solution path private, sends public puzzle (waypoints + walls).

### During play (Race)

- Each player has a private path: ordered list of `{ r, c }`.
- Client emits Zip-specific path updates (full path snapshot or append/undo — one clear model chosen in the plan).
- Server enforces soft movement rules for sync; win check is authoritative against the solution (or equivalent validation: cover + order + walls + no revisit).
- Opponent progress: fraction of cells filled (optional tip cell for mini-view).

### Win & scores

- First player with a complete valid solution wins.
- Persist under **Zip** tallies (wins, streak, best time), separate from Tango.

### Reconnect

- Resync each player’s Zip path the same way Tango resyncs private boards today.

## UI & visual style

### Controls

- Game picker: **Tango | Zip**.
- On Zip: hide Co-op; size options 6 / 7 / 8; difficulty Easy / Medium / Hard.

### ZipBoard

- Drag/paint to extend the path; invalid moves (wall, revisit, diagonal) do not extend the path (light feedback).
- **Clear path** control.
- Walls rendered as thick edges between cells.
- **Path tip:** always Bibi’s face (`public/bibi.jpg` or equivalent; placeholder avatar until the photo is added).
- **Waypoints:** fixed malatang ingredient + number, e.g. chili, meatball, tofu, greens, fishball, potato, lotus root, noodle (exact ordered list as shared/client constants).
- Warm broth / chili palette so Zip reads distinct from Tango’s bee/flower board.
- Opponent: compact fill-% progress.
- Scoreboard: same component with Tango | Zip tallies (side-by-side or tabs).

## Data / scoreboard

Extend persistence so each room (or player pair) stores separately:

- Tango: wins, streak, bestTimeMs  
- Zip: wins, streak, bestTimeMs  

UI shows both. Migration: existing fields map to Tango; Zip starts at zero.

## Errors & edge cases

- Invalid drag: no extension; light UX feedback.
- Generation uniqueness failure within budget: relax and retry; never emit multi-solution puzzles.
- Old clients omitting `gameType`: treat as Tango.
- Reject Zip + Co-op at the server if requested.

## Testing

- **Shared:** Hamiltonian generation; wall respect; waypoint order; `countSolutions === 1`; difficulty smoke tests (hard has more waypoints/walls than easy on same size).
- **Server:** Zip Race win; Zip scores isolated from Tango; Zip+coop rejected; reconnect path sync.
- **Client:** path paint/clear; Controls game switch; waypoint + Bibi tip rendering.

## Implementation shape (for planning)

Suggested phased plan (details in writing-plans):

1. Zip engine in `shared` + unit tests  
2. Protocol + `RoomManager` Race wiring + DB tallies  
3. ZipBoard UI + Controls + scoreboard + cosmetics (Bibi tip, malatang icons)

## Open implementation details (resolved in plan, not product-open)

- Exact waypoint/wall numeric bands per size × difficulty  
- Path update wire format (full snapshot vs delta)  
- Scoreboard layout (tabs vs two columns)  
- Placeholder vs real Bibi asset path naming  
