import Phaser from 'phaser';
import { FONT, BG_NUM } from '@/shell/ui/theme';
import { GAMES } from '@/games/registry';

// Hub — the main menu. Shows a big title and one tappable card per game.
// Works portrait and landscape; card size is computed from the viewport.

export class HubScene extends Phaser.Scene {
  constructor() {
    super('Hub');
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const min = Math.min(W, H);

    // Background (matches Phaser backgroundColor, but also drawn to cover any gap).
    this.add.rectangle(W / 2, H / 2, W, H, BG_NUM);

    // Title.
    this.add
      .text(W / 2, H * 0.1, 'Ehaan Games', {
        fontFamily: FONT,
        fontSize: `${Math.round(min * 0.09)}px`,
        color: '#6b4f3a',
        fontStyle: '700',
      })
      .setOrigin(0.5);

    // Responsive card layout.
    const n     = GAMES.length;
    const isLandscape = W > H;
    const cardW = isLandscape
      ? Math.min(200, (W * 0.88) / n - 20)
      : Math.min(260, W * 0.72);
    const cardH = cardW * 1.18;
    const r     = 32;

    // In landscape: single row. In portrait: single column.
    const startY = isLandscape ? H * 0.52 : H * 0.3;
    const stepY  = isLandscape ? 0           : cardH + Math.max(20, H * 0.04);
    const stepX  = isLandscape ? cardW + Math.max(20, W * 0.04) : 0;
    const originX = isLandscape
      ? W / 2 - ((n - 1) / 2) * stepX
      : W / 2;

    GAMES.forEach((game, idx) => {
      const cx = originX + idx * stepX;
      const cy = startY  + idx * stepY;
      this.makeCard(cx, cy, cardW, cardH, r, game.icon, game.title, game.sceneKey);
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
