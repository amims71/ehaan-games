import Phaser from 'phaser';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak } from '@/shell/audio/feedback';
import { FONT, TEXT_DARK, ACCENT, glyphText } from '@/shell/ui/theme';
import { fitGrid } from '@/shell/ui/layout';
import { count } from '@/shell/settings';

// Abstract "find the matching token" game. Shows ~8 candidates; player taps the one that
// matches the target — shown visually (visual mode) or announced via audio (audio mode).
// Subclasses supply token picking, face drawing, and pronunciation.

export interface FindToken {
  key: string;
}

const CANDIDATE_COUNT = 6; // fewer options = easier for the youngest players

export abstract class FindScene extends BaseGameScene {
  protected readonly promptMode: 'visual' | 'audio';
  private correctCount = 0;
  private inputLocked  = false;

  // Current round's target — held so drawFace can access it in buildVisualPrompt.
  private roundTarget!: FindToken;
  private idleTimer?: Phaser.Time.TimerEvent;
  private correctCard?: Phaser.GameObjects.Container; // the candidate matching the target

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

  /** Whether faces sit on a white square card. Override to false for self-contained art (shapes). */
  protected hasCardBg(): boolean {
    return true;
  }

  // ── build ─────────────────────────────────────────────────────────────────

  protected buildLayout(): void {
    this.inputLocked = false;
    this.idleTimer?.remove();
    this.correctCard = undefined;

    const W = this.scale.width;
    const H = this.scale.height;
    const min = Math.min(W, H);

    this.addTitle(this.roundTitle());

    const n           = count(CANDIDATE_COUNT, 4); // younger mode shows fewer options
    const candidates  = this.pickCandidates().slice(0, n);
    const target      = candidates[Math.floor(Math.random() * candidates.length)];
    this.roundTarget  = target;

    // Big "what to find" showcase at the BOTTOM (easy for a child to glance at), options above it.
    const promptSize = min * 0.3;
    const promptY    = H - promptSize / 2 - H * 0.05;
    this.buildPrompt(target, promptY, promptSize, W);

    // Candidate grid fills the space between the title and the bottom showcase — bigger tiles.
    const areaTop    = (H >= W ? min * 0.22 : H * 0.18);
    const areaBottom = promptY - promptSize / 2 - min * 0.05;
    const grid = fitGrid(
      n,
      W * 0.06,
      areaTop,
      W * 0.88,
      areaBottom - areaTop,
      0.2,
      200,
    );

    const shuffledCandidates = this.shuffle(candidates);
    shuffledCandidates.forEach((token, i) =>
      this.makeCard(grid.cells[i].x, grid.cells[i].y, grid.size, token, target),
    );

    this.scheduleIdleHint();
  }

  // ── idle help ──────────────────────────────────────────────────────────────

  /** (Re)start the no-activity timer; a stuck child gets a nudge instead of frustration. */
  private scheduleIdleHint(): void {
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(6000, () => this.idleHint());
  }

  private idleHint(): void {
    if (this.inputLocked) return;
    speak(this.promptKey(this.roundTarget)); // re-say / re-play what to find
    if (this.correctCard?.active) {
      this.tweens.add({
        targets: this.correctCard, scale: { from: 1, to: 1.18 },
        duration: 320, yoyo: true, repeat: 1, ease: 'Sine.inOut',
      });
    }
    this.scheduleIdleHint(); // keep nudging until they act
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

    if (this.hasCardBg()) {
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.12);
      shadow.fillRoundedRect(x - size / 2, promptY - size / 2 + 7, size, size, r);

      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 1);
      bg.fillRoundedRect(x - size / 2, promptY - size / 2, size, size, r);
      // Accent border signals "this is what to find".
      bg.lineStyle(6, Phaser.Display.Color.HexStringToColor(ACCENT).color, 1);
      bg.strokeRoundedRect(x - size / 2, promptY - size / 2, size, size, r);
    }

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

    if (this.hasCardBg()) {
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.12);
      shadow.fillRoundedRect(-size / 2, -size / 2 + 7, size, size, r);

      const bg = this.add.graphics();
      bg.fillStyle(0xffffff, 1);
      bg.fillRoundedRect(-size / 2, -size / 2, size, size, r);
      bg.lineStyle(5, 0xffd6b0, 0.9);
      bg.strokeRoundedRect(-size / 2, -size / 2, size, size, r);

      c.add([shadow, bg]);
    }
    this.drawFace(c, size, token);
    if (token.key === target.key) this.correctCard = c; // remembered for the idle hint
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
    this.scheduleIdleHint(); // any interaction resets the idle clock

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
