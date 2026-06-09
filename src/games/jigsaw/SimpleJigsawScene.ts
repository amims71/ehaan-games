import Phaser from 'phaser';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, buzz, speak } from '@/shell/audio/feedback';
import { glyphText } from '@/shell/ui/theme';

// "Finish the picture!" — one big emoji is rendered to a texture and sliced into a 2×2 grid of
// tiles. The tiles are scrambled in a tray; the child drags each onto its matching quadrant of a
// faded guide picture. All four placed → it says the picture's name and celebrates.

interface Pic { emoji: string; name: string; }

// Round, front-on subjects only: a face (or round fruit) fills all four tiles, so every quadrant
// reads as part of the picture. Sparse/diagonal emoji (turtle, star, rainbow, fish, vehicles) leave
// tiles looking empty in a 2×2 slice, so they're intentionally excluded.
const PICS: Pic[] = [
  { emoji: '🐶', name: 'dog' },
  { emoji: '🐱', name: 'cat' },
  { emoji: '🦁', name: 'lion' },
  { emoji: '🐼', name: 'panda' },
  { emoji: '🐸', name: 'frog' },
  { emoji: '🐧', name: 'penguin' },
  { emoji: '🐯', name: 'tiger' },
  { emoji: '🐨', name: 'koala' },
  { emoji: '🐮', name: 'cow' },
  { emoji: '🐷', name: 'pig' },
  { emoji: '🐰', name: 'rabbit' },
  { emoji: '🐻', name: 'bear' },
  { emoji: '🐵', name: 'monkey' },
  { emoji: '🍎', name: 'apple' },
  { emoji: '🌻', name: 'sunflower' },
];

const KEY = 'jigsaw-pic'; // DynamicTexture key (recreated each round)
const GRID = 2;           // 2×2 tiles

interface Tile {
  container: Phaser.GameObjects.Container;
  index: number;          // 0..3, matches its target slot
  home: { x: number; y: number };
  placed: boolean;
}

export class SimpleJigsawScene extends BaseGameScene {
  private tiles: Tile[] = [];
  private slotXY: { x: number; y: number }[] = [];
  private placedCount = 0;
  private picName = '';
  private cleanupHooked = false;

  constructor() {
    super('SimpleJigsaw');
  }

  protected buildLayout(): void {
    this.tiles = [];
    this.slotXY = [];
    this.placedCount = 0;

    // Remove last round's texture before recreating it (and once, on exit).
    if (this.textures.exists(KEY)) this.textures.remove(KEY);
    if (!this.cleanupHooked) {
      this.events.once('shutdown', () => { if (this.textures.exists(KEY)) this.textures.remove(KEY); });
      this.cleanupHooked = true;
    }

    const W = this.scale.width;
    const H = this.scale.height;
    const min = Math.min(W, H);
    const portrait = H >= W;

    this.addTitle('Finish the picture!');

    const pic = PICS[Math.floor(Math.random() * PICS.length)];
    this.picName = pic.name;

    const picSize = Math.round(min * (portrait ? 0.5 : 0.56));
    const cell = Math.round(picSize / GRID);
    const gap = Math.round(cell * 0.06);
    const tileSize = cell - gap;

    // Draw the emoji onto a Canvas texture (reliable for glyphs — unlike RenderTexture.draw, which
    // can sample a Text before its GPU texture uploads), then carve it into GRID×GRID frames.
    const size = cell * GRID;
    const tex = this.textures.createCanvas(KEY, size, size);
    if (tex) {
      this.paintEmoji(tex.context, pic.emoji, size);
      tex.refresh(); // upload the canvas to the GPU
      for (let i = 0; i < GRID * GRID; i++) {
        const c = i % GRID;
        const r = Math.floor(i / GRID);
        tex.add(`p${i}`, 0, c * cell, r * cell, cell, cell);
      }
    }

    // Centres for the target frame (where the picture assembles) and the scramble tray.
    const target = portrait ? { x: W / 2, y: H * 0.34 } : { x: W * 0.3, y: H * 0.52 };
    const tray   = portrait ? { x: W / 2, y: H * 0.75 } : { x: W * 0.74, y: H * 0.52 };

    this.buildTarget(target, pic.emoji, cell, tileSize, tex != null);
    this.buildTiles(tray, cell, tileSize);
  }

