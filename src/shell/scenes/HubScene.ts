import Phaser from 'phaser';
import { FONT, BG_NUM } from '@/shell/ui/theme';
import { GAMES } from '@/games/registry';

// Hub — the main menu: a fixed title over a vertically SCROLLABLE grid of game tiles, so the
// catalogue can grow past one screen. Drag/swipe or wheel to scroll; a small drag threshold
// distinguishes a scroll from a tap. Works portrait and landscape.

export class HubScene extends Phaser.Scene {
  private rebuildTimer?: Phaser.Time.TimerEvent;
  private builtW = 0;
  private builtH = 0;

  private list!: Phaser.GameObjects.Container;
  private listTop = 0;
  private scrollY = 0;
  private maxScroll = 0;
  private dragActive = false;
  private dragStartPointerY = 0;
  private dragStartScroll = 0;
  private dragMoved = 0;
  private rowStep = 0;
  private wheelTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super('Hub');
  }

  create(): void {
    this.buildLayout();
    this.installScrollInput();
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
    this.scrollY = 0;

    const W = this.scale.width;
    const H = this.scale.height;
    const min = Math.min(W, H);

    this.add.rectangle(W / 2, H / 2, W, H, BG_NUM);

    this.add
      .text(W / 2, H * 0.09, 'Ehaan Games', {
        fontFamily: FONT,
        fontSize: `${Math.round(min * 0.08)}px`,
        color: '#6b4f3a',
        fontStyle: '700',
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.listTop = H * 0.2;

    const cols = W > H ? 3 : 2;
    const gap = Math.max(16, W * 0.04);
    const tileW = Math.min(240, (W * 0.92 - (cols - 1) * gap) / cols);
    const tileH = tileW;
    const rows = Math.ceil(GAMES.length / cols);
    const gridW = cols * tileW + (cols - 1) * gap;
    const startX = (W - gridW) / 2 + tileW / 2;

    this.list = this.add.container(0, this.listTop);
    GAMES.forEach((game, i) => {
      const x = startX + (i % cols) * (tileW + gap);
      const y = tileH / 2 + Math.floor(i / cols) * (tileH + gap);
      this.list.add(this.makeCard(x, y, tileW, tileH, game.icon, game.title, game.sceneKey));
    });

    this.rowStep = tileH + gap;
    const contentH = rows * tileH + (rows - 1) * gap;
    const viewportH = H - this.listTop - H * 0.04;
    const rawMax = Math.max(0, contentH - viewportH);
    // Round the max scroll UP to a whole row so EVERY rest position (including the bottom) is
    // row-aligned — the top of the list then never shows a half-cut row.
    this.maxScroll = rawMax > 0 ? Math.ceil(rawMax / this.rowStep) * this.rowStep : 0;

    // Opaque header strip (depth 9) so tiles scroll out of sight behind the fixed title (depth 10).
    this.add.rectangle(W / 2, this.listTop / 2, W, this.listTop, BG_NUM).setDepth(9);
  }

  private installScrollInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < this.listTop || this.maxScroll <= 0) {
        this.dragActive = false;
        return;
      }
      this.dragActive = true;
      this.dragStartPointerY = p.y;
      this.dragStartScroll = this.scrollY;
      this.dragMoved = 0;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragActive || !p.isDown) return;
      const dy = p.y - this.dragStartPointerY;
      this.dragMoved = Math.max(this.dragMoved, Math.abs(dy));
      this.scrollY = Phaser.Math.Clamp(this.dragStartScroll - dy, 0, this.maxScroll);
      this.list.y = this.listTop - this.scrollY;
    });
    this.input.on('pointerup', () => {
      this.dragActive = false;
      if (this.dragMoved > 4) this.snapToRow();
    });
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.maxScroll <= 0) return;
      this.scrollY = Phaser.Math.Clamp(this.scrollY + dy * 0.5, 0, this.maxScroll);
      this.list.y = this.listTop - this.scrollY;
      this.wheelTimer?.remove();
      this.wheelTimer = this.time.delayedCall(160, () => this.snapToRow());
    });
  }

  // Snap the scroll to the nearest whole row so the grid never rests on a half-cut row at the top.
  private snapToRow(): void {
    if (this.maxScroll <= 0 || this.rowStep <= 0) return;
    const target = Phaser.Math.Clamp(
      Math.round(this.scrollY / this.rowStep) * this.rowStep,
      0,
      this.maxScroll,
    );
    const proxy = { v: this.scrollY };
    this.tweens.add({
      targets: proxy,
      v: target,
      duration: 180,
      ease: 'Quad.out',
      onUpdate: () => {
        this.scrollY = proxy.v;
        this.list.y = this.listTop - proxy.v;
      },
    });
  }

  private makeCard(
    x: number,
    y: number,
    w: number,
    h: number,
    icon: string,
    label: string,
    sceneKey: string,
  ): Phaser.GameObjects.Container {
    const r = 28;
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
      .text(0, -h * 0.12, icon, { fontSize: `${Math.round(Math.min(w, h) * 0.38)}px` })
      .setOrigin(0.5);

    const titleText = this.add
      .text(0, h * 0.28, label, {
        fontFamily: FONT,
        fontSize: `${Math.round(Math.min(w, h) * 0.14)}px`,
        color: '#6b4f3a',
        fontStyle: '600',
      })
      .setOrigin(0.5);

    c.add([shadow, bg, iconText, titleText]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: c,
      y: y - 6,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      delay: Math.random() * 600,
    });

    c.on('pointerup', () => {
      if (this.dragMoved > 10) return; // was a scroll, not a tap
      this.tweens.killTweensOf(c);
      this.tweens.add({
        targets: c,
        scale: 0.93,
        duration: 100,
        yoyo: true,
        onComplete: () => this.scene.start(sceneKey),
      });
    });
    c.on('pointerover', () => {
      if (c.scale === 1) c.setScale(1.05);
    });
    c.on('pointerout', () => c.setScale(1));

    return c;
  }
}
