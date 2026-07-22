import type { Avatar, Difficulty, Grid, Mode, PublicPuzzle, Slot, SymbolPair } from '@tango/shared';

export interface Player {
  slot: Slot;
  name: string;
  avatar: Avatar;
  socketId: string | null;
  connected: boolean;
}

export interface Match {
  mode: Mode;
  difficulty: Difficulty;
  puzzle: PublicPuzzle;
  solution: Grid;        // server-only, never sent to clients
  boards: Grid[];        // boards[slot] for race; boards[0] shared for coop
  startedAt: number;
  status: 'playing' | 'won';
  winnerSlot: Slot | null;
}

export interface Room {
  code: string;
  players: (Player | null)[]; // index by slot
  match: Match | null;
  symbols: SymbolPair; // current shared symbol pair
}
