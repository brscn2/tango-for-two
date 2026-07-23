import { describe, it, expect } from 'vitest';
import { RoomManager } from '../src/rooms';
import { createDb } from '../src/db';
import {
  generatePuzzle, generateZipPuzzle, mulberry32,
  type Difficulty, type Mode, type ZipSize,
} from '@tango/shared';

function manager() {
  const gen = (_s: 4 | 6 | 8 | 10, d: Difficulty) => generatePuzzle(6, d, mulberry32(123));
  const zipGen = (size: ZipSize, d: Difficulty) => generateZipPuzzle(size, d, mulberry32(99));
  return new RoomManager(createDb(':memory:'), gen, zipGen);
}

describe('RoomManager', () => {
  it('creates a room as slot 0 and lets a second player join as slot 1', () => {
    const m = manager();
    const { code, slot } = m.createRoom('Rosie', 'blueFlower');
    expect(slot).toBe(0);
    const join = m.joinRoom(code, 'Sam', 'bee');
    expect(join.ok).toBe(true);
    expect(join.slot).toBe(1);
  });

  it('rejects joining an unknown room', () => {
    const m = manager();
    expect(m.joinRoom('NOPE', 'X', 'bee')).toEqual({ ok: false, error: 'Room not found' });
  });

  it('rejects a third player', () => {
    const m = manager();
    const { code } = m.createRoom('A', 'bee');
    m.joinRoom(code, 'B', 'blueFlower');
    expect(m.joinRoom(code, 'C', 'bee')).toEqual({ ok: false, error: 'Room is full' });
  });

  it('reclaims a disconnected slot on rejoin', () => {
    const m = manager();
    const { code } = m.createRoom('A', 'bee');
    m.joinRoom(code, 'B', 'blueFlower');
    m.setConnected(code, 1, false, null);
    expect(m.joinRoom(code, 'B2', 'bee')).toEqual({ ok: true, slot: 1 });
    expect(m.joinRoom(code, 'C', 'bee')).toEqual({ ok: false, error: 'Room is full' });
  });

  it('detects a race win when a player fills the correct solution', () => {
    const m = manager();
    const { code } = m.createRoom('A', 'bee');
    m.joinRoom(code, 'B', 'blueFlower');
    const match = m.startMatch(code, 'race' as Mode, 'easy');
    expect(match.gameType).toBe('tango');
    const solution = m.getSolution(code)!;
    const puzzle = match.puzzle!;

    let won: any = null;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (puzzle.clues[r][c] !== null) continue;
        const res = m.applyCell(code, 0, r, c, solution[r][c]);
        if (res.won) won = res.won;
      }
    }
    expect(won).not.toBeNull();
    expect(won.winnerSlot).toBe(0);
    expect(won.scores.tango.find((s: any) => s.slot === 0).wins).toBe(1);
  });

  it('coop broadcasts cell updates and completes with no winner', () => {
    const m = manager();
    const { code } = m.createRoom('A', 'bee');
    m.joinRoom(code, 'B', 'blueFlower');
    const match = m.startMatch(code, 'coop' as Mode, 'easy');
    const solution = m.getSolution(code)!;
    const puzzle = match.puzzle!;

    let done: any = null;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (puzzle.clues[r][c] !== null) continue;
        const res = m.applyCell(code, 0, r, c, solution[r][c]);
        expect(res.coop).toBeTruthy();
        if (res.won) done = res.won;
      }
    }
    expect(done.winnerSlot).toBeNull();
  });

  it('getBoardState returns private board + opponent filled count for race', () => {
    const m = manager();
    const { code } = m.createRoom('A', 'bee');
    m.joinRoom(code, 'B', 'blueFlower');
    const match = m.startMatch(code, 'race' as Mode, 'easy');
    const solution = m.getSolution(code)!;
    const puzzle = match.puzzle!;

    const empties: Array<[number, number]> = [];
    for (let r = 0; r < 6 && empties.length < 2; r++) {
      for (let c = 0; c < 6 && empties.length < 2; c++) {
        if (puzzle.clues[r][c] === null) empties.push([r, c]);
      }
    }
    for (const [r, c] of empties) {
      m.applyCell(code, 0, r, c, solution[r][c]);
    }

    const clueFilled = puzzle.clues.flat().filter((c) => c !== null).length;
    const state = m.getBoardState(code, 1);
    expect(state).not.toBeNull();
    expect(state!.opponentFilled).toBe(clueFilled + 2);
    expect(state!.board).toEqual(puzzle.clues);
  });

  it('starts a zip race match and rejects coop', () => {
    const m = manager();
    const { code } = m.createRoom('A', 'bee');
    m.joinRoom(code, 'B', 'blueFlower');
    expect(() => m.startMatch(code, 'coop', 'easy', 6, 'zip')).toThrow(/race/i);
    const state = m.startMatch(code, 'race', 'easy', 6, 'zip');
    expect(state.gameType).toBe('zip');
    expect(state.zipPuzzle?.size).toBe(6);
    expect(state.puzzle).toBeUndefined();
  });

  it('zip path update wins when solution valid', () => {
    const m = manager();
    const { code } = m.createRoom('A', 'bee');
    m.joinRoom(code, 'B', 'blueFlower');
    m.startMatch(code, 'race', 'easy', 6, 'zip');
    const sol = m.getZipSolution(code)!;
    const result = m.applyZipPath(code, 0, sol);
    expect(result.won?.winnerSlot).toBe(0);
    expect(result.won?.scores.zip.find((s) => s.slot === 0)?.wins).toBe(1);
    expect(result.won?.scores.tango.find((s) => s.slot === 0)?.wins).toBe(0);
  });

  it('default gameType remains tango', () => {
    const m = manager();
    const { code } = m.createRoom('A', 'bee');
    m.joinRoom(code, 'B', 'blueFlower');
    const state = m.startMatch(code, 'race', 'easy', 6);
    expect(state.gameType).toBe('tango');
  });
});
