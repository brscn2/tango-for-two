import Database from 'better-sqlite3';
import type { ScoreEntry, Slot } from '@tango/shared';

export interface Db {
  ensureRoom(code: string): void;
  getScores(code: string): ScoreEntry[];
  recordResult(code: string, winnerSlot: Slot, timeMs: number): ScoreEntry[];
}

export function createDb(path = 'tango.sqlite'): Db {
  const sql = new Database(path);
  sql.pragma('journal_mode = WAL');
  sql.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scores (
      code TEXT NOT NULL,
      slot INTEGER NOT NULL,
      wins INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      best_time_ms INTEGER,
      PRIMARY KEY (code, slot)
    );
  `);

  const insertRoom = sql.prepare('INSERT OR IGNORE INTO rooms (code, created_at) VALUES (?, ?)');
  const insertScore = sql.prepare('INSERT OR IGNORE INTO scores (code, slot) VALUES (?, ?)');
  const selectScores = sql.prepare('SELECT slot, wins, streak, best_time_ms FROM scores WHERE code = ? ORDER BY slot');

  function ensureRoom(code: string): void {
    insertRoom.run(code, Date.now());
    insertScore.run(code, 0);
    insertScore.run(code, 1);
  }

  function getScores(code: string): ScoreEntry[] {
    return (selectScores.all(code) as any[]).map((r) => ({
      slot: r.slot as Slot,
      wins: r.wins,
      streak: r.streak,
      bestTimeMs: r.best_time_ms ?? null,
    }));
  }

  const winner = sql.prepare(
    `UPDATE scores SET wins = wins + 1, streak = streak + 1,
       best_time_ms = CASE WHEN best_time_ms IS NULL OR ? < best_time_ms THEN ? ELSE best_time_ms END
     WHERE code = ? AND slot = ?`,
  );
  const loser = sql.prepare('UPDATE scores SET streak = 0 WHERE code = ? AND slot = ?');

  function recordResult(code: string, winnerSlot: Slot, timeMs: number): ScoreEntry[] {
    ensureRoom(code);
    winner.run(timeMs, timeMs, code, winnerSlot);
    loser.run(code, winnerSlot === 0 ? 1 : 0);
    return getScores(code);
  }

  return { ensureRoom, getScores, recordResult };
}
