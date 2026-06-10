import Phaser from 'phaser';
import { FindScene, type FindToken } from '@/shell/game/FindScene';
import { SHAPES, type ShapeId, drawShape } from '@/shell/ui/shapes';

// Visual game: find the named shape among 8 shape cards.

// Vivid colours to fill the candidate shapes — rotates through the list.
const SHAPE_FILL_COLORS = [0x2e86de, 0xe23b3b, 0x2ecc71, 0x8e44ad, 0xf08000, 0xff6fb5, 0x00b4d8, 0x6d4c41];

export class FindShapeScene extends FindScene {
  // Per-round colour assigned to each shape key.
  private shapeColors = new Map<string, number>();

  constructor() {
    super('FindShape', 'visual');
  }

  protected roundTitle(): string {
    return 'Find the shape!';
  }

  // Shapes are self-contained art — no white square card behind them.
  protected override hasCardBg(): boolean {
    return false;
  }

  protected pickCandidates(): FindToken[] {
    const shapes = this.shuffle([...SHAPES]).slice(0, 8) as ShapeId[];
    this.shapeColors = new Map(
      shapes.map((s, i) => [s, SHAPE_FILL_COLORS[i % SHAPE_FILL_COLORS.length]]),
    );
    return shapes.map((s) => ({ key: s }));
  }

  protected drawFace(
    parent: Phaser.GameObjects.Container,
    size: number,
    token: FindToken,
  ): void {
    const color = this.shapeColors.get(token.key) ?? SHAPE_FILL_COLORS[0];
    // No card behind it — a soft offset shadow gives the shape depth (matches Shape Sort).
    const shadow = this.add.container(0, 6);
    drawShape(this, shadow, token.key as ShapeId, size * 0.82, 0x000000);
    shadow.setAlpha(0.12);
    parent.add(shadow);
    drawShape(this, parent, token.key as ShapeId, size * 0.82, color);
  }

  protected pronounce(token: FindToken): string {
    return token.key;
  }
}
