import Phaser from 'phaser';
import { isMatch, isSetComplete, type DraggableMeta } from '@/shell/input/dropValidation';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak } from '@/shell/audio/feedback';
import { fitGrid } from '@/shell/ui/layout';

// Shared base for pair-matching games. Subclasses supply tokens, face drawing, and pronunciation.
// The board builds 2 cards per token, shuffles positions, and handles all tap/match/celebrate logic.

export interface MatchToken {
  key: string; // identifies the pair (emoji char, letter, number, etc.)
}

interface MatchCard {
  container: Phaser.GameObjects.Container;
  meta: DraggableMeta;
  token: MatchToken;
  matched: boolean;
}

export abstract class MatchScene extends BaseGameScene {
  // ── subclass contract ────────────────────────────────────────────────────

  /** Return the distinct tokens for one round (4–5). */
  protected abstract pickRound(): MatchToken[];

  /** Draw the card face (emoji, letter, number, etc.) onto parent. */
  protected abstract drawFace(
    parent: Phaser.GameObjects.Container,
    size: number,
    token: MatchToken,
  ): void;

  /** The word/phrase to speak() when a pair is matched. */
  protected abstract pronounce(token: MatchToken): string;

  /** Override to change the round title. Default: 'Find the match!' */
  protected roundTitle(): string {
    return 'Find the match!';
  }

  // ── state ────────────────────────────────────────────────────────────────

  private cards: MatchCard[]    = [];
  private selected: MatchCard | null = null;
  private locked  = false;
  private matched: string[]     = [];

  // ── buildLayout ──────────────────────────────────────────────────────────

  protected buildLayout(): void {
    this.cards    = [];
    this.selected = null;
    this.locked   = false;
    this.matched  = [];

    const W = this.scale.width;
    const H = this.scale.height;

    this.addTitle(this.roundTitle());

    const tokens = this.pickRound();
    const deck: Array<{ pairId: string; token: MatchToken; id: string }> = [];
    tokens.forEach((token, p) => {
      const pairId = `p${p}`;
      deck.push({ pairId, token, id: `${pairId}-a` });
      deck.push({ pairId, token, id: `${pairId}-b` });
    });
    const shuffled = this.shuffle(deck);

    const grid = fitGrid(shuffled.length, W * 0.05, H * 0.17, W * 0.9, H * 0.76, 0.2, 150);
    shuffled.forEach((entry, i) =>
      this.makeCard(grid.cells[i].x, grid.cells[i].y, grid.size, entry.token, entry.id, entry.pairId),
    );
  }

  // ── card factory ─────────────────────────────────────────────────────────

  private makeCard(
    x: number,
    y: number,
    size: number,
    token: MatchToken,
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

    c.add([shadow, bg]);

    // Let subclass paint the face on top.
    this.drawFace(c, size, token);

    c.setSize(size, size);
    c.setInteractive({ useHandCursor: true });

    const card: MatchCard = { container: c, meta: { id, pairId }, token, matched: false };
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

  // ── tap logic ────────────────────────────────────────────────────────────

  private handleTap(card: MatchCard): void {
    if (this.locked || card.matched) return;

    if (this.selected === null) {
      this.selected = card;
      this.tweens.killTweensOf(card.container);
      this.tweens.add({ targets: card.container, scale: 1.14, duration: 120, ease: 'Back.out' });
      this.highlightCard(card, true);
      return;
    }

    if (this.selected === card) {
      this.tweens.add({ targets: card.container, scale: 1, duration: 120 });
      this.highlightCard(card, false);
      this.selected = null;
      return;
    }

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

  private highlightCard(card: MatchCard, on: boolean): void {
    const bg = card.container.list[1] as Phaser.GameObjects.Graphics;
    bg.setAlpha(on ? 0.75 : 1);
  }

  private lockPair(a: MatchCard, b: MatchCard): void {
    chime();
    speak(this.pronounce(a.token));
    [a, b].forEach((card) => {
      card.matched = true;
      card.container.disableInteractive();
      this.tweens.killTweensOf(card.container);
      this.tweens.add({
        targets: card.container,
        scale: 1.18,
        duration: 140,
        yoyo: true,
        ease: 'Back.out',
        onComplete: () => {
          card.container.setScale(1);
          card.container.setAlpha(0.55);
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

  private rejectPair(a: MatchCard, b: MatchCard): void {
    buzz();
    [a, b].forEach((card) => {
      this.highlightCard(card, false);
      this.wiggle(card.container);
    });
    this.time.delayedCall(420, () => {
      [a, b].forEach((card) => {
        this.tweens.add({ targets: card.container, scale: 1, duration: 120 });
      });
      this.locked = false;
    });
  }
}
