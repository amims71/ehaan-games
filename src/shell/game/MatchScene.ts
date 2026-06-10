import Phaser from 'phaser';
import { isMatch, isSetComplete, type DraggableMeta } from '@/shell/input/dropValidation';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak } from '@/shell/audio/feedback';
import { fitGrid } from '@/shell/ui/layout';
import { isYounger } from '@/shell/settings';

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
  home: { x: number; y: number };
}

export abstract class MatchScene extends BaseGameScene {
  // ── subclass contract ────────────────────────────────────────────────────

  /** Return the distinct tokens for one round (4–5). */
  protected abstract pickRound(): MatchToken[];

  /** Draw the card face onto parent. cardIndex is 0 for the first card in the pair, 1 for the second. */
  protected abstract drawFace(
    parent: Phaser.GameObjects.Container,
    size: number,
    token: MatchToken,
    cardIndex: number,
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
  // Scene-level pointer tracking drives BOTH tap and drag (same proven approach as the Hub scroll —
  // reliable on touch, unlike Phaser's built-in draggable which broke tap and the drag-return).
  private pressed: MatchCard | null = null;
  private pressX = 0;
  private pressY = 0;
  private movedDist = 0;
  private dragging = false;

  // ── buildLayout ──────────────────────────────────────────────────────────

  protected buildLayout(): void {
    this.cards    = [];
    this.selected = null;
    this.locked   = false;
    this.matched  = [];

    const W = this.scale.width;
    const H = this.scale.height;

    this.addTitle(this.roundTitle());

    const all = this.pickRound();
    const tokens = isYounger() ? all.slice(0, 3) : all; // fewer pairs for the youngest
    const deck: Array<{ pairId: string; token: MatchToken; id: string; cardIndex: number }> = [];
    tokens.forEach((token, p) => {
      const pairId = `p${p}`;
      deck.push({ pairId, token, id: `${pairId}-a`, cardIndex: 0 });
      deck.push({ pairId, token, id: `${pairId}-b`, cardIndex: 1 });
    });
    const shuffled = this.shuffle(deck);

    const grid = fitGrid(shuffled.length, W * 0.05, H * 0.17, W * 0.9, H * 0.76, 0.2, 150);
    shuffled.forEach((entry, i) =>
      this.makeCard(grid.cells[i].x, grid.cells[i].y, grid.size, entry.token, entry.id, entry.pairId, entry.cardIndex),
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
    cardIndex: number,
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
    this.drawFace(c, size, token, cardIndex);

    c.setSize(size, size);
    c.setInteractive({ useHandCursor: true }); // hover cursor only; tap + drag are scene-level

    const card: MatchCard = { container: c, meta: { id, pairId }, token, matched: false, home: { x, y } };
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

    c.on('pointerover', () => { if (!card.matched && !this.dragging && this.selected !== card) c.setScale(1.06); });
    c.on('pointerout',  () => { if (!card.matched && !this.dragging) c.setScale(this.selected === card ? 1.14 : 1); });
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
      // Celebrate the match, then make the pair vanish so only unmatched cards remain on the board.
      this.tweens.add({
        targets: card.container,
        scale: 1.2,
        duration: 150,
        yoyo: true,
        ease: 'Back.out',
        onComplete: () => {
          this.tweens.add({
            targets: card.container,
            scale: 0,
            alpha: 0,
            duration: 240,
            ease: 'Back.in',
            onComplete: () => card.container.setVisible(false),
          });
        },
      });
      if (!this.matched.includes(card.meta.id)) this.matched.push(card.meta.id);
    });

    this.locked = false;

    if (isSetComplete(this.matched, this.cards.map((c) => c.meta.id))) {
      // Wait for the last pair to finish vanishing before the celebration.
      this.time.delayedCall(700, () =>
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

  // ── pointer-driven tap + drag (scene-level, installed once) ─────────────────

  create(): void {
    super.create();        // wires base hooks + builds the first layout
    this.installPointer(); // scene-level handlers persist across rebuilds (cards are re-read live)
  }

  private installPointer(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.pressed   = this.locked ? null : this.hitCard(p.x, p.y, null);
      this.pressX    = p.x;
      this.pressY    = p.y;
      this.movedDist = 0;
      this.dragging  = false;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const card = this.pressed;
      if (!card || !p.isDown) return;
      this.movedDist = Math.max(this.movedDist, Phaser.Math.Distance.Between(this.pressX, this.pressY, p.x, p.y));
      if (this.movedDist > 10) {
        if (!this.dragging) this.beginDrag(card);
        card.container.x = p.x;
        card.container.y = p.y;
      }
    });

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const card = this.pressed;
      this.pressed = null;
      if (!card) return;

      if (this.dragging) {
        this.dragging = false;
        const target = this.locked ? null : this.hitCard(p.x, p.y, card);
        if (target && isMatch(card.meta, target.meta)) {
          this.lockPair(card, target); // both pop + vanish
        } else {
          if (target) buzz(); // dropped on a non-matching card
          this.tweens.add({
            targets: card.container, x: card.home.x, y: card.home.y, scale: 1, angle: 0,
            duration: 260, ease: 'Back.out',
          });
        }
      } else {
        this.handleTap(card); // no real movement → a tap
      }
    });
  }

  /** Lift a card to begin dragging it (and cancel any pending tap-selection). */
  private beginDrag(card: MatchCard): void {
    this.dragging = true;
    this.tweens.killTweensOf(card.container);
    this.children.bringToTop(card.container);
    this.tweens.add({ targets: card.container, scale: 1.12, duration: 100, ease: 'Back.out' });
    if (this.selected && this.selected !== card) {
      this.highlightCard(this.selected, false);
      this.tweens.add({ targets: this.selected.container, scale: 1, duration: 100 });
    }
    this.selected = null;
  }

  /** Topmost unmatched, visible card whose bounds contain (x, y), excluding `exclude`. */
  private hitCard(x: number, y: number, exclude: MatchCard | null): MatchCard | null {
    return this.cards.find((k) =>
      k !== exclude && !k.matched && k.container.visible
      && Math.abs(x - k.container.x) <= k.container.width / 2
      && Math.abs(y - k.container.y) <= k.container.height / 2) ?? null;
  }
}