  /** Draw an emoji centred and scaled to fill ~92% of a square canvas. Renders to a scratch canvas,
   *  finds the true opaque ink box by scanning pixels (measureText is unreliable for colour emoji),
   *  then blits that box centred + scaled. */
  private paintEmoji(ctx: CanvasRenderingContext2D, emoji: string, size: number): void {
    const FONT_E = '"Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.clearRect(0, 0, size, size);

    const tmp = document.createElement('canvas');
    tmp.width = size;
    tmp.height = size;
    const tctx = tmp.getContext('2d');
    if (!tctx) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.round(size * 0.8)}px ${FONT_E}`;
      ctx.fillText(emoji, size / 2, size / 2);
      return;
    }
    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    tctx.font = `${Math.round(size * 0.86)}px ${FONT_E}`;
    tctx.fillText(emoji, size / 2, size / 2);

    // Scan for the opaque bounding box of the rendered glyph.
    const px = tctx.getImageData(0, 0, size, size).data;
    let minX = size, minY = size, maxX = -1, maxY = -1;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (px[(y * size + x) * 4 + 3] > 12) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX) {
      ctx.drawImage(tmp, 0, 0); // nothing rendered — keep the naive draw
      return;
    }
    const inkW = maxX - minX + 1;
    const inkH = maxY - minY + 1;
    const scale = (size * 0.92) / Math.max(inkW, inkH);
    const dw = inkW * scale;
    const dh = inkH * scale;
    ctx.drawImage(tmp, minX, minY, inkW, inkH, (size - dw) / 2, (size - dh) / 2, dw, dh);
  }

  /** Faded guide picture + four empty wells + drop zones. */
  private buildTarget(
    centre: { x: number; y: number },
    emoji: string,
    cell: number,
    tileSize: number,
    hasTexture: boolean,
  ): void {
    const r = Math.round(tileSize * 0.12);
    for (let i = 0; i < GRID * GRID; i++) {
      const c = i % GRID;
      const rr = Math.floor(i / GRID);
      const x = centre.x + (c - (GRID - 1) / 2) * cell;
      const y = centre.y + (rr - (GRID - 1) / 2) * cell;
      this.slotXY.push({ x, y });

      const well = this.add.graphics();
      well.fillStyle(0xffffff, 0.45);
      well.fillRoundedRect(x - tileSize / 2, y - tileSize / 2, tileSize, tileSize, r);
      well.lineStyle(3, 0xf3c89e, 0.9);
      well.strokeRoundedRect(x - tileSize / 2, y - tileSize / 2, tileSize, tileSize, r);

      const zone = this.add.zone(x, y, cell, cell).setRectangleDropZone(cell, cell);
      zone.setData('slotIndex', i);
    }

    // Faded full-picture guide on top of the wells (visible enough to read the whole picture).
    // Use the '__BASE' frame explicitly: adding the p0…p3 slice frames makes p0 the texture's
    // default frame, so a frame-less add.image() would show only the top-left quadrant.
    if (hasTexture) {
      this.add.image(centre.x, centre.y, KEY, '__BASE').setDisplaySize(cell * GRID, cell * GRID).setAlpha(0.4);
    } else {
      glyphText(this, centre.x, centre.y, emoji, Math.round(cell * GRID * 0.82)).setAlpha(0.4);
    }
  }

  /** Four scrambled, draggable tiles in the tray. */
  private buildTiles(centre: { x: number; y: number }, cell: number, tileSize: number): void {
    const order = this.shuffle([0, 1, 2, 3]); // which tile sits in each tray cell
    const r = Math.round(tileSize * 0.12);

    order.forEach((tileIndex, slot) => {
      const c = slot % GRID;
      const rr = Math.floor(slot / GRID);
      const x = centre.x + (c - (GRID - 1) / 2) * cell;
      const y = centre.y + (rr - (GRID - 1) / 2) * cell;

      const cont = this.add.container(x, y);

      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.14);
      shadow.fillRoundedRect(-tileSize / 2, -tileSize / 2 + 6, tileSize, tileSize, r);

      const card = this.add.graphics();
      card.fillStyle(0xffffff, 1);
      card.fillRoundedRect(-tileSize / 2, -tileSize / 2, tileSize, tileSize, r);
      card.lineStyle(4, 0xffd6b0, 1);
      card.strokeRoundedRect(-tileSize / 2, -tileSize / 2, tileSize, tileSize, r);

      cont.add([shadow, card]);
      if (this.textures.exists(KEY)) {
        const img = this.add.image(0, 0, KEY, `p${tileIndex}`).setDisplaySize(tileSize, tileSize);
        cont.add(img);
      }

      cont.setSize(tileSize, tileSize);
      cont.setInteractive({ draggable: true, useHandCursor: true });

      const tile: Tile = { container: cont, index: tileIndex, home: { x, y }, placed: false };
      cont.setData('tile', tile);
      this.tiles.push(tile);
    });
  }

  protected override onDrop(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.Container,
    zone: Phaser.GameObjects.Zone,
  ): void {
    const tile = obj.getData('tile') as Tile | undefined;
    const slot = zone.getData('slotIndex') as number | undefined;
    if (!tile || tile.placed || slot == null) return;

    if (tile.index === slot) {
      tile.placed = true;
      obj.disableInteractive();
      chime();
      const dest = this.slotXY[slot];
      this.tweens.add({
        targets: obj, x: dest.x, y: dest.y, scale: 1, duration: 220, ease: 'Back.out',
        onComplete: () => this.pop(obj),
      });
      this.placedCount += 1;
      if (this.placedCount === GRID * GRID) {
        speak(this.picName);
        this.time.delayedCall(450, () => this.celebrate(['🎉', '⭐', '✨', '🧩', '💛']));
      }
    } else {
      buzz();
      this.wiggle(obj);
      this.returnHome(tile);
    }
  }

  protected override onDragEnd(
    _p: Phaser.Input.Pointer,
    obj: Phaser.GameObjects.Container,
    dropped: boolean,
  ): void {
    const tile = obj.getData('tile') as Tile | undefined;
    if (!dropped && tile && !tile.placed) this.returnHome(tile);
  }

  private returnHome(tile: Tile): void {
    this.tweens.add({
      targets: tile.container,
      x: tile.home.x, y: tile.home.y, scale: 1, angle: 0,
      duration: 280, ease: 'Back.out',
    });
  }
}
