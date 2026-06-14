import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared-field/shared';
import { MAP_WIDTH, MAP_HEIGHT, COUNTDOWN_SECONDS } from '@shared-field/shared';
import { GameRoom } from './Room.js';

type GameServer = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const rooms = new Map<string, GameRoom>();
const playerRoomMap = new Map<string, string>();

function findRoomByCode(code: string): GameRoom | undefined {
  return rooms.get(code.toUpperCase());
}

export function registerSocketHandlers(io: GameServer) {
  io.on('connection', (socket: GameSocket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on('create_room', () => {
      const room = new GameRoom();
      rooms.set(room.data.id, room);

      const player = room.addPlayer(socket.id);
      playerRoomMap.set(socket.id, room.data.id);
      socket.join(room.data.id);

      // Creator is implicitly ready — only the invitee's Play click is required
      // to start the countdown.
      room.readyPlayers.add(player.id);

      console.log(`[room] created ${room.data.id} by ${player.id}`);

      socket.emit('room_created', {
        roomId: room.data.id,
        playerId: player.id,
        role: player.role,
        partnerPresent: room.data.players.length > 1,
      });
    });

    socket.on('join_room', (roomCode: string) => {
      const room = findRoomByCode(roomCode);

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      if (room.isFull()) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }
      if (room.data.status !== 'waiting') {
        socket.emit('error', { message: 'Game already in progress' });
        return;
      }

      const player = room.addPlayer(socket.id);
      playerRoomMap.set(socket.id, room.data.id);
      socket.join(room.data.id);

      console.log(`[room] ${player.id} joined ${room.data.id}`);

      socket.emit('room_joined', {
        roomId: room.data.id,
        playerId: player.id,
        role: player.role,
        partnerPresent: room.data.players.length > 1,
      });

      // Broadcast to everyone in the room (including the joiner) so both
      // sides flip to the rules screen.
      io.to(room.data.id).emit('player_joined', { playerId: player.id });
    });

    socket.on('player_ready', () => {
      const roomId = playerRoomMap.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || room.data.status !== 'waiting') return;

      const player = room.getPlayerBySocket(socket.id);
      if (!player) return;
      if (room.readyPlayers.has(player.id)) return;

      room.readyPlayers.add(player.id);

      // Tell everyone else in the room that this player is ready
      socket.to(roomId).emit('partner_ready', { playerId: player.id });

      // Start countdown only when every connected player has pressed Play
      if (
        room.isFull() &&
        room.data.players.every((p) => room.readyPlayers.has(p.id))
      ) {
        startCountdown(io, room);
      }
    });

    socket.on('input_move', (data) => {
      const roomId = playerRoomMap.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || room.data.status !== 'playing') return;

      const player = room.getPlayerBySocket(socket.id);
      if (!player) return;

      player.x = Math.max(0, Math.min(MAP_WIDTH, data.x));
      player.y = Math.max(0, Math.min(MAP_HEIGHT, data.y));
    });

    socket.on('input_action_start', (data) => {
      const roomId = playerRoomMap.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || room.data.status !== 'playing') return;

      const player = room.getPlayerBySocket(socket.id);
      if (!player) return;

      const wasActing = player.isActing;
      player.isActing = true;
      player.aimX = data.aimX;
      player.aimY = data.aimY;

      // On a *fresh* press (not the ~50ms aim-update re-emits while held), apply
      // one reduction immediately so the zone starts responding within network
      // RTT instead of waiting up to a full 250ms sim tick. The per-player
      // cooldown inside the sim keeps the overall reduction rate unchanged.
      if (!wasActing) {
        room.simulation?.resolveImmediate(player);
      }
    });

    socket.on('input_action_stop', () => {
      const roomId = playerRoomMap.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.getPlayerBySocket(socket.id);
      if (!player) return;

      player.isActing = false;
    });

    socket.on('request_reveal', () => {
      const roomId = playerRoomMap.get(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || room.data.status !== 'ended') return;

      const payload = room.buildRevealPayload();
      io.to(roomId).emit('reveal_payload', payload);
    });

    socket.on('disconnect', () => {
      console.log(`[socket] disconnected: ${socket.id}`);
      const roomId = playerRoomMap.get(socket.id);
      playerRoomMap.delete(socket.id);

      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          const leaving = room.data.players.find((p) => p.socketId === socket.id);
          if (leaving) room.readyPlayers.delete(leaving.id);
          room.data.players = room.data.players.filter((p) => p.socketId !== socket.id);

          // If a player bails mid-countdown, stop it so it can't fire startMatch
          // into a room that no longer has two players.
          if (room.countdownInterval && room.data.status === 'waiting') {
            clearInterval(room.countdownInterval);
            room.countdownInterval = null;
          }

          if (room.data.players.length === 0) {
            // Last player left -- clean up after a grace period
            setTimeout(() => {
              const current = rooms.get(roomId);
              if (current && current.data.players.length === 0) {
                current.cleanup();
                rooms.delete(roomId);
                console.log(`[room] cleaned up empty room ${roomId}`);
              }
            }, 30_000);
          } else if (room.data.status === 'playing') {
            room.endRound();
          }
        }
      }
    });
  });
}

function startCountdown(io: GameServer, room: GameRoom) {
  let seconds = COUNTDOWN_SECONDS;

  const interval = setInterval(() => {
    io.to(room.data.id).emit('match_countdown', { seconds });
    seconds--;

    if (seconds < 0) {
      clearInterval(interval);
      room.countdownInterval = null;

      room.onBroadcast = (snapshot) => {
        io.to(room.data.id).emit('state_snapshot', snapshot);
      };

      room.onEvent = (evt) => {
        io.to(room.data.id).emit('event_feed', {
          messageKey: evt.type,
          zoneId: evt.zoneId,
          playerId: evt.playerId,
        });
      };

      room.onRoundEnd = () => {
        io.to(room.data.id).emit('round_end', {
          players: room.data.players,
          zones: room.data.zones,
          duration: Date.now() - room.data.createdAt,
        });
      };

      room.startMatch();

      io.to(room.data.id).emit('match_start', {
        roundEndsAt: room.data.roundEndsAt!,
        serverTime: Date.now(),
      });
    }
  }, 1000);

  room.countdownInterval = interval;
}
