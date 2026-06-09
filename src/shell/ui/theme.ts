import Phaser from 'phaser';

// Shared design tokens and drawing helpers for all game scenes.

export const FONT = 'Fredoka, "Baloo 2", "Trebuchet MS", system-ui, sans-serif';
export const BG_HEX = '#fff7ed';
export const BG_NUM = 0xfff7ed;

// Colourblind-safe Okabe-Ito palette — every colour must carry a redundant emoji cue in-game.
export const PALETTE = {
  blue:   { color: 0x0072b2, tint: 0xd5e8f4 },
  green:  { color: 0x009e73, tint: 0xd2efe6 },
  orange: { color: 0xd55e00, tint: 0xf7ddca },
  yellow: { color: 0xe69f00, tint: 0xfaf0d0 },
  pink:   { color: 0xcc79a7, tint: 0xf4dded },
  sky:    { color: 0x56b4e9, tint: 0xdaf0fc },
} as const;

export const TEXT_DARK = '#6b4f3a';
export const ACCENT    = '#e8590c';

/**
 * Draw a rounded card (shadow + filled + white inner stroke) and return a Container.
 * The Container is positioned at (x, y) and sized to (size × size).
 */
export function drawRoundedCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number,
  fillColor: number,
  radius = 24,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.12);
  shadow.fillRoundedRect(-size / 2, -size / 2 + 7, size, size, radius);

  const card = scene.add.graphics();
  card.fillStyle(fillColor, 1);
  card.fillRoundedRect(-size / 2, -size / 2, size, size, radius);
  card.lineStyle(5, 0xffffff, 0.7);
  card.strokeRoundedRect(-size / 2, -size / 2, size, size, radius);

  c.add([shadow, card]);
  c.setSize(size, size);
  return c;
}

/**
 * Draw a basket / drop-target (shadow + tint fill + coloured border).
 * Returns the Container (positioned at x, y). The icon text is added but not interactive.
 */
export function drawBasket(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  fillTint: number,
  strokeColor: number,
  icon: string,
): Phaser.GameObjects.Container {
  const r = 30;
  const c = scene.add.container(x, y);

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.1);
  shadow.fillRoundedRect(-w / 2, -h / 2 + 10, w, h, r);

  const bg = scene.add.graphics();
  bg.fillStyle(fillTint, 1);
  bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  bg.lineStyle(9, strokeColor, 1);
  bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

  const label = scene.add
    .text(0, 0, icon, { fontSize: `${Math.round(h * 0.46)}px` })
    .setOrigin(0.5)
    .setAlpha(0.32);

  c.add([shadow, bg, label]);
  c.setSize(w, h);
  return c;
}
