import { MongoClient } from 'mongodb';
import type { ScoreEntry, Slot } from '@tango/shared';

export interface Db {
  ensureRoom(code: string): void;
  getScores(code: string): ScoreEntry[];
  recordResult(code: string, winnerSlot: Slot, timeMs: number): ScoreEntry[];
}

interface Row {
  code: string;
  slot: Slot;
  wins: number;
  streak: number;
  bestTimeMs: number | null;
}

const SLOTS: Slot[] = [0, 1];
const key = (code: string, slot: Slot) => `${code}:${slot}`;
const otherSlot = (s: Slot): Slot => (s === 0 ? 1 : 0);

/**
 * In-memory scoreboard. Synchronous by design so RoomManager stays simple.
 * `onChange` lets a durable backing store (e.g. MongoDB) persist mutated rows
 * without forcing every caller to become async.
 */
function memoryDb(seed: Row[] = [], onChange?: (rows: Row[]) => void): Db {
  const map = new Map<string, Row>();
  for (const r of seed) map.set(key(r.code, r.slot), { ...r });

  function ensureRoom(code: string): void {
    const created: Row[] = [];
    for (const slot of SLOTS) {
      const k = key(code, slot);
      if (!map.has(k)) {
        const row: Row = { code, slot, wins: 0, streak: 0, bestTimeMs: null };
        map.set(k, row);
        created.push(row);
      }
    }
    if (created.length && onChange) onChange(created);
  }

  function getScores(code: string): ScoreEntry[] {
    return SLOTS.map((slot) => {
      const r = map.get(key(code, slot));
      return {
        slot,
        wins: r?.wins ?? 0,
        streak: r?.streak ?? 0,
        bestTimeMs: r?.bestTimeMs ?? null,
      };
    });
  }

  function recordResult(code: string, winnerSlot: Slot, timeMs: number): ScoreEntry[] {
    ensureRoom(code);
    const w = map.get(key(code, winnerSlot))!;
    w.wins += 1;
    w.streak += 1;
    if (w.bestTimeMs == null || timeMs < w.bestTimeMs) w.bestTimeMs = timeMs;
    const l = map.get(key(code, otherSlot(winnerSlot)))!;
    l.streak = 0;
    if (onChange) onChange([w, l]);
    return getScores(code);
  }

  return { ensureRoom, getScores, recordResult };
}

/**
 * Ephemeral in-memory scoreboard for local dev and tests. The optional `path`
 * argument is ignored and kept only for call-site compatibility.
 */
export function createDb(_path?: string): Db {
  return memoryDb();
}

/**
 * MongoDB-backed scoreboard for production (e.g. MongoDB Atlas). Hydrates the
 * in-memory cache from the `scores` collection on boot, then writes mutations
 * through asynchronously. Await this before starting the server.
 */
export async function createMongoDb(uri: string, dbName = 'tango'): Promise<Db> {
  const client = new MongoClient(uri);
  await client.connect();
  const coll = client.db(dbName).collection<Row>('scores');
  await coll.createIndex({ code: 1, slot: 1 }, { unique: true });

  const existing = await coll.find({}).toArray();
  const seed: Row[] = existing.map((r) => ({
    code: r.code,
    slot: r.slot as Slot,
    wins: r.wins ?? 0,
    streak: r.streak ?? 0,
    bestTimeMs: r.bestTimeMs ?? null,
  }));

  const persist = (rows: Row[]) => {
    for (const r of rows) {
      coll
        .updateOne(
          { code: r.code, slot: r.slot },
          { $set: { wins: r.wins, streak: r.streak, bestTimeMs: r.bestTimeMs } },
          { upsert: true },
        )
        .catch((e) => console.error('scoreboard persist failed', e));
    }
  };

  return memoryDb(seed, persist);
}
