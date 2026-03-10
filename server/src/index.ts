import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared-field/shared';
import { registerSocketHandlers } from './socketHandlers.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const app = express();
app.use(cors());

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

registerSocketHandlers(io);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

httpServer.listen(PORT, () => {
  console.log(`[server] Shared Field server running on port ${PORT}`);
});
