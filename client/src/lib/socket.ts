import { io, type Socket } from 'socket.io-client';
import type { C2S, S2C } from '@tango/shared';

const URL = import.meta.env.VITE_SERVER_URL ?? '';

export type TangoSocket = Socket<S2C, C2S>;

export function createSocket(): TangoSocket {
  return io(URL, { transports: ['websocket'], autoConnect: true });
}
