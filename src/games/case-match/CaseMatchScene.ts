import Phaser from 'phaser';
import { MatchScene, type MatchToken } from '@/shell/game/MatchScene';
import { FONT, TEXT_DARK, glyphText } from '@/shell/ui/theme';

// Pair-matching game: match the uppercase letter to its lowercase partner.
// cardIndex 0 → uppercase, cardIndex 1 → lowercase.

const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const PAIRS_PER_ROUND = 4;

export class CaseMatchScene extends MatchScene {
  constructor() {
    super('CaseMatch');
  }

  protected roundTitle(): string {
    return 'Big & little letters!';
  }

  protected pickRound(): MatchToken[] {
    return this.shuffle([...LETTERS])
      .slice(0, PAIRS_PER_ROUND)
      .map((letter) => ({ key: letter }));
  }

  protected drawFace(
    parent: Phaser.GameObjects.Container,
    size: number,
    token: MatchToken,
    cardIndex: number,
  ): void {
    // cardIndex 0: uppercase (big letter); cardIndex 1: lowercase (small letter).
    const display = cardIndex === 0 ? token.key : token.key.toLowerCase();
    const label = glyphText(this, 0, 0, display, Math.round(size * 0.5), {
      fontFamily: FONT,
      fontStyle: '700',
      color: TEXT_DARK,
    });
    parent.add(label);
  }

  protected pronounce(token: MatchToken): string {
    // Plays the letter audio clip (e.g. 'A' → a.m4a via speak's slugify).
    return token.key;
  }
}
