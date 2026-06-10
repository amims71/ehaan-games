import Phaser from 'phaser';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, speak } from '@/shell/audio/feedback';
import { glyphText } from '@/shell/ui/theme';
import { isYounger } from '@/shell/settings';

// "Catch it!" — an Arcade-gravity catcher. Items fall from the top; drag the basket along the
// bottom to catch them. Catching says the item's name + a sparkle; a miss just slips by (no
// penalty). Younger mode → slower fall, fewer items, a wider basket. Honours mute.

interface Item { emoji: string; name: string; }

const ITEMS: Item[] = [
  { emoji: '🍎', name: 'apple' }, { emoji: '🍌', name: 'banana' }, { emoji: '🍇', name: 'grapes' },
  { emoji: '🍓', name: 'strawberry' }, { emoji: '🍊', name: 'orange' }, { emoji: '🍐', name: 'pear' },
  { emoji: '⭐', name: 'star' }, { emoji: '🌸', name: 'flower' }, { emoji: '🦋', name: 'butterfly' },
  { emoji: '🐟', name: 'fish' }, { emoji: '🎈', name: 'balloon' }, { emoji: '🐝', name: 'bee' },
];

export class CatchItScene extends BaseGameScene {
  private basket?: Phaser.GameObjects.Text;
  private basketY = 0;
  private basketHalf = 0;
  private catchHalf = 0;
  private itemSize = 0;
  private playTop = 0;
  private falling: Phaser.Physics.Arcade.Image[] = [];
  private spawnEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super('CatchIt');
  }

  protected buildLayout(): void {
    this.falling = [];
    this.spawnEvent?.remove();

    const W = this.scale.width;
    const H = this.scale.height;
    const min = Math.min(W, H);
    const young = isYounger();

    this.addTitle('Catch it!');

    this.playTop = H >= W ? min * 0.18 : H * 0.16;
    this.itemSize = Math.round(min * (young ? 0.2 : 0.16));
    this.physics.world.gravity.y = young ? 320 : 600;

    // Basket the child drags along the bottom.
    const basketSize = Math.round(min * (young ? 0.42 : 0.32));
    this.basketY = H - basketSize * 0.5 - H * 0.03;
    this.basket = glyphText(this, W / 2, this.basketY, '🧺', basketSize);
    this.basketHalf = basketSize * 0.5;
    this.catchHalf = basketSize * (young ? 0.55 : 0.45); // generous catch width

    const interval = young ? 1700 : 1100;
    this.spawnEvent = this.time.addEvent({ delay: interval, loop: true, callback: () => this.spawn() });
    this.spawn(); // one right away
  }

  /** One falling item (Arcade gravity), capped to a gentle max fall speed. */
  private spawn(): void {
    const young = isYounger();
    if (this.falling.length >= (young ? 2 : 4)) return;

    const W = this.scale.width;
    const def = ITEMS[Math.floor(Math.random() * ITEMS.length)];
    const key = this.emojiTexture(def.emoji);
    const x = Phaser.Math.Between(this.itemSize, W - this.itemSize);

    const it = this.physics.add.image(x, this.playTop + this.itemSize, key).setDisplaySize(this.itemSize, this.itemSize);
    const body = it.body as Phaser.Physics.Arcade.Body;
    body.setMaxVelocity(0, young ? 260 : 420); // cap fall speed so it stays catchable
    it.setData('name', def.name);
    this.falling.push(it);
  }

  override update(): void {
    if (!this.basket) return;
    const W = this.scale.width;
    const H = this.scale.height;

    // Basket follows the finger (drag anywhere in the play area).
    const p = this.input.activePointer;
    if (p.isDown && p.y > this.playTop) {
      this.basket.x = Phaser.Math.Clamp(p.x, this.basketHalf, W - this.basketHalf);
    }

    for (const it of this.falling) {
      if (!it.active) continue;
      const caught = it.y >= this.basketY - this.itemSize * 0.4
        && it.y <= this.basketY + this.itemSize * 0.5
        && Math.abs(it.x - this.basket.x) <= this.catchHalf;
      if (caught) {
        this.catch(it);
      } else if (it.y > H + this.itemSize) {
        it.destroy(); // missed — no penalty
      }
    }
    this.falling = this.falling.filter((i) => i.active);
  }

  private catch(it: Phaser.Physics.Arcade.Image): void {
    const name = it.getData('name') as string;
    const x = it.x;
    chime();
    speak(name);
    (it.body as Phaser.Physics.Arcade.Body).enable = false;
    this.tweens.add({
      targets: it, y: this.basketY, scale: it.scale * 0.4, alpha: 0, duration: 180, ease: 'Quad.in',
      onComplete: () => it.destroy(),
    });
    if (this.basket) this.tweens.add({ targets: this.basket, scaleX: 1.12, scaleY: 0.9, duration: 110, yoyo: true });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI - Math.PI / 2;
      const dot = this.add.circle(x, this.basketY, Math.max(4, this.itemSize * 0.1), 0xffd34d);
      this.tweens.add({
        targets: dot, x: x + Math.cos(a) * this.itemSize, y: this.basketY - Math.sin(a) * this.itemSize,
        alpha: 0, duration: 400, ease: 'Cubic.out', onComplete: () => dot.destroy(),
      });
    }
  }

  /** Cached emoji texture (rendered once per emoji, centred via pixel-scan). */
  private emojiTexture(emoji: string): string {
    const key = `catch-${emoji.codePointAt(0)}`;
    if (this.textures.exists(key)) return key;
    const S = 128;
    const tex = this.textures.createCanvas(key, S, S);
    if (!tex) return key;
    const tmp = document.createElement('canvas');
    tmp.width = S; tmp.height = S;
    const t = tmp.getContext('2d');
    const ctx = tex.context;
    if (!t) { ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${Math.round(S * 0.8)}px sans-serif`; ctx.fillText(emoji, S / 2, S / 2); tex.refresh(); return key; }
    t.textAlign = 'center'; t.textBaseline = 'middle';
    t.font = `${Math.round(S * 0.8)}px "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    t.fillText(emoji, S / 2, S / 2);
    const px = t.getImageData(0, 0, S, S).data;
    let minX = S, minY = S, maxX = -1, maxY = -1;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (px[(y * S + x) * 4 + 3] > 12) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    if (maxX < minX) { ctx.drawImage(tmp, 0, 0); tex.refresh(); return key; }
    const iw = maxX - minX + 1, ih = maxY - minY + 1, scale = (S * 0.9) / Math.max(iw, ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(tmp, minX, minY, iw, ih, (S - dw) / 2, (S - dh) / 2, dw, dh);
    tex.refresh();
    return key;
  }
}
