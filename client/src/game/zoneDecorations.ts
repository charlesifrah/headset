// 6-state zone decorations shared by ZoneCanvas (game) and GamePreview (reveal)
// State is determined by instability: 0-16 | 17-33 | 34-49 | 50-65 | 66-82 | 83-100

function getState(instability: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (instability < 17) return 0;
  if (instability < 34) return 1;
  if (instability < 50) return 2;
  if (instability < 66) return 3;
  if (instability < 83) return 4;
  return 5;
}

// ─── shared helpers ─────────────────────────────────────────────────────────

function flame(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  w: number, h: number,
  t: number, phase: number,
) {
  const flicker = Math.sin(t * 7 + phase) * w * 0.28;
  ctx.fillStyle = 'rgba(249,115,22,0.93)';
  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y);
  ctx.quadraticCurveTo(x - w * 0.15, y - h * 0.55, x + flicker,  y - h);
  ctx.quadraticCurveTo(x + w * 0.15,  y - h * 0.55, x + w * 0.5, y);
  ctx.closePath();
  ctx.fill();

  if (h > 6) {
    ctx.fillStyle = 'rgba(251,191,36,0.97)';
    ctx.beginPath();
    ctx.moveTo(x - w * 0.24, y);
    ctx.quadraticCurveTo(x - w * 0.08, y - h * 0.38, x + flicker * 0.55, y - h * 0.62);
    ctx.quadraticCurveTo(x + w * 0.08,  y - h * 0.38, x + w * 0.24, y);
    ctx.closePath();
    ctx.fill();
  }
}

function smoke(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, t: number) {
  const d = Math.sin(t * 0.8 + x * 0.01) * 4;
  ctx.fillStyle = `rgba(148,163,184,${alpha})`;
  ctx.beginPath(); ctx.arc(x + d,       y,          size,        0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + d * 1.3, y - size,   size * 0.65, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + d * 0.7, y - size * 1.7, size * 0.42, 0, Math.PI * 2); ctx.fill();
}

function flower(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  petals: number, t: number,
  petalColor: string, centerColor: string, alpha: number,
) {
  ctx.globalAlpha = alpha;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2 + t * 0.35;
    ctx.fillStyle = petalColor;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * size * 0.62, cy + Math.sin(a) * size * 0.62, size * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = centerColor;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function stem(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number, x1: number, y1: number,
  color: string, width: number,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo((x0 + x1) * 0.5 + (x1 - x0) * 0.12, y0 + (y1 - y0) * 0.45, x1, y1);
  ctx.stroke();
}

function grass(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, h: number, sway: number,
  color: string, width: number, alpha: number,
) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + sway * 0.45, y - h * 0.55, x + sway, y - h);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function deadLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(101,67,33,1)';
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ─── FIRE ────────────────────────────────────────────────────────────────────

