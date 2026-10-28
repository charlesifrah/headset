import Phaser from 'phaser';
import { MAP_WIDTH, MAP_HEIGHT } from '@shared-field/shared';
import { GameScene } from './scenes/GameScene';
import type { GameContext } from '../App';
import { getBackgroundColor } from '../perception/perceptionMapper';
import { RENDER_SCALE } from './renderScale';

export function createPhaserGame(
  parent: HTMLElement,
  gameCtx: GameContext
): Phaser.Game {
  const bg = getBackgroundColor(gameCtx.role);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: MAP_WIDTH * RENDER_SCALE,
    height: MAP_HEIGHT * RENDER_SCALE,
    backgroundColor: `#${bg.toString(16).padStart(6, '0')}`,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      roundPixels: true,
    },
    scene: [],
  };

  const game = new Phaser.Game(config);

  game.scene.add('GameScene', new GameScene(gameCtx), true);

  return game;
}
