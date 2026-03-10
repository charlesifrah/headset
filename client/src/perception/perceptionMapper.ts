import type { PerceptionMode } from '@shared-field/shared';
import {
  THRESHOLD_CALM,
  THRESHOLD_EMERGING,
  THRESHOLD_ACTIVE,
} from '@shared-field/shared';

// ---- Smooth color interpolation (matches GamePreview rendering) ----

type RGB = [number, number, number];

function hexToRgb(hex: number): RGB {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function lerpInt(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function lerpRgb(a: RGB, b: RGB, t: number): number {
  return (lerpInt(a[0], b[0], t) << 16) | (lerpInt(a[1], b[1], t) << 8) | lerpInt(a[2], b[2], t);
}

function multiLerpColor(stops: number[], t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const segments = stops.length - 1;
  const idx = Math.min(Math.floor(clamped * segments), segments - 1);
  const local = clamped * segments - idx;
  return lerpRgb(hexToRgb(stops[idx]), hexToRgb(stops[idx + 1]), local);
}

const GARDEN_FILL_STOPS   = [0x1e3a28, 0x2a4a20, 0x4a3518, 0x3a1a0a];
const GARDEN_STROKE_STOPS = [0x2a5a3a, 0x3a6030, 0x5a4520, 0x552810];
const FIRE_FILL_STOPS     = [0x1e2230, 0x3a2010, 0x6a1a1a, 0x8a2020];
const FIRE_STROKE_STOPS   = [0x2a3045, 0x4a2a15, 0x802020, 0xa52a2a];

export function getZoneColorsSmooth(instability: number, mode: PerceptionMode): { fillColor: number; strokeColor: number } {
  const t = instability / 100;
  if (mode === 'garden') {
    return { fillColor: multiLerpColor(GARDEN_FILL_STOPS, t), strokeColor: multiLerpColor(GARDEN_STROKE_STOPS, t) };
  }
  return { fillColor: multiLerpColor(FIRE_FILL_STOPS, t), strokeColor: multiLerpColor(FIRE_STROKE_STOPS, t) };
}

export type ThresholdLevel = 'calm' | 'emerging' | 'active' | 'critical';

export type ZoneVisual = {
  fillColor: number;
  strokeColor: number;
  urgency: 0 | 1 | 2 | 3; // 0=fine, 1=watch, 2=help, 3=urgent
  alpha: number;
  glowColor: number;
  borderWidth: number;
};

export type SprayVisual = {
  color: number;
};

export function getLevel(instability: number): ThresholdLevel {
  if (instability <= THRESHOLD_CALM) return 'calm';
  if (instability <= THRESHOLD_EMERGING) return 'emerging';
  if (instability <= THRESHOLD_ACTIVE) return 'active';
  return 'critical';
}

const gardenZoneMap: Record<ThresholdLevel, ZoneVisual> = {
  calm:     { fillColor: 0x1e3a28, strokeColor: 0x2a5a3a, urgency: 0, alpha: 1.0, glowColor: 0x22c55e, borderWidth: 1.5 },
  emerging: { fillColor: 0x2a4a20, strokeColor: 0x3a6030, urgency: 1, alpha: 1.0, glowColor: 0xa3e635, borderWidth: 2 },
  active:   { fillColor: 0x4a3518, strokeColor: 0x5a4520, urgency: 2, alpha: 1.0, glowColor: 0xfbbf24, borderWidth: 2.5 },
  critical: { fillColor: 0x3a1a0a, strokeColor: 0x552810, urgency: 3, alpha: 1.0, glowColor: 0xef4444, borderWidth: 3 },
};

const fireZoneMap: Record<ThresholdLevel, ZoneVisual> = {
  calm:     { fillColor: 0x1e2230, strokeColor: 0x2a3045, urgency: 0, alpha: 1.0, glowColor: 0x64748b, borderWidth: 1.5 },
  emerging: { fillColor: 0x3a2010, strokeColor: 0x4a2a15, urgency: 1, alpha: 1.0, glowColor: 0xf59e0b, borderWidth: 2 },
  active:   { fillColor: 0x6a1a1a, strokeColor: 0x802020, urgency: 2, alpha: 1.0, glowColor: 0xef4444, borderWidth: 2.5 },
  critical: { fillColor: 0x8a2020, strokeColor: 0xa52a2a, urgency: 3, alpha: 1.0, glowColor: 0xfef08a, borderWidth: 3 },
};

export function getZoneVisual(instability: number, mode: PerceptionMode): ZoneVisual {
  const level = getLevel(instability);
  const map = mode === 'garden' ? gardenZoneMap : fireZoneMap;
  return map[level];
}

export function getSprayVisual(mode: PerceptionMode): SprayVisual {
  return mode === 'garden'
    ? { color: 0x38bdf8 }
    : { color: 0xfef3c7 };
}

export function getBackgroundColor(mode: PerceptionMode): number {
  return mode === 'garden' ? 0x1a3a2a : 0x1a1a2e;
}

export function getRoleName(mode: PerceptionMode): string {
  return mode === 'garden' ? 'Garden Keeper' : 'Fire Fighter';
}

export function getActionVerb(mode: PerceptionMode): string {
  return mode === 'garden' ? 'Water' : 'Spray';
}
