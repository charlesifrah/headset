import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import type { GameContext } from '../App';
import { getBackgroundColor } from '../perception/perceptionMapper';

export function createPhaserGame(
  parent: HTMLElement,
  gameCtx: GameContext
): Phaser.Game {
  const bg = getBackgroundColor(gameCtx.role);

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: 800,
    height: 600,
    backgroundColor: `#${bg.toString(16).padStart(6, '0')}`,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      zoom: 1 / window.devicePixelRatio,
    },
    scene: [],
  };

  const game = new Phaser.Game(config);

  game.scene.add('GameScene', new GameScene(gameCtx), true);

  return game;
}
