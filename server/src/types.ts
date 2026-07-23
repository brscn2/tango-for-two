import type {
  Avatar,
  Difficulty,
  GameType,
  Grid,
  Mode,
  PublicPuzzle,
  PublicZipPuzzle,
  Slot,
  SymbolPair,
  ZipCoord,
} from '@tango/shared';

export interface Player {
  slot: Slot;
  name: string;
  avatar: Avatar;
  socketId: string | null;
  connected: boolean;
}

export interface Match {
  gameType: GameType;
  mode: Mode;
  difficulty: Difficulty;
  // tango
  puzzle?: PublicPuzzle;
  solution?: Grid;
  boards?: Grid[];
  // zip
  zipPuzzle?: PublicZipPuzzle;
  solutionPath?: ZipCoord[];
  paths?: ZipCoord[][];
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
