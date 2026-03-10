import Phaser from 'phaser';
import type { GameContext } from '../../App';
import type { StateSnapshot, ZoneState } from '@shared-field/shared';
import { MAP_WIDTH, MAP_HEIGHT, ACTION_RANGE, ZONE_RADIUS } from '@shared-field/shared';
import { socket } from '../../socket';
import { ZoneObject } from '../objects/Zone';
import { PlayerObject } from '../objects/Player';
import { getSprayVisual, getBackgroundColor, getActionVerb } from '../../perception/perceptionMapper';
import { VirtualJoystick } from '../input/VirtualJoystick';
import { ActionButton } from '../input/ActionButton';

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent
  ) || ('ontouchstart' in window && window.innerWidth < 900);
}

const MOUSE_FOLLOW_SPEED = 5;
const MOUSE_DEAD_ZONE = 12;
const SEND_INTERVAL_MS = 50; // throttle network sends to ~20/sec

export class GameScene extends Phaser.Scene {
  private gameCtx: GameContext;
  private zones: Map<string, ZoneObject> = new Map();
  private localPlayer: PlayerObject | null = null;
  private partnerPlayer: PlayerObject | null = null;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private isActing = false;
  private sprayGfx: Phaser.GameObjects.Graphics | null = null;
  private arrowGfx: Phaser.GameObjects.Graphics | null = null;
  private latestSnapshot: StateSnapshot | null = null;
  private latestZoneStates: ZoneState[] = [];
  private joystick: VirtualJoystick | null = null;
  private actionBtn: ActionButton | null = null;
  private mobile = false;
  private usingKeyboard = false;
  private lastSendTime = 0;
  private lastVisualTime = 0;
  private snapshotHandler: ((data: StateSnapshot) => void) | null = null;
  private eventFeedHandler: ((data: { messageKey: string; zoneId: string; playerId: string }) => void) | null = null;
  private toasts: Phaser.GameObjects.Container[] = [];
  private lastToastTime: Record<string, number> = {};
  private static readonly MAX_TOASTS = 2;
  private static readonly TOAST_COOLDOWN = 4000;

  // Onboarding
  private tutorialOverlay: Phaser.GameObjects.Container | null = null;
  private tutorialStep = 0;
  private tutorialTimer = 0;
  private hasMovedYet = false;
  private hasActedYet = false;
  private visibilityHandler: (() => void) | null = null;

  constructor(gameCtx: GameContext) {
    super({ key: 'GameScene' });
    this.gameCtx = gameCtx;
  }

  create() {
    this.mobile = isMobile();
    this.drawBackground();

    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      };
      this.wasd.SPACE.on('down', () => this.startAction());
      this.wasd.SPACE.on('up', () => this.stopAction());

