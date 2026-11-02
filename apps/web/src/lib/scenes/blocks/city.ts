import { BUILDING } from '../office.js';
import { CROSSING, LANES, LOT, STREET, treeSpots } from '../street.js';
import { buildBackdropTowers } from '../skyline.js';
import type { BiomeLayout } from './biomes.js';
import { BLOCKS, type BlockId } from './blocks.js';
import { BLOCK, inRect, WORLD, type Rect } from './layout.js';
import { buildWorld, columnAt, columnX, columnZ, put, type Site, type World } from './world.js';

/**
 * Downtown round the office: a street in front with a pavement either side, a parking lot to the
 * right, lawns with trees, and blocks of towers rising behind.
 */

const HALF_X = (WORLD.width / 2) * BLOCK;
const HALF_Z = (WORLD.depth / 2) * BLOCK;

/** The city is flat all the way to the edge of the world. */
const FLAT: readonly Rect[] = [{ x1: -HALF_X, x2: HALF_X, z1: -HALF_Z, z2: HALF_Z }];

const CITY_BIOMES: BiomeLayout = {
  plains: { bearing: 0, spread: 3 },
  mountains: { bearing: 0, spread: 0 },
  forest: { bearing: 0, spread: 0 },
  taiga: { bearing: 0, spread: 0 },
  ocean: { bearing: 0, spread: 0 },
  mesa: { bearing: 0, spread: 0 },
  desert: { bearing: 0, spread: 0 },
};

/** The ground under the office tower, and the courtyard round its foot. */
const FOOTPRINT: Rect = { x1: BUILDING.left - 0.5, x2: BUILDING.right + 0.5, z1: BUILDING.back - 0.5, z2: BUILDING.front };

/** The road sits a block below the pavements, with a kerb either side. */
export const ROAD_LEVEL = -1;

const roadBand = (z: number) => z >= STREET.road.z1 && z <= STREET.road.z2;
const walkBand = (z: number) => (z >= STREET.nearWalk.z1 && z < STREET.road.z1) || (z > STREET.road.z2 && z <= STREET.farWalk.z2);

/** Where the painted line between the two lanes runs. */
export const MEDIAN_Z = (LANES[0].z + LANES[1].z) / 2;

/**
 * Manhole covers, one every few blocks down each lane, clear of the crossing and the lane line.
 * The tolerance is a touch over half a block: lane centres don't always land exactly on a column,
 * so a tight BLOCK / 2 window can miss every column by a hair and place no manhole at all.
 */
const MANHOLE_STEP = 6;
const NEAR = BLOCK * 0.6;
const manholeAt = (x: number, z: number) => Math.abs(x - CROSSING.x) > CROSSING.width / 2 + CROSSING.gap && Math.abs(((x - MANHOLE_STEP / 2) % MANHOLE_STEP + MANHOLE_STEP) % MANHOLE_STEP - MANHOLE_STEP / 2) < NEAR && (Math.abs(z - LANES[0].z) < NEAR || Math.abs(z - LANES[1].z) < NEAR);

function cityFloor(x: number, z: number): BlockId | null {
  if (inRect(x, z, FOOTPRINT)) return BLOCKS.deck;
  if (inRect(x, z, LOT)) return BLOCKS.asphalt;
  if (walkBand(z)) return BLOCKS.stoneBricks;
  // Behind the tower and the lot, a plaza of paving between the towers.
  if (z < BUILDING.back - 0.5) return Math.abs(x) < 28 && z > -14 ? BLOCKS.stoneBricks : null;
  return null;
}

/** Lower the road a block, paint the lane line in dashes and a zebra crossing at the door. */
function road(world: World) {
  for (let k = 0; k < world.depth; k += 1) {
    const z = columnZ(k);
    if (!roadBand(z)) continue;
    for (let i = 0; i < world.width; i += 1) {
      const x = columnX(i);
      put(world, i, 0, k, BLOCKS.air);
      let top: BlockId = BLOCKS.asphalt;
      const crossing = Math.abs(x - CROSSING.x) < CROSSING.width / 2;
      const edge = Math.abs(z - STREET.road.z1) < BLOCK / 2 || Math.abs(z - STREET.road.z2) < BLOCK / 2;
      // Bars run along the road (the car's direction, i), repeating across its width (the walker's direction, k):
      // alternating by i instead drew thin stripes the wrong way, the full depth of the road rather than a zebra.
      if (crossing && k % 2 === 0) top = BLOCKS.roadLine;
      else if (!crossing && Math.abs(x - CROSSING.x) > CROSSING.width / 2 + CROSSING.gap && Math.abs(z - MEDIAN_Z) < BLOCK / 2 && i % 4 < 2) top = BLOCKS.roadLine;
      // Solid edge line down both kerbs, and a manhole cover sunk in the asphalt every few blocks down each lane.
      else if (!crossing && edge) top = BLOCKS.roadLine;
      else if (manholeAt(x, z)) top = BLOCKS.ironBlock;
      put(world, i, ROAD_LEVEL, k, top);
      world.surface[k * world.width + i] = ROAD_LEVEL;
    }
  }
}

