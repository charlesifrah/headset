import { useRef, useEffect } from 'react';
import type { PerceptionMode } from '@shared-field/shared';
import { drawGardenZoneDecoration, drawFireZoneDecoration } from '../game/zoneDecorations';

// ─── colour helpers (same stops as GamePreview) ──────────────────────────────

type RGB = [number, number, number];
function hexToRgb(h: string): RGB { const n = parseInt(h.slice(1), 16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function lerpRgb(a: RGB, b: RGB, t: number) { return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`; }
function multiLerp(stops: RGB[], t: number) {
  const c = Math.max(0, Math.min(1, t)), seg = stops.length - 1;
  const i = Math.min(Math.floor(c * seg), seg - 1);
  return lerpRgb(stops[i], stops[i + 1], c * seg - i);
}
const GF = [hexToRgb('#1e3a28'),hexToRgb('#2a4a20'),hexToRgb('#4a3518'),hexToRgb('#3a1a0a')];
const GS = [hexToRgb('#2a5a3a'),hexToRgb('#3a6030'),hexToRgb('#5a4520'),hexToRgb('#552810')];
const FF = [hexToRgb('#1e2230'),hexToRgb('#3a2010'),hexToRgb('#6a1a1a'),hexToRgb('#8a2020')];
const FS = [hexToRgb('#2a3045'),hexToRgb('#4a2a15'),hexToRgb('#802020'),hexToRgb('#a52a2a')];
function zoneColors(mode: PerceptionMode, inst: number) {
  const t = inst / 100;
  return mode === 'garden'
    ? { fill: multiLerp(GF, t), stroke: multiLerp(GS, t) }
    : { fill: multiLerp(FF, t), stroke: multiLerp(FS, t) };
}

// ─── state metadata ──────────────────────────────────────────────────────────

const STATES = [
  { instability:  8, fireLabel: 'Ember',   gardenLabel: 'Full Bloom', range: '0 – 16' },
  { instability: 25, fireLabel: 'XS',      gardenLabel: 'Healthy',    range: '17 – 33' },
  { instability: 42, fireLabel: 'Small',   gardenLabel: 'Stressed',   range: '34 – 49' },
  { instability: 58, fireLabel: 'Medium',  gardenLabel: 'Wilting',    range: '50 – 65' },
  { instability: 75, fireLabel: 'Large',   gardenLabel: 'Dying',      range: '66 – 82' },
  { instability: 91, fireLabel: 'Massive', gardenLabel: 'Dead Twigs', range: '83 – 100' },
];

// ─── single animated zone cell ───────────────────────────────────────────────

const RADIUS = 68;
const PAD    = 28;
const SIZE   = RADIUS * 2 + PAD * 2;

function ZoneCell({ mode, instability, label }: { mode: PerceptionMode; instability: number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const dpr    = window.devicePixelRatio || 1;
    canvas.width  = Math.round(SIZE * dpr);
    canvas.height = Math.round(SIZE * dpr);

    const ctx   = canvas.getContext('2d')!;
    const start = performance.now();
    let   raf: number;

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, SIZE, SIZE);

      const t         = (performance.now() - start) / 1000;
      const cx        = SIZE / 2;
      const cy        = SIZE / 2;
      const r         = RADIUS;
      const intensity = instability / 100;
      const colors    = zoneColors(mode, instability);

      // zone circle
      ctx.globalAlpha = 0.75 + intensity * 0.15;
      ctx.fillStyle   = colors.fill;
      ctx.beginPath(); ctx.arc(cx, cy, r + intensity * 4, 0, Math.PI * 2); ctx.fill();

      ctx.globalAlpha = 0.65 + intensity * 0.15;
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth   = 1.5 + intensity * 1.5;
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(255,255,255,${0.06 + intensity * 0.06})`;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;

      // decoration (sc = 1 — canvas is already DPR-scaled via setTransform)
      if (mode === 'garden') {
        drawGardenZoneDecoration(ctx, cx, cy, r, instability, t, 1);
      } else {
        drawFireZoneDecoration(ctx, cx, cy, r, instability, t, 1);
      }

      raf = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(raf);
  }, [mode, instability]);

  return (
    <div style={cellStyle}>
      <canvas ref={ref} style={{ width: SIZE, height: SIZE, display: 'block' }} />
      <span style={labelStyle}>{label}</span>
    </div>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

type Props = { onBack: () => void };

export function DevPreview({ onBack }: Props) {
  return (
    <div style={page}>
      <div style={header}>
        <button style={backBtn} onClick={onBack}>← Back</button>
        <h1 style={title}>Zone State Preview</h1>
      </div>

      <section style={section}>
        <h2 style={{ ...sectionTitle, color: '#f97316' }}>🔥 Fire — 6 states</h2>
        <div style={row}>
          {STATES.map((s) => (
            <ZoneCell key={s.instability} mode="fire" instability={s.instability} label={s.fireLabel} />
          ))}
        </div>
        <div style={rangeRow}>
          {STATES.map((s) => <span key={s.instability} style={rangeLabel}>{s.range}</span>)}
        </div>
      </section>

      <section style={section}>
        <h2 style={{ ...sectionTitle, color: '#4ade80' }}>🌿 Garden — 6 states</h2>
        <div style={row}>
          {STATES.map((s) => (
            <ZoneCell key={s.instability} mode="garden" instability={s.instability} label={s.gardenLabel} />
          ))}
        </div>
        <div style={rangeRow}>
          {STATES.map((s) => <span key={s.instability} style={rangeLabel}>{s.range}</span>)}
        </div>
      </section>
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────

const page: React.CSSProperties = {
  minHeight: '100%',
  background: '#0b0f19',
  color: '#fff',
  fontFamily: 'sans-serif',
  padding: '24px 32px 48px',
  boxSizing: 'border-box',
};

const header: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 20,
  marginBottom: 40,
};

const title: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  margin: 0,
  opacity: 0.9,
};

const backBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff',
  padding: '8px 16px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};

const section: React.CSSProperties = {
  marginBottom: 48,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  marginBottom: 12,
  letterSpacing: 0.5,
};

const row: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  flexWrap: 'wrap',
};

const rangeRow: React.CSSProperties = {
  display: 'flex',
  gap: 12,
  marginTop: 4,
  flexWrap: 'wrap',
};

const cellStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  width: SIZE,
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: 'rgba(255,255,255,0.85)',
  textAlign: 'center',
};

const rangeLabel: React.CSSProperties = {
  width: SIZE,
  textAlign: 'center',
  fontSize: 11,
  color: 'rgba(255,255,255,0.35)',
  display: 'inline-block',
};
