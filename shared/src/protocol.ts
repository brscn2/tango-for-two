import type { BoardSize, Difficulty, EdgeConstraint, Grid, Sym } from './types';
import type { ZipCoord, ZipPuzzle, ZipSize } from './zip/types';

export type Slot = 0 | 1;
export type Mode = 'race' | 'coop';
export type GameType = 'tango' | 'zip';

// All selectable symbol icons. The engine still uses logical 'bee'/'flower';
// a SymbolPair maps logical 'bee' -> a, logical 'flower' -> b for rendering.
export type SymbolKey = 'bee' | 'blueFlower' | 'shokupan' | 'saltBread' | 'matcha' | 'boba' | 'iceCream' | 'sun' | 'moon';
export interface SymbolPair { a: SymbolKey; b: SymbolKey; }
export const DEFAULT_SYMBOLS: SymbolPair = { a: 'bee', b: 'blueFlower' };

// A player's chosen identity icon can be any palette icon.
export type Avatar = SymbolKey;

export interface PlayerInfo {
  slot: Slot;
  name: string;
  avatar: Avatar;
  connected: boolean;
}

export interface PublicPuzzle {
  id: string;
  size: BoardSize;
  clues: Grid;
  constraints: EdgeConstraint[];
  difficulty: Difficulty;
}

export interface PublicZipPuzzle {
  id: string;
  size: ZipSize;
  waypoints: ZipPuzzle['waypoints'];
  walls: ZipPuzzle['walls'];
  difficulty: Difficulty;
}

export interface ScoreEntry {
  slot: Slot;
  wins: number;
  streak: number;
  bestTimeMs: number | null;
}

export interface RoomScores {
  tango: ScoreEntry[];
  zip: ScoreEntry[];
}

export interface MatchState {
  gameType: GameType;
  mode: Mode;
  difficulty: Difficulty;
  /** Present when gameType === 'tango' */
  puzzle?: PublicPuzzle;
  /** Present when gameType === 'zip' */
  zipPuzzle?: PublicZipPuzzle;
  startedAt: number;
  status: 'playing' | 'won';
  winnerSlot: Slot | null;
}

export interface RoomState {
  code: string;
  players: PlayerInfo[];
  scores: RoomScores;
  match: MatchState | null;
  symbols: SymbolPair; // the pair both players currently see
}

export interface MusicControl {
  action: 'load' | 'play' | 'pause' | 'seek';
  videoId?: string;      // for 'load'
  positionSec?: number;  // for 'play' | 'seek' | 'load'
}

// Client -> Server events
export interface C2S {
  createRoom: (p: { name: string; avatar: Avatar }, cb: (r: { code: string; slot: Slot }) => void) => void;
  joinRoom: (p: { code: string; name: string; avatar: Avatar }, cb: (r: { ok: boolean; slot?: Slot; error?: string }) => void) => void;
  startMatch: (p: {
    gameType?: GameType;
    mode: Mode;
    difficulty: Difficulty;
    size?: BoardSize | ZipSize;
  }) => void;
  cellUpdate: (p: { row: number; col: number; value: Sym | null }) => void;
  zipPathUpdate: (p: { path: ZipCoord[] }) => void;
  reaction: (p: { kind: 'emoji' | 'gif'; content: string }) => void;
  musicControl: (p: MusicControl) => void;
  setSymbols: (p: SymbolPair) => void;
}

// Server -> Client events
export interface S2C {
  roomState: (s: RoomState) => void;
  matchStarted: (m: MatchState) => void;
  boardSync: (p: { board: Grid; opponentFilled: number }) => void;
  zipPathSync: (p: { path: ZipCoord[]; opponentFilled: number }) => void;
  opponentProgress: (p: { slot: Slot; filled: number; total: number }) => void;
  coopCellUpdate: (p: { row: number; col: number; value: Sym | null; bySlot: Slot }) => void;
  matchWon: (p: { winnerSlot: Slot | null; timeMs: number; scores: RoomScores }) => void;
  reaction: (p: { fromSlot: Slot; kind: 'emoji' | 'gif'; content: string }) => void;
  musicSync: (p: MusicControl & { serverTime: number }) => void;
  partnerDisconnected: (p: { slot: Slot }) => void;
  errorMsg: (p: { message: string }) => void;
}
