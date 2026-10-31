import { describe, expect, it } from 'vitest';
import { park } from '../park.js';
import { FOUNTAIN, GATE, GROUNDS, PLAZA, RIDES } from '../park-layout.js';
import { BLOCKS } from './blocks.js';
import { FAIR_TREES, fairgroundWorld, FLOWER_BEDS, FOUNTAIN_COLUMN } from './fairground.js';
import { blockAt, columnAt, groundAt, topAt } from './world.js';

const world = fairgroundWorld();
const at = (x: number, level: number, z: number) => {
  const [i, k] = columnAt(x, z);
  return blockAt(world, i, level, k);
};

describe('fairground world', () => {
  it('keeps the grounds flat and every gathering spot clear', () => {
    for (const [x, , z] of Object.values(park.activities)) {
      expect(groundAt(world, x, z)).toBe(0);
      expect(at(x, 2, z)).toBe(BLOCKS.air);
    }
    expect(groundAt(world, RIDES.ferrisWheel.at[0], RIDES.ferrisWheel.at[2])).toBe(0);
  });

  it('paves the plaza in stone and the way in through the gate', () => {
    expect([BLOCKS.stoneBricks, BLOCKS.cobble]).toContain(at(PLAZA.centre[0], 0, PLAZA.centre[2]));
    expect(at(GATE.x, 0, GROUNDS.z2 - 1)).toBe(BLOCKS.stoneBricks);
  });

  it('fills the fountain with water round a column that spills from its top', () => {
    expect(at(FOUNTAIN.at[0] + 0.6, 0, FOUNTAIN.at[2])).toBe(BLOCKS.water);
    expect(at(FOUNTAIN.at[0], FOUNTAIN_COLUMN, FOUNTAIN.at[2])).toBe(BLOCKS.water);
    expect(at(FOUNTAIN.at[0], FOUNTAIN_COLUMN - 1, FOUNTAIN.at[2])).toBe(BLOCKS.stoneBricks);
  });

  it('plants trees and flower beds', () => {
    for (const [x, , z] of FAIR_TREES) expect(topAt(world, x, z)).toBeGreaterThan(2);
    for (const { at: [x, , z] } of FLOWER_BEDS) expect([BLOCKS.poppy, BLOCKS.dandelion]).toContain(at(x, 1, z));
  });
});
