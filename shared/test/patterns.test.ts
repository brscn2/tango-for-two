import { describe, it, expect } from 'vitest';
import { BOARD_SIZES, half, type BoardSize, type Sym } from '../src/types';
import { allRowVariants, enumerateBasePatterns, expandVariants } from '../src/patterns';

function validRow(row: Sym[], size: BoardSize): boolean {
  if (row.length !== size) return false;
  if (row.filter((s) => s === 'bee').length !== half(size)) return false;
  for (let i = 0; i + 2 < size; i++) {
    if (row[i] === row[i + 1] && row[i + 1] === row[i + 2]) return false;
  }
  return true;
}

describe('patterns', () => {
  for (const size of BOARD_SIZES) {
    it(`enumerates valid base patterns for ${size}×${size}`, () => {
      const bases = enumerateBasePatterns(size);
      expect(bases.length).toBeGreaterThan(0);
      for (const row of bases) expect(validRow(row, size)).toBe(true);
    });

    it(`expands variants for ${size}×${size}`, () => {
      const variants = allRowVariants(size);
      expect(variants.length).toBeGreaterThanOrEqual(enumerateBasePatterns(size).length);
      for (const row of variants) expect(validRow(row, size)).toBe(true);
    });
  }

  it('expandVariants includes reverse and invert', () => {
    const row: Sym[] = ['bee', 'bee', 'flower', 'flower'];
    const v = expandVariants(row);
    expect(v.some((p) => p.join() === 'flower,flower,bee,bee')).toBe(true);
  });
});
