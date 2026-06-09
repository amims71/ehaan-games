import Phaser from 'phaser';
import { HubScene }          from './shell/scenes/HubScene';
import { ColorSortScene }    from './games/color-sort/ColorSortScene';
import { ItemSortScene }     from './games/item-sort/ItemSortScene';
import { ItemMatchScene }    from './games/item-match/ItemMatchScene';
import { LetterMatchScene }  from './games/letter-match/LetterMatchScene';
import { FindLetterScene }   from './games/letter-find/FindLetterScene';
import { ListenFindScene }   from './games/letter-find/ListenFindScene';

// Wait for web fonts (if any) so text renders in the intended face, then boot Phaser.
async function boot(): Promise<void> {
  try {
    await document.fonts?.ready;
  } catch {
    // Fonts API unavailable — proceed with the fallback font stack.
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: '#fff7ed',
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [HubScene, ColorSortScene, ItemSortScene, ItemMatchScene, LetterMatchScene, FindLetterScene, ListenFindScene],
  });
  // Dev-only: expose the game for quick scene navigation while iterating (stripped from production).
  if (import.meta.env.DEV) (globalThis as Record<string, unknown>).__game = game;
}

void boot();
