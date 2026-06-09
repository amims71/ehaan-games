import Phaser from 'phaser';
import {
  isValidDrop,
  isSetComplete,
  type DraggableMeta,
  type DropTarget,
} from '@/shell/input/dropValidation';

// Design-prototype color-sort game. Honors the spec's accessibility rule: every colour
// category carries a REDUNDANT non-colour cue (a distinct emoji character), and colours
// are drawn from the colourblind-safe Okabe-Ito palette. No levels/scoring — finishing the
// set triggers an appreciation reward, then the board reshuffles (open continuous play).

const FONT = 'Fredoka, "Baloo 2", "Trebuchet MS", system-ui, sans-serif';

interface Category {
  id: string;
  color: number; // Okabe-Ito, colourblind-safe
  tint: number; // soft fill for the basket
  icon: string; // redundant non-colour cue
}

const CATEGORIES: Category[] = [
  { id: 'blue', color: 0x0072b2, tint: 0xd5e8f4, icon: '🐳' },
  { id: 'green', color: 0x009e73, tint: 0xd2efe6, icon: '🐢' },
  { id: 'orange', color: 0xd55e00, tint: 0xf7ddca, icon: '🦊' },
];
const ITEMS_PER_CATEGORY = 2;

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

export class ColorSortScene extends Phaser.Scene {
  private items: Item[] = [];
  private bins: Bin[] = [];
  private placed: string[] = [];

  constructor() {
    super('ColorSort');
  }

  create(): void {
    this.input.on('dragstart', this.onDragStart, this);
    this.input.on('drag', this.onDrag, this);
    this.input.on('drop', this.onDrop, this);
    this.input.on('dragend', this.onDragEnd, this);
    this.buildLayout();
  }

  private buildLayout(): void {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.items = [];
    this.bins = [];
    this.placed = [];

    const W = this.scale.width;
    const H = this.scale.height;

    this.add
      .text(W / 2, H * 0.09, 'Match the colors!', {
        fontFamily: FONT,
        fontSize: `${Math.round(Math.min(W, H) * 0.072)}px`,
        color: '#6b4f3a',
        fontStyle: '600',
      })
      .setOrigin(0.5);

    const n = CATEGORIES.length;
    const binW = Math.min(230, (W * 0.94) / n - 18);
    const binH = binW * 0.92;
    const binGap = (W - n * binW) / (n + 1);
    const binY = H * 0.74;
    CATEGORIES.forEach((cat, i) => {
      const x = binGap + binW / 2 + i * (binW + binGap);
      this.drawBin(x, binY, binW, binH, cat);
    });

    const deck: Category[] = [];
    CATEGORIES.forEach((c) => {
      for (let k = 0; k < ITEMS_PER_CATEGORY; k++) deck.push(c);
    });
    const shuffled = this.shuffle(deck);
    const count = shuffled.length;
    const size = Math.min(108, (W * 0.92) / count - 14);
    const trayGap = (W - count * size) / (count + 1);
    const trayY = H * 0.36;
    shuffled.forEach((cat, i) => {
      const x = trayGap + size / 2 + i * (size + trayGap);
      this.makeItem(x, trayY, size, cat, `i${i}`);
    });
  }

  private drawBin(x: number, y: number, w: number, h: number, cat: Category): void {
    const r = 30;
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.1);
    shadow.fillRoundedRect(x - w / 2, y - h / 2 + 10, w, h, r);

    const g = this.add.graphics();
    g.fillStyle(cat.tint, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
    g.lineStyle(9, cat.color, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);

    this.add
      .text(x, y, cat.icon, { fontSize: `${Math.round(h * 0.46)}px` })
      .setOrigin(0.5)
      .setAlpha(0.32);

    const zone = this.add.zone(x, y, w, h).setRectangleDropZone(w, h);
    this.bins.push({
      zone,
      target: { id: `bin-${cat.id}`, acceptsCategoryId: cat.id },
      x,
      y: y - h * 0.16,
      count: 0,
    });
  }

  private makeItem(x: number, y: number, size: number, cat: Category, id: string): void {
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

    const icon = this.add
      .text(0, 0, cat.icon, { fontSize: `${Math.round(size * 0.56)}px` })
      .setOrigin(0.5);

    c.add([shadow, card, icon]);
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

  private onDragStart(_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Container): void {
    this.tweens.killTweensOf(obj);
    this.children.bringToTop(obj);
    this.tweens.add({ targets: obj, scale: 1.14, duration: 130, ease: 'Back.out' });
  }

  private onDrag(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.Container,
    dragX: number,
    dragY: number,
  ): void {
    obj.x = dragX;
    obj.y = dragY;
  }

  private onDrop(
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
        this.time.delayedCall(320, () => this.celebrate());
      }
    } else {
      this.wiggle(obj);
      this.returnHome(item);
    }
  }

  private onDragEnd(
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

  private pop(obj: Phaser.GameObjects.Container): void {
    this.tweens.add({ targets: obj, scale: 0.7, duration: 120, yoyo: true });
  }

  private wiggle(obj: Phaser.GameObjects.Container): void {
    this.tweens.add({
      targets: obj,
      angle: { from: -9, to: 9 },
      duration: 70,
      yoyo: true,
      repeat: 3,
      onComplete: () => obj.setAngle(0),
    });
  }

  private celebrate(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const banner = this.add
      .text(W / 2, H * 0.48, 'Yay! 🎉', {
        fontFamily: FONT,
        fontSize: `${Math.round(Math.min(W, H) * 0.13)}px`,
        color: '#e8590c',
        fontStyle: '600',
      })
      .setOrigin(0.5)
      .setScale(0);
    this.tweens.add({ targets: banner, scale: 1, duration: 480, ease: 'Back.out' });

    const confetti = ['🎉', '⭐', '🐳', '🐢', '🦊', '💛', '✨'];
    for (let i = 0; i < 28; i++) {
      const e = this.add
        .text(W / 2, H * 0.48, confetti[i % confetti.length], { fontSize: '40px' })
        .setOrigin(0.5);
      this.tweens.add({
        targets: e,
        x: Math.random() * W,
        y: H * 0.9 * Math.random(),
        angle: Math.random() * 360,
        alpha: { from: 1, to: 0 },
        duration: 900 + Math.random() * 600,
        ease: 'Cubic.out',
        onComplete: () => e.destroy(),
      });
    }

    this.time.delayedCall(2300, () => this.buildLayout());
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
