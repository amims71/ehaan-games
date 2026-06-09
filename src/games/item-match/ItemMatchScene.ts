import Phaser from 'phaser';
import {
  isMatch,
  isSetComplete,
  type DraggableMeta,
} from '@/shell/input/dropValidation';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak } from '@/shell/audio/feedback';
import { nameFor } from '@/shell/ui/emojiNames';
import { fitGrid } from '@/shell/ui/layout';

// Find-the-pair matching game. All 6 cards are face-up (appropriate for ages 2-5).
// Tap one card to select it, tap another — if they share pairId they lock; else both wiggle.

// Large pool of distinct, recognisable emoji; a fresh few are chosen each round.
const MATCH_POOL: string[] = [
  '🐱', '⭐', '🌞', '🐶', '🍎', '🚗', '🐸', '🌈', '🦋', '🐢',
  '🐠', '🌸', '🍓', '🐙', '🦄', '🍦', '🎈', '🐧', '🐝', '🌻',
];
const MIN_PAIRS = 4;
const MAX_PAIRS = 5;

interface Card {
  container: Phaser.GameObjects.Container;
  meta: DraggableMeta;
  emoji: string;
  matched: boolean;
}

export class ItemMatchScene extends BaseGameScene {
  private cards: Card[] = [];
  private selected: Card | null = null;
  private locked = false; // guard during wiggle/pop animation
  private matched: string[] = [];

  constructor() {
    super('ItemMatch');
  }

  protected buildLayout(): void {
    this.cards    = [];
    this.selected = null;
    this.locked   = false;
    this.matched  = [];

    const W = this.scale.width;
    const H = this.scale.height;

    this.addTitle('Find the match!');

    // Pick 4-5 pairs this round; build 2 cards per pair and shuffle positions.
    const pairCount = MIN_PAIRS + Math.floor(Math.random() * (MAX_PAIRS - MIN_PAIRS + 1));
    const chosen = this.shuffle([...MATCH_POOL]).slice(0, pairCount);
    const deck: Array<{ pairId: string; emoji: string; id: string }> = [];
    chosen.forEach((emoji, p) => {
      const pairId = `p${p}`;
      deck.push({ pairId, emoji, id: `${pairId}-a` });
      deck.push({ pairId, emoji, id: `${pairId}-b` });
    });
    const shuffled = this.shuffle(deck);

    // Responsive grid that fits all cards below the title in any orientation.
    const grid = fitGrid(shuffled.length, W * 0.05, H * 0.17, W * 0.9, H * 0.76, 0.2, 150);
    shuffled.forEach((entry, i) =>
      this.makeCard(grid.cells[i].x, grid.cells[i].y, grid.size, entry.emoji, entry.id, entry.pairId),
    );
  }

  private makeCard(
    x: number,
    y: number,
    size: number,
    emoji: string,
    id: string,
    pairId: string,
  ): void {
    const r = 24;
    const c = this.add.container(x, y);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.12);
    shadow.fillRoundedRect(-size / 2, -size / 2 + 7, size, size, r);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(-size / 2, -size / 2, size, size, r);
    bg.lineStyle(5, 0xffd6b0, 0.9);
    bg.strokeRoundedRect(-size / 2, -size / 2, size, size, r);

    const icon = this.add
      .text(0, 0, emoji, { fontSize: `${Math.round(size * 0.52)}px` })
      .setOrigin(0.5);

    c.add([shadow, bg, icon]);
    c.setSize(size, size);
    c.setInteractive({ useHandCursor: true });

    const card: Card = { container: c, meta: { id, pairId }, emoji, matched: false };
    c.setData('card', card);
    this.cards.push(card);

    // Gentle idle bob.
    this.tweens.add({
      targets: c,
      y: y - 6,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
      delay: Math.random() * 800,
    });

    c.on('pointerdown', () => this.handleTap(card));
    c.on('pointerover',  () => { if (!card.matched) c.setScale(1.06); });
    c.on('pointerout',   () => { if (!card.matched) c.setScale(this.selected === card ? 1.14 : 1); });
  }

  private handleTap(card: Card): void {
    if (this.locked || card.matched) return;

    if (this.selected === null) {
      // First selection.
      this.selected = card;
      this.tweens.killTweensOf(card.container);
      this.tweens.add({ targets: card.container, scale: 1.14, duration: 120, ease: 'Back.out' });
      this.highlightCard(card, true);
      return;
    }

    if (this.selected === card) {
      // Deselect.
      this.tweens.add({ targets: card.container, scale: 1, duration: 120 });
      this.highlightCard(card, false);
      this.selected = null;
      return;
    }

    // Second card chosen — evaluate.
    const first  = this.selected;
    const second = card;
    this.selected = null;
    this.locked   = true;

    if (isMatch(first.meta, second.meta)) {
      this.lockPair(first, second);
    } else {
      this.rejectPair(first, second);
    }
  }

  private highlightCard(card: Card, on: boolean): void {
    // Tint the background graphics by swapping alpha on the bg layer (index 1).
    const bg = card.container.list[1] as Phaser.GameObjects.Graphics;
    bg.setAlpha(on ? 0.75 : 1);
  }

  private lockPair(a: Card, b: Card): void {
    chime();
    speak(nameFor(a.emoji));
    [a, b].forEach((card) => {
      card.matched = true;
      card.container.disableInteractive();
      this.tweens.killTweensOf(card.container);
      // Pop then dim to signal matched.
      this.tweens.add({
        targets: card.container,
        scale: 1.18,
        duration: 140,
        yoyo: true,
        ease: 'Back.out',
        onComplete: () => {
          card.container.setScale(1);
          card.container.setAlpha(0.55);
          // Add a ✓ badge.
          const badge = this.add
            .text(0, 0, '✓', {
              fontSize: `${Math.round(card.container.width * 0.38)}px`,
              color: '#009e73',
              fontStyle: '700',
            })
            .setOrigin(0.5);
          card.container.add(badge);
        },
      });
      if (!this.matched.includes(card.meta.id)) this.matched.push(card.meta.id);
    });

    this.locked = false;

    if (isSetComplete(this.matched, this.cards.map((c) => c.meta.id))) {
      this.time.delayedCall(400, () =>
        this.celebrate(['🎉', '⭐', '🐱', '✨', '🌞', '💛', '🧩']),
      );
    }
  }

  private rejectPair(a: Card, b: Card): void {
    buzz();
    [a, b].forEach((card) => {
      this.highlightCard(card, false);
      this.wiggle(card.container);
    });
    // Reset scale for both after a brief pause.
    this.time.delayedCall(420, () => {
      [a, b].forEach((card) => {
        this.tweens.add({ targets: card.container, scale: 1, duration: 120 });
      });
      this.locked = false;
    });
  }
}
