import Phaser from 'phaser';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak } from '@/shell/audio/feedback';
import { FONT, TEXT_DARK, ACCENT } from '@/shell/ui/theme';
import { fitGrid } from '@/shell/ui/layout';

// Abstract "find the matching character" game. Shows 8 candidates; player must tap the one that
// matches the target — shown visually (visual mode) or announced via audio (audio mode).

const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const NUMBERS = [...'0123456789'];

const CANDIDATE_COUNT = 8;

export abstract class FindScene extends BaseGameScene {
  private readonly promptMode: 'visual' | 'audio';
  private correctCount = 0;
  private inputLocked  = false;

  constructor(sceneKey: string, promptMode: 'visual' | 'audio') {
    super(sceneKey);
    this.promptMode = promptMode;
  }

  protected buildLayout(): void {
    this.inputLocked = false;

    const W = this.scale.width;
    const H = this.scale.height;
    const min = Math.min(W, H);

    this.addTitle(this.promptMode === 'audio' ? 'Listen and find!' : 'Find it!');

    // Pick letter or number pool for this round.
    const pool = Math.random() < 0.5 ? LETTERS : NUMBERS;
    const shuffledPool = this.shuffle([...pool]);
    const candidates   = shuffledPool.slice(0, CANDIDATE_COUNT);
    const target       = candidates[Math.floor(Math.random() * CANDIDATE_COUNT)];

    // Prompt zone — centred, below title.
    const promptY    = H >= W ? min * 0.30 : H * 0.27;
    const promptSize = min * 0.2;

    this.buildPrompt(target, promptY, promptSize, W);

    // Candidate grid — below the prompt zone.
    const gridTop = promptY + promptSize * 0.6;
    const grid = fitGrid(
      CANDIDATE_COUNT,
      W * 0.05,
      gridTop,
      W * 0.9,
      H * 0.94 - gridTop,
      0.2,
      150,
    );

    const shuffledCandidates = this.shuffle(candidates);
    shuffledCandidates.forEach((char, i) =>
      this.makeCard(grid.cells[i].x, grid.cells[i].y, grid.size, char, target),
    );
  }

  // ── prompt zone ──────────────────────────────────────────────────────────

  private buildPrompt(target: string, promptY: number, size: number, W: number): void {
    if (this.promptMode === 'visual') {
      this.buildVisualPrompt(target, promptY, size, W);
    } else {
      this.buildAudioPrompt(target, promptY, size, W);
      // Auto-play the target sound when the round starts.
      this.time.delayedCall(200, () => speak(target));
    }
  }

  private buildVisualPrompt(target: string, promptY: number, size: number, W: number): void {
    const r = 24;
    const x = W / 2;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.12);
    shadow.fillRoundedRect(x - size / 2, promptY - size / 2 + 7, size, size, r);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(x - size / 2, promptY - size / 2, size, size, r);
    // Accent border to signal "this is the one to find".
    bg.lineStyle(6, Phaser.Display.Color.HexStringToColor(ACCENT).color, 1);
    bg.strokeRoundedRect(x - size / 2, promptY - size / 2, size, size, r);

    const label = this.add
      .text(x, promptY, target, {
        fontFamily: FONT,
        fontStyle: '700',
        color: ACCENT,
        fontSize: `${Math.round(size * 0.52)}px`,
      })
      .setOrigin(0.5);

    this.children.bringToTop(label);
  }

  private buildAudioPrompt(target: string, promptY: number, size: number, W: number): void {
    const r = 24;
    const x = W / 2;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.12);
    shadow.fillRoundedRect(x - size / 2, promptY - size / 2 + 7, size, size, r);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(x - size / 2, promptY - size / 2, size, size, r);
    bg.lineStyle(5, 0xffd6b0, 0.9);
    bg.strokeRoundedRect(x - size / 2, promptY - size / 2, size, size, r);

    // Tappable speaker button.
    const speaker = this.add
      .text(x, promptY, '🔊', { fontSize: `${Math.round(size * 0.52)}px` })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    speaker.on('pointerdown', () => speak(target));
    speaker.on('pointerover',  () => speaker.setScale(1.1));
    speaker.on('pointerout',   () => speaker.setScale(1));
  }

  // ── candidate cards ──────────────────────────────────────────────────────

  private makeCard(x: number, y: number, size: number, char: string, target: string): void {
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

    const label = this.add
      .text(0, 0, char, {
        fontFamily: FONT,
        fontStyle: '700',
        color: TEXT_DARK,
        fontSize: `${Math.round(size * 0.5)}px`,
      })
      .setOrigin(0.5);

    c.add([shadow, bg, label]);
    c.setSize(size, size);
    c.setInteractive({ useHandCursor: true });

    c.on('pointerover', () => c.setScale(1.06));
    c.on('pointerout',  () => c.setScale(1));
    c.on('pointerdown', () => this.handleTap(c, char, target));
  }

  // ── tap logic ────────────────────────────────────────────────────────────

  private handleTap(
    card: Phaser.GameObjects.Container,
    char: string,
    target: string,
  ): void {
    if (this.inputLocked) return;

    if (char === target) {
      this.inputLocked = true;
      chime();
      speak(target);

      // Pop the card and add a green ✓.
      this.pop(card);
      this.time.delayedCall(120, () => {
        const size = card.width;
        const badge = this.add
          .text(0, 0, '✓', {
            fontSize: `${Math.round(size * 0.38)}px`,
            color: '#009e73',
            fontStyle: '700',
          })
          .setOrigin(0.5);
        card.add(badge);
        card.disableInteractive();
      });

      this.correctCount++;
      if (this.correctCount % 5 === 0) {
        this.time.delayedCall(450, () =>
          this.celebrate(['🎉', '⭐', '🔤', '✨', '🌟', '💛', '🔡']),
        );
      } else {
        this.time.delayedCall(650, () => this.rebuild());
      }
    } else {
      buzz();
      this.wiggle(card);
    }
  }
}
