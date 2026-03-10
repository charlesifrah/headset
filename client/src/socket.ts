import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared-field/shared';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const URL = import.meta.env.PROD
  ? window.location.origin
  : 'http://localhost:3001';

export const socket: GameSocket = io(URL, {
  autoConnect: false,
  transports: ['websocket'],
});
