import Phaser from 'phaser';
import {
  isValidDrop,
  isSetComplete,
  type DraggableMeta,
  type DropTarget,
} from '@/shell/input/dropValidation';
import { drawBasket, COLORS, darken, type NamedColor } from '@/shell/ui/theme';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak } from '@/shell/audio/feedback';
import { fitGrid, rowX } from '@/shell/ui/layout';
import { count } from '@/shell/settings';

// Color-sort game. Each round randomly picks 3 of the 11 named colours from the shared palette.
// Items show the vivid colour with a darkened border (so white/yellow remain visible on cream bg).
// Baskets use the tint fill with a darkened border for the same reason.

const ROUND_COLORS = 3; // colours shown per round
const ITEMS_PER_CATEGORY = 2; // items of each colour per round

interface Item {
  container: Phaser.GameObjects.Container;
  meta: DraggableMeta;
  home: { x: number; y: number };
  placed: boolean;
}
interface Bin {
  zone: Phaser.GameObjects.Zone;
  target: DropTarget;
  x: number;
  y: number;
  count: number;
}

export class ColorSortScene extends BaseGameScene {
  private items: Item[] = [];
  private bins: Bin[] = [];
  private placed: string[] = [];

  constructor() {
    super('ColorSort');
  }

  protected buildLayout(): void {
    this.items = [];
    this.bins = [];
    this.placed = [];

    const W = this.scale.width;
    const H = this.scale.height;

    this.addTitle('Match the colors!');

    // Pick 3 of the 11 named colours for this round.
    const cats: NamedColor[] = this.shuffle([...COLORS]).slice(0, count(ROUND_COLORS, 2));

    // Bins: a centred row across the bottom, sized to the viewport.
    const n = cats.length;
    const gap = W * 0.03;
    const binH = Math.min(W * 0.3, H * 0.26);
    const binW = Math.min(240, (W - (n + 1) * gap) / n);
    const binY = H - binH / 2 - H * 0.05;
    const xs = rowX(n, 0, W, binW, gap);
    cats.forEach((cat, i) => this.drawBin(xs[i], binY, binW, binH, cat));

    // Items: a grid filling the area between the title and the bins (adapts to orientation).
    const deck: NamedColor[] = [];
    cats.forEach((c) => {
      for (let k = 0; k < ITEMS_PER_CATEGORY; k++) deck.push(c);
    });
    const shuffled = this.shuffle(deck);
    const areaTop = H * 0.17;
    const areaH = binY - binH / 2 - H * 0.03 - areaTop;
    const grid = fitGrid(shuffled.length, W * 0.05, areaTop, W * 0.9, areaH, 0.24, 120);
    shuffled.forEach((cat, i) =>
      this.makeItem(grid.cells[i].x, grid.cells[i].y, grid.size, cat, `i${i}`),
    );
  }

  private drawBin(x: number, y: number, w: number, h: number, cat: NamedColor): void {
    // Use darken() stroke so light colours (white/yellow) remain visible on the cream background.
    drawBasket(this, x, y, w, h, cat.tint, darken(cat.color), '');
    // Forgiving drop zone — taller than the basket (extends upward), so a drop that lands short still counts.
    const zone = this.add.zone(x, y - h * 0.4, w, h * 1.8).setRectangleDropZone(w, h * 1.8);
    this.bins.push({
      zone,
      target: { id: `bin-${cat.id}`, acceptsCategoryId: cat.id },
      x,
      y: y - h * 0.16,
      count: 0,
    });
  }

  private makeItem(x: number, y: number, size: number, cat: NamedColor, id: string): void {
    const r = 24;
    const c = this.add.container(x, y);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.12);
    shadow.fillRoundedRect(-size / 2, -size / 2 + 7, size, size, r);

    const card = this.add.graphics();
    card.fillStyle(cat.color, 1);
    card.fillRoundedRect(-size / 2, -size / 2, size, size, r);
    // Darkened border so white/yellow cards remain visible on the cream background.
    card.lineStyle(5, darken(cat.color), 0.9);
    card.strokeRoundedRect(-size / 2, -size / 2, size, size, r);

    c.add([shadow, card]);
    c.setSize(size, size);
    c.setInteractive({ draggable: true, useHandCursor: true });

    const item: Item = {
      container: c,
      meta: { id, categoryId: cat.id },
      home: { x, y },
      placed: false,
    };
    c.setData('item', item);
    this.items.push(item);

    this.tweens.add({
      targets: c,
      y: y - 7,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      delay: Math.random() * 700,
    });
  }

  protected override onDrop(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.Container,
    zone: Phaser.GameObjects.Zone,
  ): void {
    const item = obj.getData('item') as Item | undefined;
    const bin = this.bins.find((b) => b.zone === zone);
    if (!item || !bin || item.placed) return;

    if (isValidDrop(item.meta, bin.target)) {
      item.placed = true;
      obj.disableInteractive();
      chime();
      speak(item.meta.categoryId ?? '');
      const idx = bin.count;
      bin.count += 1;
      const tx = bin.x + (idx - (ITEMS_PER_CATEGORY - 1) / 2) * 26;
      this.tweens.add({
        targets: obj,
        x: tx,
        y: bin.y,
        scale: 0.6,
        duration: 260,
        ease: 'Back.in',
        onComplete: () => this.pop(obj),
      });
      if (!this.placed.includes(item.meta.id)) this.placed.push(item.meta.id);
      if (isSetComplete(this.placed, this.items.map((i) => i.meta.id))) {
        this.time.delayedCall(320, () => this.celebrate(['🎉', '⭐', '✨', '💛', '🎈', '🌈']));
      }
    } else {
      buzz();
      this.wiggle(obj);
      this.returnHome(item);
    }
  }

  protected override onDragEnd(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.Container,
    dropped: boolean,
  ): void {
    const item = obj.getData('item') as Item | undefined;
    if (!dropped && item && !item.placed) this.returnHome(item);
  }

  private returnHome(item: Item): void {
    this.tweens.add({
      targets: item.container,
      x: item.home.x,
      y: item.home.y,
      scale: 1,
      angle: 0,
      duration: 300,
      ease: 'Back.out',
    });
  }
}
