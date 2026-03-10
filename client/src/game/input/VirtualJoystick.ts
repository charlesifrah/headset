import Phaser from 'phaser';

export class VirtualJoystick {
  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Graphics;
  private thumb: Phaser.GameObjects.Graphics;
  private baseX: number;
  private baseY: number;
  private radius: number;
  private active = false;
  private pointerId = -1;

  public dx = 0;
  public dy = 0;
  public magnitude = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, radius = 50) {
    this.scene = scene;
    this.baseX = x;
    this.baseY = y;
    this.radius = radius;

    this.base = scene.add.graphics();
    this.base.setDepth(100);
    this.base.setScrollFactor(0);
    this.drawBase();

    this.thumb = scene.add.graphics();
    this.thumb.setDepth(101);
    this.thumb.setScrollFactor(0);
    this.drawThumb(x, y);

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x < scene.scale.width / 2 && !this.active) {
        this.active = true;
        this.pointerId = pointer.id;
      }
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.active || pointer.id !== this.pointerId) return;
      this.updateThumb(pointer.x, pointer.y);
    });

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.pointerId) return;
      this.active = false;
      this.pointerId = -1;
      this.dx = 0;
      this.dy = 0;
      this.magnitude = 0;
      this.drawThumb(this.baseX, this.baseY);
    });
  }

  private drawBase() {
    this.base.clear();
    this.base.fillStyle(0xffffff, 0.1);
    this.base.fillCircle(this.baseX, this.baseY, this.radius);
    this.base.lineStyle(2, 0xffffff, 0.2);
    this.base.strokeCircle(this.baseX, this.baseY, this.radius);
  }

  private drawThumb(x: number, y: number) {
    this.thumb.clear();
    this.thumb.fillStyle(0xffffff, 0.3);
    this.thumb.fillCircle(x, y, this.radius * 0.4);
  }

  private updateThumb(pointerX: number, pointerY: number) {
    const rawDx = pointerX - this.baseX;
    const rawDy = pointerY - this.baseY;
    const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

    if (dist > 0) {
      this.magnitude = Math.min(dist / this.radius, 1);
      this.dx = (rawDx / dist) * this.magnitude;
      this.dy = (rawDy / dist) * this.magnitude;

      const clampedDist = Math.min(dist, this.radius);
      const thumbX = this.baseX + (rawDx / dist) * clampedDist;
      const thumbY = this.baseY + (rawDy / dist) * clampedDist;
      this.drawThumb(thumbX, thumbY);
    }
  }

  setVisible(visible: boolean) {
    this.base.setVisible(visible);
    this.thumb.setVisible(visible);
  }

  destroy() {
    this.base.destroy();
    this.thumb.destroy();
  }
}
