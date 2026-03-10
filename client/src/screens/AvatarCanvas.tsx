import { useRef, useEffect } from 'react';
import type { PerceptionMode } from '@shared-field/shared';

type Props = {
  mode: PerceptionMode;
  isLocal: boolean;
  size?: number;
};

export function AvatarCanvas({ mode, isLocal, size = 80 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    let raf: number;
    let startTime = performance.now();

    function draw() {
      const t = (performance.now() - startTime) / 1000;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2 + 4);

      const scale = size / 52;
      ctx.scale(scale, scale);

      const bob = Math.sin(t * 3) * 1.2;

      drawShadow(ctx, bob);

      if (mode === 'garden') {
        drawGardenCharacter(ctx, isLocal, bob, t);
      } else {
        drawFireCharacter(ctx, isLocal, bob, t);
      }

      ctx.restore();
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(raf);
  }, [mode, isLocal, size]);

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, display: 'block' }}
    />
  );
}

function drawShadow(ctx: CanvasRenderingContext2D, bob: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.ellipse(0, 18 + bob * 0.3, 12, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGardenCharacter(ctx: CanvasRenderingContext2D, isLocal: boolean, bob: number, t: number) {
  const skin = isLocal ? '#60a5fa' : '#a78bfa';
  const skinDark = isLocal ? '#3b82f6' : '#8b5cf6';

  // Body
  roundedRect(ctx, -10, -2 + bob, 20, 18, 5, skin, 'rgba(255,255,255,0.15)', 1);

  // Head
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -7 + bob, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Eyes
  drawEyes(ctx, -3.5, -8 + bob, 3.5, -8 + bob);

  // Smile
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, -5 + bob, 3, 0.2, Math.PI - 0.2, false);
  ctx.stroke();

  // Garden hat - brim
  const hatY = -14 + bob;
  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.ellipse(0, hatY + 2, 14, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hat dome
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(0, hatY + 1, 9, Math.PI, 0, false);
  ctx.fill();

  // Hat band
  ctx.fillStyle = '#16a34a';
  ctx.fillRect(-9, hatY, 18, 2.5);

  // Leaf on hat
  ctx.fillStyle = '#86efac';
  ctx.beginPath();
  ctx.moveTo(5, hatY - 3);
  ctx.lineTo(8, hatY - 12);
  ctx.lineTo(12, hatY - 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(8, hatY - 11);
  ctx.lineTo(7, hatY - 2);
  ctx.stroke();

  // Watering can
  const canSway = Math.sin(t * 4) * 1.5;
  const canX = 10;
  const canY = 2 + bob;

  ctx.fillStyle = '#38bdf8';
  roundedRect(ctx, canX - 2, canY - 1, 10, 7, 2, '#38bdf8');
  ctx.fillStyle = '#0ea5e9';
  ctx.fillRect(canX, canY, 6, 2);

  // Spout
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(canX + 7, canY);
  ctx.lineTo(canX + 13, canY - 6 + canSway);
  ctx.stroke();

  // Handle
  ctx.strokeStyle = 'rgba(56,189,248,0.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(canX + 3, canY - 4, 4, Math.PI * 0.8, Math.PI * 1.8, false);
  ctx.stroke();

  // Water drops animation
  const dropPhase = t * 4;
  for (let i = 0; i < 3; i++) {
    const dropY = ((dropPhase + i * 2.1) % 6);
    const dropAlpha = 1 - dropY / 6;
    ctx.fillStyle = `rgba(125,211,252,${dropAlpha * 0.7})`;
    ctx.beginPath();
    ctx.arc(canX + 12 + (i - 1) * 2, canY - 5 + canSway + dropY * 2, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Feet
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.ellipse(-5, 18 + bob, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(5, 18 + bob, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFireCharacter(ctx: CanvasRenderingContext2D, isLocal: boolean, bob: number, t: number) {
  const skin = isLocal ? '#60a5fa' : '#a78bfa';
  const skinDark = isLocal ? '#3b82f6' : '#8b5cf6';

  // Body
  roundedRect(ctx, -10, -2 + bob, 20, 18, 5, skin, 'rgba(255,255,255,0.15)', 1);

  // Head
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -7 + bob, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Eyes
  drawEyes(ctx, -3.5, -8 + bob, 3.5, -8 + bob);

  // Determined mouth
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-3, -4 + bob);
  ctx.lineTo(3, -4 + bob);
  ctx.stroke();

  // Fire helmet - brim
  const hatY = -14 + bob;
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.ellipse(0, hatY + 4, 13, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Helmet dome
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(0, hatY + 3, 10, Math.PI, 0, false);
  ctx.fill();

  // Top ridge
  ctx.fillStyle = '#dc2626';
  roundedRect(ctx, -3, hatY - 2, 6, 4, 2, '#dc2626');

  // Badge
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(0, hatY);
  ctx.lineTo(-3, hatY + 5);
  ctx.lineTo(3, hatY + 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(0, hatY + 3, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Neck flap
  ctx.fillStyle = 'rgba(251,191,36,0.35)';
  ctx.fillRect(-8, hatY + 5, 16, 3);

  // Hose nozzle
  const hoseX = -10;
  const hoseY = 3 + bob;

  ctx.fillStyle = '#94a3b8';
  roundedRect(ctx, hoseX - 6, hoseY - 2, 8, 5, 1, '#94a3b8');
  ctx.fillStyle = '#64748b';
  roundedRect(ctx, hoseX - 9, hoseY - 1, 4, 3, 1, '#64748b');

  // Hose tube
  ctx.strokeStyle = 'rgba(71,85,105,0.6)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(hoseX + 2, hoseY + 2);
  ctx.lineTo(hoseX - 2, hoseY + 10);
  ctx.lineTo(hoseX + 4, hoseY + 14);
  ctx.stroke();

  // Water blast particles
  const blastPhase = t * 5;
  for (let i = 0; i < 4; i++) {
    const pt = ((blastPhase + i * 1.5) % 8);
    const alpha = 1 - pt / 8;
    ctx.fillStyle = `rgba(125,211,252,${alpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(
      hoseX - 10 - pt * 2 + Math.sin(pt) * 2,
      hoseY + Math.sin(pt * 0.5) * 1.5,
      1.5 + pt * 0.3,
      0, Math.PI * 2
    );
    ctx.fill();
  }

  // Feet
  ctx.fillStyle = skinDark;
  ctx.beginPath();
  ctx.ellipse(-5, 18 + bob, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(5, 18 + bob, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEyes(ctx: CanvasRenderingContext2D, lx: number, ly: number, rx: number, ry: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(lx + 0.5, ly + 0.3, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(rx + 0.5, ry + 0.3, 1.3, 0, Math.PI * 2);
  ctx.fill();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
  fill: string, stroke?: string, lineWidth?: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth ?? 1;
    ctx.stroke();
  }
}
