import { describe, it, expect, afterEach } from 'vitest';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io as Client, type Socket } from 'socket.io-client';
import { createDb } from '../src/db';
import { RoomManager } from '../src/rooms';
import { registerSocketHandlers } from '../src/socket';
import { generatePuzzle, mulberry32, type Difficulty } from '@tango/shared';

let server: http.Server;
const clients: Socket[] = [];

function start() {
  server = http.createServer();
  const ioServer = new Server(server);
  const gen = (d: Difficulty) => generatePuzzle(d, mulberry32(999));
  const manager = new RoomManager(createDb(':memory:'), gen);
  registerSocketHandlers(ioServer, manager);
  return new Promise<{ url: string; manager: RoomManager }>((resolve) => {
    server.listen(() => {
      const { port } = server.address() as AddressInfo;
      resolve({ url: `http://localhost:${port}`, manager });
    });
  });
}

afterEach(() => {
  clients.forEach((c) => c.close());
  clients.length = 0;
  server?.close();
});

function connect(url: string) {
  const c = Client(url, { transports: ['websocket'] });
  clients.push(c);
  return c;
}

describe('socket race flow', () => {
  it('two players join, start a race, and one solving triggers matchWon', async () => {
    const { url, manager } = await start();
    const a = connect(url);
    const b = connect(url);

    const code: string = await new Promise((resolve) =>
      a.emit('createRoom', { name: 'A', avatar: 'bee' }, (r: any) => resolve(r.code)),
    );
    await new Promise((resolve) =>
      b.emit('joinRoom', { code, name: 'B', avatar: 'flower' }, () => resolve(null)),
    );

    const matchStarted = new Promise<any>((resolve) => a.on('matchStarted', resolve));
    a.emit('startMatch', { mode: 'race', difficulty: 'easy' });
    const match = await matchStarted;

    const solution = manager.getSolution(code)!;
    const won = new Promise<any>((resolve) => a.on('matchWon', resolve));

    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (match.puzzle.clues[r][c] !== null) continue;
        a.emit('cellUpdate', { row: r, col: c, value: solution[r][c] });
      }
    }

    const result = await won;
    expect(result.winnerSlot).toBe(0);
    expect(result.scores.find((s: any) => s.slot === 0).wins).toBe(1);
  });
});
