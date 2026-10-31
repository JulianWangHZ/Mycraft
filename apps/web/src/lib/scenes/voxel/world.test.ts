import { describe, expect, it } from 'vitest';
import { voxel } from '../voxel.js';
import { BIOMES } from './biomes.js';
import { BLOCKS } from './blocks.js';
import { BLOCK, DOCK, HOUSE_SIZE, HOUSES, SEA_LEVEL, WORLD, workSpot } from './layout.js';
import { VILLAGE, villageWorld } from './village.js';
import { blockAt, buildWorld, columnAt, columnsIn, columnX, columnZ, groundAt, topAt } from './world.js';

const world = villageWorld();

function column(x: number, z: number): [number, number] {
  return [Math.floor(x / BLOCK + WORLD.width / 2), Math.floor(z / BLOCK + WORLD.depth / 2)];
}

function surfaceAt(x: number, z: number): number {
  const [i, k] = column(x, z);
  return world.surface[k * world.width + i] as number;
}

describe('village world', () => {
  it('is built once per site and reused', () => {
    expect(villageWorld()).toBe(world);
    expect(buildWorld({ ...VILLAGE, key: 'village-again', seed: 8 })).not.toBe(world);
  });

  it('lists the columns inside a rectangle', () => {
    const columns = columnsIn({ x1: 0, x2: 1, z1: 0, z2: 0.5 });
    expect(columns).toHaveLength(2);
    for (const [i, k] of columns) {
      expect(columnX(i)).toBeGreaterThan(0);
      expect(columnZ(k)).toBeGreaterThan(0);
    }
  });

  it('maps columns back to scene units', () => {
    const [i, k] = column(2.3, -4.1);
    expect(Math.abs(columnX(i) - 2.3)).toBeLessThanOrEqual(BLOCK / 2);
    expect(Math.abs(columnZ(k) + 4.1)).toBeLessThanOrEqual(BLOCK / 2);
  });

  it('keeps every workbench and activity on flat ground at height 0', () => {
    const spots = [...Array.from({ length: 36 }, (_, i) => workSpot(i)), ...Object.values(voxel.activities)];
    for (const [x, , z] of spots) {
      if (Math.abs(x - DOCK.x) < 1 && z > DOCK.z1) continue;
      expect(surfaceAt(x, z)).toBe(0);
    }
  });

  it('leaves the space above workbenches and activities open', () => {
    for (const [x, , z] of [...Array.from({ length: 36 }, (_, i) => workSpot(i)), ...Object.values(voxel.activities)]) {
      const [i, k] = column(x, z);
      for (let level = 2; level < 6; level += 1) expect(blockAt(world, i, level, k)).toBe(BLOCKS.air);
    }
  });

  it('puts the end of the dock over open water', () => {
    const [i, k] = column(DOCK.x, DOCK.z2 - 0.5);
    expect(blockAt(world, i, SEA_LEVEL, k)).toBe(BLOCKS.water);
  });

  it('has every biome somewhere in the world', () => {
    expect(new Set(world.biome)).toEqual(new Set(BIOMES));
  });

  it('raises mountains well above the village and sinks the sea below it', () => {
    const heights = Array.from(world.surface);
    expect(Math.max(...heights)).toBeGreaterThan(24);
    expect(Math.min(...heights)).toBeLessThan(SEA_LEVEL - 3);
  });

  it('grows trees, cacti and plants', () => {
    const found = new Set(world.blocks);
    for (const id of [BLOCKS.oakLog, BLOCKS.spruceLog, BLOCKS.cactus, BLOCKS.tallGrass, BLOCKS.wheat, BLOCKS.snow, BLOCKS.clayRed]) {
      expect(found.has(id)).toBe(true);
    }
  });

  it('builds every house with a door at the front, windows and a roof', () => {
    for (const [x, , z] of HOUSES) {
      const [i, k] = columnAt(x + BLOCK / 2, z + BLOCK / 2);
      const front = k + HOUSE_SIZE.depth - 1;
      const mid = i + Math.floor(HOUSE_SIZE.width / 2);
      expect(blockAt(world, mid, 1, front)).toBe(BLOCKS.doorLower);
      expect(blockAt(world, mid, 2, front)).toBe(BLOCKS.doorUpper);
      expect(blockAt(world, mid - 1, 2, front)).toBe(BLOCKS.glass);
      expect(blockAt(world, mid, 2, k + 2)).toBe(BLOCKS.air);
      expect(topAt(world, x + 1.2, z + 1.2)).toBeGreaterThan(3 * BLOCK);
    }
  });

  it('builds the dock from planks on log piles', () => {
    const [i, k] = columnAt(DOCK.x, DOCK.z1 + 1);
    expect(blockAt(world, i, 0, k)).toBe(BLOCKS.planks);
    expect(blockAt(world, i, 1, k)).toBe(BLOCKS.air);
    expect(world.blocks.includes(BLOCKS.oakLog)).toBe(true);
  });

  it('reads heights off the world as sea level and flat ground', () => {
    expect(topAt(world, 1000, 1000)).toBe(SEA_LEVEL * BLOCK);
    expect(groundAt(world, 1000, 1000)).toBe(0);
    expect(groundAt(world, 0, 0)).toBe(0);
  });

  it('dresses exposed rock with ores and blends grass colour by biome', () => {
    const found = new Set(world.blocks);
    for (const id of [BLOCKS.coalOre, BLOCKS.ironOre, BLOCKS.andesite, BLOCKS.mossyCobble]) expect(found.has(id)).toBe(true);
    const greens = new Set(Array.from(world.tint).filter((_, i) => i % 3 === 2).map((b) => b.toFixed(2)));
    expect(greens.size).toBeGreaterThan(10);
  });

  it('reads air outside the world', () => {
    expect(blockAt(world, -1, 0, 0)).toBe(BLOCKS.air);
    expect(blockAt(world, 0, WORLD.top, 0)).toBe(BLOCKS.air);
    expect(blockAt(world, 0, WORLD.bottom - 1, 0)).toBe(BLOCKS.air);
  });
});
