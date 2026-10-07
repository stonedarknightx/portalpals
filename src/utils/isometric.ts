export interface IsoPoint {
  x: number;
  y: number;
}

/**
 * Standard 2:1 Isometric Grid Configuration
 *
 * Single Tile Assets: 512 x 384 px (first_tile_light_nogold_final.png & first_tile_dark_matching_final.png)
 * - Top diamond face: 512 x 256 px (width = 512, height = 256). Ratio = 256 / 512 = 0.50000 (Exact 2:1 slope, arctan(0.5) ≈ 26.565°).
 * - Full image height: 384 px (skirt extends 128 px below diamond). Ratio = 384 / 512 = 0.75000.
 *
 * Using DEFAULT_TILE_WIDTH = 96 px:
 * - tileHeight = 48 px (diamond height: 48 px, diamond center step: 24 px)
 * - tileImageHeight = 72 px (foundation skirt: 24 px)
 * All math uses clean integers: x step = ±48px, y step = +24px, zero fractional rounding seams.
 */
export const DEFAULT_TILE_WIDTH = 96;
export const TILE_DIAMOND_RATIO = 256 / 512; // Exactly 0.50000 (2:1 isometric ratio)
export const DEFAULT_TILE_HEIGHT = DEFAULT_TILE_WIDTH * TILE_DIAMOND_RATIO; // Exactly 48 px

// Full PNG image height ratio (384 / 512 = 0.75000 -> 96 * 0.75 = 72 px)
export const TILE_IMAGE_HEIGHT_RATIO = 384 / 512; // Exactly 0.75000

// 2x2 Lush Pit Asset: 1024 x 640 px (pit_lush_padded.png)
// Top diamond rim: 1024 x 512 px (2:1 ratio). Total height ratio: 640 / 1024 = 0.62500.
export const PIT_IMAGE_HEIGHT_RATIO = 640 / 1024; // Exactly 0.62500

/**
 * Maps grid (r, c) to isometric coordinates where top diamond faces touch seamlessly with 0 gap.
 */
export function gridToIso(
  r: number,
  c: number,
  tileWidth: number = DEFAULT_TILE_WIDTH,
  tileHeight: number = DEFAULT_TILE_HEIGHT
): IsoPoint {
  const x = (c - r) * (tileWidth / 2);
  const y = (c + r) * (tileHeight / 2);
  return { x, y };
}

/**
 * Maps screen coordinates relative to board center back to grid (r, c).
 */
export function isoToGrid(
  x: number,
  y: number,
  tileWidth: number = DEFAULT_TILE_WIDTH,
  tileHeight: number = DEFAULT_TILE_HEIGHT
): { r: number; c: number } {
  const halfW = tileWidth / 2;
  const halfH = tileHeight / 2;

  const cMinusR = x / halfW;
  const cPlusR = y / halfH;

  const c = Math.round((cPlusR + cMinusR) / 2);
  const r = Math.round((cPlusR - cMinusR) / 2);

  return { r, c };
}

/**
 * Calculates depth / z-index for painter's algorithm.
 */
export function getIsoDepth(r: number, c: number, layer: number = 0): number {
  return (r + c) * 10 + layer;
}
