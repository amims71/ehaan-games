import Phaser from 'phaser';
import {
  isValidDrop,
  isSetComplete,
  type DraggableMeta,
  type DropTarget,
} from '@/shell/input/dropValidation';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak } from '@/shell/audio/feedback';
import { fitGrid, rowX } from '@/shell/ui/layout';

// Reusable "drag items into matching baskets" base for new sort games.
// Subclasses supply bins and items; this base handles layout, drag, drop, and celebrate.

/** A category basket that knows how to draw itself. */
export interface SortBin {
  categoryId: string;
  drawInto(c: Phaser.GameObjects.Container, w: number, h: number): void;
}

/** A draggable item that knows how to draw itself. */
export interface SortItem {
  id: string;
  categoryId: string;
  pronounce: string;
  drawInto(c: Phaser.GameObjects.Container, size: number): void;
}

interface LiveItem {
  container: Phaser.GameObjects.Container;
  item: SortItem;
  home: { x: number; y: number };
  placed: boolean;
}

interface LiveBin {
  zone: Phaser.GameObjects.Zone;
  target: DropTarget;
  x: number;
  y: number;
  count: number;
}

export abstract class SortScene extends BaseGameScene {
  // ── subclass contract ────────────────────────────────────────────────────

  /** Title text shown at the top of the board. */
  protected abstract roundTitle(): string;

  /** Return the bins and items for one round. */
  protected abstract buildRound(): { bins: SortBin[]; items: SortItem[] };

  // ── state ────────────────────────────────────────────────────────────────

  private liveItems: LiveItem[] = [];
  private liveBins: LiveBin[] = [];
  private placed: string[] = [];

  // ── buildLayout ──────────────────────────────────────────────────────────

  protected buildLayout(): void {
    this.liveItems = [];
    this.liveBins  = [];
    this.placed    = [];

    const W = this.scale.width;
    const H = this.scale.height;

    this.addTitle(this.roundTitle());

    const { bins, items } = this.buildRound();
    const shuffledItems = this.shuffle(items);

    // Category baskets: a centred row across the bottom.
    const n = bins.length;
    const gap = W * 0.03;
    const binH = Math.min(W * 0.3, H * 0.27);
    const binW = Math.min(230, (W - (n + 1) * gap) / n);
    const binY = H - binH / 2 - H * 0.06;
    const xs = rowX(n, 0, W, binW, gap);

    bins.forEach((bin, i) => {
      const c = this.add.container(xs[i], binY);
      bin.drawInto(c, binW, binH);
      c.setSize(binW, binH);
      const zone = this.add.zone(xs[i], binY, binW, binH).setRectangleDropZone(binW, binH);
      this.liveBins.push({
        zone,
        target: { id: `bin-${bin.categoryId}`, acceptsCategoryId: bin.categoryId },
        x: xs[i],
        y: binY - binH * 0.14,
        count: 0,
      });
    });

    // Items grid fills the area between title and baskets.
    const areaTop = H * 0.17;
    const areaH = binY - binH / 2 - H * 0.03 - areaTop;
    const grid = fitGrid(shuffledItems.length, W * 0.05, areaTop, W * 0.9, areaH, 0.24, 116);

    shuffledItems.forEach((item, i) => {
      const { x, y } = grid.cells[i];
      const c = this.add.container(x, y);
      item.drawInto(c, grid.size);
      c.setSize(grid.size, grid.size);
      c.setInteractive({ draggable: true, useHandCursor: true });

      const live: LiveItem = { container: c, item, home: { x, y }, placed: false };
      c.setData('sortItem', live);
      this.liveItems.push(live);

      // Gentle idle bob.
      this.tweens.add({
        targets: c,
        y: y - 7,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
        delay: Math.random() * 700,
      });
    });
  }

  // ── drop logic ───────────────────────────────────────────────────────────

  protected override onDrop(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.Container,
    zone: Phaser.GameObjects.Zone,
  ): void {
    const live = obj.getData('sortItem') as LiveItem | undefined;
    const bin  = this.liveBins.find((b) => b.zone === zone);
    if (!live || !bin || live.placed) return;

    const meta: DraggableMeta = { id: live.item.id, categoryId: live.item.categoryId };
    if (isValidDrop(meta, bin.target)) {
      live.placed = true;
      obj.disableInteractive();
      chime();
      speak(live.item.pronounce);
      const idx = bin.count;
      bin.count += 1;
      const tx = bin.x + (idx - 0.5) * 28;
      this.tweens.add({
        targets: obj,
        x: tx,
        y: bin.y,
        scale: 0.62,
        duration: 260,
        ease: 'Back.in',
        onComplete: () => this.pop(obj),
      });
      if (!this.placed.includes(live.item.id)) this.placed.push(live.item.id);
      if (isSetComplete(this.placed, this.liveItems.map((li) => li.item.id))) {
        this.time.delayedCall(320, () => this.celebrate());
      }
    } else {
      buzz();
      this.wiggle(obj);
      this.returnHome(live);
    }
  }

  protected override onDragEnd(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.Container,
    dropped: boolean,
  ): void {
    const live = obj.getData('sortItem') as LiveItem | undefined;
    if (!dropped && live && !live.placed) this.returnHome(live);
  }

  private returnHome(live: LiveItem): void {
    this.tweens.add({
      targets: live.container,
      x: live.home.x,
      y: live.home.y,
      scale: 1,
      angle: 0,
      duration: 300,
      ease: 'Back.out',
    });
  }
}
