import Phaser from 'phaser';
import { SortScene, type SortBin, type SortItem } from '@/shell/game/SortScene';
import { FONT, PALETTE, glyphText } from '@/shell/ui/theme';

// Sort game: drag items to the 'Big' or 'Small' basket based on the rendered emoji size.
// Each round shows a few icons AS PAIRS — the same icon once big and once small — so the child
// compares the same item at two sizes and learns big vs small per item.

const EMOJI_POOL = ['🐶', '🍎', '⭐', '🚗', '🐱', '🌸', '🦁', '🎈', '🍦', '🐸'];
const PAIRS = 3; // distinct icons per round; each appears once big and once small (→ 6 items)

type SizeCategory = 'big' | 'small';

export class SizeSortScene extends SortScene {
  constructor() {
    super('SizeSort');
  }

  protected roundTitle(): string {
    return 'Big and small!';
  }

  protected buildRound(): { bins: SortBin[]; items: SortItem[] } {
    const bins: SortBin[] = [
      {
        categoryId: 'big',
        drawInto: (c: Phaser.GameObjects.Container, w: number, h: number) => {
          this.drawSizeBin(c, w, h, PALETTE.blue.tint, PALETTE.blue.color, 'Big');
        },
      },
      {
        categoryId: 'small',
        drawInto: (c: Phaser.GameObjects.Container, w: number, h: number) => {
          this.drawSizeBin(c, w, h, PALETTE.orange.tint, PALETTE.orange.color, 'Small');
        },
      },
    ];

    // Each chosen icon becomes a pair: one 'big' item and one 'small' item, so the same picture
    // is shown at both sizes for direct comparison.
    const emojis = this.shuffle([...EMOJI_POOL]).slice(0, PAIRS);
    const items: SortItem[] = [];
    emojis.forEach((emoji, i) => {
      (['big', 'small'] as SizeCategory[]).forEach((cat) => {
        items.push({
          id: `${emoji}-${cat}-${i}`,
          categoryId: cat,
          pronounce: cat,
          drawInto: (c: Phaser.GameObjects.Container, size: number) => {
            this.drawSizeItem(c, emoji, cat, size);
          },
        });
      });
    });

    return { bins, items: this.shuffle(items) };
  }

  // ── drawing helpers ────────────────────────────────────────────────────────

  private drawSizeBin(
    c: Phaser.GameObjects.Container,
    w: number,
    h: number,
    fillTint: number,
    strokeColor: number,
    label: string,
  ): void {
    const rr = 30;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.1);
    shadow.fillRoundedRect(-w / 2, -h / 2 + 10, w, h, rr);

    const bg = this.add.graphics();
    bg.fillStyle(fillTint, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, rr);
    bg.lineStyle(9, strokeColor, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, rr);

    c.add([shadow, bg]);

    const txt = this.add
      .text(0, h * 0.28, label, {
        fontFamily: FONT,
        fontSize: `${Math.round(Math.min(w, h) * 0.22)}px`,
        color: '#6b4f3a',
        fontStyle: '700',
      })
      .setOrigin(0.5);
    c.add(txt);
  }

  private drawSizeItem(
    c: Phaser.GameObjects.Container,
    emoji: string,
    cat: SizeCategory,
    size: number,
  ): void {
    const r = 24;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.12);
    shadow.fillRoundedRect(-size / 2, -size / 2 + 7, size, size, r);

    const card = this.add.graphics();
    card.fillStyle(0xffffff, 1);
    card.fillRoundedRect(-size / 2, -size / 2, size, size, r);
    card.lineStyle(5, 0xffd6b0, 0.9);
    card.strokeRoundedRect(-size / 2, -size / 2, size, size, r);

    c.add([shadow, card]);

    // Large emoji for 'big', small emoji for 'small'.
    const fontSize = cat === 'big' ? Math.round(size * 0.78) : Math.round(size * 0.34);
    const icon = glyphText(this, 0, 0, emoji, fontSize);
    c.add(icon);
  }
}
