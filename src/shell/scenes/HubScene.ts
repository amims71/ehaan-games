import Phaser from 'phaser';
import { FONT, BG_NUM } from '@/shell/ui/theme';
import { GAMES } from '@/games/registry';
import { fitGrid } from '@/shell/ui/layout';

// Hub — the main menu. Shows a big title and one tappable card per game.
// Works portrait and landscape; card size is computed from the viewport.

export class HubScene extends Phaser.Scene {
  constructor() {
    super('Hub');
  }

  private rebuildTimer?: Phaser.Time.TimerEvent;
  private builtW = 0;
  private builtH = 0;

  create(): void {
    this.buildLayout();
    this.scale.on('resize', this.scheduleRebuild, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.scheduleRebuild, this));
  }

  private scheduleRebuild(): void {
    if (this.scale.width === this.builtW && this.scale.height === this.builtH) return;
    this.rebuildTimer?.remove();
    this.rebuildTimer = this.time.delayedCall(120, () => this.buildLayout());
  }

  private buildLayout(): void {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.builtW = this.scale.width;
    this.builtH = this.scale.height;

    const W = this.scale.width;
    const H = this.scale.height;
    const min = Math.min(W, H);

    this.add.rectangle(W / 2, H / 2, W, H, BG_NUM);

    this.add
      .text(W / 2, H * 0.1, 'Ehaan Games', {
        fontFamily: FONT,
        fontSize: `${Math.round(min * 0.09)}px`,
        color: '#6b4f3a',
        fontStyle: '700',
      })
      .setOrigin(0.5);

    // Square cards laid out in a grid that fits any orientation (row in landscape, column in portrait).
    const grid = fitGrid(GAMES.length, W * 0.06, H * 0.2, W * 0.88, H * 0.72, 0.2, 260);
    GAMES.forEach((game, idx) => {
      const cell = grid.cells[idx];
      this.makeCard(cell.x, cell.y, grid.size, grid.size, 32, game.icon, game.title, game.sceneKey);
    });
  }

  private makeCard(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    icon: string,
    label: string,
    sceneKey: string,
  ): void {
    const c = this.add.container(x, y);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.1);
    shadow.fillRoundedRect(-w / 2, -h / 2 + 10, w, h, r);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    bg.lineStyle(5, 0xfed7aa, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

    const iconText = this.add
      .text(0, -h * 0.12, icon, {
        fontSize: `${Math.round(Math.min(w, h) * 0.38)}px`,
      })
      .setOrigin(0.5);

    const titleText = this.add
      .text(0, h * 0.27, label, {
        fontFamily: FONT,
        fontSize: `${Math.round(Math.min(w, h) * 0.15)}px`,
        color: '#6b4f3a',
        fontStyle: '600',
      })
      .setOrigin(0.5);

    c.add([shadow, bg, iconText, titleText]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });

    // Gentle idle bob.
    this.tweens.add({
      targets: c,
      y: y - 8,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      delay: Math.random() * 600,
    });

    c.on('pointerdown', () => {
      this.tweens.killTweensOf(c);
      this.tweens.add({
        targets: c, scale: 0.93, duration: 100, yoyo: true,
        onComplete: () => this.scene.start(sceneKey),
      });
    });
    c.on('pointerover',  () => { if (c.scale === 1) c.setScale(1.05); });
    c.on('pointerout',   () => c.setScale(1));
  }
}
