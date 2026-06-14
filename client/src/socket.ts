import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared-field/shared';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const URL = import.meta.env.PROD
  ? 'https://shared-fieldserver-production.up.railway.app'
  : 'http://localhost:3001';

export const socket: GameSocket = io(URL, {
  autoConnect: false,
  // Prefer WebSocket directly so the realtime game traffic skips the HTTP
  // long-poll handshake + upgrade round-trip at match start. Polling stays as a
  // fallback for networks that block raw WebSocket.
  transports: ['websocket', 'polling'],
});
