import { describe, it, expect } from 'vitest';
import { RoomManager } from '../src/rooms';
import { createDb } from '../src/db';
import { generatePuzzle, mulberry32, type Difficulty, type Mode } from '@tango/shared';

function manager() {
  // Deterministic generator for tests.
  const gen = (d: Difficulty) => generatePuzzle(d, mulberry32(123));
  return new RoomManager(createDb(':memory:'), gen);
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
    const solution = m.getSolution(code)!; // test-only accessor

    // Fill slot 0's board to match the solution.
    let won: any = null;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (match.puzzle.clues[r][c] !== null) continue;
        const res = m.applyCell(code, 0, r, c, solution[r][c]);
        if (res.won) won = res.won;
      }
    }
    expect(won).not.toBeNull();
    expect(won.winnerSlot).toBe(0);
    expect(won.scores.find((s: any) => s.slot === 0).wins).toBe(1);
  });

  it('coop broadcasts cell updates and completes with no winner', () => {
    const m = manager();
    const { code } = m.createRoom('A', 'bee');
    m.joinRoom(code, 'B', 'blueFlower');
    const match = m.startMatch(code, 'coop' as Mode, 'easy');
    const solution = m.getSolution(code)!;

    let done: any = null;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (match.puzzle.clues[r][c] !== null) continue;
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

    // Apply a couple of non-clue cells for slot 0.
    const empties: Array<[number, number]> = [];
    for (let r = 0; r < 6 && empties.length < 2; r++) {
      for (let c = 0; c < 6 && empties.length < 2; c++) {
        if (match.puzzle.clues[r][c] === null) empties.push([r, c]);
      }
    }
    for (const [r, c] of empties) {
      m.applyCell(code, 0, r, c, solution[r][c]);
    }

    const clueFilled = match.puzzle.clues.flat().filter((c) => c !== null).length;
    const state = m.getBoardState(code, 1);
    expect(state).not.toBeNull();
    // Slot 1 still has only clues; opponentFilled reflects slot 0's two fills.
    expect(state!.opponentFilled).toBe(clueFilled + 2);
    expect(state!.board).toEqual(match.puzzle.clues);
  });
});
