import { describe, expect, it } from 'vitest';
import { KINDS, TILES } from '../scenes/blocks/blocks.js';
import { paintTile, TILE_SIZE, tilePixels } from './block-tiles.js';

const alphas = (pixels: Uint8Array) => Array.from(pixels).filter((_, i) => i % 4 === 3);
const plantTiles = new Set<string>([...Object.values(KINDS).filter((k) => k.shape === 'plant' || k.shape === 'glass').map((k) => k.top), 'rail']);

describe('block tiles', () => {
  it.each(TILES)('paints %s, see-through only for plants, glass and rails', (tile) => {
    const pixels = tilePixels(tile);
    expect(pixels.length).toBe(TILE_SIZE * TILE_SIZE * 4);
    const clear = alphas(pixels).filter((a) => a === 0).length;
    if (plantTiles.has(tile)) expect(clear).toBeGreaterThan(0);
    else expect(clear).toBe(0);
  });

  it('stores the top row of the painting last, the way textures are uploaded', () => {
    const pixels = paintTile((_, y) => (y === 0 ? [255, 0, 0] : [0, 0, 255]), 2);
    expect(Array.from(pixels.slice(8, 12))).toEqual([255, 0, 0, 255]);
    expect(Array.from(pixels.slice(0, 4))).toEqual([0, 0, 255, 255]);
  });
});
