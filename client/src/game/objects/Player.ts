import Phaser from 'phaser';
import type { PerceptionMode } from '@shared-field/shared';
import { PLAYER_RADIUS } from '@shared-field/shared';
import { getSprayVisual } from '../../perception/perceptionMapper';

export class PlayerObject extends Phaser.GameObjects.Container {
  private bodyGfx: Phaser.GameObjects.Graphics;
  private actingRing: Phaser.GameObjects.Graphics;
  private nameTag: Phaser.GameObjects.Text;
  private isLocal: boolean;
  private mode: PerceptionMode;
  private _isActing = false;
  private targetX: number;
  private targetY: number;
  private actingPulse = 0;
  private bobPhase = Math.random() * Math.PI * 2;
  private lastActingState = false;
  private bodyDrawn = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    isLocal: boolean,
    mode: PerceptionMode
  ) {
    super(scene, x, y);
    this.isLocal = isLocal;
    this.mode = mode;
    this.targetX = x;
    this.targetY = y;

    this.actingRing = scene.add.graphics();
    this.add(this.actingRing);

    this.bodyGfx = scene.add.graphics();
    this.add(this.bodyGfx);

    const tagText = isLocal ? 'You' : 'Partner';
    this.nameTag = scene.add.text(0, -PLAYER_RADIUS - 22, tagText, {
      fontSize: '10px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      align: 'center',
    });
    this.nameTag.setOrigin(0.5);
    this.nameTag.setAlpha(0.7);
    this.add(this.nameTag);

    scene.add.existing(this);
    this.setDepth(isLocal ? 20 : 15);
  }

  private drawBody(time: number) {
    this.bodyGfx.clear();
    const R = PLAYER_RADIUS;

    const bob = Math.sin(this.bobPhase + time * 0.003) * 1.5;

    this.bodyGfx.fillStyle(0x000000, 0.15);
    this.bodyGfx.fillEllipse(0, R + 2, R * 1.4, R * 0.35);

    if (this.mode === 'garden') {
      this.drawGardenAvatar(R, bob, time);
    } else {
      this.drawFireAvatar(R, bob, time);
    }
  }

  private drawGardenAvatar(R: number, bob: number, time: number) {
    const skin = this.isLocal ? 0x60a5fa : 0xa78bfa;
    const skinDark = this.isLocal ? 0x3b82f6 : 0x8b5cf6;

    // --- Body (rounded torso) ---
    this.bodyGfx.fillStyle(skin, 1);
    this.bodyGfx.fillRoundedRect(-R * 0.65, -2 + bob, R * 1.3, R * 1.1, 5);
    this.bodyGfx.lineStyle(1, 0xffffff, 0.15);
    this.bodyGfx.strokeRoundedRect(-R * 0.65, -2 + bob, R * 1.3, R * 1.1, 5);

    // --- Head ---
    this.bodyGfx.fillStyle(skin, 1);
    this.bodyGfx.fillCircle(0, -R * 0.45 + bob, R * 0.6);
    this.bodyGfx.lineStyle(1, 0xffffff, 0.15);
    this.bodyGfx.strokeCircle(0, -R * 0.45 + bob, R * 0.6);

    // --- Eyes ---
    this.bodyGfx.fillStyle(0xffffff, 0.95);
    this.bodyGfx.fillCircle(-3.5, -R * 0.5 + bob, 2.5);
    this.bodyGfx.fillCircle(3.5, -R * 0.5 + bob, 2.5);
    this.bodyGfx.fillStyle(0x1e293b, 1);
    this.bodyGfx.fillCircle(-3, -R * 0.48 + bob, 1.3);
    this.bodyGfx.fillCircle(4, -R * 0.48 + bob, 1.3);

    // --- Smile ---
    this.bodyGfx.lineStyle(1, 0xffffff, 0.3);
    this.bodyGfx.beginPath();
    this.bodyGfx.arc(0, -R * 0.35 + bob, 3, 0.2, Math.PI - 0.2, false);
    this.bodyGfx.strokePath();

    // --- Garden hat (wide brimmed sun hat) ---
    const hatY = -R * 0.85 + bob;
    this.bodyGfx.fillStyle(0x4ade80, 0.9);
    this.bodyGfx.fillEllipse(0, hatY + 2, R * 1.7, 5);
    this.bodyGfx.fillStyle(0x22c55e, 0.95);
    this.bodyGfx.beginPath();
    this.bodyGfx.arc(0, hatY + 1, R * 0.55, Math.PI, 0, false);
    this.bodyGfx.closePath();
    this.bodyGfx.fillPath();
    this.bodyGfx.fillStyle(0x16a34a, 0.8);
    this.bodyGfx.fillRoundedRect(-R * 0.55, hatY, R * 1.1, 3, 1);

    // --- Leaf on hat ---
    this.bodyGfx.fillStyle(0x86efac, 0.9);
    this.bodyGfx.fillTriangle(
      R * 0.3, hatY - 4,
      R * 0.5, hatY - 12,
      R * 0.7, hatY - 3,
    );
    this.bodyGfx.lineStyle(0.8, 0x22c55e, 0.7);
    this.bodyGfx.lineBetween(R * 0.5, hatY - 11, R * 0.45, hatY - 3);

    // --- Watering can (held by side) ---
    const canSway = Math.sin(time * 0.004) * 2;
    const canX = R * 0.55;
    const canY = R * 0.1 + bob;

    this.bodyGfx.fillStyle(0x38bdf8, 0.9);
    this.bodyGfx.fillRoundedRect(canX - 2, canY - 1, 10, 7, 2);
    this.bodyGfx.fillStyle(0x0ea5e9, 0.8);
    this.bodyGfx.fillRoundedRect(canX - 1, canY, 8, 2, 1);

    // Spout
    this.bodyGfx.lineStyle(2, 0x38bdf8, 0.9);
    this.bodyGfx.beginPath();
    this.bodyGfx.moveTo(canX + 7, canY);
    this.bodyGfx.lineTo(canX + 13, canY - 7 + canSway);
    this.bodyGfx.strokePath();

    // Water drops when acting
    if (this._isActing) {
      const dropPhase = time * 0.008;
      for (let i = 0; i < 3; i++) {
        const dropY = ((dropPhase + i * 2.1) % 6);
        const dropAlpha = 1 - dropY / 6;
        this.bodyGfx.fillStyle(0x7dd3fc, dropAlpha * 0.8);
        this.bodyGfx.fillCircle(
          canX + 12 + (i - 1) * 2,
          canY - 6 + canSway + dropY * 2,
          1.2
        );
      }
    }

    // Handle
    this.bodyGfx.lineStyle(1.5, 0x38bdf8, 0.7);
    this.bodyGfx.beginPath();
    this.bodyGfx.arc(canX + 3, canY - 4, 4, Math.PI * 0.8, Math.PI * 1.8, false);
    this.bodyGfx.strokePath();

    // --- Feet (tiny) ---
    this.bodyGfx.fillStyle(skinDark, 0.9);
    this.bodyGfx.fillEllipse(-R * 0.3, R * 1.15 + bob, 5, 3);
    this.bodyGfx.fillEllipse(R * 0.3, R * 1.15 + bob, 5, 3);

    // --- Glow ring for local ---
    if (this.isLocal) {
      this.bodyGfx.lineStyle(1.5, 0x4ade80, 0.2 + Math.sin(time * 0.003) * 0.1);
      this.bodyGfx.strokeCircle(0, bob, R + 4);
    }
  }

  private drawFireAvatar(R: number, bob: number, time: number) {
    const skin = this.isLocal ? 0x60a5fa : 0xa78bfa;
    const skinDark = this.isLocal ? 0x3b82f6 : 0x8b5cf6;

    // --- Body (rounded torso) ---
    this.bodyGfx.fillStyle(skin, 1);
    this.bodyGfx.fillRoundedRect(-R * 0.65, -2 + bob, R * 1.3, R * 1.1, 5);
    this.bodyGfx.lineStyle(1, 0xffffff, 0.15);
    this.bodyGfx.strokeRoundedRect(-R * 0.65, -2 + bob, R * 1.3, R * 1.1, 5);

    // --- Head ---
    this.bodyGfx.fillStyle(skin, 1);
    this.bodyGfx.fillCircle(0, -R * 0.45 + bob, R * 0.6);
    this.bodyGfx.lineStyle(1, 0xffffff, 0.15);
    this.bodyGfx.strokeCircle(0, -R * 0.45 + bob, R * 0.6);

    // --- Eyes ---
    this.bodyGfx.fillStyle(0xffffff, 0.95);
    this.bodyGfx.fillCircle(-3.5, -R * 0.5 + bob, 2.5);
    this.bodyGfx.fillCircle(3.5, -R * 0.5 + bob, 2.5);
    this.bodyGfx.fillStyle(0x1e293b, 1);
    this.bodyGfx.fillCircle(-3, -R * 0.48 + bob, 1.3);
    this.bodyGfx.fillCircle(4, -R * 0.48 + bob, 1.3);

    // --- Determined expression ---
    this.bodyGfx.lineStyle(1, 0xffffff, 0.25);
    this.bodyGfx.lineBetween(-3, -R * 0.3 + bob, 3, -R * 0.3 + bob);

    // --- Fire helmet ---
    const hatY = -R * 0.85 + bob;

    // Brim
    this.bodyGfx.fillStyle(0xb91c1c, 0.95);
    this.bodyGfx.fillEllipse(0, hatY + 4, R * 1.6, 5);

    // Dome
    this.bodyGfx.fillStyle(0xef4444, 0.95);
    this.bodyGfx.beginPath();
    this.bodyGfx.arc(0, hatY + 3, R * 0.6, Math.PI, 0, false);
    this.bodyGfx.closePath();
    this.bodyGfx.fillPath();

    // Top ridge
    this.bodyGfx.fillStyle(0xdc2626, 0.9);
    this.bodyGfx.fillRoundedRect(-R * 0.2, hatY - R * 0.15, R * 0.4, 4, 2);

    // Badge / shield emblem
    this.bodyGfx.fillStyle(0xfbbf24, 0.95);
    this.bodyGfx.fillTriangle(
      0, hatY - 1,
      -3, hatY + 5,
      3, hatY + 5,
    );
    this.bodyGfx.fillStyle(0xf59e0b, 0.9);
    this.bodyGfx.fillCircle(0, hatY + 3, 1.5);

    // Neck flap
    this.bodyGfx.fillStyle(0xfbbf24, 0.4);
    this.bodyGfx.fillRoundedRect(-R * 0.5, hatY + 5, R * 1, 4, 1);

    // --- Hose (held at side) ---
    const swingAngle = Math.sin(time * 0.004) * 0.15;
    const hoseX = -R * 0.6;
    const hoseY = R * 0.15 + bob;

    // Nozzle
    this.bodyGfx.fillStyle(0x94a3b8, 0.9);
    this.bodyGfx.fillRoundedRect(hoseX - 6, hoseY - 2, 8, 5, 1);
    this.bodyGfx.fillStyle(0x64748b, 0.8);
    this.bodyGfx.fillRoundedRect(hoseX - 9, hoseY - 1, 4, 3, 1);

    // Hose tube curving down
    this.bodyGfx.lineStyle(3, 0x475569, 0.7);
    this.bodyGfx.beginPath();
    this.bodyGfx.moveTo(hoseX + 2, hoseY + 2);
    this.bodyGfx.lineTo(hoseX - 2, hoseY + 10);
    this.bodyGfx.lineTo(hoseX + 4, hoseY + 14);
    this.bodyGfx.strokePath();

    // Water blast when acting
    if (this._isActing) {
      const blastPhase = time * 0.01;
      for (let i = 0; i < 4; i++) {
        const t = ((blastPhase + i * 1.5) % 8);
        const alpha = 1 - t / 8;
        this.bodyGfx.fillStyle(0x7dd3fc, alpha * 0.7);
        this.bodyGfx.fillCircle(
          hoseX - 10 - t * 2 + Math.sin(t + swingAngle) * 2,
          hoseY + Math.sin(t * 0.5) * 1.5,
          1.5 + t * 0.3,
        );
      }
    }

    // --- Feet ---
    this.bodyGfx.fillStyle(skinDark, 0.9);
    this.bodyGfx.fillEllipse(-R * 0.3, R * 1.15 + bob, 5, 3);
    this.bodyGfx.fillEllipse(R * 0.3, R * 1.15 + bob, 5, 3);

    // --- Glow ring for local ---
    if (this.isLocal) {
      this.bodyGfx.lineStyle(1.5, 0xf97316, 0.2 + Math.sin(time * 0.003) * 0.1);
      this.bodyGfx.strokeCircle(0, bob, R + 4);
    }
  }

  syncPosition(newX: number, newY: number) {
    this.targetX = newX;
    this.targetY = newY;
  }

  moveLocal(newX: number, newY: number) {
    this.x = newX;
    this.y = newY;
  }

  setActing(acting: boolean) {
    this._isActing = acting;
  }

  preUpdate(time: number, delta: number) {
    if (this.isLocal) {
      const driftX = this.targetX - this.x;
      const driftY = this.targetY - this.y;
      const driftDist = Math.sqrt(driftX * driftX + driftY * driftY);
      if (driftDist > 2) {
        const correction = Math.min(0.1, driftDist * 0.005);
        this.x += driftX * correction;
        this.y += driftY * correction;
      }
    } else {
      const lerpFactor = 1 - Math.pow(0.001, delta / 1000);
      this.x = Phaser.Math.Linear(this.x, this.targetX, lerpFactor);
      this.y = Phaser.Math.Linear(this.y, this.targetY, lerpFactor);
    }

    // Draw body once, then only redraw on acting state change
    if (!this.bodyDrawn) {
      this.bodyDrawn = true;
      this.drawBody(0);
    }

    if (this._isActing !== this.lastActingState) {
      this.lastActingState = this._isActing;
      this.actingRing.clear();
      if (this._isActing) {
        const spray = getSprayVisual(this.mode);
        this.actingRing.lineStyle(2, spray.color, 0.3);
        this.actingRing.strokeCircle(0, 0, PLAYER_RADIUS + 8);
      }
    }
  }
}
