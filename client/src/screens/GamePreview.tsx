import { useRef, useEffect } from 'react';
import type { PerceptionMode, ZoneState } from '@shared-field/shared';
import { MAP_WIDTH, MAP_HEIGHT, ZONE_RADIUS } from '@shared-field/shared';
import { drawGardenZoneDecoration, drawFireZoneDecoration } from '../game/zoneDecorations';

type Props = {
  mode: PerceptionMode;
  zones: ZoneState[];
};

const GARDEN_BG = '#1a3a2a';
const FIRE_BG = '#1a1a2e';

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpRgb(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

const GARDEN_FILLS = [hexToRgb('#1e3a28'), hexToRgb('#2a4a20'), hexToRgb('#4a3518'), hexToRgb('#3a1a0a')];
const GARDEN_STROKES = [hexToRgb('#2a5a3a'), hexToRgb('#3a6030'), hexToRgb('#5a4520'), hexToRgb('#552810')];
const FIRE_FILLS = [hexToRgb('#1e2230'), hexToRgb('#3a2010'), hexToRgb('#6a1a1a'), hexToRgb('#8a2020')];
const FIRE_STROKES = [hexToRgb('#2a3045'), hexToRgb('#4a2a15'), hexToRgb('#802020'), hexToRgb('#a52a2a')];

function multiLerp(stops: [number, number, number][], t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const segments = stops.length - 1;
  const idx = Math.min(Math.floor(clamped * segments), segments - 1);
  const local = (clamped * segments) - idx;
  return lerpRgb(stops[idx], stops[idx + 1], local);
}

function getColors(mode: PerceptionMode, inst: number) {
  const t = inst / 100;
  if (mode === 'garden') {
    return { fill: multiLerp(GARDEN_FILLS, t), stroke: multiLerp(GARDEN_STROKES, t) };
  }
  return { fill: multiLerp(FIRE_FILLS, t), stroke: multiLerp(FIRE_STROKES, t) };
}

export function GamePreview({ mode, zones }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const bg = mode === 'garden' ? GARDEN_BG : FIRE_BG;

    let raf: number;
    const start = performance.now();

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
    }

    resize();
    window.addEventListener('resize', resize);

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;

      if (canvas!.width !== w * dpr || canvas!.height !== h * dpr) {
        canvas!.width = w * dpr;
        canvas!.height = h * dpr;
      }

      const ctx = canvas!.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const t = (performance.now() - start) / 1000;

      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const scaleX = w / MAP_WIDTH;
      const scaleY = h / MAP_HEIGHT;
      const scale = Math.max(scaleX, scaleY);
      const offsetX = (w - MAP_WIDTH * scale) / 2;
      const offsetY = (h - MAP_HEIGHT * scale) / 2;

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      const gridStep = 40 * scale;
      const gridStartX = offsetX % gridStep;
      const gridStartY = offsetY % gridStep;
      for (let gx = gridStartX; gx < w; gx += gridStep) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (let gy = gridStartY; gy < h; gy += gridStep) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }

      const r = ZONE_RADIUS * scale;

      for (const zone of zones) {
        const cx = zone.x * scale + offsetX;
        const cy = zone.y * scale + offsetY;
        const intensity = zone.instability / 100;
        const colors = getColors(mode, zone.instability);

        ctx.globalAlpha = 0.75 + intensity * 0.15;
        ctx.fillStyle = colors.fill;
        ctx.beginPath();
        ctx.arc(cx, cy, r + intensity * 4 * scale, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.65 + intensity * 0.15;
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = (1.5 + intensity * 1.5) * scale;
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.strokeStyle = `rgba(255,255,255,${0.06 + intensity * 0.06})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        if (mode === 'garden') {
          drawGardenZoneDecoration(ctx, cx, cy, r, zone.instability, t, scale);
        } else {
          drawFireZoneDecoration(ctx, cx, cy, r, zone.instability, t, scale);
        }
      }

      raf = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [mode, zones]);

  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}

