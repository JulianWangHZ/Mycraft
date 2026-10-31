import { describe, expect, it } from 'vitest';
import { pool } from '../pool.js';
import { CABANA, DECK, LAP_POOL, laneSpot, PALMS, SPLASH_POOL } from '../pool-layout.js';
import { BLOCKS } from './blocks.js';
import { HOTEL, ISLANDS, LAP_DEPTH, LIGHTHOUSE, resortWorld, SPLASH_DEPTH } from './resort.js';
import { blockAt, columnAt, groundAt, topAt } from './world.js';

const world = resortWorld();
const at = (x: number, level: number, z: number) => blockAt(world, ...([columnAt(x, z)[0], level, columnAt(x, z)[1]] as const));

describe('resort world', () => {
  it('fills the lap pool with water down to a tiled floor, with a lane line under every lane', () => {
    const mid = (LAP_POOL.z1 + LAP_POOL.z2) / 2;
    for (let lane = 0; lane < 6; lane += 1) {
      const [x] = laneSpot(lane);
      for (let level = 0; level > -LAP_DEPTH; level -= 1) expect(at(x, level, mid)).toBe(BLOCKS.water);
      expect(at(x, -LAP_DEPTH, mid)).toBe(BLOCKS.poolLine);
    }
  });

  it('tiles the pool walls below the deck', () => {
    expect(at(LAP_POOL.x1 - 0.25, -1, (LAP_POOL.z1 + LAP_POOL.z2) / 2)).toBe(BLOCKS.poolTile);
    expect(at(LAP_POOL.x1 - 0.25, 0, (LAP_POOL.z1 + LAP_POOL.z2) / 2)).not.toBe(BLOCKS.water);
  });

  it('gives the splash pool its own shallower water', () => {
    const x = (SPLASH_POOL.x1 + SPLASH_POOL.x2) / 2;
    const z = (SPLASH_POOL.z1 + SPLASH_POOL.z2) / 2;
    expect(at(x, -SPLASH_DEPTH + 1, z)).toBe(BLOCKS.water);
    expect(at(x, -SPLASH_DEPTH, z)).toBe(BLOCKS.poolTile);
  });

  it('paves the deck flat at the scene floor, leaving every resting spot clear', () => {
    for (const [x, , z] of Object.values(pool.activities)) {
      expect(groundAt(world, x, z)).toBe(0);
      expect(at(x, 1, z)).toBe(BLOCKS.air);
      expect(at(x, 2, z)).toBe(BLOCKS.air);
    }
    expect([BLOCKS.deck, BLOCKS.deckDark]).toContain(at(CABANA.at[0], 0, CABANA.at[2]));
    expect(at(DECK.x1 + 0.3, 0, DECK.z2 + 1)).toBe(BLOCKS.sand);
  });

  it('builds the hotel behind the deck, with glass doors facing it', () => {
    expect(topAt(world, (HOTEL.x1 + HOTEL.x2) / 2, (HOTEL.z1 + HOTEL.z2) / 2)).toBeGreaterThan(5);
    expect(at((HOTEL.x1 + HOTEL.x2) / 2, 1, HOTEL.z2 - 0.1)).toBe(BLOCKS.glass);
  });

  it('plants every deck palm in grass, with fronds overhead', () => {
    for (const [x, , z] of PALMS) {
      expect(at(x, 0, z)).toBe(BLOCKS.grass);
      expect(at(x, 1, z)).toBe(BLOCKS.palmLog);
      expect(topAt(world, x, z)).toBeGreaterThan(3);
    }
  });

  it('rings the club with sand, sea and islands, with no hills or rock in sight', () => {
    const found = new Set(world.blocks);
    for (const id of [BLOCKS.snow, BLOCKS.spruceLog, BLOCKS.oakLog, BLOCKS.clayRed]) expect(found.has(id)).toBe(false);
    for (const { at } of ISLANDS) expect(at && groundAt(world, at[0], at[1])).toBeGreaterThan(0);
    expect(topAt(world, ISLANDS[0]?.at[0] ?? 0, ISLANDS[0]?.at[1] ?? 0)).toBeGreaterThan(LIGHTHOUSE.height * 0.5);
  });

  it('grows palms on the dunes', () => {
    let palms = 0;
    for (let i = 0; i < world.blocks.length; i += 1) if (world.blocks[i] === BLOCKS.palmLeaves) palms += 1;
    expect(palms).toBeGreaterThan(PALMS.length * 15);
  });
});
