import Phaser from 'phaser';
import { FindScene, type FindToken } from '@/shell/game/FindScene';
import { COLORS, darken } from '@/shell/ui/theme';

// Visual game: find the named colour among 8 colour swatches.
// Each swatch is a rounded rect filled with the colour and outlined with a darker shade,
// so even white and yellow swatches are clearly visible on the cream background.

export class FindColorScene extends FindScene {
  constructor() {
    super('FindColor', 'visual');
  }

  protected roundTitle(): string {
    return 'Find the colour!';
  }

  protected pickCandidates(): FindToken[] {
    return this.shuffle([...COLORS])
      .slice(0, 8)
      .map((c) => ({ key: c.id }));
  }

  protected drawFace(
    parent: Phaser.GameObjects.Container,
    size: number,
    token: FindToken,
  ): void {
    const col = COLORS.find((c) => c.id === token.key);
    if (!col) return;

    const sw = size * 0.7;
    const r  = 14;
    const g  = this.add.graphics();
    g.fillStyle(col.color, 1);
    g.fillRoundedRect(-sw / 2, -sw / 2, sw, sw, r);
    // Darkened outline keeps light colours (white, yellow) visible.
    g.lineStyle(4, darken(col.color), 1);
    g.strokeRoundedRect(-sw / 2, -sw / 2, sw, sw, r);
    parent.add(g);
  }

  protected pronounce(token: FindToken): string {
    return token.key;
  }
}
