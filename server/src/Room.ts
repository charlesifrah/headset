import type { Room, PlayerState, HiddenScore, PerceptionMode, RevealPayload, StateSnapshot } from '@shared-field/shared';
import { ROUND_DURATION_MS, MAP_WIDTH, MAP_HEIGHT, BROADCAST_TICK_MS } from '@shared-field/shared';
import { Simulation, createZones } from './Simulation.js';
import type { SimulationEvent } from './Simulation.js';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createScore(): HiddenScore {
  return { totalReduction: 0 };
}

export class GameRoom {
  data: Room;
  simulation: Simulation | null = null;
  broadcastInterval: ReturnType<typeof setInterval> | null = null;
  roundTimer: ReturnType<typeof setTimeout> | null = null;
  countdownInterval: ReturnType<typeof setInterval> | null = null;
  readyPlayers: Set<string> = new Set();

  onBroadcast?: (snapshot: StateSnapshot) => void;
  onEvent?: (evt: SimulationEvent) => void;
  onRoundEnd?: () => void;

  constructor() {
    this.data = {
      id: generateRoomCode(),
      status: 'waiting',
      createdAt: Date.now(),
      roundEndsAt: null,
      players: [],
      zones: createZones(),
    };
  }

  addPlayer(socketId: string): PlayerState {
    const role: PerceptionMode = this.data.players.length === 0 ? 'garden' : 'fire';
    const spawnX = role === 'garden' ? MAP_WIDTH * 0.3 : MAP_WIDTH * 0.7;
    const spawnY = MAP_HEIGHT / 2;

    const player: PlayerState = {
      id: `player_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      socketId,
      role,
      x: spawnX,
      y: spawnY,
      aimX: 0,
      aimY: -1,
      isActing: false,
      score: createScore(),
    };

    this.data.players.push(player);
    return player;
  }

  getPlayerBySocket(socketId: string): PlayerState | undefined {
    return this.data.players.find((p) => p.socketId === socketId);
  }

  isFull(): boolean {
    return this.data.players.length >= 2;
  }

  startMatch() {
    this.data.status = 'playing';
    this.data.roundEndsAt = Date.now() + ROUND_DURATION_MS;

    this.simulation = new Simulation(this.data.zones, this.data.players);
    this.simulation.onEvent = (evt) => this.onEvent?.(evt);
    this.simulation.start();

    this.broadcastInterval = setInterval(() => {
      this.onBroadcast?.(this.buildSnapshot());
    }, BROADCAST_TICK_MS);

    this.roundTimer = setTimeout(() => {
      this.endRound();
    }, ROUND_DURATION_MS);
  }

  // Lean snapshot for the wire: strips role/socketId so the reveal twist can't
  // be inspected via devtools mid-game.
  private buildSnapshot(): StateSnapshot {
    return {
      players: this.data.players.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        isActing: p.isActing,
        score: p.score,
      })),
      zones: this.data.zones.map((z) => ({
        id: z.id,
        x: z.x,
        y: z.y,
        instability: z.instability,
      })),
      roundEndsAt: this.data.roundEndsAt,
      serverTime: Date.now(),
    };
  }

  endRound() {
    this.data.status = 'ended';
    this.simulation?.stop();
    this.simulation = null;

    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }

    this.onRoundEnd?.();
  }

  buildRevealPayload(): RevealPayload {
    const garden = this.data.players.find((p) => p.role === 'garden');
    const fire = this.data.players.find((p) => p.role === 'fire');

    return {
      gardenPlayer: {
        id: garden?.id ?? '',
        score: garden?.score ?? createScore(),
      },
      firePlayer: {
        id: fire?.id ?? '',
        score: fire?.score ?? createScore(),
      },
      zones: this.data.zones,
    };
  }

  cleanup() {
    this.simulation?.stop();
    if (this.broadcastInterval) clearInterval(this.broadcastInterval);
    if (this.roundTimer) clearTimeout(this.roundTimer);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }
}
