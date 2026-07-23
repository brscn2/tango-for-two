import type { ZipCoord, ZipWall } from './types';

export function canonicalizeWall(w: ZipWall): ZipWall {
  const a = { r: w.r1, c: w.c1 };
  const b = { r: w.r2, c: w.c2 };
  if (a.r < b.r || (a.r === b.r && a.c <= b.c)) {
    return { r1: a.r, c1: a.c, r2: b.r, c2: b.c };
  }
  return { r1: b.r, c1: b.c, r2: a.r, c2: a.c };
}

export function wallKey(w: ZipWall): string {
  const c = canonicalizeWall(w);
  return `${c.r1},${c.c1}|${c.r2},${c.c2}`;
}

export function parseWallKey(key: string): ZipWall {
  const [a, b] = key.split('|');
  const [r1, c1] = a.split(',').map(Number);
  const [r2, c2] = b.split(',').map(Number);
  return canonicalizeWall({ r1, c1, r2, c2 });
}

export function buildWallSet(walls: ZipWall[]): Set<string> {
  return new Set(walls.map(wallKey));
}

export function hasWallBetween(wallSet: Set<string>, a: ZipCoord, b: ZipCoord): boolean {
  return wallSet.has(wallKey({ r1: a.r, c1: a.c, r2: b.r, c2: b.c }));
}

export function isOrthogonalStep(a: ZipCoord, b: ZipCoord): boolean {
  const dr = Math.abs(a.r - b.r);
  const dc = Math.abs(a.c - b.c);
  return dr + dc === 1;
}

export function orthogonalNeighbors(r: number, c: number, size: number): ZipCoord[] {
  const out: ZipCoord[] = [];
  for (const [dr, dc] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ] as const) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.push({ r: nr, c: nc });
  }
  return out;
}

export function cellKey(p: ZipCoord): string {
  return `${p.r},${p.c}`;
}

export function pathCoversGrid(path: ZipCoord[], size: number): boolean {
  if (path.length !== size * size) return false;
  const seen = new Set<string>();
  for (const p of path) {
    const k = cellKey(p);
    if (seen.has(k)) return false;
    if (p.r < 0 || p.r >= size || p.c < 0 || p.c >= size) return false;
    seen.add(k);
  }
  return seen.size === size * size;
}
