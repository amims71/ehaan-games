import Phaser from 'phaser';

// Shared shape library. Every shape is a point polygon so it can be filled (a solid piece) or
// drawn as an outlined silhouette (a drop target). Used by the shape sort / match / find games.

export type ShapeId =
  | 'circle'
  | 'square'
  | 'rectangle'
  | 'triangle'
  | 'oval'
  | 'semicircle'
  | 'pentagon'
  | 'hexagon'
  | 'octagon'
  | 'star'
  | 'diamond'
  | 'heart'
  | 'trapezium'
  | 'cross'
  | 'arrow'
  | 'parallelogram';

export const SHAPES: ShapeId[] = [
  'circle', 'square', 'rectangle', 'triangle', 'oval', 'semicircle',
  'pentagon', 'hexagon', 'octagon', 'star', 'diamond', 'heart',
  'trapezium', 'cross', 'arrow', 'parallelogram',
];

function regular(sides: number, r: number, rotDeg = -90): Array<[number, number]> {
  const rot = (rotDeg * Math.PI) / 180;
  return Array.from({ length: sides }, (_, i) => {
    const a = rot + (i * 2 * Math.PI) / sides;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
}

// Points for each shape, centred on (0,0), fitting within `size`. Exported so other renderers
// (e.g. the Colour-It tracing game) can draw a shape silhouette to a canvas.
export function shapePoints(shape: ShapeId, size: number): Array<[number, number]> {
  const r = size * 0.46;
  switch (shape) {
    case 'circle':
      return Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * 2 * Math.PI;
        return [Math.cos(a) * r, Math.sin(a) * r];
      });
    case 'oval':
      return Array.from({ length: 44 }, (_, i) => {
        const a = (i / 44) * 2 * Math.PI;
        return [Math.cos(a) * size * 0.48, Math.sin(a) * size * 0.32];
      });
    case 'square': {
      const s = size * 0.74;
      return [[-s / 2, -s / 2], [s / 2, -s / 2], [s / 2, s / 2], [-s / 2, s / 2]];
    }
    case 'rectangle': {
      const w = size * 0.88;
      const h = size * 0.56;
      return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    }
    case 'triangle':
      return [[0, -r], [r * 0.95, r * 0.78], [-r * 0.95, r * 0.78]];
    case 'semicircle': {
      const pts: Array<[number, number]> = [];
      const n = 26;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI - (i / n) * Math.PI;
        pts.push([Math.cos(a) * r, -Math.sin(a) * r + r / 2]);
      }
      return pts;
    }
    case 'pentagon':
      return regular(5, r);
    case 'hexagon':
      return regular(6, r, 0);
    case 'octagon':
      return regular(8, r, -67.5);
    case 'diamond':
      return [[0, -r], [r * 0.78, 0], [0, r], [-r * 0.78, 0]];
    case 'star': {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? r : r * 0.45;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      return pts;
    }
    case 'heart': {
      const pts: Array<[number, number]> = [];
      const n = 30;
      const k = size / 34;
      for (let i = 0; i <= n; i++) {
        const t = (i / n) * 2 * Math.PI;
        const x = 16 * Math.sin(t) ** 3;
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        pts.push([x * k, -y * k]);
      }
      return pts;
    }
    case 'trapezium':
      return [[-r * 0.5, -r * 0.6], [r * 0.5, -r * 0.6], [r * 0.9, r * 0.6], [-r * 0.9, r * 0.6]];
    case 'parallelogram':
      return [[-r * 0.5, -r * 0.55], [r * 0.9, -r * 0.55], [r * 0.5, r * 0.55], [-r * 0.9, r * 0.55]];
    case 'cross': {
      const a = r * 0.36;
      const e = r;
      return [
        [-a, -e], [a, -e], [a, -a], [e, -a], [e, a], [a, a],
        [a, e], [-a, e], [-a, a], [-e, a], [-e, -a], [-a, -a],
      ];
    }
    case 'arrow': {
      const w = r;
      const sh = r * 0.34;
      return [
        [-w, -sh], [w * 0.2, -sh], [w * 0.2, -r * 0.7], [w, 0],
        [w * 0.2, r * 0.7], [w * 0.2, sh], [-w, sh],
      ];
    }
  }
}

/**
 * Draw a shape centred at (0,0), fitting within `size`, into `parent`.
 * Pass `outline` to render it as a light-filled silhouette with a bold border (a drop target).
 */
export function drawShape(
  scene: Phaser.Scene,
  parent: Phaser.GameObjects.Container,
  shape: ShapeId,
  size: number,
  fillColor: number,
  outline?: { stroke: number; width?: number },
): void {
  const g = scene.add.graphics();
  const pts = shapePoints(shape, size).map(([x, y]) => new Phaser.Math.Vector2(x, y));
  g.fillStyle(fillColor, 1);
  g.fillPoints(pts, true);
  if (outline) {
    g.lineStyle(outline.width ?? 7, outline.stroke, 1);
    g.strokePoints(pts, true);
  }
  parent.add(g);
}
