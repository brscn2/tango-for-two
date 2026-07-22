import type { Server, Socket } from 'socket.io';
import type { Avatar, BoardSize, C2S, Difficulty, Mode, MusicControl, S2C, Slot, Sym, SymbolPair } from '@tango/shared';
import type { RoomManager } from './rooms';

interface Session { code: string; slot: Slot; }

export function registerSocketHandlers(io: Server<C2S, S2C>, manager: RoomManager): void {
  io.on('connection', (socket: Socket<C2S, S2C>) => {
    let session: Session | null = null;

    const broadcastRoomState = (code: string) => {
      const state = manager.getRoomState(code);
      if (state) io.to(code).emit('roomState', state);
    };

    socket.on('createRoom', ({ name, avatar }: { name: string; avatar: Avatar }, cb) => {
      const { code, slot } = manager.createRoom(name, avatar);
      session = { code, slot };
      manager.setConnected(code, slot, true, socket.id);
      socket.join(code);
      cb({ code, slot });
      broadcastRoomState(code);
      const board = manager.getBoardState(code, slot);
      if (board) socket.emit('boardSync', board);
    });

    socket.on('joinRoom', ({ code, name, avatar }: { code: string; name: string; avatar: Avatar }, cb) => {
      const res = manager.joinRoom(code, name, avatar);
      if (!res.ok || res.slot === undefined) { cb(res); return; }
      session = { code, slot: res.slot };
      manager.setConnected(code, res.slot, true, socket.id);
      socket.join(code);
      cb(res);
      broadcastRoomState(code);
      const board = manager.getBoardState(code, res.slot);
      if (board) socket.emit('boardSync', board);
    });

    socket.on('startMatch', ({ mode, difficulty, size }: { mode: Mode; difficulty: Difficulty; size?: BoardSize }) => {
      if (!session) return;
      const match = manager.startMatch(session.code, mode, difficulty, size ?? 6);
      io.to(session.code).emit('matchStarted', match);
    });

    socket.on('cellUpdate', ({ row, col, value }: { row: number; col: number; value: Sym | null }) => {
      if (!session) return;
      const res = manager.applyCell(session.code, session.slot, row, col, value);
      if (res.progress) socket.to(session.code).emit('opponentProgress', res.progress);
      if (res.coop) socket.to(session.code).emit('coopCellUpdate', res.coop);
      if (res.won) io.to(session.code).emit('matchWon', res.won);
    });

    socket.on('reaction', ({ kind, content }: { kind: 'emoji' | 'gif'; content: string }) => {
      if (!session) return;
      socket.to(session.code).emit('reaction', { fromSlot: session.slot, kind, content });
    });

    socket.on('musicControl', (ctrl: MusicControl) => {
      if (!session) return;
      // Broadcast to everyone (including sender) with a server timestamp for drift correction.
      io.to(session.code).emit('musicSync', { ...ctrl, serverTime: Date.now() });
    });

    socket.on('setSymbols', (symbols: SymbolPair) => {
      if (!session) return;
      manager.setSymbols(session.code, symbols);
      broadcastRoomState(session.code);
    });

    socket.on('disconnect', () => {
      if (!session) return;
      manager.setConnected(session.code, session.slot, false, null);
      socket.to(session.code).emit('partnerDisconnected', { slot: session.slot });
      broadcastRoomState(session.code);
    });
  });
}
