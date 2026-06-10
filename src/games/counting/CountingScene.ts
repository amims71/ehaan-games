import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak } from '@/shell/audio/feedback';
import { FONT, TEXT_DARK, glyphText } from '@/shell/ui/theme';
import { fitGrid, rowX } from '@/shell/ui/layout';
import { count } from '@/shell/settings';

const OBJECTS = ['🍎', '🐶', '⭐', '🚗', '🐱', '🌸', '🐝', '🎈', '🍓', '🦋'];
const MAX_COUNT = 5;

export class CountingScene extends BaseGameScene {
  private correctCount = 0;
  private inputLocked = false;

  constructor() {
    super('Counting');
  }

  protected buildLayout(): void {
    this.inputLocked = false;

    const W = this.scale.width;
    const H = this.scale.height;
    const min = Math.min(W, H);

    this.addTitle('Count them!');

    // Pick a random count and random emoji object for this round (lower max in younger mode).
    const maxCount = count(MAX_COUNT, 3);
    const n = 1 + Math.floor(Math.random() * maxCount);
    const emoji = OBJECTS[Math.floor(Math.random() * OBJECTS.length)];

    // ── Count area ────────────────────────────────────────────────────────────
    // Sits between the title (≈ H*0.18 in portrait) and the number row (bottom ~20% of H).
    const countTop = H >= W ? min * 0.24 : H * 0.2;
    const countBot = H * 0.72;
    const countH = countBot - countTop;

    const grid = fitGrid(
      n,
      W * 0.05,
      countTop,
      W * 0.9,
      countH,
      0.22,
      120, // maxSize: prevent over-large glyphs on small counts
    );

    for (let i = 0; i < n; i++) {
      glyphText(this, grid.cells[i].x, grid.cells[i].y, emoji, Math.round(grid.size * 0.8));
    }

    // ── Number candidate row ──────────────────────────────────────────────────
    // Cards 1..maxCount shuffled, centred in the bottom strip.
    const nums = this.shuffle(Array.from({ length: maxCount }, (_, i) => i + 1));
    // Gap-inclusive fit so the row actually stays within the 0.82·W budget (mirrors FirstLetter/Patterns).
    const gapRatio = 0.18;
    const cardSize = Math.round(
      Math.min(min * 0.17, (W * 0.82) / (nums.length + (nums.length - 1) * gapRatio)),
    );
    const cardGap = Math.round(cardSize * gapRatio);
    const rowY = H * 0.86;
    const xs = rowX(nums.length, 0, W, cardSize, cardGap);
    const r = 18;

    nums.forEach((num, idx) => {
      const x = xs[idx];
      const y = rowY;
      const card = this.add.container(x, y);

      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.12);
      shadow.fillRoundedRect(-cardSize / 2, -cardSize / 2 + 7, cardSize, cardSize, r);

      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 1);
      bg.fillRoundedRect(-cardSize / 2, -cardSize / 2, cardSize, cardSize, r);
      bg.lineStyle(5, 0xffd6b0, 0.9);
      bg.strokeRoundedRect(-cardSize / 2, -cardSize / 2, cardSize, cardSize, r);

      const label = glyphText(this, 0, 0, String(num), Math.round(cardSize * 0.5), {
        fontFamily: FONT,
        fontStyle: '700',
        color: TEXT_DARK,
      });

      card.add([shadow, bg, label]);
      card.setSize(cardSize, cardSize);
      card.setInteractive({ useHandCursor: true });

      card.on('pointerover', () => { if (!this.inputLocked) card.setScale(1.06); });
      card.on('pointerout',  () => card.setScale(1));
      card.on('pointerdown', () => this.handleTap(card, num, n));
    });
  }

  private handleTap(
    card: Phaser.GameObjects.Container,
    num: number,
    n: number,
  ): void {
    if (this.inputLocked) return;

    if (num === n) {
      this.inputLocked = true;
      chime();
      speak(String(n));

      this.pop(card);
      this.time.delayedCall(120, () => {
        if (!card.active) return; // a resize may have rebuilt the scene in this window
        const badgeSize = card.width;
        const badge = this.add
          .text(0, 0, '✓', {
            fontFamily: FONT,
            fontSize: `${Math.round(badgeSize * 0.38)}px`,
            color: '#009e73',
            fontStyle: '700',
          })
          .setOrigin(0.5);
        card.add(badge);
        card.disableInteractive();
      });

      this.correctCount++;
      if (this.correctCount % 5 === 0) {
        this.time.delayedCall(500, () => this.celebrate(['🎉', '⭐', '✨', '🔢', '💛']));
      } else {
        this.time.delayedCall(650, () => this.rebuild());
      }
    } else {
      buzz();
      this.wiggle(card);
    }
  }
}