export function drawFireZoneDecoration(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
  instability: number, t: number, sc: number,
) {
  const state = getState(instability);
  const base  = cy + r * 0.08;

  // State 0 – Ember: single glowing dot, no flame
  if (state === 0) {
    const pulse = 1 + Math.sin(t * 3.5) * 0.22;
    ctx.fillStyle = 'rgba(249,115,22,0.88)';
    ctx.beginPath(); ctx.arc(cx, cy, 4 * sc * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(253,224,71,0.95)';
    ctx.beginPath(); ctx.arc(cx, cy, 2 * sc * pulse, 0, Math.PI * 2); ctx.fill();
    return;
  }

  // States 1-5 – Flames
  //               count  height           width
  const cfg: [number, number, number][] = [
    [1, r * 0.30, 5.5 * sc],  // 1: XS — 1 thin short flame
    [2, r * 0.50, 8.0 * sc],  // 2: S  — 2 medium flames
    [3, r * 0.65, 9.5 * sc],  // 3: M  — 3 flames
    [4, r * 0.80, 11.5 * sc], // 4: L  — 4 tall flames
    [5, r * 0.94, 13.5 * sc], // 5: XL — 5 massive flames
  ];

  const [count, maxH, w] = cfg[state - 1];
  const spread = count > 1 ? r * 0.26 : 0;

  for (let i = 0; i < count; i++) {
    const a  = count === 1 ? -Math.PI / 2 : (i / count) * Math.PI * 2 + t * 0.38;
    const fx = cx + Math.cos(a) * spread * 0.65;
    const fy = base + (count > 1 ? Math.sin(a) * spread * 0.22 : 0);
    const h  = maxH * (0.82 + Math.sin(t * 5.8 + i * 2.1) * 0.18);
    flame(ctx, fx, fy, w, h, t, i * 1.85);
  }

  // Smoke only at L and XL
  if (state >= 4) {
    const a = state === 4 ? 0.11 : 0.19;
    const s = state === 4 ? 4.5 * sc : 7 * sc;
    smoke(ctx, cx, cy - maxH * 0.62, s, a, t);
  }
}

// ─── GARDEN ──────────────────────────────────────────────────────────────────

export function drawGardenZoneDecoration(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
  instability: number, t: number, sc: number,
) {
  const state  = getState(instability);
  const ground = cy + r * 0.14;
  const sway   = Math.sin(t * 1.8 + cx * 0.004) * 2.2 * sc;

  // ── State 0: Full bloom ──────────────────────────────────────────────────
  if (state === 0) {
    const sh = r * 0.44, tx = cx + sway, ty = ground - sh;
    stem(ctx, cx, ground, tx, ty, 'rgba(22,163,74,0.90)', 2.3 * sc);
    flower(ctx, tx, ty, r * 0.22, 5, t, '#fbbf24', '#fef08a', 0.96);

    const lx = cx - r * 0.33, ltx = lx - sway * 0.4, lty = ground - r * 0.26;
    stem(ctx, lx, ground + r * 0.04, ltx, lty, 'rgba(22,163,74,0.72)', 1.7 * sc);
    flower(ctx, ltx, lty, r * 0.13, 5, t + 1.0, '#f472b6', '#fbcfe8', 0.86);

    const rx = cx + r * 0.33, rtx = rx + sway * 0.4, rty = ground - r * 0.22;
    stem(ctx, rx, ground + r * 0.04, rtx, rty, 'rgba(22,163,74,0.72)', 1.7 * sc);
    flower(ctx, rtx, rty, r * 0.11, 5, t + 2.1, '#a78bfa', '#e9d5ff', 0.84);

    grass(ctx, cx - r * 0.40, ground + r * 0.04, r * 0.22, -sway * 1.3, '#22c55e', 1.5 * sc, 0.72);
    grass(ctx, cx + r * 0.40, ground + r * 0.04, r * 0.18,  sway * 1.3, '#22c55e', 1.5 * sc, 0.68);
    grass(ctx, cx,             ground + r * 0.04, r * 0.20,  sway * 0.5, '#22c55e', 1.5 * sc, 0.62);
    return;
  }

  // ── State 1: Healthy ─────────────────────────────────────────────────────
  if (state === 1) {
    const sh = r * 0.38, tx = cx + sway, ty = ground - sh;
    stem(ctx, cx, ground, tx, ty, 'rgba(22,163,74,0.85)', 2.1 * sc);
    flower(ctx, tx, ty, r * 0.18, 5, t, '#fbbf24', '#fef08a', 0.92);

    const lx = cx - r * 0.29, ltx = lx - sway * 0.3, lty = ground - r * 0.20;
    stem(ctx, lx, ground + r * 0.05, ltx, lty, 'rgba(22,163,74,0.65)', 1.5 * sc);
    flower(ctx, ltx, lty, r * 0.11, 5, t + 1.4, '#f472b6', '#fbcfe8', 0.80);

    grass(ctx, cx - r * 0.38, ground + r * 0.05, r * 0.19, -sway * 1.1, '#22c55e', 1.4 * sc, 0.68);
    grass(ctx, cx + r * 0.38, ground + r * 0.05, r * 0.16,  sway * 1.1, '#4ade80', 1.4 * sc, 0.62);
    return;
  }

  // ── State 2: Stressed ────────────────────────────────────────────────────
  if (state === 2) {
    const droop = r * 0.06;
    const sh = r * 0.33, tx = cx + sway * 0.6 + droop * 0.5, ty = ground - sh + droop * 0.4;
    stem(ctx, cx, ground, tx, ty, 'rgba(113,124,30,0.80)', 1.9 * sc);
    flower(ctx, tx, ty, r * 0.14, 4, t * 0.8, '#e8a910', '#fef08a', 0.84);

    grass(ctx, cx - r * 0.28, ground + r * 0.05, r * 0.14, -sway * 0.8, '#a3e635', 1.3 * sc, 0.56);
    grass(ctx, cx + r * 0.24, ground + r * 0.05, r * 0.11,  sway * 0.6, '#a3e635', 1.2 * sc, 0.48);
    return;
  }

  // ── State 3: Wilting ─────────────────────────────────────────────────────
  if (state === 3) {
    const droop = r * 0.16;
    const sh = r * 0.26, tx = cx + droop + sway * 0.4, ty = ground - sh + droop * 0.7;
    stem(ctx, cx, ground, tx, ty, 'rgba(120,80,20,0.75)', 1.7 * sc);
    flower(ctx, tx, ty, r * 0.085, 3, t * 0.4, '#b7791f', '#fde68a', 0.68);
    return;
  }

  // ── State 4: Dying ───────────────────────────────────────────────────────
  if (state === 4) {
    const tx = cx + r * 0.20 + sway * 0.25, ty = ground - r * 0.16;
    stem(ctx, cx, ground, tx, ty, 'rgba(101,67,33,0.70)', 1.6 * sc);
    // fallen leaves
    deadLeaf(ctx, cx - r * 0.14, ground + r * 0.06, 4.8 * sc, -0.45, 0.55);
    deadLeaf(ctx, cx + r * 0.10, ground + r * 0.08, 3.8 * sc,  0.85, 0.50);
    deadLeaf(ctx, cx - r * 0.04, ground + r * 0.10, 3.2 * sc,  0.20, 0.45);
    return;
  }

  // ── State 5: Dead twigs ──────────────────────────────────────────────────
  const tw = 'rgba(92,51,23,0.82)';
  ctx.lineCap = 'round';

  // left twig + branch
  ctx.strokeStyle = tw; ctx.lineWidth = 2.1 * sc;
  ctx.beginPath(); ctx.moveTo(cx - r * 0.17, ground); ctx.lineTo(cx - r * 0.25, ground - r * 0.30); ctx.stroke();
  ctx.lineWidth = 1.2 * sc;
  ctx.beginPath(); ctx.moveTo(cx - r * 0.23, ground - r * 0.17); ctx.lineTo(cx - r * 0.37, ground - r * 0.27); ctx.stroke();

  // centre twig + branch
  ctx.lineWidth = 2.3 * sc;
  ctx.beginPath(); ctx.moveTo(cx, ground + r * 0.03); ctx.lineTo(cx + r * 0.05, ground - r * 0.34); ctx.stroke();
  ctx.lineWidth = 1.1 * sc;
  ctx.beginPath(); ctx.moveTo(cx + r * 0.03, ground - r * 0.17); ctx.lineTo(cx + r * 0.19, ground - r * 0.26); ctx.stroke();

  // right twig
  ctx.lineWidth = 1.9 * sc;
  ctx.beginPath(); ctx.moveTo(cx + r * 0.18, ground); ctx.lineTo(cx + r * 0.30, ground - r * 0.26); ctx.stroke();
  ctx.lineWidth = 1.0 * sc;
  ctx.beginPath(); ctx.moveTo(cx + r * 0.28, ground - r * 0.14); ctx.lineTo(cx + r * 0.38, ground - r * 0.22); ctx.stroke();
}
