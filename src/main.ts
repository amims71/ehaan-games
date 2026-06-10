import Phaser from 'phaser';
import { HubScene }            from './shell/scenes/HubScene';
import { ColorSortScene }      from './games/color-sort/ColorSortScene';
import { ItemSortScene }       from './games/item-sort/ItemSortScene';
import { ItemMatchScene }      from './games/item-match/ItemMatchScene';
import { LetterMatchScene }    from './games/letter-match/LetterMatchScene';
import { FindLetterScene }     from './games/letter-find/FindLetterScene';
import { ListenFindScene }     from './games/letter-find/ListenFindScene';
import { ShapeSortScene }      from './games/shape-sort/ShapeSortScene';
import { SizeSortScene }       from './games/size-sort/SizeSortScene';
import { ShapeMatchScene }     from './games/shape-match/ShapeMatchScene';
import { CaseMatchScene }      from './games/case-match/CaseMatchScene';
import { FindColorScene }      from './games/find-color/FindColorScene';
import { FindShapeScene }      from './games/find-shape/FindShapeScene';
import { AnimalSoundScene }    from './games/animal-sound/AnimalSoundScene';
import { CountingScene }       from './games/counting/CountingScene';
import { PatternsScene }       from './games/patterns/PatternsScene';
import { FirstLetterScene }    from './games/first-letter/FirstLetterScene';
import { SimpleJigsawScene }   from './games/jigsaw/SimpleJigsawScene';
import { ColourItScene }       from './games/colour-it/ColourItScene';
import { BubblePopScene }      from './games/bubble-pop/BubblePopScene';

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
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
    scene: [HubScene, ColorSortScene, ItemSortScene, ItemMatchScene, LetterMatchScene, FindLetterScene, ListenFindScene, ShapeSortScene, SizeSortScene, ShapeMatchScene, CaseMatchScene, FindColorScene, FindShapeScene, AnimalSoundScene, CountingScene, PatternsScene, FirstLetterScene, SimpleJigsawScene, ColourItScene, BubblePopScene],
  });
  // Dev-only: expose the game for quick scene navigation while iterating (stripped from production).
  if (import.meta.env.DEV) (globalThis as Record<string, unknown>).__game = game;
}

void boot();

// Service-worker update nudge. vite-plugin-pwa (registerType: 'autoUpdate') already reloads when a
// new worker activates, but iOS home-screen apps only check on cold launch. Re-checking on launch
// and whenever the app is brought back to the foreground makes new deploys apply a launch sooner.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready
    .then((reg) => {
      const check = (): void => { void reg.update().catch(() => {}); };
      check();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    })
    .catch(() => {
      // No active service worker (e.g. dev server) — nothing to update.
    });
}
