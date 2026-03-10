import type { Room, PlayerState, HiddenScore, PerceptionMode, RevealPayload, StateSnapshot } from '@shared-field/shared';
import { ROUND_DURATION_MS, MAP_WIDTH, MAP_HEIGHT } from '@shared-field/shared';
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
  return { totalReduction: 0, criticalSaves: 0, actionTimeMs: 0, chainPreventions: 0 };
}

export class GameRoom {
  data: Room;
  simulation: Simulation | null = null;
  broadcastInterval: ReturnType<typeof setInterval> | null = null;
  roundTimer: ReturnType<typeof setTimeout> | null = null;

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
      this.onBroadcast?.({
        players: this.data.players,
        zones: this.data.zones,
        roundEndsAt: this.data.roundEndsAt,
        serverTime: Date.now(),
      });
    }, 150);

    this.roundTimer = setTimeout(() => {
      this.endRound();
    }, ROUND_DURATION_MS);
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

    const gardenScore = garden?.score ?? createScore();
    const fireScore = fire?.score ?? createScore();

    return {
      gardenPlayer: {
        id: garden?.id ?? '',
        score: gardenScore,
      },
      firePlayer: {
        id: fire?.id ?? '',
        score: fireScore,
      },
      zones: this.data.zones,
      mappings: [
        {
          gardenLabel: 'Plants Grown',
          fireLabel: 'Fires Extinguished',
          value: Math.round(gardenScore.totalReduction + fireScore.totalReduction),
        },
        {
          gardenLabel: 'Garden Saves',
          fireLabel: 'Sector Saves',
          value: Math.round(gardenScore.criticalSaves + fireScore.criticalSaves),
        },
        {
          gardenLabel: 'Bloom Chains',
          fireLabel: 'Flare Stops',
          value: Math.round(gardenScore.chainPreventions + fireScore.chainPreventions),
        },
      ],
    };
  }

  cleanup() {
    this.simulation?.stop();
    if (this.broadcastInterval) clearInterval(this.broadcastInterval);
    if (this.roundTimer) clearTimeout(this.roundTimer);
  }
}
