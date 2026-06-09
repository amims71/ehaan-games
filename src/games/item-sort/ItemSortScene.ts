import Phaser from 'phaser';
import {
  isValidDrop,
  isSetComplete,
  type DraggableMeta,
  type DropTarget,
} from '@/shell/input/dropValidation';
import { FONT, PALETTE, drawBasket } from '@/shell/ui/theme';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak } from '@/shell/audio/feedback';
import { nameFor } from '@/shell/ui/emojiNames';

// Sort items into category baskets (Fruit / Animal / Vehicle).
// Uses redundant emoji cues — no colour-only distinction.

interface CategoryDef {
  id: string;
  label: string;
  color: number;
  tint: number;
  icon: string;  // basket header icon
  items: string[]; // item emojis belonging to this category
}

const CATEGORY_DEFS: CategoryDef[] = [
  {
    id: 'fruit', label: 'Fruit', color: PALETTE.orange.color, tint: PALETTE.orange.tint, icon: '🍎',
    items: ['🍎', '🍌', '🍇', '🍓', '🍊', '🍉', '🍐', '🍑', '🥝', '🍒', '🥭', '🍍'],
  },
  {
    id: 'animal', label: 'Animal', color: PALETTE.green.color, tint: PALETTE.green.tint, icon: '🐶',
    items: ['🐶', '🐱', '🐰', '🐻', '🐼', '🦁', '🐯', '🐸', '🐵', '🐷', '🐮', '🐨'],
  },
  {
    id: 'vehicle', label: 'Vehicle', color: PALETTE.blue.color, tint: PALETTE.blue.tint, icon: '🚗',
    items: ['🚗', '🚌', '🚲', '🚕', '🚙', '🚒', '🚓', '🚚', '🚜', '🛵', '🚂', '🚁'],
  },
];
const ITEMS_PER_CATEGORY = 2; // show 2 random items per category each round (from a large pool)

interface Item {
  container: Phaser.GameObjects.Container;
  meta: DraggableMeta;
  emoji: string;
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

export class ItemSortScene extends BaseGameScene {
  private items: Item[] = [];
  private bins: Bin[]  = [];
  private placed: string[] = [];

  constructor() {
    super('ItemSort');
  }

  protected buildLayout(): void {
    this.items  = [];
    this.bins   = [];
    this.placed = [];

    const W = this.scale.width;
    const H = this.scale.height;

    this.addTitle('Sort the items!');

    // Draw category baskets along the bottom third.
    const n = CATEGORY_DEFS.length;
    const binW = Math.min(220, (W * 0.94) / n - 18);
    const binH = binW * 1.0;
    const binGap = (W - n * binW) / (n + 1);
    const binY = H * 0.75;

    CATEGORY_DEFS.forEach((cat, i) => {
      const x = binGap + binW / 2 + i * (binW + binGap);
      this.drawBin(x, binY, binW, binH, cat);
    });

    // Build a shuffled deck of 2 items per category.
    const deck: { emoji: string; categoryId: string }[] = [];
    CATEGORY_DEFS.forEach((cat) => {
      const picked = this.shuffle([...cat.items]).slice(0, ITEMS_PER_CATEGORY);
      picked.forEach((emoji) => deck.push({ emoji, categoryId: cat.id }));
    });
    const shuffled = this.shuffle(deck);

    const count = shuffled.length;
    const size  = Math.min(110, (W * 0.92) / count - 14);
    const trayGap = (W - count * size) / (count + 1);
    const trayY = H * 0.36;

    shuffled.forEach(({ emoji, categoryId }, i) => {
      const x = trayGap + size / 2 + i * (size + trayGap);
      this.makeItem(x, trayY, size, emoji, categoryId, `i${i}`);
    });
  }

  private drawBin(x: number, y: number, w: number, h: number, cat: CategoryDef): void {
    // Basket body via shared helper.
    drawBasket(this, x, y, w, h, cat.tint, cat.color, cat.icon);

    // Category word label below the basket icon.
    this.add
      .text(x, y + h * 0.28, cat.label, {
        fontFamily: FONT,
        fontSize: `${Math.round(Math.min(w, h) * 0.18)}px`,
        color: '#6b4f3a',
        fontStyle: '700',
      })
      .setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setRectangleDropZone(w, h);
    this.bins.push({
      zone,
      target: { id: `bin-${cat.id}`, acceptsCategoryId: cat.id },
      x,
      y: y - h * 0.14,
      count: 0,
    });
  }

  private makeItem(
    x: number,
    y: number,
    size: number,
    emoji: string,
    categoryId: string,
    id: string,
  ): void {
    const r = 24;
    const c = this.add.container(x, y);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.12);
    shadow.fillRoundedRect(-size / 2, -size / 2 + 7, size, size, r);

    const card = this.add.graphics();
    card.fillStyle(0xffffff, 1);
    card.fillRoundedRect(-size / 2, -size / 2, size, size, r);
    card.lineStyle(5, 0xffd6b0, 0.9);
    card.strokeRoundedRect(-size / 2, -size / 2, size, size, r);

    const icon = this.add
      .text(0, 0, emoji, { fontSize: `${Math.round(size * 0.56)}px` })
      .setOrigin(0.5);

    c.add([shadow, card, icon]);
    c.setSize(size, size);
    c.setInteractive({ draggable: true, useHandCursor: true });

    const item: Item = {
      container: c,
      meta: { id, categoryId },
      emoji,
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
    const bin  = this.bins.find((b) => b.zone === zone);
    if (!item || !bin || item.placed) return;

    if (isValidDrop(item.meta, bin.target)) {
      item.placed = true;
      obj.disableInteractive();
      chime();
      speak(nameFor(item.emoji));
      const idx = bin.count;
      bin.count += 1;
      const tx = bin.x + (idx - (ITEMS_PER_CATEGORY - 1) / 2) * 28;
      this.tweens.add({
        targets: obj,
        x: tx,
        y: bin.y,
        scale: 0.62,
        duration: 260,
        ease: 'Back.in',
        onComplete: () => this.pop(obj),
      });
      if (!this.placed.includes(item.meta.id)) this.placed.push(item.meta.id);
      if (isSetComplete(this.placed, this.items.map((i) => i.meta.id))) {
        this.time.delayedCall(320, () =>
          this.celebrate(['🎉', '⭐', '🍎', '🐶', '🚗', '✨', '🧺']),
        );
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
