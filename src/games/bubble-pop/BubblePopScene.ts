import Phaser from 'phaser';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, speak } from '@/shell/audio/feedback';
import { COLORS, type NamedColor } from '@/shell/ui/theme';
import { isYounger, count } from '@/shell/settings';

// "Bubble Pop" — a calm Arcade-physics sandbox. Coloured balls drift and bounce gently around the
// play area (Arcade velocity + world-bounds bounce, zero gravity). Tap one to pop it: a little
// burst, a chime, and it says the colour, then a fresh bubble takes its place. No failure, endless.

const TEX = 'bubble-ball';

export class BubblePopScene extends BaseGameScene {
  private playTop = 0;
  private diameter = 80;

  constructor() {
    super('BubblePop');
  }

  protected buildLayout(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const min = Math.min(W, H);

    this.addTitle('Pop the bubbles!');

    const young = isYounger();
    this.diameter = Math.round(min * (young ? 0.26 : 0.2));
    this.playTop = (H >= W ? min * 0.2 : H * 0.18);

    // Bubbles bounce within the play area (below the title).
    this.physics.world.setBounds(0, this.playTop, W, H - this.playTop);

    // White ball texture (regenerated at the current size); tinted per colour, with a soft rim.
    if (this.textures.exists(TEX)) this.textures.remove(TEX);
    const d = this.diameter;
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(d / 2, d / 2, d / 2 - 2);
    g.lineStyle(Math.max(3, d * 0.05), 0x000000, 0.14);
    g.strokeCircle(d / 2, d / 2, d / 2 - 3);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(d * 0.36, d * 0.34, d * 0.12); // highlight
    g.generateTexture(TEX, d, d);
    g.destroy();

    const n = count(7, 4);
    for (let i = 0; i < n; i++) this.spawn(true);
  }

  /** Add one bouncing bubble (placed anywhere on the first fill, else near the bottom). */
  private spawn(anywhere = false): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const young = isYounger();
    const cat: NamedColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const d = this.diameter;

    const x = Phaser.Math.Between(d, W - d);
    const y = anywhere ? Phaser.Math.Between(this.playTop + d, H - d) : H - d / 2;

    const b = this.physics.add.image(x, y, TEX).setTint(cat.color);
    const body = b.body as Phaser.Physics.Arcade.Body;
    body.setCircle(d / 2);
    body.setCollideWorldBounds(true);
    body.setBounce(1, 1);
    const sp = young ? 55 : 85;
    body.setVelocity(Phaser.Math.Between(-sp, sp), Phaser.Math.Between(-sp, -sp * 0.4));

    b.setInteractive({ useHandCursor: true });
    b.setData('color', cat);
    b.on('pointerdown', () => this.popBubble(b));
  }

  private popBubble(b: Phaser.Physics.Arcade.Image): void {
    if (!b.active) return;
    const cat = b.getData('color') as NamedColor;
    chime();
    speak(cat.id);

    const x = b.x, y = b.y;
    (b.body as Phaser.Physics.Arcade.Body).enable = false;
    b.disableInteractive();
    this.tweens.add({
      targets: b, scale: b.scale * 1.4, alpha: 0, duration: 200, ease: 'Quad.out',
      onComplete: () => b.destroy(),
    });

    // Little burst of dots in the bubble's colour.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const dot = this.add.circle(x, y, Math.max(4, this.diameter * 0.08), cat.color);
      this.tweens.add({
        targets: dot,
        x: x + Math.cos(a) * this.diameter * 0.7,
        y: y + Math.sin(a) * this.diameter * 0.7,
        alpha: 0,
        duration: 360,
        ease: 'Cubic.out',
        onComplete: () => dot.destroy(),
      });
    }

    this.spawn(); // a fresh bubble rises to replace it
  }
}
