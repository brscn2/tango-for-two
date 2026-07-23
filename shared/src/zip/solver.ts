import {
  buildWallSet,
  cellKey,
  hasWallBetween,
  orthogonalNeighbors,
} from './path';
import type { ZipCoord, ZipPuzzle, ZipWaypoint } from './types';

function sortedWaypoints(waypoints: ZipWaypoint[]): ZipWaypoint[] {
  return [...waypoints].sort((a, b) => a.n - b.n);
}

function waypointIndexByCell(
  ordered: ZipWaypoint[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < ordered.length; i++) {
    map.set(cellKey(ordered[i]), i);
  }
  return map;
}

function unusedDegree(
  cell: ZipCoord,
  visited: Set<string>,
  wallSet: Set<string>,
  size: number,
): number {
  let degree = 0;
  for (const n of orthogonalNeighbors(cell.r, cell.c, size)) {
    if (visited.has(cellKey(n))) continue;
    if (hasWallBetween(wallSet, cell, n)) continue;
    degree++;
  }
  return degree;
}

function sortedNeighbors(
  cell: ZipCoord,
  visited: Set<string>,
  wallSet: Set<string>,
  size: number,
): ZipCoord[] {
  const neighbors = orthogonalNeighbors(cell.r, cell.c, size).filter(
    (n) => !visited.has(cellKey(n)) && !hasWallBetween(wallSet, cell, n),
  );
  neighbors.sort((a, b) => {
    const da = unusedDegree(a, visited, wallSet, size);
    const db = unusedDegree(b, visited, wallSet, size);
    return da - db || a.r - b.r || a.c - b.c;
  });
  return neighbors;
}

function remainingReachable(
  tip: ZipCoord,
  visited: Set<string>,
  wallSet: Set<string>,
  size: number,
): number {
  const stack: ZipCoord[] = [];
  const seen = new Set<string>();
  for (const n of orthogonalNeighbors(tip.r, tip.c, size)) {
    const k = cellKey(n);
    if (visited.has(k) || seen.has(k)) continue;
    if (hasWallBetween(wallSet, tip, n)) continue;
    seen.add(k);
    stack.push(n);
  }
  let count = seen.size;
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of orthogonalNeighbors(cur.r, cur.c, size)) {
      const k = cellKey(n);
      if (visited.has(k) || seen.has(k)) continue;
      if (hasWallBetween(wallSet, cur, n)) continue;
      seen.add(k);
      stack.push(n);
      count++;
    }
  }
  return count;
}

function search(
  puzzle: ZipPuzzle,
  limit: number,
  collectOne: boolean,
  maxNodes: number,
): { count: number; solution: ZipCoord[] | null; aborted: boolean } {
  const { size, walls, waypoints } = puzzle;
  const wallSet = buildWallSet(walls);
  const ordered = sortedWaypoints(waypoints);
  const waypointAt = waypointIndexByCell(ordered);

  const start = ordered.find((w) => w.n === 1);
  if (!start) return { count: 0, solution: null, aborted: false };

  const totalCells = size * size;
  let count = 0;
  let nodes = 0;
  let aborted = false;
  let solution: ZipCoord[] | null = null;
  const visited = new Set<string>();

  function dfs(path: ZipCoord[], nextWaypointIdx: number): void {
    if (count >= limit || aborted) return;
    if (++nodes > maxNodes) {
      aborted = true;
      return;
    }

    if (path.length === totalCells) {
      if (nextWaypointIdx === ordered.length) {
        count++;
        if (collectOne && solution === null) {
          solution = [...path];
        }
      }
      return;
    }

    const current = path[path.length - 1];
    const need = totalCells - path.length;
    if (remainingReachable(current, visited, wallSet, size) < need) return;

    const neighbors = sortedNeighbors(current, visited, wallSet, size);

    for (const next of neighbors) {
      const wi = waypointAt.get(cellKey(next));
      let newWaypointIdx = nextWaypointIdx;
      if (wi !== undefined) {
        if (wi !== nextWaypointIdx) continue;
        newWaypointIdx = nextWaypointIdx + 1;
      }

      const key = cellKey(next);
      visited.add(key);
      path.push(next);
      dfs(path, newWaypointIdx);
      path.pop();
      visited.delete(key);

      if (count >= limit || aborted) return;
    }
  }

  visited.add(cellKey(start));
  dfs([{ r: start.r, c: start.c }], 1);
  return { count, solution, aborted };
}

export function countZipSolutions(puzzle: ZipPuzzle, limit = 2): number {
  return search(puzzle, limit, false, Number.POSITIVE_INFINITY).count;
}

/** Like countZipSolutions but aborts after `maxNodes` expansions (for generators). */
export function countZipSolutionsBounded(
  puzzle: ZipPuzzle,
  limit = 2,
  maxNodes = 50_000,
): { count: number; aborted: boolean } {
  const { count, aborted } = search(puzzle, limit, false, maxNodes);
  return { count, aborted };
}

export function findZipSolution(puzzle: ZipPuzzle): ZipCoord[] | null {
  return search(puzzle, 1, true, Number.POSITIVE_INFINITY).solution;
}
