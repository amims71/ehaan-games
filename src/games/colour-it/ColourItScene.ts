import Phaser from 'phaser';
import { BaseGameScene } from '@/shell/game/BaseGameScene';
import { chime, speak } from '@/shell/audio/feedback';
import { SHAPES, type ShapeId, shapePoints } from '@/shell/ui/shapes';
import { isYounger } from '@/shell/settings';

// "Colour it in!" — a forgiving tracing game. A big faint glyph (letter, number, or shape) is the
// guide; the child scribbles over it with a chunky brush. The paint is clipped to the glyph (canvas
// destination-in, since Phaser 4 has no BitmapMask), so it stays in the lines. When ~⅔ of the glyph
// is covered it pops in full colour and says its name. Younger mode → bigger glyph + lower threshold.

const SIL_KEY = 'colourit-sil';     // white silhouette (guide + clip mask + reveal)
const PAINT_KEY = 'colourit-paint'; // the child's clipped paint
const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const NUMBERS = [...'0123456789'];
const BRUSH_COLORS = [0xe23b3b, 0x2e86de, 0x2ecc71, 0xf08000, 0x8e44ad, 0xff6fb5];
const GRID = 14; // coverage grid resolution

interface Target { kind: 'letter' | 'number' | 'shape'; value: string; say: string; }

export class ColourItScene extends BaseGameScene {
  private s = 0;
  private cx = 0;
  private cy = 0;
  private cell = 0;
  private inside = new Set<number>();
  private insideCount = 1;
  private visited = new Set<number>();
  private threshold = 0.6;
  private silTex?: Phaser.Textures.CanvasTexture;
  private paintTex?: Phaser.Textures.CanvasTexture;
  private painting = false;
  private lastX = 0;
  private lastY = 0;
  private locked = false;
  private brushCss = '#e23b3b';
  private target!: Target;
  private correctCount = 0;
  private cleanupHooked = false;

  constructor() {
    super('ColourIt');
  }

  create(): void {
    super.create();
    this.installPaint(); // re-add every entry — Phaser clears scene input listeners on shutdown
  }

  private pickTarget(): Target {
    const kind = (['letter', 'number', 'shape'] as const)[Math.floor(Math.random() * 3)];
    if (kind === 'letter') {
      const v = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      return { kind, value: v, say: v.toLowerCase() };
    }
    if (kind === 'number') {
      const v = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
      return { kind, value: v, say: v };
    }
    const v = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    return { kind: 'shape', value: v, say: v };
  }

