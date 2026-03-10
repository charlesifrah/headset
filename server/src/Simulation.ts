import type { ZoneState, PlayerState } from '@shared-field/shared';
import {
  SIMULATION_TICK_MS,
  GRID_COLS,
  GRID_ROWS,
  MAP_WIDTH,
  MAP_HEIGHT,
  INSTABILITY_MAX,
  INSTABILITY_MIN,
  ESCALATION_ZONES_MIN,
  ESCALATION_ZONES_MAX,
  ESCALATION_AMOUNT_MIN,
  ESCALATION_AMOUNT_MAX,
  NATURAL_DECAY_RATE,
  SPREAD_THRESHOLD,
  SPREAD_SUSTAIN_TICKS,
  SPREAD_AMOUNT_MIN,
  SPREAD_AMOUNT_MAX,
  SPREAD_MAX_NEIGHBORS,
  ACTION_RANGE,
  ACTION_REDUCTION_PER_TICK,
  CRITICAL_SAVE_THRESHOLD,
  ZONE_RADIUS,
} from '@shared-field/shared';

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function createZones(): ZoneState[] {
  const zones: ZoneState[] = [];
  const marginX = MAP_WIDTH / (GRID_COLS + 1);
  const marginY = MAP_HEIGHT / (GRID_ROWS + 1);

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      zones.push({
        id: `zone_${row}_${col}`,
        x: marginX * (col + 1),
        y: marginY * (row + 1),
        instability: rand(5, 30),
        lastContributors: [],
      });
    }
  }
  return zones;
}

function getNeighborIds(zoneId: string, zones: ZoneState[]): string[] {
  const parts = zoneId.split('_');
  const row = parseInt(parts[1]);
  const col = parseInt(parts[2]);
  const neighbors: string[] = [];

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      if (Math.abs(dr) + Math.abs(dc) > 1) continue; // cardinal only, no diagonals
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS) {
        const nId = `zone_${nr}_${nc}`;
        if (zones.find((z) => z.id === nId)) {
          neighbors.push(nId);
        }
      }
    }
  }
  return neighbors;
}

export type SimulationEvent = {
  type: 'zone_saved' | 'chain_started' | 'zone_critical' | 'partner_helped_zone';
  zoneId: string;
  playerId: string;
};

export class Simulation {
  zones: ZoneState[];
  players: PlayerState[];
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private criticalTickCounters: Map<string, number> = new Map();
  private tickCount = 0;
  onEvent?: (evt: SimulationEvent) => void;

  constructor(zones: ZoneState[], players: PlayerState[]) {
    this.zones = zones;
    this.players = players;
  }

  start() {
    this.tickInterval = setInterval(() => this.tick(), SIMULATION_TICK_MS);
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  private tick() {
    this.tickCount++;
    this.escalateZones();
    this.applyPlayerActions();
    this.applySpread();
  }

  private escalateZones() {
    // Ramp up difficulty over time: first 10 seconds are gentle
    const rampMultiplier = Math.min(1, this.tickCount / 40); // reaches full strength at ~10s
    const count = rand(ESCALATION_ZONES_MIN, ESCALATION_ZONES_MAX);
    const indices = new Set<number>();
    while (indices.size < count) {
      indices.add(rand(0, this.zones.length - 1));
    }

    for (const idx of indices) {
      const zone = this.zones[idx];
      const baseAmount = randFloat(ESCALATION_AMOUNT_MIN, ESCALATION_AMOUNT_MAX);
      const amount = baseAmount * rampMultiplier;
      const prev = zone.instability;
      zone.instability = clamp(zone.instability + amount, INSTABILITY_MIN, INSTABILITY_MAX);

      if (prev < SPREAD_THRESHOLD && zone.instability >= SPREAD_THRESHOLD) {
        this.onEvent?.({ type: 'zone_critical', zoneId: zone.id, playerId: '' });
      }
    }
  }

  private applyNaturalDecay() {
    for (const zone of this.zones) {
      if (zone.instability > 0 && zone.instability < SPREAD_THRESHOLD) {
        zone.instability = clamp(
          zone.instability - NATURAL_DECAY_RATE,
          INSTABILITY_MIN,
          INSTABILITY_MAX
        );
      }
    }
  }

  private applyPlayerActions() {
    const now = Date.now();

    for (const player of this.players) {
      if (!player.isActing) continue;

      player.score.actionTimeMs += SIMULATION_TICK_MS;

      let bestZone: ZoneState | null = null;
      let bestDist = Infinity;

      for (const zone of this.zones) {
        const dist = distance(player.x, player.y, zone.x, zone.y);
        if (dist <= ACTION_RANGE + ZONE_RADIUS && dist < bestDist) {
          bestDist = dist;
          bestZone = zone;
        }
      }

      if (!bestZone) continue;

      const prevInstability = bestZone.instability;
      const reduction = Math.min(bestZone.instability, ACTION_REDUCTION_PER_TICK);
      bestZone.instability = clamp(bestZone.instability - reduction, INSTABILITY_MIN, INSTABILITY_MAX);

      if (reduction > 0) {
        player.score.totalReduction += reduction;

        bestZone.lastContributors.push({
          playerId: player.id,
          contribution: reduction,
          timestamp: now,
        });
        if (bestZone.lastContributors.length > 20) {
          bestZone.lastContributors = bestZone.lastContributors.slice(-20);
        }

        if (prevInstability >= SPREAD_THRESHOLD && bestZone.instability < CRITICAL_SAVE_THRESHOLD) {
          player.score.criticalSaves += 1;
          this.onEvent?.({ type: 'zone_saved', zoneId: bestZone.id, playerId: player.id });
        }
      }
    }
  }

  private applySpread() {
    for (const zone of this.zones) {
      if (zone.instability >= SPREAD_THRESHOLD) {
        const counter = (this.criticalTickCounters.get(zone.id) || 0) + 1;
        this.criticalTickCounters.set(zone.id, counter);

        if (counter >= SPREAD_SUSTAIN_TICKS) {
          const neighborIds = getNeighborIds(zone.id, this.zones);
          // Pick a limited number of random neighbors to spread to
          const shuffled = neighborIds.sort(() => Math.random() - 0.5);
          const targets = shuffled.slice(0, SPREAD_MAX_NEIGHBORS);

          for (const nId of targets) {
            const neighbor = this.zones.find((z) => z.id === nId);
            if (neighbor) {
              const spreadAmt = rand(SPREAD_AMOUNT_MIN, SPREAD_AMOUNT_MAX);
              neighbor.instability = clamp(neighbor.instability + spreadAmt, INSTABILITY_MIN, INSTABILITY_MAX);
            }
          }

          this.criticalTickCounters.set(zone.id, 0);

          const recentContributors = zone.lastContributors
            .filter((c) => Date.now() - c.timestamp < 5000);
          for (const c of recentContributors) {
            const player = this.players.find((p) => p.id === c.playerId);
            if (player) player.score.chainPreventions += 1;
          }

          this.onEvent?.({ type: 'chain_started', zoneId: zone.id, playerId: '' });
        }
      } else {
        this.criticalTickCounters.delete(zone.id);
      }
    }
  }
}
