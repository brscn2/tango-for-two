import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import type { C2S, S2C } from '@tango/shared';
import { createDb, createMongoDb } from './db';
import { RoomManager } from './rooms';
import { registerSocketHandlers } from './socket';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3001);
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

const app = express();
const server = http.createServer(app);
const io = new Server<C2S, S2C>(server, {
  cors: { origin: process.env.CORS_ORIGIN ?? '*' },
});

// Use MongoDB (e.g. Atlas) when configured; otherwise fall back to an ephemeral in-memory store.
const db = process.env.MONGODB_URI ? await createMongoDb(process.env.MONGODB_URI) : createDb();
const manager = new RoomManager(db);
registerSocketHandlers(io, manager);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use(express.static(CLIENT_DIST));
app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));

server.listen(PORT, () => console.log(`Tango server on :${PORT}`));

export { app, server, io, manager };
