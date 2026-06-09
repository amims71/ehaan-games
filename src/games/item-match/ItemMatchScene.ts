import Phaser from 'phaser';
import { MatchScene, type MatchToken } from '@/shell/game/MatchScene';
import { nameFor } from '@/shell/ui/emojiNames';
import { glyphText } from '@/shell/ui/theme';

// Find-the-pair matching game. All cards are face-up (appropriate for ages 2-5).
// Tap one card to select it, tap another — if they share pairId they lock; else both wiggle.

const MATCH_POOL: string[] = [
  '🐱', '⭐', '🌞', '🐶', '🍎', '🚗', '🐸', '🌈', '🦋', '🐢',
  '🐠', '🌸', '🍓', '🐙', '🦄', '🍦', '🎈', '🐧', '🐝', '🌻',
];
const MIN_PAIRS = 4;
const MAX_PAIRS = 5;

export class ItemMatchScene extends MatchScene {
  constructor() {
    super('ItemMatch');
  }

  protected pickRound(): MatchToken[] {
    const pairCount = MIN_PAIRS + Math.floor(Math.random() * (MAX_PAIRS - MIN_PAIRS + 1));
    return this.shuffle([...MATCH_POOL])
      .slice(0, pairCount)
      .map((emoji) => ({ key: emoji }));
  }

  protected drawFace(
    parent: Phaser.GameObjects.Container,
    size: number,
    token: MatchToken,
    _cardIndex: number,
  ): void {
    const icon = glyphText(this, 0, 0, token.key, Math.round(size * 0.52));
    parent.add(icon);
  }

  protected pronounce(token: MatchToken): string {
    return nameFor(token.key);
  }
}
