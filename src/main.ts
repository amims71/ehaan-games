import Phaser from 'phaser';
import { ColorSortScene } from './games/color-sort/ColorSortScene';

// Wait for web fonts (if any) so text renders in the intended face, then boot Phaser.
async function boot(): Promise<void> {
  try {
    await document.fonts?.ready;
  } catch {
    // Fonts API unavailable — proceed with the fallback font stack.
  }
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: '#fff7ed',
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [ColorSortScene],
  });
}

void boot();
