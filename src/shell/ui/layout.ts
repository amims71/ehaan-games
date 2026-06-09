// Responsive layout helpers shared by all scenes. Everything is computed from the live canvas
// size so the games adapt to portrait and landscape (and to rotation — scenes rebuild on resize).

export interface Cell {
  x: number;
  y: number;
}
export interface Grid {
  cells: Cell[];
  size: number;
  cols: number;
  rows: number;
}

/**
 * Fit `count` square cells into a rect, centred, maximising cell size. Gaps scale with the cell.
 * Picks the column count that yields the largest cell, so it works in any aspect ratio.
 */
export function fitGrid(
  count: number,
  rectX: number,
  rectY: number,
  rectW: number,
  rectH: number,
  gapRatio = 0.22,
  maxSize = Number.POSITIVE_INFINITY,
): Grid {
  let best = { size: 0, cols: 1, rows: count };
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const sizeW = rectW / (cols + (cols + 1) * gapRatio);
    const sizeH = rectH / (rows + (rows + 1) * gapRatio);
    const size = Math.min(sizeW, sizeH);
    if (size > best.size) best = { size, cols, rows };
  }

  const size = Math.min(best.size, maxSize);
  const { cols, rows } = best;
  const gap = size * gapRatio;
  const gridH = rows * size + (rows - 1) * gap;
  const top = rectY + (rectH - gridH) / 2 + size / 2;

  const cells: Cell[] = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const inRow = r === rows - 1 ? count - cols * r : cols;
    const rowW = inRow * size + (inRow - 1) * gap;
    const left = rectX + (rectW - rowW) / 2 + size / 2;
    cells.push({ x: left + (i % cols) * (size + gap), y: top + r * (size + gap) });
  }
  return { cells, size, cols, rows };
}

/** Lay out `n` items in a single centred row inside [rectX, rectX+rectW], returning x centres. */
export function rowX(n: number, rectX: number, rectW: number, cellW: number, gap: number): number[] {
  const total = n * cellW + (n - 1) * gap;
  const left = rectX + (rectW - total) / 2 + cellW / 2;
  return Array.from({ length: n }, (_, i) => left + i * (cellW + gap));
}

export function isPortrait(w: number, h: number): boolean {
  return h >= w;
}