/** A street tree: a grass square in the pavement, a short trunk and a round crown. */
function streetTree(world: World, x: number, z: number, tall: number) {
  const [i, k] = columnAt(x, z);
  put(world, i, 0, k, BLOCKS.grass);
  for (let level = 1; level <= tall; level += 1) put(world, i, level, k, BLOCKS.oakLog);
  for (let dy = tall - 1; dy <= tall + 1; dy += 1) {
    const radius = dy === tall + 1 ? 1 : 2;
    for (let dk = -radius; dk <= radius; dk += 1) {
      for (let di = -radius; di <= radius; di += 1) {
        if (Math.abs(di) === radius && Math.abs(dk) === radius) continue;
        if (di === 0 && dk === 0 && dy <= tall) continue;
        put(world, i + di, dy, k + dk, BLOCKS.oakLeaves);
      }
    }
  }
}

/** Towers behind the office, a block of concrete and window bands, with a roof plant on top. */
function tower(world: World, x: number, z: number, width: number, depth: number, height: number) {
  const [i1, k1] = columnAt(x - width / 2, z - depth / 2);
  const [i2, k2] = columnAt(x + width / 2, z + depth / 2);
  const levels = Math.min(world.top - 2, Math.round(height / BLOCK));
  for (let k = k1; k <= k2; k += 1) {
    for (let i = i1; i <= i2; i += 1) {
      const edge = i === i1 || i === i2 || k === k1 || k === k2;
      for (let level = 1; level <= levels; level += 1) put(world, i, level, k, edge ? (level % 4 === 0 ? BLOCKS.concreteWhite : BLOCKS.facade) : BLOCKS.concreteWhite);
    }
  }
  const mi = Math.round((i1 + i2) / 2);
  const mk = Math.round((k1 + k2) / 2);
  for (let level = levels + 1; level <= levels + 2; level += 1) {
    for (const [di, dk] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) put(world, mi + di, level, mk + dk, BLOCKS.ironBlock);
  }
}

/** Towers that fit inside the world, clear of the office, the lot and the street. */
export function cityTowers() {
  return buildBackdropTowers(60).filter(({ x, z, width, depth }) => {
    const r = { x1: x - width / 2, x2: x + width / 2, z1: z - depth / 2, z2: z + depth / 2 };
    const inside = r.x1 > -HALF_X + 1 && r.x2 < HALF_X - 1 && r.z1 > -HALF_Z + 1;
    const clear = r.z2 < BUILDING.back - 3 && !(r.x2 > LOT.x1 - 1 && r.x1 < LOT.x2 + 1 && r.z2 > LOT.z1 - 3);
    return inside && clear;
  });
}

export const CITY: Site = {
  key: 'city',
  seed: 23,
  flat: FLAT,
  biomes: CITY_BIOMES,
  floor: cityFloor,
  build(world) {
    road(world);
    treeSpots().forEach(([x, z], index) => {
      if (Math.abs(x) < HALF_X - 2) streetTree(world, x, z, 3 + (index % 2));
    });
    const placed: Rect[] = [];
    for (const { x, z, width, depth, top } of cityTowers()) {
      const r = { x1: x - width / 2 - 1, x2: x + width / 2 + 1, z1: z - depth / 2 - 1, z2: z + depth / 2 + 1 };
      if (placed.some((p) => p.x1 < r.x2 && p.x2 > r.x1 && p.z1 < r.z2 && p.z2 > r.z1)) continue;
      placed.push(r);
      tower(world, x, z, width, depth, top);
    }
  },
};

export function cityWorld(): World {
  return buildWorld(CITY);
}
