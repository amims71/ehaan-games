import Phaser from 'phaser';
import { FONT, ACCENT, TEXT_DARK } from '@/shell/ui/theme';
import { speak } from '@/shell/audio/feedback';

// Abstract base for all mini-game scenes. Subclasses call super('SceneKey') and implement
// buildLayout() to populate the board. Everything else (Back button, celebrate, drag wiring)
// is provided here.

export abstract class BaseGameScene extends Phaser.Scene {

  // Subclasses must implement this — called on create() and after each celebrate().
  protected abstract buildLayout(): void;

  create(): void {
    this.input.on('dragstart', this.onDragStart, this);
    this.input.on('drag',      this.onDrag,      this);
    this.input.on('drop',      this.onDrop,      this);
    this.input.on('dragend',   this.onDragEnd,   this);
    this.buildLayout();
    this._addChrome();
  }

  // ── shared chrome ────────────────────────────────────────────────────────

  private _addChrome(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const min = Math.min(W, H);

    // Back button — top-left rounded pill.
    const btnW = Math.round(min * 0.22);
    const btnH = Math.round(min * 0.1);
    const btnX = btnW / 2 + 16;
    const btnY = btnH / 2 + 16;
    const r    = btnH / 2;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(0xfedcc8, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, r);
    btnBg.lineStyle(3, 0xe8590c, 1);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, r);

    const btnLabel = this.add
      .text(0, 0, '← Back', {
        fontFamily: FONT,
        fontSize: `${Math.round(min * 0.045)}px`,
        color: '#e8590c',
        fontStyle: '600',
      })
      .setOrigin(0.5);

    const btn = this.add.container(btnX, btnY, [btnBg, btnLabel]);
    btn.setSize(btnW, btnH);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      this.tweens.add({
        targets: btn, scale: 0.9, duration: 80, yoyo: true,
        onComplete: () => this.scene.start('Hub'),
      });
    });
    btn.on('pointerover',  () => btnBg.setAlpha(0.8));
    btn.on('pointerout',   () => btnBg.setAlpha(1));
  }

  /** Shared title text — called by subclasses from buildLayout(). */
  protected addTitle(text: string): void {
    const W = this.scale.width;
    const H = this.scale.height;
    this.add
      .text(W / 2, H * 0.09, text, {
        fontFamily: FONT,
        fontSize: `${Math.round(Math.min(W, H) * 0.072)}px`,
        color: TEXT_DARK,
        fontStyle: '600',
      })
      .setOrigin(0.5);
  }

  // ── celebration ──────────────────────────────────────────────────────────

  /** Boom-and-reshuffle. Override confettiPool for scene-specific confetti. */
  protected celebrate(confettiPool?: string[]): void {
    const W = this.scale.width;
    const H = this.scale.height;

    const banner = this.add
      .text(W / 2, H * 0.48, 'Yay! 🎉', {
        fontFamily: FONT,
        fontSize:  `${Math.round(Math.min(W, H) * 0.13)}px`,
        color: ACCENT,
        fontStyle: '600',
      })
      .setOrigin(0.5)
      .setScale(0);
    this.tweens.add({ targets: banner, scale: 1, duration: 480, ease: 'Back.out' });
    speak('Great job!');

    const pool = confettiPool ?? ['🎉', '⭐', '✨', '💛', '🎈'];
    for (let i = 0; i < 28; i++) {
      const e = this.add
        .text(W / 2, H * 0.48, pool[i % pool.length], { fontSize: '40px' })
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

    this.time.delayedCall(2300, () => {
      this.tweens.killAll();
      this.children.removeAll(true);
      this.buildLayout();
      this._addChrome();
    });
  }

  // ── drag hooks — subclasses override to handle game logic ───────────────

  protected onDragStart(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.Container,
  ): void {
    this.tweens.killTweensOf(obj);
    this.children.bringToTop(obj);
    this.tweens.add({ targets: obj, scale: 1.14, duration: 130, ease: 'Back.out' });
  }

  protected onDrag(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.Container,
    dragX: number,
    dragY: number,
  ): void {
    obj.x = dragX;
    obj.y = dragY;
  }

  protected onDrop(
    _p: Phaser.Input.Pointer,
    _obj: Phaser.GameObjects.Container,
    _zone: Phaser.GameObjects.Zone,
  ): void {
    // Override in subclass.
  }

  protected onDragEnd(
    _p: Phaser.Input.Pointer,
    _obj: Phaser.GameObjects.Container,
    _dropped: boolean,
  ): void {
    // Override in subclass.
  }

  // ── common tween helpers ─────────────────────────────────────────────────

  protected pop(obj: Phaser.GameObjects.Container): void {
    this.tweens.add({ targets: obj, scale: 0.7, duration: 120, yoyo: true });
  }

  protected wiggle(obj: Phaser.GameObjects.Container): void {
    this.tweens.add({
      targets: obj,
      angle: { from: -9, to: 9 },
      duration: 70,
      yoyo: true,
      repeat: 3,
      onComplete: () => obj.setAngle(0),
    });
  }

  protected shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
