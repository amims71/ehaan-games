import Phaser from 'phaser';
import { MatchScene, type MatchToken } from '@/shell/game/MatchScene';
import { FONT, TEXT_DARK, glyphText } from '@/shell/ui/theme';

// Pair-matching game for letters A–Z and digits 0–9. Each round randomly picks letters or numbers.

const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const NUMBERS = [...'0123456789'];

const MIN_PAIRS = 4;
const MAX_PAIRS = 5;

export class LetterMatchScene extends MatchScene {
  constructor() {
    super('LetterMatch');
  }

  protected roundTitle(): string {
    return 'Match the letters!';
  }

  protected pickRound(): MatchToken[] {
    const pool  = Math.random() < 0.5 ? LETTERS : NUMBERS;
    const count = MIN_PAIRS + Math.floor(Math.random() * (MAX_PAIRS - MIN_PAIRS + 1));
    return this.shuffle([...pool])
      .slice(0, count)
      .map((char) => ({ key: char }));
  }

  protected drawFace(
    parent: Phaser.GameObjects.Container,
    size: number,
    token: MatchToken,
    _cardIndex: number,
  ): void {
    const label = glyphText(this, 0, 0, token.key, Math.round(size * 0.5), {
      fontFamily: FONT,
      fontStyle: '700',
      color: TEXT_DARK,
    });
    parent.add(label);
  }

  protected pronounce(token: MatchToken): string {
    return token.key;
  }
}
