import { useRef, useEffect } from 'react';

/**
 * Landing-page teaser: a fake, self-playing round drawn in a deliberately
 * neutral style. No flames, flowers, hats or role colours, so it shows the
 * loop (zones destabilise -> rush in -> hold to calm) without spoiling the twist.
 */

const W = 400;
const H = 300;
const ZONE_R = 30;
const ROUND_SECONDS = 75;
const BG = '#151a2e';

type Zone = { x: number; y: number; inst: number; rate: number };
type Bot = {
  x: number; y: number;
  color: string; dark: string;
  label: string;
  target: number;
  acting: boolean;
  phase: number;
};

const COLS = [100, 200, 300];
const ROWS = [85, 165, 245];

function makeZones(): Zone[] {
  return ROWS.flatMap((y) =>
    COLS.map((x) => ({ x, y, inst: Math.random() * 40, rate: 3 + Math.random() * 4 })),
  );
}

export function FieldPreview() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const zones = makeZones();
    const bots: Bot[] = [
      { x: 40, y: 50, color: '#60a5fa', dark: '#3b82f6', label: 'You', target: -1, acting: false, phase: 0 },
      { x: 360, y: 270, color: '#a78bfa', dark: '#8b5cf6', label: 'Partner', target: -1, acting: false, phase: 2 },
    ];

    let raf = 0;
    let last = performance.now();
    const start = last;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas!.clientWidth;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(w * (H / W) * dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    function pickTarget(bot: Bot, other: Bot) {
      let best = -1;
      let bestScore = -Infinity;
      zones.forEach((z, i) => {
        if (i === other.target) return;
        const dist = Math.hypot(z.x - bot.x, z.y - bot.y);
        const score = z.inst - dist * 0.12;
        if (score > bestScore) { bestScore = score; best = i; }
      });
      return best;
    }

    function step(dt: number) {
      for (const z of zones) {
        z.inst = Math.min(100, z.inst + z.rate * dt);
      }
      bots.forEach((bot, i) => {
        const other = bots[1 - i];
        const cur = zones[bot.target];
        if (!cur || cur.inst < 8) bot.target = pickTarget(bot, other);
        const z = zones[bot.target];
        if (!z) return;
        // Stand just beside the zone, not on top of it
        const tx = z.x + (i === 0 ? -ZONE_R - 6 : ZONE_R + 6);
        const ty = z.y + 6;
        const dx = tx - bot.x;
        const dy = ty - bot.y;
        const d = Math.hypot(dx, dy);
        bot.acting = d < 6;
        if (!bot.acting) {
          const speed = 150 * dt;
          bot.x += (dx / d) * Math.min(speed, d);
          bot.y += (dy / d) * Math.min(speed, d);
        } else {
          z.inst = Math.max(0, z.inst - 60 * dt);
        }
      });
    }

    function drawZone(z: Zone, t: number) {
      const k = z.inst / 100;
      const pulse = k > 0.5 ? (Math.sin(t * (4 + k * 6)) + 1) / 2 : 0;

      // Warning glow
      if (k > 0.35) {
        const g = ctx.createRadialGradient(z.x, z.y, ZONE_R * 0.6, z.x, z.y, ZONE_R * 1.6);
        g.addColorStop(0, `rgba(251,191,36,${0.18 * k + 0.1 * pulse})`);
        g.addColorStop(1, 'rgba(251,191,36,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(z.x, z.y, ZONE_R * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = `rgba(${30 + k * 50},${34 + k * 26},${48 - k * 20},1)`;
      ctx.beginPath();
      ctx.arc(z.x, z.y, ZONE_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(${120 + k * 131},${130 + k * 61},${160 - k * 124},${0.35 + k * 0.4})`;
      ctx.stroke();

      // Instability arc
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = k > 0.75 ? '#fbbf24' : 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(z.x, z.y, ZONE_R - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
      ctx.stroke();

      if (k > 0.5) {
        ctx.font = '700 15px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        const mark = k > 0.75 ? '!!' : '!';
        const y = z.y + ZONE_R + 12 - pulse * 2;
        ctx.strokeText(mark, z.x, y);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(mark, z.x, y);
      }
    }

    function drawRipples(bot: Bot, t: number) {
      if (!bot.acting) return;
      const z = zones[bot.target];
      if (!z) return;
      for (let i = 0; i < 3; i++) {
        const p = (t * 1.4 + i / 3) % 1;
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - p)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(z.x, z.y, ZONE_R * (0.3 + p * 0.8), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function drawBot(bot: Bot, t: number) {
      const R = 11;
      const bob = Math.sin(t * 5 + bot.phase) * 1.3;
      ctx.save();
      ctx.translate(Math.round(bot.x), Math.round(bot.y));

      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, R + 2, R * 0.7, R * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bot.dark;
      ctx.beginPath();
      ctx.ellipse(-R * 0.3, R * 1.1 + bob * 0.3, 2.6, 1.6, 0, 0, Math.PI * 2);
      ctx.ellipse(R * 0.3, R * 1.1 + bob * 0.3, 2.6, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bot.color;
      ctx.beginPath();
      ctx.roundRect(-R * 0.65, -2 + bob, R * 1.3, R * 1.1, 5);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -R * 0.45 + bob, R * 0.62, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-2.6, -R * 0.5 + bob, 2, 0, Math.PI * 2);
      ctx.arc(2.6, -R * 0.5 + bob, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(-2.2, -R * 0.48 + bob, 1, 0, Math.PI * 2);
      ctx.arc(3, -R * 0.48 + bob, 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '600 10px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillText(bot.label, 0, -R * 1.6 + bob);
      ctx.restore();
    }

    function drawHud(t: number) {
      const left = Math.max(0, ROUND_SECONDS - Math.floor(t % ROUND_SECONDS));
      ctx.font = '700 15px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`${left}s`, W / 2, 20);

      const health = 1 - zones.reduce((s, z) => s + z.inst, 0) / (zones.length * 100);
      const bx = W - 92;
      ctx.font = '600 8px "Space Grotesk", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('FIELD', bx - 30, 20);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(bx, 17, 70, 6, 3);
      ctx.fill();
      ctx.fillStyle = health > 0.6 ? '#4ade80' : health > 0.35 ? '#fbbf24' : '#f87171';
      ctx.beginPath();
      ctx.roundRect(bx, 17, 70 * health, 6, 3);
      ctx.fill();
    }

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = (now - start) / 1000;
      if (!reduceMotion) step(dt);

      const scale = canvas!.width / W;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 25) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = 0; y <= H; y += 25) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();

      zones.forEach((z) => drawZone(z, t));
      bots.forEach((b) => drawRipples(b, t));
      [...bots].sort((a, b) => a.y - b.y).forEach((b) => drawBot(b, t));
      drawHud(t);

      if (!reduceMotion) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-label="Two players rushing between glowing zones to calm them down"
      style={{ width: '100%', aspectRatio: `${W} / ${H}`, display: 'block' }}
    />
  );
}
