import Phaser from 'phaser';
import { MatchScene, type MatchToken } from '@/shell/game/MatchScene';
import { SHAPES, type ShapeId, drawShape } from '@/shell/ui/shapes';

// Pair-matching game using 2D shapes. Match the two cards that show the same shape.
// Colour is assigned per-round from a small vivid palette so all 16 shapes compile cleanly.

const VIVID_PALETTE = [0x2e86de, 0xe23b3b, 0x2ecc71, 0x8e44ad, 0xf08000, 0xff6fb5];

const MIN_PAIRS = 4;
const MAX_PAIRS = 5;

export class ShapeMatchScene extends MatchScene {
  // Colour assigned per-round, keyed by shape id.
  private roundColors = new Map<string, number>();

  constructor() {
    super('ShapeMatch');
  }

  protected roundTitle(): string {
    return 'Match the shapes!';
  }

  protected pickRound(): MatchToken[] {
    const count = MIN_PAIRS + Math.floor(Math.random() * (MAX_PAIRS - MIN_PAIRS + 1));
    const shapes: ShapeId[] = this.shuffle([...SHAPES]).slice(0, count);
    // Assign a vivid colour to each shape for this round (cycles through the palette).
    this.roundColors = new Map(
      shapes.map((s, i) => [s, VIVID_PALETTE[i % VIVID_PALETTE.length]]),
    );
    return shapes.map((shape) => ({ key: shape }));
  }

  protected drawFace(
    parent: Phaser.GameObjects.Container,
    size: number,
    token: MatchToken,
    _cardIndex: number,
  ): void {
    const shape = token.key as ShapeId;
    const color = this.roundColors.get(shape) ?? VIVID_PALETTE[0];
    drawShape(this, parent, shape, size * 0.6, color);
  }

  protected pronounce(token: MatchToken): string {
    return token.key;
  }
}
