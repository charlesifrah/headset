import { useRef, useEffect } from 'react';
import type { PerceptionMode, ZoneState } from '@shared-field/shared';
import { MAP_WIDTH, MAP_HEIGHT, ZONE_RADIUS } from '@shared-field/shared';
import { drawGardenZoneDecoration, drawFireZoneDecoration } from '../game/zoneDecorations';

type Props = {
  mode: PerceptionMode;
  zones: ZoneState[];
};

/**
 * Transparent canvas overlay that draws only the flame/flower decorations
 * on top of the Phaser canvas. Phaser handles background + zone circles.
 * pointer-events: none so all input passes through to Phaser.
 */
export function ZoneCanvas({ mode, zones }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zonesRef  = useRef(zones);
  useEffect(() => { zonesRef.current = zones; }, [zones]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let raf: number;
    const start = performance.now();

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w   = canvas!.clientWidth;
      const h   = canvas!.clientHeight;
      if (canvas!.width !== Math.round(w * dpr) || canvas!.height !== Math.round(h * dpr)) {
        canvas!.width  = Math.round(w * dpr);
        canvas!.height = Math.round(h * dpr);
      }
    }

    resize();
    window.addEventListener('resize', resize);

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      // Use actual canvas pixel dimensions (set by resize()), not clientWidth
      const w   = canvas!.width  / dpr;
      const h   = canvas!.height / dpr;

      if (w === 0 || h === 0) { raf = requestAnimationFrame(draw); return; }

      const ctx = canvas!.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Fully transparent each frame — Phaser draws background + circles below
      ctx.clearRect(0, 0, w, h);

      const t = (performance.now() - start) / 1000;

      // Match Phaser Scale.FIT exactly
      const scale   = Math.min(w / MAP_WIDTH, h / MAP_HEIGHT);
      const offsetX = (w - MAP_WIDTH  * scale) / 2;
      const offsetY = (h - MAP_HEIGHT * scale) / 2;
      const r       = ZONE_RADIUS * scale;

      for (const zone of zonesRef.current) {
        const cx = Math.round(zone.x * scale + offsetX);
        const cy = Math.round(zone.y * scale + offsetY);

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
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    />
  );
}
