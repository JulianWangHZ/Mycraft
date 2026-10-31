import { describe, expect, it } from 'vitest';
import { PATHS, segmentDistance } from './layout.js';
import { villagerAt, VILLAGERS } from './villagers.js';

describe('villagers', () => {
  it('keeps every villager on its own path, clear of both ends', () => {
    VILLAGERS.forEach((villager, index) => {
      const path = PATHS[villager.path] as (typeof PATHS)[number];
      for (let s = 0; s < 120; s += 0.7) {
        const { position } = villagerAt(index, s);
        expect(segmentDistance(position[0], position[2], path)).toBeLessThan(1e-6);
        for (const end of path) expect(Math.hypot(position[0] - end[0], position[2] - end[2])).toBeGreaterThan(0.5);
      }
    });
  });

  it('walks, pauses, turns round and walks back', () => {
    const states = Array.from({ length: 200 }, (_, s) => villagerAt(0, s * 0.25));
    expect(states.some((p) => p.walking)).toBe(true);
    expect(states.some((p) => !p.walking)).toBe(true);
    const facings = new Set(states.map((p) => p.facing.toFixed(3)));
    expect(facings.size).toBe(2);
  });

  it('handles any moment, before zero included', () => {
    expect(villagerAt(2, -5).position.every(Number.isFinite)).toBe(true);
  });
});
