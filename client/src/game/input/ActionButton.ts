import Phaser from 'phaser';

export class ActionButton {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private x: number;
  private y: number;
  private radius: number;
  private _isPressed = false;

  public onPress?: () => void;
  public onRelease?: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, labelText: string, radius = 40) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.radius = radius;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(100);
    this.graphics.setScrollFactor(0);

    this.label = scene.add.text(x, y, labelText, {
      fontSize: '12px',
      color: '#ffffff',
      align: 'center',
    });
    this.label.setOrigin(0.5);
    this.label.setDepth(101);
    this.label.setScrollFactor(0);

    this.draw();

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.x > scene.scale.width / 2 && this.hitTest(pointer.x, pointer.y)) {
        this._isPressed = true;
        this.draw();
        this.onPress?.();
      }
    });

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this._isPressed) {
        this._isPressed = false;
        this.draw();
        this.onRelease?.();
      }
    });
  }

  private hitTest(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= (this.radius + 20) * (this.radius + 20);
  }

  private draw() {
    this.graphics.clear();
    const alpha = this._isPressed ? 0.4 : 0.15;
    const lineAlpha = this._isPressed ? 0.6 : 0.3;
    this.graphics.fillStyle(0xffffff, alpha);
    this.graphics.fillCircle(this.x, this.y, this.radius);
    this.graphics.lineStyle(2, 0xffffff, lineAlpha);
    this.graphics.strokeCircle(this.x, this.y, this.radius);
  }

  get isPressed(): boolean {
    return this._isPressed;
  }

  setVisible(visible: boolean) {
    this.graphics.setVisible(visible);
    this.label.setVisible(visible);
  }

  destroy() {
    this.graphics.destroy();
    this.label.destroy();
  }
}
