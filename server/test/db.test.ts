import { describe, it, expect } from 'vitest';
import { createDb } from '../src/db';

describe('db scoreboard', () => {
  it('initializes zeroed scores for a new room', () => {
    const db = createDb(':memory:');
    db.ensureRoom('ABCD');
    const scores = db.getScores('ABCD');
    expect(scores).toEqual([
      { slot: 0, wins: 0, streak: 0, bestTimeMs: null },
      { slot: 1, wins: 0, streak: 0, bestTimeMs: null },
    ]);
  });

  it('records a win: increments winner wins+streak, resets loser streak, tracks best time', () => {
    const db = createDb(':memory:');
    db.ensureRoom('ABCD');
    let scores = db.recordResult('ABCD', 0, 90000);
    scores = db.recordResult('ABCD', 0, 60000); // faster win
    scores = db.recordResult('ABCD', 1, 75000); // slot 1 wins, resets slot 0 streak

    const s0 = scores.find((s) => s.slot === 0)!;
    const s1 = scores.find((s) => s.slot === 1)!;
    expect(s0.wins).toBe(2);
    expect(s0.streak).toBe(0);
    expect(s0.bestTimeMs).toBe(60000);
    expect(s1.wins).toBe(1);
    expect(s1.streak).toBe(1);
    expect(s1.bestTimeMs).toBe(75000);
  });
});
