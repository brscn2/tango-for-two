import type { Server, Socket } from 'socket.io';
import type {
  Avatar, BoardSize, C2S, Difficulty, GameType, Mode, MusicControl, S2C, Slot, Sym, SymbolPair, ZipCoord, ZipSize,
} from '@tango/shared';
import type { RoomManager } from './rooms';

interface Session { code: string; slot: Slot; }

export function registerSocketHandlers(io: Server<C2S, S2C>, manager: RoomManager): void {
  io.on('connection', (socket: Socket<C2S, S2C>) => {
    let session: Session | null = null;

    const broadcastRoomState = (code: string) => {
      const state = manager.getRoomState(code);
      if (state) io.to(code).emit('roomState', state);
    };

    const syncPrivateState = (code: string, slot: Slot) => {
      const board = manager.getBoardState(code, slot);
      if (board) socket.emit('boardSync', board);
      const zip = manager.getZipPathState(code, slot);
      if (zip) socket.emit('zipPathSync', zip);
    };

    socket.on('createRoom', ({ name, avatar }: { name: string; avatar: Avatar }, cb) => {
      const { code, slot } = manager.createRoom(name, avatar);
      session = { code, slot };
      manager.setConnected(code, slot, true, socket.id);
      socket.join(code);
      cb({ code, slot });
      broadcastRoomState(code);
      syncPrivateState(code, slot);
    });

    socket.on('joinRoom', ({ code, name, avatar }: { code: string; name: string; avatar: Avatar }, cb) => {
      const res = manager.joinRoom(code, name, avatar);
      if (!res.ok || res.slot === undefined) { cb(res); return; }
      session = { code, slot: res.slot };
      manager.setConnected(code, res.slot, true, socket.id);
      socket.join(code);
      cb(res);
      broadcastRoomState(code);
      syncPrivateState(code, res.slot);
    });

    socket.on('startMatch', ({
      mode, difficulty, size, gameType,
    }: {
      mode: Mode;
      difficulty: Difficulty;
      size?: BoardSize | ZipSize;
      gameType?: GameType;
    }) => {
      if (!session) return;
      try {
        const match = manager.startMatch(
          session.code,
          mode,
          difficulty,
          size ?? 6,
          gameType ?? 'tango',
        );
        io.to(session.code).emit('matchStarted', match);
      } catch (e) {
        socket.emit('errorMsg', { message: (e as Error).message });
      }
    });

    socket.on('cellUpdate', ({ row, col, value }: { row: number; col: number; value: Sym | null }) => {
      if (!session) return;
      const res = manager.applyCell(session.code, session.slot, row, col, value);
      if (res.progress) socket.to(session.code).emit('opponentProgress', res.progress);
      if (res.coop) socket.to(session.code).emit('coopCellUpdate', res.coop);
      if (res.won) io.to(session.code).emit('matchWon', res.won);
    });

    socket.on('zipPathUpdate', ({ path }: { path: ZipCoord[] }) => {
      if (!session) return;
      const res = manager.applyZipPath(session.code, session.slot, path);
      if (res.progress) socket.to(session.code).emit('opponentProgress', res.progress);
      if (res.won) io.to(session.code).emit('matchWon', res.won);
    });

    socket.on('reaction', ({ kind, content }: { kind: 'emoji' | 'gif'; content: string }) => {
      if (!session) return;
      socket.to(session.code).emit('reaction', { fromSlot: session.slot, kind, content });
    });

    socket.on('musicControl', (ctrl: MusicControl) => {
      if (!session) return;
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
