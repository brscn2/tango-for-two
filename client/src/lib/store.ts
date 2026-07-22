import { create } from 'zustand';
import { cloneGrid, DEFAULT_SYMBOLS, type Avatar, type BoardSize, type Difficulty, type Grid, type MatchState, type Mode, type PlayerInfo, type ScoreEntry, type Slot, type Sym, type SymbolPair } from '@tango/shared';
import { createSocket, type TangoSocket } from './socket';

export interface FloatingReaction { id: number; fromSlot: Slot; kind: 'emoji' | 'gif'; content: string; }

interface State {
  socket: TangoSocket | null;
  connected: boolean;
  code: string | null;
  slot: Slot | null;
  lastName: string | null;
  lastAvatar: Avatar | null;
  players: PlayerInfo[];
  scores: ScoreEntry[];
  match: MatchState | null;
  myBoard: Grid | null;
  opponentFilled: number;
  reactions: FloatingReaction[];
  music: { videoId?: string; action?: string; positionSec?: number; serverTime?: number };
  symbols: SymbolPair;
  error: string | null;

  connect(): void;
  createRoom(name: string, avatar: Avatar): Promise<void>;
  joinRoom(code: string, name: string, avatar: Avatar): Promise<{ ok: boolean; error?: string }>;
  startMatch(mode: Mode, difficulty: Difficulty, size?: BoardSize): void;
  setCell(row: number, col: number, value: Sym | null): void;
  sendReaction(kind: 'emoji' | 'gif', content: string): void;
  musicControl(action: 'load' | 'play' | 'pause' | 'seek', videoId?: string, positionSec?: number): void;
  setSymbols(pair: SymbolPair): void;
  dismissReaction(id: number): void;
}

let reactionSeq = 0;

export const useStore = create<State>((set, get) => ({
  socket: null,
  connected: false,
  code: null,
  slot: null,
  lastName: null,
  lastAvatar: null,
  players: [],
  scores: [],
  match: null,
  myBoard: null,
  opponentFilled: 0,
  reactions: [],
  music: {},
  symbols: DEFAULT_SYMBOLS,
  error: null,

  connect() {
    if (get().socket) return;
    const socket = createSocket();

    socket.on('connect', () => {
      set({ connected: true });
      const { code, lastName, lastAvatar } = get();
      // Reclaim room slot after reconnect; skip before the user has entered a room.
      if (code && lastName && lastAvatar) {
        socket.emit('joinRoom', { code, name: lastName, avatar: lastAvatar }, (r) => {
          if (r.ok && r.slot !== undefined) set({ slot: r.slot });
        });
      }
    });
    socket.on('disconnect', () => set({ connected: false }));

    socket.on('roomState', (s) => {
      const myBoard = s.match
        ? (get().myBoard ?? cloneGrid(s.match.puzzle.clues))
        : null;
      set({ code: s.code, players: s.players, scores: s.scores, match: s.match, symbols: s.symbols, myBoard });
    });
    socket.on('matchStarted', (m) => set({ match: m, myBoard: cloneGrid(m.puzzle.clues), opponentFilled: 0 }));
    socket.on('boardSync', ({ board, opponentFilled }) => set({ myBoard: board, opponentFilled }));
    socket.on('opponentProgress', (p) => { if (p.slot !== get().slot) set({ opponentFilled: p.filled }); });
    socket.on('coopCellUpdate', (p) => {
      const board = get().myBoard;
      if (!board || p.bySlot === get().slot) return;
      const next = cloneGrid(board);
      next[p.row][p.col] = p.value;
      set({ myBoard: next });
    });
    socket.on('matchWon', (p) => {
      set((st) => ({ scores: p.scores, match: st.match ? { ...st.match, status: 'won', winnerSlot: p.winnerSlot } : null }));
    });
    socket.on('reaction', (p) => {
      const id = ++reactionSeq;
      set((st) => ({ reactions: [...st.reactions, { id, ...p }] }));
    });
    socket.on('musicSync', (p) => set({ music: p }));
    socket.on('errorMsg', (p) => set({ error: p.message }));

    set({ socket });
  },

  createRoom(name, avatar) {
    return new Promise((resolve) => {
      const socket = get().socket!;
      socket.emit('createRoom', { name, avatar }, ({ code, slot }) => {
        set({ code, slot, lastName: name, lastAvatar: avatar });
        // Apply the symbols chosen on the landing page to the new room.
        socket.emit('setSymbols', get().symbols);
        resolve();
      });
    });
  },

  joinRoom(code, name, avatar) {
    return new Promise((resolve) => {
      const socket = get().socket!;
      socket.emit('joinRoom', { code, name, avatar }, (r) => {
        if (r.ok && r.slot !== undefined) {
          set({ code, slot: r.slot, lastName: name, lastAvatar: avatar });
        }
        resolve({ ok: r.ok, error: r.error });
      });
    });
  },

  startMatch(mode, difficulty, size = 6) { get().socket!.emit('startMatch', { mode, difficulty, size }); },

  setCell(row, col, value) {
    const board = get().myBoard;
    if (!board) return;
    const next = cloneGrid(board);
    next[row][col] = value;
    set({ myBoard: next });
    get().socket!.emit('cellUpdate', { row, col, value });
  },

  sendReaction(kind, content) {
    get().socket!.emit('reaction', { kind, content });
    // Show our own reaction locally too.
    const id = ++reactionSeq;
    const slot = get().slot ?? 0;
    set((st) => ({ reactions: [...st.reactions, { id, fromSlot: slot, kind, content }] }));
  },

  musicControl(action, videoId, positionSec) {
    get().socket!.emit('musicControl', { action, videoId, positionSec });
  },

  setSymbols(pair) {
    set({ symbols: pair }); // optimistic; server echoes via roomState
    get().socket!.emit('setSymbols', pair);
  },

  dismissReaction(id) { set((st) => ({ reactions: st.reactions.filter((r) => r.id !== id) })); },
}));
