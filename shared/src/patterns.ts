import type { BoardSize, Sym } from './types';
import { half } from './types';

function hasTriple(row: Sym[]): boolean {
  for (let i = 0; i + 2 < row.length; i++) {
    if (row[i] === row[i + 1] && row[i + 1] === row[i + 2]) return true;
  }
  return false;
}

function canExtend(row: Sym[], size: number, h: number): boolean {
  const bees = row.filter((s) => s === 'bee').length;
  const flowers = row.length - bees;
  if (bees > h || flowers > h) return false;
  if (row.length >= 3) {
    const a = row[row.length - 3];
    const b = row[row.length - 2];
    const c = row[row.length - 1];
    if (a === b && b === c) return false;
  }
  const remaining = size - row.length;
  if (bees + remaining < h) return false;
  if (flowers + remaining < h) return false;
  return true;
}

/** All valid full-row patterns for a board size (balance + no 3-in-a-row). */
export function enumerateBasePatterns(size: BoardSize): Sym[][] {
  const h = half(size);
  const out: Sym[][] = [];
  const row: Sym[] = [];
  const rec = (): void => {
    if (row.length === size) {
      if (row.filter((s) => s === 'bee').length === h && !hasTriple(row)) out.push(row.slice());
      return;
    }
    for (const s of ['bee', 'flower'] as Sym[]) {
      row.push(s);
      if (canExtend(row, size, h)) rec();
      row.pop();
    }
  };
  rec();
  return out;
}

function invert(row: Sym[]): Sym[] {
  return row.map((s) => (s === 'bee' ? 'flower' : 'bee'));
}

/** Identity, reverse, invert, reverse+invert (deduped). */
export function expandVariants(pattern: Sym[]): Sym[][] {
  const cands = [pattern, [...pattern].reverse(), invert(pattern), invert([...pattern].reverse())];
  const seen = new Set<string>();
  const out: Sym[][] = [];
  for (const p of cands) {
    const key = p.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

/** All unique row variants usable when building a solution. */
export function allRowVariants(size: BoardSize): Sym[][] {
  const seen = new Set<string>();
  const out: Sym[][] = [];
  for (const base of enumerateBasePatterns(size)) {
    for (const v of expandVariants(base)) {
      const key = v.join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}
