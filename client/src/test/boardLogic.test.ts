import { describe, it, expect } from 'vitest';
import { cycleSymbol, lockedSet, conflictSet } from '../lib/boardLogic';
import type { Grid } from '@tango/shared';

describe('boardLogic', () => {
  it('cycles null -> bee -> flower -> null', () => {
    expect(cycleSymbol(null)).toBe('bee');
    expect(cycleSymbol('bee')).toBe('flower');
    expect(cycleSymbol('flower')).toBe(null);
  });

  it('lockedSet contains coordinates of non-null clue cells', () => {
    const clues: Grid = Array.from({ length: 6 }, () => Array(6).fill(null));
    clues[0][0] = 'bee';
    clues[2][3] = 'flower';
    const locked = lockedSet(clues);
    expect(locked.has('0,0')).toBe(true);
    expect(locked.has('2,3')).toBe(true);
    expect(locked.has('1,1')).toBe(false);
  });

  it('conflictSet flags a 3-in-a-row on the working board', () => {
    const board: Grid = Array.from({ length: 6 }, () => Array(6).fill(null));
    board[0][0] = 'bee'; board[0][1] = 'bee'; board[0][2] = 'bee';
    const conflicts = conflictSet(board, []);
    expect(conflicts.has('0,0')).toBe(true);
    expect(conflicts.has('0,2')).toBe(true);
  });
});
