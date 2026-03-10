import Phaser from 'phaser';
import type { PerceptionMode } from '@shared-field/shared';
import { getZoneVisual, getZoneColorsSmooth } from '../../perception/perceptionMapper';

export class ZoneObject extends Phaser.GameObjects.Container {
  private baseGfx: Phaser.GameObjects.Graphics;
  private outerRing: Phaser.GameObjects.Graphics;
  private warningMarker: Phaser.GameObjects.Text;
  private mode: PerceptionMode;
  private radius: number;
  private currentInstability = 0;
  private targetInstability = 0;
  private lastDrawnInstability = -1;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    radius: number,
    mode: PerceptionMode,
  ) {
    super(scene, x, y);
    this.mode = mode;
    this.radius = radius;
    this.setDepth(5);

    this.outerRing = scene.add.graphics();
    this.add(this.outerRing);

    this.baseGfx = scene.add.graphics();
    this.add(this.baseGfx);

    this.warningMarker = scene.add.text(0, this.radius + 14, '', {
      fontSize: '16px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: '#fbbf24',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.warningMarker.setOrigin(0.5);
    this.warningMarker.setDepth(7);
    this.add(this.warningMarker);

    scene.add.existing(this);
    this.draw(0);
  }

  updateInstability(value: number) {
    this.targetInstability = value;
  }

  snapToTarget() {
    this.currentInstability = this.targetInstability;
    this.lastDrawnInstability = -1;
    this.draw(this.currentInstability);
  }

  private draw(instability: number) {
    const v      = getZoneVisual(instability, this.mode);
    const colors = getZoneColorsSmooth(instability, this.mode);
    const intensity = instability / 100;
    const r = this.radius + intensity * 4;

    this.baseGfx.clear();
    this.baseGfx.fillStyle(colors.fillColor, 0.75 + intensity * 0.15);
    this.baseGfx.fillCircle(0, 0, r);
    this.baseGfx.lineStyle(v.borderWidth, colors.strokeColor, 0.65 + intensity * 0.15);
    this.baseGfx.strokeCircle(0, 0, r);
    // subtle white halo
    this.baseGfx.lineStyle(1, 0xffffff, 0.06 + intensity * 0.06);
    this.baseGfx.strokeCircle(0, 0, r + 2);

    this.outerRing.clear();
    if (v.urgency >= 2) {
      this.outerRing.lineStyle(2, v.glowColor, 0.2);
      this.outerRing.strokeCircle(0, 0, this.radius + 10);
    }

    if (v.urgency === 0) {
      this.warningMarker.setText('');
    } else if (v.urgency === 1) {
      this.warningMarker.setText('!');
      this.warningMarker.setFontSize(14);
      this.warningMarker.setAlpha(0.6);
    } else if (v.urgency === 2) {
      this.warningMarker.setText('!!');
      this.warningMarker.setFontSize(16);
      this.warningMarker.setAlpha(0.8);
    } else {
      this.warningMarker.setText('!!!');
      this.warningMarker.setFontSize(20);
      this.warningMarker.setAlpha(1);
    }
  }

  preUpdate(_time: number, _delta: number) {
    const diff = this.targetInstability - this.currentInstability;
    if (Math.abs(diff) > 0.5) {
      this.currentInstability += diff * 0.2;
    }

    const changed = Math.abs(this.currentInstability - this.lastDrawnInstability);
    if (changed >= 1 || this.lastDrawnInstability < 0) {
      this.lastDrawnInstability = this.currentInstability;
      this.draw(this.currentInstability);
    }
  }
}
