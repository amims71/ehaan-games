import Phaser from 'phaser';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak, speakAfterCurrent } from '@/shell/audio/feedback';
import { FONT, TEXT_DARK, glyphText } from '@/shell/ui/theme';
import { rowX } from '@/shell/ui/layout';

// "First letter?" — show an object, say its name, and let the child tap the letter it starts with.
// The object is tappable to replay its name; success plays the chosen letter's sound. Every word
// below has a bundled name clip and every letter a-z has a clip, so all audio resolves offline.

// `alts` lists first-letters of common alternate names (bunny, pony) so a defensible answer is never
// offered as a wrong card. (We keep the canonical word for audio — no clip exists for the alias.)
interface Obj { emoji: string; word: string; letter: string; alts?: string[]; }

const OBJECTS: Obj[] = [
  { emoji: '🍎', word: 'apple',      letter: 'A' },
  { emoji: '🍌', word: 'banana',     letter: 'B' },
  { emoji: '🐻', word: 'bear',       letter: 'B' },
  { emoji: '🎈', word: 'balloon',    letter: 'B' },
  { emoji: '🦋', word: 'butterfly',  letter: 'B' },
  { emoji: '🐱', word: 'cat',        letter: 'C' },
  { emoji: '🐮', word: 'cow',        letter: 'C' },
  { emoji: '🚗', word: 'car',        letter: 'C' },
  { emoji: '🐶', word: 'dog',        letter: 'D' },
  { emoji: '🦆', word: 'duck',       letter: 'D' },
  { emoji: '🐘', word: 'elephant',   letter: 'E' },
  { emoji: '🐟', word: 'fish',       letter: 'F' },
  { emoji: '🌸', word: 'flower',     letter: 'F' },
  { emoji: '🐸', word: 'frog',       letter: 'F' },
  { emoji: '🍇', word: 'grapes',     letter: 'G' },
  { emoji: '🐴', word: 'horse',      letter: 'H', alts: ['P'] }, // pony
  { emoji: '🍦', word: 'ice cream',  letter: 'I' },
  { emoji: '🥝', word: 'kiwi',       letter: 'K' },
  { emoji: '🐨', word: 'koala',      letter: 'K' },
  { emoji: '🦁', word: 'lion',       letter: 'L' },
  { emoji: '🐵', word: 'monkey',     letter: 'M' },
  { emoji: '🥭', word: 'mango',      letter: 'M' },
  { emoji: '🐙', word: 'octopus',    letter: 'O' },
  { emoji: '🦉', word: 'owl',        letter: 'O' },
  { emoji: '🐷', word: 'pig',        letter: 'P' },
  { emoji: '🐧', word: 'penguin',    letter: 'P' },
  { emoji: '🐼', word: 'panda',      letter: 'P' },
  { emoji: '🍐', word: 'pear',       letter: 'P' },
  { emoji: '🐰', word: 'rabbit',     letter: 'R', alts: ['B'] }, // bunny
  { emoji: '🌈', word: 'rainbow',    letter: 'R' },
  { emoji: '⭐', word: 'star',       letter: 'S' },
  { emoji: '🌞', word: 'sun',        letter: 'S' },
  { emoji: '🐍', word: 'snake',      letter: 'S' },
  { emoji: '🍓', word: 'strawberry', letter: 'S' },
  { emoji: '🐯', word: 'tiger',      letter: 'T' },
  { emoji: '🐢', word: 'turtle',     letter: 'T' },
  { emoji: '🚂', word: 'train',      letter: 'T' },
  { emoji: '🚚', word: 'truck',      letter: 'T' },
  { emoji: '🦄', word: 'unicorn',    letter: 'U' },
  { emoji: '🍉', word: 'watermelon', letter: 'W' },
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const TARGET_LETTERS = [...new Set(OBJECTS.map((o) => o.letter))];
const CANDIDATES = 3; // letter cards offered (1 correct + distractors)

export class FirstLetterScene extends BaseGameScene {
  private correctCount = 0;
  private inputLocked = false;
  private newRound = true;        // when true, the next buildLayout() starts a fresh round
  private obj!: Obj;
  private choices!: string[];

  constructor() {
    super('FirstLetter');
  }

  /** Pick a new object + candidate letters and announce the word. Only called on a real round
   *  start (entry / after a correct answer) — never on a resize reflow. */
  private startRound(): void {
    // Pick the target LETTER first (so every letter is equally likely), then a word for it.
    const letter = TARGET_LETTERS[Math.floor(Math.random() * TARGET_LETTERS.length)];
    const pool = OBJECTS.filter((o) => o.letter === letter);
    this.obj = pool[Math.floor(Math.random() * pool.length)];

    // Distractors: random letters, excluding the answer and any defensible alternate-name letters.
    const excluded = new Set([this.obj.letter, ...(this.obj.alts ?? [])]);
    const others = this.shuffle(ALPHABET.filter((c) => !excluded.has(c))).slice(0, CANDIDATES - 1);
    this.choices = this.shuffle([this.obj.letter, ...others]);

    this.inputLocked = false;
    // Queue behind any still-playing clip (e.g. the celebration "Great job!"); immediate otherwise.
    speakAfterCurrent(this.obj.word);
  }

  protected buildLayout(): void {
    if (this.newRound) {
      this.startRound();
      this.newRound = false;
    }
    const obj = this.obj;
    const choices = this.choices;

    const W = this.scale.width;
    const H = this.scale.height;
    const min = Math.min(W, H);

    this.addTitle('First letter?');

    // ── Object (tap to hear its name) ──────────────────────────────────────────
    const objY = H >= W ? min * 0.5 : H * 0.46;
    const emojiSize = Math.round(min * 0.34);
    const box = this.add.container(W / 2, objY);

    const emoji = glyphText(this, 0, 0, obj.emoji, emojiSize);
    const speaker = glyphText(this, emojiSize * 0.52, emojiSize * 0.34, '🔊', Math.round(min * 0.085))
      .setAlpha(0.85);

    box.add([emoji, speaker]);
    box.setSize(emojiSize * 1.3, emojiSize * 1.3); // hit area encloses the speaker badge too
    box.setInteractive({ useHandCursor: true });
    box.on('pointerdown', () => { this.pop(box); speak(obj.word); });

    // Gentle bob so the object feels alive, plus a one-shot "tap me" pulse to hint the replay.
    this.tweens.add({
      targets: box, y: objY - 4, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.tweens.add({
      targets: box, scale: { from: 1, to: 1.12 }, duration: 260, yoyo: true, repeat: 1, ease: 'Sine.inOut',
    });

    // ── Letter candidate cards ──────────────────────────────────────────────────
    // cardSize is capped to a fraction of the smaller dimension; the availW term is an overflow
    // guard that only binds if the cap or CANDIDATES grows. 3 cards + 0.22-of-card gaps ≈ 0.76·min.
    const gapRatio = 0.22;
    const availW = W * 0.82;
    const cardSize = Math.round(
      Math.min(min * 0.22, availW / (CANDIDATES + (CANDIDATES - 1) * gapRatio)),
    );
    const cardGap = Math.round(cardSize * gapRatio);
    const rowY = H * 0.84;
    const xs = rowX(CANDIDATES, 0, W, cardSize, cardGap);

    choices.forEach((letter, idx) => {
      const card = this.makeCard(xs[idx], rowY, cardSize, letter);
      card.on('pointerover', () => { if (!this.inputLocked) card.setScale(1.06); });
      card.on('pointerout',  () => card.setScale(1));
      card.on('pointerdown', () => this.handleTap(card, letter, obj));
    });
  }

  /** A white card holding an uppercase letter. */
  private makeCard(
    x: number,
    y: number,
    size: number,
    letter: string,
  ): Phaser.GameObjects.Container {
    const r = 18;
    const card = this.add.container(x, y);

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.12);
    shadow.fillRoundedRect(-size / 2, -size / 2 + 7, size, size, r);

    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(-size / 2, -size / 2, size, size, r);
    bg.lineStyle(5, 0xffd6b0, 0.9);
    bg.strokeRoundedRect(-size / 2, -size / 2, size, size, r);

    const label = glyphText(this, 0, 0, letter, Math.round(size * 0.5), {
      fontFamily: FONT,
      fontStyle: '700',
      color: TEXT_DARK,
    });

    card.add([shadow, bg, label]);
    card.setSize(size, size);
    card.setInteractive({ useHandCursor: true });
    return card;
  }

  private handleTap(
    card: Phaser.GameObjects.Container,
    letter: string,
    obj: Obj,
  ): void {
    if (this.inputLocked) return;

    if (letter === obj.letter) {
      this.inputLocked = true;
      this.newRound = true; // the next build (rebuild, or celebrate's doBuild) starts a fresh round
      chime();
      speak(obj.letter);
      this.pop(card);

      this.time.delayedCall(120, () => {
        if (!card.active) return; // a resize may have rebuilt the scene in this window
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
        this.time.delayedCall(650, () => this.celebrate(['🎉', '⭐', '✨', '🔤', '🅰️']));
      } else {
        this.time.delayedCall(800, () => this.rebuild());
      }
    } else {
      buzz();
      this.wiggle(card);
    }
  }
}