      // Detect if user starts using keyboard so we don't fight with mouse follow
      this.input.keyboard.on('keydown', () => { this.usingKeyboard = true; });
    }

    this.arrowGfx = this.add.graphics();
    this.arrowGfx.setDepth(30);

    this.sprayGfx = this.add.graphics();
    this.sprayGfx.setDepth(50);

    this.snapshotHandler = (data: StateSnapshot) => {
      this.latestSnapshot = data;
      this.latestZoneStates = data.zones;
    };
    socket.on('state_snapshot', this.snapshotHandler);

    this.eventFeedHandler = (data) => {
      this.showEventToast(data.messageKey, data.zoneId);
    };
    socket.on('event_feed', this.eventFeedHandler);

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.syncState();
        for (const zone of this.zones.values()) zone.snapToTarget();
        this.lastVisualTime = 0;
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.game.events.on(Phaser.Core.Events.RESUME, () => {
      this.syncState();
      for (const zone of this.zones.values()) zone.snapToTarget();
      this.lastVisualTime = 0;
    });

    if (this.mobile) {
      this.setupMobileControls();
    } else {
      this.setupDesktopControls();
    }

    this.createTutorial();
  }

  // ---- Tutorial ----

  private createTutorial() {
    this.tutorialOverlay = this.add.container(0, 0);
    this.tutorialOverlay.setDepth(500);
    this.tutorialOverlay.setScrollFactor(0);
    this.updateTutorialStep();
  }

  private updateTutorialStep() {
    if (!this.tutorialOverlay) return;
    this.tutorialOverlay.removeAll(true);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRoundedRect(MAP_WIDTH / 2 - 220, MAP_HEIGHT - 84, 440, 56, 12);
    this.tutorialOverlay.add(bg);

    let msg = '';
    const verb = this.gameCtx.role === 'garden' ? 'water' : 'spray';

    if (this.tutorialStep === 0) {
      msg = this.mobile
        ? 'Drag the left joystick to move around'
        : 'Move your mouse to guide your character';
    } else if (this.tutorialStep === 1) {
      msg = this.mobile
        ? `Hold the ${getActionVerb(this.gameCtx.role)} button to ${verb} nearby zones`
        : `Click and hold near a zone to ${verb} it`;
    } else if (this.tutorialStep === 2) {
      msg = this.gameCtx.role === 'garden'
        ? 'Move to zones with (!) and hold click to water them!'
        : 'Move to zones with (!) and hold click to spray them!';
    }

    const text = this.add.text(MAP_WIDTH / 2, MAP_HEIGHT - 56, msg, {
      fontSize: '15px',
      fontFamily: 'sans-serif',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 410 },
    });
    text.setOrigin(0.5);
    this.tutorialOverlay.add(text);
  }

  private advanceTutorial() {
    this.tutorialStep++;
    if (this.tutorialStep > 2) {
      this.dismissTutorial();
    } else {
      this.tutorialTimer = 0;
      this.updateTutorialStep();
    }
  }

  private dismissTutorial() {
    if (!this.tutorialOverlay) return;
    this.tweens.add({
      targets: this.tutorialOverlay,
      alpha: 0,
      duration: 600,
      onComplete: () => {
        this.tutorialOverlay?.destroy();
        this.tutorialOverlay = null;
      },
    });
  }

  // ---- Background ----

  private drawBackground() {
    const bg = this.add.graphics();
    bg.setDepth(0);
    const bgColor = getBackgroundColor(this.gameCtx.role);
    bg.fillStyle(bgColor, 1);
    bg.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    bg.lineStyle(1, 0xffffff, 0.04);
    const gridSize = 40;
    for (let x = 0; x <= MAP_WIDTH; x += gridSize) {
      bg.lineBetween(x, 0, x, MAP_HEIGHT);
    }
    for (let y = 0; y <= MAP_HEIGHT; y += gridSize) {
      bg.lineBetween(0, y, MAP_WIDTH, y);
    }
  }

  // ---- Controls ----

  private setupMobileControls() {
    this.joystick = new VirtualJoystick(this, 100, MAP_HEIGHT - 100, 50);

    const label = getActionVerb(this.gameCtx.role).toUpperCase();
    this.actionBtn = new ActionButton(this, MAP_WIDTH - 100, MAP_HEIGHT - 100, label, 40);
    this.actionBtn.onPress = () => this.startAction();
    this.actionBtn.onRelease = () => this.stopAction();
  }

  private setupDesktopControls() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.startAction();
    });
    this.input.on('pointerup', () => this.stopAction());

    // Mouse movement switches away from keyboard mode
    this.input.on('pointermove', () => { this.usingKeyboard = false; });
  }

  private startAction() {
    if (this.isActing) return;
    this.isActing = true;
    if (!this.hasActedYet) {
      this.hasActedYet = true;
      if (this.tutorialStep === 1) this.advanceTutorial();
    }
    const aim = this.getAimDirection();
    socket.emit('input_action_start', { aimX: aim.x, aimY: aim.y });
  }

  private stopAction() {
    if (!this.isActing) return;
    this.isActing = false;
    socket.emit('input_action_stop');
  }

  private getAimDirection(): { x: number; y: number } {
    if (!this.localPlayer) return { x: 0, y: -1 };
    const pointer = this.input.activePointer;
    return {
      x: pointer.worldX - this.localPlayer.x,
      y: pointer.worldY - this.localPlayer.y,
    };
  }

  // ---- Helpers ----

  private findNearestZone(): ZoneState | null {
    if (!this.localPlayer || this.latestZoneStates.length === 0) return null;
    const px = this.localPlayer.x;
    const py = this.localPlayer.y;
    let best: ZoneState | null = null;
    let bestDist = Infinity;
    for (const z of this.latestZoneStates) {
      const dx = z.x - px;
      const dy = z.y - py;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist && d <= ACTION_RANGE + ZONE_RADIUS) {
        bestDist = d;
        best = z;
      }
    }
    return best;
  }

  private findMostUrgentZone(): ZoneState | null {
    if (!this.localPlayer || this.latestZoneStates.length === 0) return null;
    const px = this.localPlayer.x;
    const py = this.localPlayer.y;
    let best: ZoneState | null = null;
    let bestScore = -Infinity;
    for (const z of this.latestZoneStates) {
      if (z.instability <= 30) continue;
      const dx = z.x - px;
      const dy = z.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const proximityBonus = Math.max(0, 1 - dist / (MAP_WIDTH * 0.8));
      const urgencyScore = (z.instability / 100) + proximityBonus * 0.5;
      if (urgencyScore > bestScore) {
        bestScore = urgencyScore;
        best = z;
      }
    }
    return best;
  }

  // ---- Update loop ----

  update(time: number, delta: number) {
    this.handleMovement(delta);
    this.syncState();

    if (time - this.lastVisualTime >= 100) {
      this.lastVisualTime = time;
      this.drawArrowToUrgent();
      this.drawSpray();
    }

    if (this.tutorialOverlay) {
      this.tutorialTimer += delta;
      if (this.tutorialStep === 2 && this.tutorialTimer > 5000) {
        this.dismissTutorial();
      }
    }
  }

  private handleMovement(delta: number) {
    const speed = MOUSE_FOLLOW_SPEED * (delta / 16.67);
    let dx = 0;
    let dy = 0;

    if (this.mobile && this.joystick) {
      dx = this.joystick.dx * speed;
      dy = this.joystick.dy * speed;
    } else if (!this.mobile && !this.usingKeyboard) {
      // Desktop: player follows mouse cursor
      const pointer = this.input.activePointer;
      if (this.localPlayer && pointer.worldX > 0 && pointer.worldY > 0) {
        const toDx = pointer.worldX - this.localPlayer.x;
        const toDy = pointer.worldY - this.localPlayer.y;
        const dist = Math.sqrt(toDx * toDx + toDy * toDy);
        if (dist > MOUSE_DEAD_ZONE) {
          // Smooth ease-toward-cursor: faster when far, slower when close
          const easing = Math.min(1, dist / 200);
          const moveAmt = speed * easing;
          dx = (toDx / dist) * moveAmt;
          dy = (toDy / dist) * moveAmt;
        }
      }
    }

    // WASD always works as override
    if (this.cursors && this.wasd) {
      const kSpeed = 4 * (delta / 16.67);
      if (this.cursors.left.isDown || this.wasd.A.isDown) dx = -kSpeed;
      if (this.cursors.right.isDown || this.wasd.D.isDown) dx = kSpeed;
      if (this.cursors.up.isDown || this.wasd.W.isDown) dy = -kSpeed;
      if (this.cursors.down.isDown || this.wasd.S.isDown) dy = kSpeed;
    }

    if (dx !== 0 || dy !== 0) {
      if (!this.hasMovedYet) {
        this.hasMovedYet = true;
        if (this.tutorialStep === 0) this.advanceTutorial();
      }

      // Client-side prediction: move the local player immediately
      const currentX = this.localPlayer?.x ?? MAP_WIDTH / 2;
      const currentY = this.localPlayer?.y ?? MAP_HEIGHT / 2;
      const newX = Phaser.Math.Clamp(currentX + dx, 20, MAP_WIDTH - 20);
      const newY = Phaser.Math.Clamp(currentY + dy, 20, MAP_HEIGHT - 20);

      // Move local player directly -- no waiting for server
      this.localPlayer?.moveLocal(newX, newY);

      // Throttle network sends
      const now = performance.now();
      if (now - this.lastSendTime >= SEND_INTERVAL_MS) {
        this.lastSendTime = now;
        socket.emit('input_move', { x: newX, y: newY });
      }
    }

    if (this.isActing && this.localPlayer) {
      const now = performance.now();
      if (now - this.lastSendTime >= SEND_INTERVAL_MS) {
        const aim = this.getAimDirection();
        socket.emit('input_action_start', { aimX: aim.x, aimY: aim.y });
      }
    }
  }

  private syncState() {
    const snap = this.latestSnapshot;
    if (!snap) return;

    this.latestZoneStates = snap.zones;

    for (const zs of snap.zones) {
      let zone = this.zones.get(zs.id);
      if (!zone) {
        zone = new ZoneObject(this, zs.x, zs.y, ZONE_RADIUS, this.gameCtx.role);
        this.zones.set(zs.id, zone);
      }
      zone.updateInstability(zs.instability);
    }

    const meState = snap.players.find((p) => p.id === this.gameCtx.playerId);
    const partnerState = snap.players.find((p) => p.id !== this.gameCtx.playerId);

    if (meState) {
      if (!this.localPlayer) {
        this.localPlayer = new PlayerObject(this, meState.x, meState.y, true, this.gameCtx.role);
      }
      this.localPlayer.syncPosition(meState.x, meState.y);
      this.localPlayer.setActing(meState.isActing);
    }

    if (partnerState) {
      if (!this.partnerPlayer) {
        this.partnerPlayer = new PlayerObject(this, partnerState.x, partnerState.y, false, this.gameCtx.role);
      }
      this.partnerPlayer.syncPosition(partnerState.x, partnerState.y);
      this.partnerPlayer.setActing(partnerState.isActing);
    }
  }

  // ---- Visual feedback ----

  private drawArrowToUrgent() {
    if (!this.arrowGfx || !this.localPlayer) return;
    this.arrowGfx.clear();

    if (this.isActing) return;

    const urgent = this.findMostUrgentZone();
    if (!urgent) return;

    const px = this.localPlayer.x;
    const py = this.localPlayer.y;
    const toDx = urgent.x - px;
    const toDy = urgent.y - py;
    const dist = Math.sqrt(toDx * toDx + toDy * toDy);
    if (dist < ZONE_RADIUS + 20) return;

    const nx = toDx / dist;
    const ny = toDy / dist;

    const arrowDist = 35;
    const ax = px + nx * arrowDist;
    const ay = py + ny * arrowDist;

    const perpX = -ny;
    const perpY = nx;
    const headLen = 7;

    const urgencyAlpha = Math.min(0.7, (urgent.instability - 40) / 80);

    this.arrowGfx.lineStyle(2.5, 0xfbbf24, urgencyAlpha);
    this.arrowGfx.beginPath();
    this.arrowGfx.moveTo(ax - nx * headLen + perpX * headLen, ay - ny * headLen + perpY * headLen);
    this.arrowGfx.lineTo(ax, ay);
    this.arrowGfx.lineTo(ax - nx * headLen - perpX * headLen, ay - ny * headLen - perpY * headLen);
    this.arrowGfx.strokePath();
  }

  private drawSpray() {
    if (!this.sprayGfx) return;
    this.sprayGfx.clear();

    if (!this.isActing || !this.localPlayer) return;

    const px = this.localPlayer.x;
    const py = this.localPlayer.y;
    const nearest = this.findNearestZone();

    if (!nearest) {
      this.sprayGfx.lineStyle(1.5, 0xff4444, 0.25);
      this.sprayGfx.strokeCircle(px, py, ACTION_RANGE * 0.5);
      this.sprayGfx.lineStyle(1, 0xff4444, 0.12);
      this.sprayGfx.strokeCircle(px, py, ACTION_RANGE * 0.75);
      return;
    }

    const spray = getSprayVisual(this.gameCtx.role);
    const tx = nearest.x;
    const ty = nearest.y;

    this.sprayGfx.lineStyle(3, spray.color, 0.6);
    this.sprayGfx.beginPath();
    this.sprayGfx.moveTo(px, py);
    this.sprayGfx.lineTo(tx, ty);
    this.sprayGfx.strokePath();

    this.sprayGfx.lineStyle(2, spray.color, 0.35);
    this.sprayGfx.strokeCircle(tx, ty, ZONE_RADIUS + 4);

    this.sprayGfx.fillStyle(spray.color, 0.4);
    this.sprayGfx.fillCircle(tx, ty, 8);
  }

  // ---- Event toasts ----

  private showEventToast(messageKey: string, _zoneId: string) {
    const now = Date.now();
    const cooldowns: Record<string, number> = {
      zone_critical: 6000,
      chain_started: 4000,
      zone_saved: 2000,
    };
    const cooldown = cooldowns[messageKey] ?? GameScene.TOAST_COOLDOWN;
    const lastTime = this.lastToastTime[messageKey] ?? 0;
    if (now - lastTime < cooldown) return;
    if (this.toasts.length >= GameScene.MAX_TOASTS) return;

    this.lastToastTime[messageKey] = now;

    const mode = this.gameCtx.role;
    const translations: Record<string, Record<string, { text: string; color: string }>> = {
      chain_started: {
        garden: { text: '\u{1F4A5} Blight spreading!', color: '#fbbf24' },
        fire: { text: '\u{1F4A5} Fire spreading!', color: '#fbbf24' },
      },
      zone_saved: {
        garden: { text: '\u{2705} Patch rescued!', color: '#4ade80' },
        fire: { text: '\u{2705} Sector contained!', color: '#4ade80' },
      },
      zone_critical: {
        garden: { text: '\u{26A0}\u{FE0F} A patch needs help!', color: '#f97316' },
        fire: { text: '\u{26A0}\u{FE0F} Sector ablaze!', color: '#f97316' },
      },
    };

    const entry = translations[messageKey]?.[mode];
    if (!entry) return;

    const toast = this.add.container(MAP_WIDTH / 2, 40);
    toast.setDepth(600);
    toast.setScrollFactor(0);
    toast.setAlpha(0);

    const label = this.add.text(0, 0, entry.text, {
      fontSize: '12px',
      fontFamily: 'sans-serif',
      fontStyle: 'bold',
      color: entry.color,
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3,
    });
    label.setOrigin(0.5);

    const bg = this.add.graphics();
    const pad = 8;
    bg.fillStyle(0x0f172a, 0.8);
    bg.fillRoundedRect(
      -label.width / 2 - pad, -label.height / 2 - pad / 2,
      label.width + pad * 2, label.height + pad,
      6
    );
    toast.add(bg);
    toast.add(label);

    if (this.toasts.length > 0) {
      toast.y += 28;
    }
    this.toasts.push(toast);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      duration: 200,
      ease: 'Power2',
    });

    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: toast,
        alpha: 0,
        y: toast.y - 10,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          const idx = this.toasts.indexOf(toast);
          if (idx >= 0) this.toasts.splice(idx, 1);
          toast.destroy();
        },
      });
    });
  }

  shutdown() {
    if (this.snapshotHandler) {
      socket.off('state_snapshot', this.snapshotHandler);
      this.snapshotHandler = null;
    }
    if (this.eventFeedHandler) {
      socket.off('event_feed', this.eventFeedHandler);
      this.eventFeedHandler = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }
}
