import { describe, expect, it } from 'vitest';
import { BIOMES, biomeHeight, biomeWeights, dominant, groundHeight } from './biomes.js';
import { isOpaque, kindOf, BLOCKS } from './blocks.js';
import { fbm, ridged, smoothstep } from './noise.js';

describe('noise', () => {
  it('stays within 0..1 and repeats for the same input', () => {
    for (let i = 0; i < 200; i += 1) {
      const x = i * 0.73 - 40;
      const z = i * 1.31 - 70;
      for (const value of [fbm(x, z, 3), ridged(x, z, 3)]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      expect(fbm(x, z, 3)).toBe(fbm(x, z, 3));
    }
  });

  it('eases between its edges', () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(smoothstep(0, 1, 2)).toBe(1);
  });
});

describe('biomes', () => {
  it('blends weights that add up to one', () => {
    const weights = biomeWeights(10, -20, 7);
    expect(Object.values(weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it('puts mountains behind the village and the sea in front', () => {
    expect(dominant(biomeWeights(0, -28, 7))).toBe('mountains');
    expect(dominant(biomeWeights(0, 28, 7))).toBe('ocean');
  });

  it('keeps the village flat', () => {
    expect(groundHeight(0, 0, 7, 0)).toBe(0);
    expect(groundHeight(30, -30, 7, 0)).toBe(0);
    expect(groundHeight(0, -28, 7, 20)).toBeGreaterThan(4);
  });

  it('gives every biome a height', () => {
    for (const biome of BIOMES) expect(Number.isFinite(biomeHeight(biome, 20, 20, 7))).toBe(true);
    expect(biomeHeight('ocean', 20, 20, 7)).toBeLessThan(0);
  });
});

describe('blocks', () => {
  it('treats only cubes as hiding their neighbours', () => {
    expect(kindOf(BLOCKS.air)).toBeNull();
    expect(isOpaque(BLOCKS.stone)).toBe(true);
    expect(isOpaque(BLOCKS.water)).toBe(false);
    expect(isOpaque(BLOCKS.poppy)).toBe(false);
    expect(isOpaque(250)).toBe(false);
  });
});
