// Matches the app-wide font set in index.html. Phaser rasterises text once,
// so the font must be loaded before the game creates any Text objects.
export const GAME_FONT = '"Space Grotesk", sans-serif';

export function loadGameFonts(): Promise<unknown> {
  return Promise.all([
    document.fonts.load('400 16px "Space Grotesk"'),
    document.fonts.load('700 16px "Space Grotesk"'),
  ]).catch(() => undefined);
}
