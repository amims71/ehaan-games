import Phaser from 'phaser';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak } from '@/shell/audio/feedback';
import { FONT, ACCENT, glyphText } from '@/shell/ui/theme';
import { rowX } from '@/shell/ui/layout';

// "What comes next?" — show a simple repeating pattern of coloured tokens with the last slot
// blank, and let the child tap the token that continues the pattern. Uses coloured circles so the
// pattern reads at a glance; the colour name is spoken on success (clips shared with Colour Sort).

interface Token { emoji: string; name: string; }

const POOL: Token[] = [
  { emoji: '🔴', name: 'red' },
  { emoji: '🔵', name: 'blue' },
  { emoji: '🟡', name: 'yellow' },
  { emoji: '🟢', name: 'green' },
  { emoji: '🟣', name: 'purple' },
  { emoji: '🟠', name: 'orange' },
];

// Pattern unit templates expressed as indices into the round's distinct tokens (A=0, B=1, C=2).
const UNITS: number[][] = [
  [0, 1],       // AB AB ...
  [0, 0, 1],    // AAB AAB ...
  [0, 1, 1],    // ABB ABB ...
  [0, 1, 2],    // ABC ABC ...
];

const VISIBLE = 5;        // tokens shown before the blank slot
const CANDIDATES = 3;     // answer cards offered

export class PatternsScene extends BaseGameScene {
  private correctCount = 0;
  private inputLocked = false;
  private qSlot?: Phaser.GameObjects.Container;
  private qGlyphSize = 0;

  constructor() {
    super('Patterns');
  }

  protected buildLayout(): void {
    this.inputLocked = false;

    const W = this.scale.width;
    const H = this.scale.height;
    const min = Math.min(W, H);

    this.addTitle('What comes next?');

    // ── Build the pattern ──────────────────────────────────────────────────────
    const unit = UNITS[Math.floor(Math.random() * UNITS.length)];
    const distinct = Math.max(...unit) + 1;
    const tokens = this.shuffle([...POOL]);
    const items = tokens.slice(0, distinct);                 // A, B, (C)

    // Full sequence of length VISIBLE+1; the final entry is the answer.
    const full: Token[] = [];
    for (let i = 0; i <= VISIBLE; i++) full.push(items[unit[i % unit.length]]);
    const answer = full[VISIBLE];

    // Candidate set: the distinct tokens in the pattern, padded with distractors to CANDIDATES.
    const candidates = [...items];
    let k = distinct;
    while (candidates.length < CANDIDATES && k < tokens.length) candidates.push(tokens[k++]);
    const choices = this.shuffle(candidates);

    // ── Sequence row (5 tokens + 1 blank "?" slot) ──────────────────────────────
    // cellW solves  n·cellW + (n-1)·gapRatio·cellW = availW  so the whole row fits on screen.
    const seqCount = VISIBLE + 1;
    const gapRatio = 0.22;
    const availW = W * 0.9;
    const cellW = Math.round(
      Math.min(min * 0.14, availW / (seqCount + (seqCount - 1) * gapRatio)),
    );
    const cellGap = Math.round(cellW * gapRatio);
    const seqY = H >= W ? H * 0.4 : H * 0.42;
    const xs = rowX(seqCount, 0, W, cellW, cellGap);
    this.qGlyphSize = Math.round(cellW * 0.86);

    for (let i = 0; i < VISIBLE; i++) {
      glyphText(this, xs[i], seqY, full[i].emoji, this.qGlyphSize);
    }
    this.qSlot = this.makeBlankSlot(xs[VISIBLE], seqY, cellW);

    // ── Candidate cards ─────────────────────────────────────────────────────────
    const cardSize = Math.round(Math.min(min * 0.22, (W * 0.74) / CANDIDATES));
    const cardGap = Math.round(cardSize * 0.22);
    const rowY = H * 0.84;
    const cxs = rowX(CANDIDATES, 0, W, cardSize, cardGap);

    choices.forEach((tok, idx) => {
      const card = this.makeCard(cxs[idx], rowY, cardSize, tok.emoji);
      card.on('pointerover', () => { if (!this.inputLocked) card.setScale(1.06); });
      card.on('pointerout',  () => card.setScale(1));
      card.on('pointerdown', () => this.handleTap(card, tok, answer));
    });
  }

  /** A blank rounded card with a "?" — the slot the child completes. */
  private makeBlankSlot(x: number, y: number, size: number): Phaser.GameObjects.Container {
    const r = 18;
    const c = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.55);
    bg.fillRoundedRect(-size / 2, -size / 2, size, size, r);
    bg.lineStyle(5, 0xf3a072, 1);
    bg.strokeRoundedRect(-size / 2, -size / 2, size, size, r);

    const q = glyphText(this, 0, 0, '?', Math.round(size * 0.5), {
      fontFamily: FONT,
      fontStyle: '700',
      color: ACCENT,
    });

    c.add([bg, q]);
    c.setSize(size, size);
    return c;
  }

  /** A white candidate card holding a token emoji. */
  private makeCard(
    x: number,
    y: number,
    size: number,
    emoji: string,
  ): Phaser.GameObjects.Container {
    const r = 20;
    const card = this.add.container(x, y);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.12);
    shadow.fillRoundedRect(-size / 2, -size / 2 + 7, size, size, r);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(-size / 2, -size / 2, size, size, r);
    bg.lineStyle(5, 0xffd6b0, 0.9);
    bg.strokeRoundedRect(-size / 2, -size / 2, size, size, r);

    const icon = glyphText(this, 0, 0, emoji, Math.round(size * 0.56));

    card.add([shadow, bg, icon]);
    card.setSize(size, size);
    card.setInteractive({ useHandCursor: true });
    return card;
  }

  private handleTap(
    card: Phaser.GameObjects.Container,
    tok: Token,
    answer: Token,
  ): void {
    if (this.inputLocked) return;

    if (tok.emoji === answer.emoji) {
      this.inputLocked = true;
      chime();
      speak(answer.name);
      this.pop(card);

      // Fill the blank slot with the answer token.
      if (this.qSlot) {
        const slot = this.qSlot;
        slot.removeAll(true);
        const bg = this.add.graphics();
        const half = slot.width / 2;
        bg.fillStyle(0xffffff, 0.55);
        bg.fillRoundedRect(-half, -half, slot.width, slot.width, 18);
        bg.lineStyle(5, 0x8ecb9a, 1);
        bg.strokeRoundedRect(-half, -half, slot.width, slot.width, 18);
        const filled = glyphText(this, 0, 0, answer.emoji, this.qGlyphSize).setScale(0);
        slot.add([bg, filled]);
        this.tweens.add({ targets: filled, scale: 1, duration: 300, ease: 'Back.out' });
      }

      this.time.delayedCall(120, () => {
        const badge = this.add
          .text(0, 0, '✓', {
            fontFamily: FONT,
            fontSize: `${Math.round(card.width * 0.34)}px`,
            color: '#009e73',
            fontStyle: '700',
          })
          .setOrigin(0.5);
        card.add(badge);
        card.disableInteractive();
      });

      this.correctCount++;
      if (this.correctCount % 5 === 0) {
        this.time.delayedCall(700, () => this.celebrate(['🎉', '⭐', '✨', '🔴', '🔵', '🟡']));
      } else {
        this.time.delayedCall(850, () => this.rebuild());
      }
    } else {
      buzz();
      this.wiggle(card);
    }
  }
}
