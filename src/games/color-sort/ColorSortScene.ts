import Phaser from 'phaser';
import {
  isValidDrop,
  isSetComplete,
  type DraggableMeta,
  type DropTarget,
} from '@/shell/input/dropValidation';
import { drawBasket } from '@/shell/ui/theme';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak } from '@/shell/audio/feedback';
import { fitGrid, rowX } from '@/shell/ui/layout';

// Color-sort game. Each round randomly picks a few colours (from a vivid, mutually-distinguishable
// pool) and a DISTINCT redundant emoji cue per colour, so the board varies every round but stays
// colourblind-accessible: within a round a colour's bin and its items share the same cue. No
// levels/scoring — finishing the set triggers an appreciation reward, then the board reshuffles.

interface ColorDef {
  id: string;
  color: number; // filled card colour
  tint: number; // soft basket fill
}

// Rendered as filled cards with a white border + drop shadow, so they read clearly on the cream bg.
const COLOR_POOL: ColorDef[] = [
  { id: 'blue', color: 0x0072b2, tint: 0xd5e8f4 },
  { id: 'green', color: 0x009e73, tint: 0xd2efe6 },
  { id: 'red', color: 0xd55e00, tint: 0xf7ddca },
  { id: 'purple', color: 0x9b4dca, tint: 0xeaddf5 },
  { id: 'pink', color: 0xe75a9c, tint: 0xfadcec },
  { id: 'teal', color: 0x00a3a3, tint: 0xd2efef },
];

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

    // Random colours for THIS round. No icons — pure colour matching, so the child sorts by colour.
    const cats = this.shuffle([...COLOR_POOL]).slice(0, ROUND_COLORS);

    // Bins: a centred row across the bottom, sized to the viewport.
    const n = cats.length;
    const gap = W * 0.03;
    const binH = Math.min(W * 0.3, H * 0.26);
    const binW = Math.min(240, (W - (n + 1) * gap) / n);
    const binY = H - binH / 2 - H * 0.05;
    const xs = rowX(n, 0, W, binW, gap);
    cats.forEach((cat, i) => this.drawBin(xs[i], binY, binW, binH, cat));

    // Items: a grid filling the area between the title and the bins (adapts to orientation).
    const deck: ColorDef[] = [];
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

  private drawBin(x: number, y: number, w: number, h: number, cat: ColorDef): void {
    drawBasket(this, x, y, w, h, cat.tint, cat.color, '');
    const zone = this.add.zone(x, y, w, h).setRectangleDropZone(w, h);
    this.bins.push({
      zone,
      target: { id: `bin-${cat.id}`, acceptsCategoryId: cat.id },
      x,
      y: y - h * 0.16,
      count: 0,
    });
  }

  private makeItem(x: number, y: number, size: number, cat: ColorDef, id: string): void {
    const r = 24;
    const c = this.add.container(x, y);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.12);
    shadow.fillRoundedRect(-size / 2, -size / 2 + 7, size, size, r);

    const card = this.add.graphics();
    card.fillStyle(cat.color, 1);
    card.fillRoundedRect(-size / 2, -size / 2, size, size, r);
    card.lineStyle(5, 0xffffff, 0.7);
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
