import Phaser from 'phaser';
import { SortScene, type SortBin, type SortItem } from '@/shell/game/SortScene';
import { SHAPES, type ShapeId, drawShape } from '@/shell/ui/shapes';

// Sort game: drag shapes into drop targets that display the shape itself as a large silhouette.
// Each round picks 3 random shapes; items share the shape but may differ in colour.

// Vivid fill colours for items — sorting is by SHAPE, not colour.
const ITEM_COLORS = [0xe63946, 0x2ec4b6, 0xff9f1c, 0x9b4dca, 0x0072b2, 0x009e73];

// Soft tint / bold stroke pairs for each bin slot.
const BIN_PALETTES = [
  { tint: 0xd5e8f4, stroke: 0x2e86de },
  { tint: 0xd4f4e2, stroke: 0x2ecc71 },
  { tint: 0xfce3c7, stroke: 0xf08000 },
  { tint: 0xfcf3cf, stroke: 0xe6b800 },
  { tint: 0xffe0f0, stroke: 0xff6fb5 },
];

const ITEMS_PER_SHAPE = 2;

export class ShapeSortScene extends SortScene {
  constructor() {
    super('ShapeSort');
  }

  protected roundTitle(): string {
    return 'Sort the shapes!';
  }

  protected buildRound(): { bins: SortBin[]; items: SortItem[] } {
    // Pick 3 random distinct shapes.
    const picked: ShapeId[] = this.shuffle([...SHAPES]).slice(0, 3);

    const bins: SortBin[] = picked.map((shape, i) => {
      const pal = BIN_PALETTES[i % BIN_PALETTES.length];
      return this.makeBin(shape, pal);
    });

    // Two items per shape; each gets a distinct vivid colour.
    const items: SortItem[] = [];
    let colorIdx = 0;
    picked.forEach((shape) => {
      for (let k = 0; k < ITEMS_PER_SHAPE; k++) {
        const color = ITEM_COLORS[colorIdx % ITEM_COLORS.length];
        colorIdx++;
        items.push(this.makeItem(shape, k, color));
      }
    });

    return { bins, items };
  }

  private makeBin(shape: ShapeId, pal: { tint: number; stroke: number }): SortBin {
    return {
      categoryId: shape,
      drawInto: (c: Phaser.GameObjects.Container, w: number, h: number) => {
        // Large pale shape silhouette with bold outline — the bin IS the shape, no square basket.
        drawShape(this, c, shape, Math.min(w, h) * 1.0, pal.tint, { stroke: pal.stroke, width: 8 });
      },
    };
  }

  private makeItem(shape: ShapeId, k: number, color: number): SortItem {
    return {
      id: `${shape}-${k}`,
      categoryId: shape,
      pronounce: shape,
      drawInto: (c: Phaser.GameObjects.Container, size: number) => {
        this.drawItemCard(c, shape, size, color);
      },
    };
  }

  // ── drawing helpers ────────────────────────────────────────────────────────

  private drawItemCard(
    c: Phaser.GameObjects.Container,
    shape: ShapeId,
    size: number,
    color: number,
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
    drawShape(this, c, shape, size * 0.6, color);
  }
}
