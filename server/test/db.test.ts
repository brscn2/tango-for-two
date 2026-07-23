import { describe, it, expect } from 'vitest';
import { createDb } from '../src/db';

describe('db scoreboard', () => {
  it('initializes zeroed tango and zip scores for a new room', () => {
    const db = createDb(':memory:');
    db.ensureRoom('ABCD');
    const scores = db.getScores('ABCD');
    expect(scores.tango).toEqual([
      { slot: 0, wins: 0, streak: 0, bestTimeMs: null },
      { slot: 1, wins: 0, streak: 0, bestTimeMs: null },
    ]);
    expect(scores.zip).toEqual([
      { slot: 0, wins: 0, streak: 0, bestTimeMs: null },
      { slot: 1, wins: 0, streak: 0, bestTimeMs: null },
    ]);
  });

  it('records a tango win without touching zip tallies', () => {
    const db = createDb(':memory:');
    db.ensureRoom('ABCD');
    let scores = db.recordResult('ABCD', 'tango', 0, 90000);
    scores = db.recordResult('ABCD', 'tango', 0, 60000);
    scores = db.recordResult('ABCD', 'tango', 1, 75000);

    const s0 = scores.tango.find((s) => s.slot === 0)!;
    const s1 = scores.tango.find((s) => s.slot === 1)!;
    expect(s0.wins).toBe(2);
    expect(s0.streak).toBe(0);
    expect(s0.bestTimeMs).toBe(60000);
    expect(s1.wins).toBe(1);
    expect(s1.streak).toBe(1);
    expect(s1.bestTimeMs).toBe(75000);
    expect(scores.zip.every((s) => s.wins === 0)).toBe(true);
  });

  it('tracks tango and zip wins separately', () => {
    const db = createDb(':memory:');
    db.ensureRoom('ABCDE');
    db.recordResult('ABCDE', 'tango', 0, 1000);
    db.recordResult('ABCDE', 'zip', 1, 2000);
    const s = db.getScores('ABCDE');
    expect(s.tango.find((x) => x.slot === 0)?.wins).toBe(1);
    expect(s.zip.find((x) => x.slot === 1)?.wins).toBe(1);
    expect(s.zip.find((x) => x.slot === 0)?.wins).toBe(0);
  });
});