  protected buildLayout(): void {
    this.locked = false;
    this.painting = false;
    this.visited = new Set();

    [SIL_KEY, PAINT_KEY].forEach((k) => { if (this.textures.exists(k)) this.textures.remove(k); });
    if (!this.cleanupHooked) {
      this.events.once('shutdown', () => {
        [SIL_KEY, PAINT_KEY].forEach((k) => { if (this.textures.exists(k)) this.textures.remove(k); });
      });
      this.cleanupHooked = true;
    }

    const W = this.scale.width;
    const H = this.scale.height;
    const min = Math.min(W, H);
    const young = isYounger();

    this.addTitle('Colour it in!');

    this.target = this.pickTarget();
    const brush = BRUSH_COLORS[Math.floor(Math.random() * BRUSH_COLORS.length)];
    this.brushCss = `#${brush.toString(16).padStart(6, '0')}`;
    this.threshold = young ? 0.82 : 0.92; // must colour (nearly) the whole glyph, not just part
    this.s = Math.round(min * (young ? 0.66 : 0.58));
    this.cx = W / 2;
    this.cy = H >= W ? min * 0.54 : H * 0.52;
    this.cell = this.s / GRID;

    // White glyph silhouette (guide + clip + reveal).
    this.silTex = this.textures.createCanvas(SIL_KEY, this.s, this.s) ?? undefined;
    if (this.silTex) {
      const ctx = this.silTex.context;
      ctx.clearRect(0, 0, this.s, this.s);
      ctx.fillStyle = '#fff';
      if (this.target.kind === 'shape') {
        const pts = shapePoints(this.target.value as ShapeId, this.s * 0.9);
        ctx.beginPath();
        pts.forEach(([x, y], i) => {
          const px = this.s / 2 + x;
          const py = this.s / 2 + y;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fill();
      } else {
        this.paintGlyphText(ctx, this.target.value, this.s);
      }
      this.silTex.refresh();
      this.buildInsideGrid(ctx, this.s);
    }

    // Transparent paint canvas (strokes are drawn + clipped here).
    this.paintTex = this.textures.createCanvas(PAINT_KEY, this.s, this.s) ?? undefined;

    this.add.image(this.cx, this.cy, SIL_KEY).setTint(0xa68a72).setAlpha(0.4); // faint guide
    this.add.image(this.cx, this.cy, PAINT_KEY);                               // paint on top

    speak(this.target.say); // say what to colour
  }

  /** Solid glyph drawn centred + scaled to ~80% via a pixel-scan ink box (reliable across fonts). */
  private paintGlyphText(ctx: CanvasRenderingContext2D, ch: string, size: number): void {
    const tmp = document.createElement('canvas');
    tmp.width = size; tmp.height = size;
    const t = tmp.getContext('2d');
    if (!t) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(size * 0.8)}px sans-serif`;
      ctx.fillText(ch, size / 2, size / 2);
      return;
    }
    t.fillStyle = '#fff';
    t.textAlign = 'center';
    t.textBaseline = 'middle';
    t.font = `700 ${Math.round(size * 0.8)}px Fredoka, "Baloo 2", system-ui, sans-serif`;
    t.fillText(ch, size / 2, size / 2);
    const px = t.getImageData(0, 0, size, size).data;
    let minX = size, minY = size, maxX = -1, maxY = -1;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (px[(y * size + x) * 4 + 3] > 20) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX) { ctx.drawImage(tmp, 0, 0); return; }
    const iw = maxX - minX + 1, ih = maxY - minY + 1;
    const scale = (size * 0.8) / Math.max(iw, ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(tmp, minX, minY, iw, ih, (size - dw) / 2, (size - dh) / 2, dw, dh);
  }

  /** Mark which grid cells lie inside the glyph (alpha at the cell centre). */
  private buildInsideGrid(ctx: CanvasRenderingContext2D, size: number): void {
    const data = ctx.getImageData(0, 0, size, size).data;
    this.inside = new Set();
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const x = Math.min(size - 1, Math.floor((c + 0.5) * this.cell));
        const y = Math.min(size - 1, Math.floor((r + 0.5) * this.cell));
        if (data[(y * size + x) * 4 + 3] > 40) this.inside.add(r * GRID + c);
      }
    }
    this.insideCount = Math.max(1, this.inside.size);
  }

  private installPaint(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.locked) return;
      this.painting = true;
      this.lastX = p.x; this.lastY = p.y;
      this.stroke(p.x, p.y, p.x, p.y);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.painting || !p.isDown || this.locked) return;
      this.stroke(this.lastX, this.lastY, p.x, p.y);
      this.lastX = p.x; this.lastY = p.y;
    });
    this.input.on('pointerup', () => { this.painting = false; });
  }

  /** Paint a chunky stroke onto the paint canvas, clip it to the glyph, and track coverage. */
  private stroke(x0: number, y0: number, x1: number, y1: number): void {
    if (!this.paintTex || !this.silTex) return;
    const ox = this.cx - this.s / 2;
    const oy = this.cy - this.s / 2;
    const lx0 = x0 - ox, ly0 = y0 - oy, lx1 = x1 - ox, ly1 = y1 - oy;

    const ctx = this.paintTex.context;
    ctx.strokeStyle = this.brushCss;
    ctx.fillStyle = this.brushCss;
    ctx.lineCap = 'round';
    ctx.lineWidth = this.s * 0.14;
    ctx.beginPath();
    ctx.moveTo(lx0, ly0);
    ctx.lineTo(lx1, ly1);
    ctx.stroke();
    // Clip the accumulated paint to the glyph silhouette so it stays in the lines.
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.silTex.canvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    this.paintTex.refresh();

    // Mark every inside cell the brush actually covers (within its radius of the stroke), so the
    // coverage count matches what's visibly painted.
    const br = this.s * 0.07;
    const steps = Math.max(1, Math.ceil(Phaser.Math.Distance.Between(lx0, ly0, lx1, ly1) / (this.cell * 0.5)));
    for (let i = 0; i <= steps; i++) {
      const lx = Phaser.Math.Linear(lx0, lx1, i / steps);
      const ly = Phaser.Math.Linear(ly0, ly1, i / steps);
      const cMin = Math.floor((lx - br) / this.cell), cMax = Math.floor((lx + br) / this.cell);
      const rMin = Math.floor((ly - br) / this.cell), rMax = Math.floor((ly + br) / this.cell);
      for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
          if (c < 0 || r < 0 || c >= GRID || r >= GRID) continue;
          const dx = (c + 0.5) * this.cell - lx;
          const dy = (r + 0.5) * this.cell - ly;
          if (dx * dx + dy * dy > br * br) continue;
          const idx = r * GRID + c;
          if (this.inside.has(idx)) this.visited.add(idx);
        }
      }
    }

    if (!this.locked && this.visited.size / this.insideCount >= this.threshold) this.complete();
  }

  private complete(): void {
    if (!this.paintTex || !this.silTex) return;
    this.locked = true;
    this.painting = false;
    // Fill the whole glyph in the brush colour (clipped) for a clean finished reveal.
    const ctx = this.paintTex.context;
    ctx.fillStyle = this.brushCss;
    ctx.fillRect(0, 0, this.s, this.s);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.silTex.canvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    this.paintTex.refresh();

    chime();
    speak(this.target.say);

    this.correctCount += 1;
    if (this.correctCount % 5 === 0) {
      this.time.delayedCall(750, () => this.celebrate(['🎉', '⭐', '✨', '🖍️', '💛']));
    } else {
      this.time.delayedCall(950, () => this.rebuild());
    }
  }
}
