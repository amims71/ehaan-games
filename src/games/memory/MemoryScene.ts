import Phaser from 'phaser';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak } from '@/shell/audio/feedback';
import { FONT, glyphText } from '@/shell/ui/theme';
import { fitGrid } from '@/shell/ui/layout';
import { count } from '@/shell/settings';

// "Find the pair!" — a memory game. Cards start face-down; tap to flip two. A match stays up,
// celebrates, and vanishes; a mismatch flips back. Distinct from Item Match (all faces up).
// Small grids suit 2–5 (3 pairs, 2 in younger mode).

interface Pic { emoji: string; name: string; }

const POOL: Pic[] = [
  { emoji: '🍎', name: 'apple' }, { emoji: '🍌', name: 'banana' }, { emoji: '🍓', name: 'strawberry' },
  { emoji: '🐶', name: 'dog' }, { emoji: '🐱', name: 'cat' }, { emoji: '🦁', name: 'lion' },
  { emoji: '🐸', name: 'frog' }, { emoji: '🚗', name: 'car' }, { emoji: '🚌', name: 'bus' },
  { emoji: '⭐', name: 'star' }, { emoji: '🦋', name: 'butterfly' }, { emoji: '🐟', name: 'fish' },
  { emoji: '🌸', name: 'flower' }, { emoji: '🐝', name: 'bee' }, { emoji: '🎈', name: 'balloon' },
];

interface Card {
  container: Phaser.GameObjects.Container;
  back: Phaser.GameObjects.Container;
  face: Phaser.GameObjects.Container;
  name: string;
  pairId: number;
  faceUp: boolean;
  matched: boolean;
}

export class MemoryScene extends BaseGameScene {
  private cards: Card[] = [];
  private first: Card | null = null;
  private locked = false;
  private matchedCount = 0;

  constructor() {
    super('Memory');
  }

  protected buildLayout(): void {
    this.cards = [];
    this.first = null;
    this.locked = false;
    this.matchedCount = 0;

    const W = this.scale.width;
    const H = this.scale.height;

    this.addTitle('Find the pair!');

    const pairs = count(3, 2);
    const picks = this.shuffle([...POOL]).slice(0, pairs);
    const deck: Array<{ pic: Pic; pairId: number }> = [];
    picks.forEach((pic, i) => { deck.push({ pic, pairId: i }); deck.push({ pic, pairId: i }); });
    const shuffled = this.shuffle(deck);

    const grid = fitGrid(shuffled.length, W * 0.06, H * 0.18, W * 0.88, H * 0.72, 0.22, 170);
    shuffled.forEach((entry, i) =>
      this.makeCard(grid.cells[i].x, grid.cells[i].y, grid.size, entry.pic, entry.pairId),
    );
  }

  private makeCard(x: number, y: number, size: number, pic: Pic, pairId: number): void {
    const r = 22;
    const c = this.add.container(x, y);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.12);
    shadow.fillRoundedRect(-size / 2, -size / 2 + 7, size, size, r);
    c.add(shadow);

    // Face-down back: warm card with a "?".
    const back = this.add.container(0, 0);
    const bbg = this.add.graphics();
    bbg.fillStyle(0xf4a261, 1);
    bbg.fillRoundedRect(-size / 2, -size / 2, size, size, r);
    bbg.lineStyle(5, 0xffffff, 0.8);
    bbg.strokeRoundedRect(-size / 2, -size / 2, size, size, r);
    const q = glyphText(this, 0, 0, '?', Math.round(size * 0.5), { fontFamily: FONT, fontStyle: '700', color: '#ffffff' });
    back.add([bbg, q]);

    // Face: white card with the picture.
    const face = this.add.container(0, 0).setVisible(false);
    const fbg = this.add.graphics();
    fbg.fillStyle(0xffffff, 1);
    fbg.fillRoundedRect(-size / 2, -size / 2, size, size, r);
    fbg.lineStyle(5, 0xffd6b0, 0.9);
    fbg.strokeRoundedRect(-size / 2, -size / 2, size, size, r);
    const fe = glyphText(this, 0, 0, pic.emoji, Math.round(size * 0.56));
    face.add([fbg, fe]);

    c.add([back, face]);
    c.setSize(size, size);
    c.setInteractive({ useHandCursor: true });

    const card: Card = { container: c, back, face, name: pic.name, pairId, faceUp: false, matched: false };
    c.setData('card', card);
    this.cards.push(card);

    c.on('pointerdown', () => this.handleTap(card));
  }

  private handleTap(card: Card): void {
    if (this.locked || card.faceUp || card.matched) return;
    this.flip(card, true);

    if (!this.first) {
      this.first = card;
      return;
    }
    const a = this.first;
    const b = card;
    this.first = null;
    this.locked = true;

    this.time.delayedCall(700, () => {
      if (a.pairId === b.pairId) {
        chime();
        speak(a.name);
        [a, b].forEach((k) => { k.matched = true; this.vanish(k); });
        this.matchedCount += 2;
        this.locked = false;
        if (this.matchedCount >= this.cards.length) {
          this.time.delayedCall(600, () => this.celebrate(['🎉', '⭐', '✨', '🧠', '💛']));
        }
      } else {
        buzz();
        this.flip(a, false);
        this.flip(b, false);
        this.locked = false;
      }
    });
  }

  /** Flip a card up (show face) or down (show back) with a quick vertical flip. */
  private flip(card: Card, up: boolean): void {
    card.faceUp = up;
    this.tweens.add({
      targets: card.container, scaleX: 0, duration: 110, ease: 'Quad.in',
      onComplete: () => {
        card.back.setVisible(!up);
        card.face.setVisible(up);
        this.tweens.add({ targets: card.container, scaleX: 1, duration: 110, ease: 'Quad.out' });
      },
    });
  }

  private vanish(card: Card): void {
    card.container.disableInteractive();
    this.tweens.add({
      targets: card.container, scale: 1.15, duration: 120, yoyo: true, ease: 'Back.out',
      onComplete: () => {
        this.tweens.add({
          targets: card.container, scale: 0, alpha: 0, duration: 240, ease: 'Back.in',
          onComplete: () => card.container.setVisible(false),
        });
      },
    });
  }
}
