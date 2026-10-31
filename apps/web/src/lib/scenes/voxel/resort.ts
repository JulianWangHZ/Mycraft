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

/**
 * An island resort: open sea in front and round both sides, and low palm-covered dunes behind
 * the hotel. No hills, no rock: nothing but sand, palms and water.
 */
const RESORT_BIOMES: BiomeLayout = {
  ocean: { bearing: Math.PI, spread: 1.7 },
  desert: { bearing: 0, spread: 0.8 },
  mountains: { bearing: 0, spread: 0 },
  forest: { bearing: 0, spread: 0 },
  plains: { bearing: 0, spread: 0 },
  taiga: { bearing: 0, spread: 0 },
  mesa: { bearing: 0, spread: 0 },
};

/** Little islands out at sea, each with a palm or two; the first has the lighthouse. */
export const ISLANDS: ReadonlyArray<{ at: readonly [number, number]; radius: number }> = [
  { at: [-26, 26], radius: 3.2 },
  { at: [24, 30], radius: 2.4 },
  { at: [36, 6], radius: 2.8 },
  { at: [-38, 4], radius: 2.2 },
];
export const LIGHTHOUSE = { height: 18 } as const;

/** How many blocks deep each pool's water runs. */
export const LAP_DEPTH = 3;
export const SPLASH_DEPTH = 2;

/** The deck is laid in a checker of two stones, the hotel forecourt in plain stone; all round it is sand. */
function resortFloor(x: number, z: number): BlockId | null {
  if (inRect(x, z, DECK)) return (Math.floor(x / BLOCK / 2) + Math.floor(z / BLOCK / 2)) % 2 ? BLOCKS.deckDark : BLOCKS.deck;
  if (z > DECK.z2) return BLOCKS.sand;
  if (z < HOTEL.z2 + 1 && z > HOTEL.z1 - 1) return BLOCKS.deck;
  return BLOCKS.sand;
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

/** A palm on its own: a trunk with fronds out in a star from the top, drooping at their tips. */
function palmTree(world: World, i: number, base: number, k: number, tall: number) {
  for (let level = base; level < base + tall; level += 1) put(world, i, level, k, BLOCKS.palmLog);
  const top = base + tall;
  put(world, i, top, k, BLOCKS.palmLeaves);
  for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] as const) {
    const reach = di && dk ? 2 : 3;
    for (let step = 1; step <= reach; step += 1) {
      const level = step === reach ? top - 1 : top;
      if (blockAt(world, i + di * step, level, k + dk * step) === BLOCKS.air) put(world, i + di * step, level, k + dk * step, BLOCKS.palmLeaves);
    }
  }
}

/**
 * An islet: a mound of sand rising out of the sea with a palm on it. The first one carries a
 * lighthouse instead, striped red and white, with a lantern room at the top.
 */
function islet(world: World, { at: [cx, cz], radius }: { at: readonly [number, number]; radius: number }, index: number) {
  const [ci, ck] = columnAt(cx, cz);
  const reach = Math.ceil(radius / BLOCK);
  for (let dk = -reach; dk <= reach; dk += 1) {
    for (let di = -reach; di <= reach; di += 1) {
      const d = Math.hypot(di, dk) * BLOCK;
      if (d > radius) continue;
      const top = Math.round((1 - d / radius) * 3) - 1;
      for (let level = world.bottom; level <= top; level += 1) put(world, ci + di, level, ck + dk, level === top ? BLOCKS.sand : BLOCKS.sandstone);
      world.surface[(ck + dk) * world.width + ci + di] = top;
    }
  }
  if (index > 0) {
    palmTree(world, ci, 3, ck, 6);
    return;
  }
  // The lighthouse: a two-block-wide tower in red and white bands, a glass lantern room and a cap.
  for (let level = 3; level < 3 + LIGHTHOUSE.height; level += 1) {
    const band = Math.floor((level - 3) / 3) % 2 ? BLOCKS.terracotta : BLOCKS.concreteWhite;
    for (const [di, dk] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) put(world, ci + di, level, ck + dk, band);
  }
  const room = 3 + LIGHTHOUSE.height;
  for (const [di, dk] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
    put(world, ci + di, room, ck + dk, BLOCKS.seaLantern);
    put(world, ci + di, room + 1, ck + dk, BLOCKS.glass);
    put(world, ci + di, room + 2, ck + dk, BLOCKS.terracotta);
  }
}

/** Palms in planters set into the deck: a grass block and a trunk with fronds. */
function deckPalms(world: World) {
  PALMS.forEach(([x, , z], index) => {
    const [i, k] = columnAt(x, z);
    put(world, i, 0, k, BLOCKS.grass);
    palmTree(world, i, 1, k, 6 + (index % 3));
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
  trees: { desert: 'palm' },
  bare: ['desert', 'ocean'],
  build(world) {
    pool(world, LAP_POOL, LAP_DEPTH, laneLines());
    pool(world, SPLASH_POOL, SPLASH_DEPTH);
    hotel(world);
    deckPalms(world);
    ISLANDS.forEach((island, index) => islet(world, island, index));
  },
};

export function resortWorld(): World {
  return buildWorld(RESORT);
}
