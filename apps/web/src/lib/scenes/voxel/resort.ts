import type { BiomeLayout } from './biomes.js';
import { BLOCKS, type BlockId } from './blocks.js';
import { DECK, LANES, LAP_POOL, laneSpot, PALMS, SPLASH_POOL } from '../pool-layout.js';
import { BLOCK, inRect, type Rect } from './layout.js';
import { blockAt, buildWorld, columnAt, columnsIn, put, type Site, type World } from './world.js';

/**
 * The beach club: a stone deck by the sea with its pools let into it, a hotel behind, palms on
 * the deck and the hills round it.
 */

/** The hotel block behind the deck, in scene units, with its floors and how tall each is in blocks. */
export const HOTEL = { x1: -9, x2: 10.5, z1: -14.5, z2: -10, floors: 4, storey: 3 } as const;

/** Flat ground: the deck and the hotel's forecourt. The beach falls away in front. */
const FLAT: readonly Rect[] = [
  { x1: DECK.x1 - 1.5, x2: DECK.x2 + 1.5, z1: HOTEL.z1 - 1.5, z2: DECK.z2 + 0.5 },
];

/** Sea in front, palm woods either side and the hills behind the hotel. */
const RESORT_BIOMES: BiomeLayout = {
  mountains: { bearing: 0, spread: 0.6 },
  forest: { bearing: -1.4, spread: 0.6 },
  plains: { bearing: 1.4, spread: 0.6 },
  ocean: { bearing: Math.PI, spread: 1.3 },
  taiga: { bearing: 0, spread: 0 },
  mesa: { bearing: 0, spread: 0 },
  desert: { bearing: 0, spread: 0 },
};

/** How many blocks deep each pool's water runs. */
export const LAP_DEPTH = 3;
export const SPLASH_DEPTH = 2;

/** The deck is laid in a checker of two stones; past its front edge is sand. */
function resortFloor(x: number, z: number): BlockId | null {
  if (inRect(x, z, DECK)) return (Math.floor(x / BLOCK / 2) + Math.floor(z / BLOCK / 2)) % 2 ? BLOCKS.deckDark : BLOCKS.deck;
  if (z > DECK.z2) return BLOCKS.sand;
  if (z < HOTEL.z2 + 1 && z > HOTEL.z1 - 1) return BLOCKS.deck;
  return null;
}

/** Hollow out a pool: water to `depth` blocks, tiled floor and walls, the deck as its coping. */
function pool(world: World, rect: Rect, depth: number, lines: readonly number[] = []) {
  const columns = columnsIn(rect);
  const inside = new Set(columns.map(([i, k]) => `${i},${k}`));
  for (const [i, k] of columns) {
    for (let level = 0; level > -depth; level -= 1) put(world, i, level, k, BLOCKS.water);
    put(world, i, -depth, k, lines.includes(i) ? BLOCKS.poolLine : BLOCKS.poolTile);
    // Line the walls round the edge, below the deck.
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      if (inside.has(`${i + di},${k + dk}`)) continue;
      for (let level = -1; level >= -depth; level -= 1) put(world, i + di, level, k + dk, BLOCKS.poolTile);
    }
  }
}

/**
 * The hotel: a white block of rooms with a band of windows on every floor, quartz columns at
 * the corners and between bays, a terracotta cornice and glass doors facing the deck.
 */
function hotel(world: World) {
  const columns = columnsIn(HOTEL);
  const is = columns.map(([i]) => i);
  const ks = columns.map(([, k]) => k);
  const [i1, i2, k1, k2] = [Math.min(...is), Math.max(...is), Math.min(...ks), Math.max(...ks)];
  const mid = Math.round((i1 + i2) / 2);
  const height = HOTEL.floors * HOTEL.storey;
  for (const [i, k] of columns) {
    const edge = i === i1 || i === i2 || k === k1 || k === k2;
    const column = (i - i1) % 4 === 0 && (k === k1 || k === k2);
    const corner = (i === i1 || i === i2) && (k === k1 || k === k2);
    for (let level = 1; level <= height; level += 1) {
      let id: BlockId = BLOCKS.air;
      const floorLine = level % HOTEL.storey === 0;
      if (edge) {
        id = corner || column ? BLOCKS.quartzPillar : floorLine ? BLOCKS.sandstone : level % HOTEL.storey === 2 ? BLOCKS.glass : BLOCKS.concreteWhite;
        // Lobby doors and a tall window over them, in the middle of the front.
        if (k === k2 && Math.abs(i - mid) <= 1 && level <= 2) id = BLOCKS.glass;
      } else if (floorLine) id = BLOCKS.concreteWhite;
      put(world, i, level, k, id);
    }
    // Cornice: a terracotta lip all round the roof, a little proud of the walls.
    if (edge) put(world, i, height + 1, k, BLOCKS.terracotta);
  }
  for (let i = i1 - 1; i <= i2 + 1; i += 1) {
    for (const k of [k1 - 1, k2 + 1]) put(world, i, height, k, BLOCKS.terracotta);
  }
  for (let k = k1 - 1; k <= k2 + 1; k += 1) {
    for (const i of [i1 - 1, i2 + 1]) put(world, i, height, k, BLOCKS.terracotta);
  }
  // Glowing lanterns by the lobby doors.
  for (const di of [-3, 3]) put(world, mid + di, 1, k2 + 1, BLOCKS.seaLantern);
}

/** Palms in planters set into the deck: a grass block and a trunk with fronds. */
function deckPalms(world: World) {
  PALMS.forEach(([x, , z], index) => {
    const [i, k] = columnAt(x, z);
    put(world, i, 0, k, BLOCKS.grass);
    const tall = 6 + (index % 3);
    for (let level = 1; level <= tall; level += 1) put(world, i, level, k, BLOCKS.palmLog);
    const top = tall + 1;
    put(world, i, top, k, BLOCKS.palmLeaves);
    for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] as const) {
      const reach = di && dk ? 2 : 3;
      for (let step = 1; step <= reach; step += 1) {
        const level = step === reach ? top - 1 : top;
        if (blockAt(world, i + di * step, level, k + dk * step) === BLOCKS.air) put(world, i + di * step, level, k + dk * step, BLOCKS.palmLeaves);
      }
    }
  });
}

/** Columns down the middle of each swimming lane, where the dark lane line runs on the floor. */
function laneLines(): number[] {
  return Array.from({ length: LANES }, (_, lane) => columnAt(laneSpot(lane)[0], 0)[0]);
}

export const RESORT: Site = {
  key: 'resort',
  seed: 11,
  flat: FLAT,
  biomes: RESORT_BIOMES,
  floor: resortFloor,
  trees: { forest: 'palm', plains: 'palm', mountains: 'oak' },
  build(world) {
    pool(world, LAP_POOL, LAP_DEPTH, laneLines());
    pool(world, SPLASH_POOL, SPLASH_DEPTH);
    hotel(world);
    deckPalms(world);
  },
};

export function resortWorld(): World {
  return buildWorld(RESORT);
}
