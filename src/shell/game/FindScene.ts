import Phaser from 'phaser';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak } from '@/shell/audio/feedback';
import { FONT, TEXT_DARK, ACCENT, glyphText } from '@/shell/ui/theme';
import { fitGrid } from '@/shell/ui/layout';

// Abstract "find the matching token" game. Shows ~8 candidates; player taps the one that
// matches the target — shown visually (visual mode) or announced via audio (audio mode).
// Subclasses supply token picking, face drawing, and pronunciation.

export interface FindToken {
  key: string;
}

const CANDIDATE_COUNT = 8;

export abstract class FindScene extends BaseGameScene {
  protected readonly promptMode: 'visual' | 'audio';
  private correctCount = 0;
  private inputLocked  = false;

  // Current round's target — held so drawFace can access it in buildVisualPrompt.
  private roundTarget!: FindToken;

  constructor(sceneKey: string, promptMode: 'visual' | 'audio') {
    super(sceneKey);
    this.promptMode = promptMode;
  }

  // ── subclass contract ─────────────────────────────────────────────────────

  /** Title shown at the top of the board. */
  protected abstract roundTitle(): string;

  /** Return ~8 distinct tokens for this round. */
  protected abstract pickCandidates(): FindToken[];

  /** Draw the token's face into `parent`, centred at (0,0), fitting within `size`. */
  protected abstract drawFace(
    parent: Phaser.GameObjects.Container,
    size: number,
    token: FindToken,
  ): void;

  /** Word spoken on correct tap (and as audio prompt in audio mode). */
  protected abstract pronounce(token: FindToken): string;

  /** Word used as the audio PROMPT (override to use a different sound, e.g. animal sound). */
  protected promptKey(token: FindToken): string {
    return this.pronounce(token);
  }

  // ── build ─────────────────────────────────────────────────────────────────

  protected buildLayout(): void {
    this.inputLocked = false;

    const W = this.scale.width;
    const H = this.scale.height;
    const min = Math.min(W, H);

    this.addTitle(this.roundTitle());

    const candidates  = this.pickCandidates().slice(0, CANDIDATE_COUNT);
    const target      = candidates[Math.floor(Math.random() * candidates.length)];
    this.roundTarget  = target;

    const promptY    = H >= W ? min * 0.30 : H * 0.27;
    const promptSize = min * 0.2;

    this.buildPrompt(target, promptY, promptSize, W);

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
    shuffledCandidates.forEach((token, i) =>
      this.makeCard(grid.cells[i].x, grid.cells[i].y, grid.size, token, target),
    );
  }

  // ── prompt zone ───────────────────────────────────────────────────────────

  private buildPrompt(target: FindToken, promptY: number, size: number, W: number): void {
    if (this.promptMode === 'visual') {
      this.buildVisualPrompt(target, promptY, size, W);
    } else {
      this.buildAudioPrompt(promptY, size, W);
      this.time.delayedCall(200, () => speak(this.promptKey(target)));
    }
  }

  private buildVisualPrompt(target: FindToken, promptY: number, size: number, W: number): void {
    const r = 24;
    const x = W / 2;

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.12);
    shadow.fillRoundedRect(x - size / 2, promptY - size / 2 + 7, size, size, r);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(x - size / 2, promptY - size / 2, size, size, r);
    // Accent border signals "this is what to find".
    bg.lineStyle(6, Phaser.Display.Color.HexStringToColor(ACCENT).color, 1);
    bg.strokeRoundedRect(x - size / 2, promptY - size / 2, size, size, r);

    // Draw the token's face into a container centred at (x, promptY).
    const faceContainer = this.add.container(x, promptY);
    this.drawFace(faceContainer, size, target);
    this.children.bringToTop(faceContainer);
  }

  private buildAudioPrompt(promptY: number, size: number, W: number): void {
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

    const target = this.roundTarget;
    const speaker = this.add
      .text(x, promptY, '🔊', { fontSize: `${Math.round(size * 0.52)}px` })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    speaker.on('pointerdown', () => speak(this.promptKey(target)));
    speaker.on('pointerover',  () => speaker.setScale(1.1));
    speaker.on('pointerout',   () => speaker.setScale(1));
  }

  // ── candidate cards ───────────────────────────────────────────────────────

  private makeCard(
    x: number,
    y: number,
    size: number,
    token: FindToken,
    target: FindToken,
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
    this.drawFace(c, size, token);
    c.setSize(size, size);
    c.setInteractive({ useHandCursor: true });

    c.on('pointerover', () => c.setScale(1.06));
    c.on('pointerout',  () => c.setScale(1));
    c.on('pointerdown', () => this.handleTap(c, token, target));
  }

  // ── tap logic ─────────────────────────────────────────────────────────────

  private handleTap(
    card: Phaser.GameObjects.Container,
    token: FindToken,
    target: FindToken,
  ): void {
    if (this.inputLocked) return;

    if (token.key === target.key) {
      this.inputLocked = true;
      chime();
      speak(this.pronounce(token));

      this.pop(card);
      this.time.delayedCall(120, () => {
        const size = card.width;
        const badge = this.add
          .text(0, 0, '✓', {
            fontFamily: FONT,
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
        this.time.delayedCall(450, () => this.celebrate());
      } else {
        this.time.delayedCall(650, () => this.rebuild());
      }
    } else {
      buzz();
      this.wiggle(card);
    }
  }
}

// ── letter/number shared base ─────────────────────────────────────────────────

const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const NUMBERS = [...'0123456789'];

/**
 * Abstract base for the letter/number find games. Subclasses only need to pass the
 * scene key and prompt mode — everything else is implemented here.
 */
export abstract class LetterFindScene extends FindScene {
  protected roundTitle(): string {
    return this.promptMode === 'audio' ? 'Listen and find!' : 'Find it!';
  }

  protected pickCandidates(): FindToken[] {
    const pool = Math.random() < 0.5 ? LETTERS : NUMBERS;
    return this.shuffle([...pool])
      .slice(0, 8)
      .map((ch) => ({ key: ch }));
  }

  protected drawFace(
    parent: Phaser.GameObjects.Container,
    size: number,
    token: FindToken,
  ): void {
    const label = glyphText(this, 0, 0, token.key, Math.round(size * 0.5), {
      fontFamily: FONT,
      fontStyle: '700',
      color: TEXT_DARK,
    });
    parent.add(label);
  }

  protected pronounce(token: FindToken): string {
    return token.key;
  }
}
