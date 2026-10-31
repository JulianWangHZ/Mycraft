import { hash } from '../../textures/relief.js';
import { park } from '../park.js';
import { FOUNTAIN, GATE, GROUNDS, PATHS, PLAZA } from '../park-layout.js';
import type { Vec3 } from '../types.js';
import type { BiomeLayout } from './biomes.js';
import { BLOCKS, type BlockId } from './blocks.js';
import { BLOCK, segmentDistance, type Rect } from './layout.js';
import { buildWorld, columnAt, columnX, columnZ, put, type Site, type World } from './world.js';

/**
 * The theme park: lawns inside a fence, a paved plaza and paths out to the rides, a fountain
 * by the gate, flower beds and trees, with farmland and woods round it and hills behind.
 */

const FLAT: readonly Rect[] = [{ x1: GROUNDS.x1 - 2, x2: GROUNDS.x2 + 2, z1: GROUNDS.z1 - 2, z2: GROUNDS.z2 + 3 }];

const FAIR_BIOMES: BiomeLayout = {
  mountains: { bearing: 0.3, spread: 0.55 },
  taiga: { bearing: -0.6, spread: 0.45 },
  forest: { bearing: -1.7, spread: 0.6 },
  plains: { bearing: Math.PI, spread: 1.1 },
  ocean: { bearing: 1.9, spread: 0.45 },
  mesa: { bearing: 0, spread: 0 },
  desert: { bearing: 0, spread: 0 },
};

export const PATH_WIDTH = 2.2;

/** Trees round the inside of the fence, and the flower beds by the paths. */
export const FAIR_TREES: readonly Vec3[] = [
  [-11.6, 0, 9.2], [-11.8, 0, 1.4], [-11.5, 0, -12.6], [-6.5, 0, -12.8], [1.2, 0, -12.6],
  [15.6, 0, 9.2], [15.8, 0, 2.6], [12.8, 0, 9.6], [-7.2, 0, 9.8], [5.8, 0, 9.8],
];
export const FLOWER_BEDS: ReadonlyArray<{ at: Vec3; radius: number }> = [
  { at: [-2.8, 0, 8.4], radius: 0.9 },
  { at: [3.4, 0, 8.4], radius: 0.9 },
  { at: [10.8, 0, 6.6], radius: 1.2 },
  { at: [-9.6, 0, 6.2], radius: 1.1 },
];

/** Height of the fountain's centre column, in blocks; water spills from its top. */
export const FOUNTAIN_COLUMN = 3;

function fairFloor(x: number, z: number): BlockId | null {
  const outside = x < GROUNDS.x1 || x > GROUNDS.x2 || z < GROUNDS.z1 || z > GROUNDS.z2;
  // A paved apron outside the gate, so the way in reads from afar.
  if (outside) return z > GROUNDS.z2 && Math.abs(x - GATE.x) < GATE.width / 2 + 1 ? BLOCKS.stoneBricks : null;
  const plaza = Math.hypot(x - PLAZA.centre[0], z - PLAZA.centre[2]);
  if (plaza < PLAZA.radius - 0.5) return hash(Math.round(x * 2), Math.round(z * 2), 7) < 0.12 ? BLOCKS.cobble : BLOCKS.stoneBricks;
  if (plaza < PLAZA.radius) return BLOCKS.cobble;
  if (Math.abs(x - GATE.x) < GATE.width / 2 && z > GROUNDS.z2 - 3) return BLOCKS.stoneBricks;
  if (PATHS.some((path) => segmentDistance(x, z, path) < PATH_WIDTH / 2)) return BLOCKS.path;
  return null;
}

/** Lawn may grow the odd tuft, but nowhere near a ride, stall or path. */
function fairPlantable(x: number, z: number): boolean {
  if (fairFloor(x, z) !== null) return false;
  return Object.values(park.activities).every(([ax, , az]) => Math.hypot(x - ax, z - az) > 2.2) && x > GROUNDS.x1 + 1.5 && x < 7;
}

/** A round stone basin of water by the gate, with a column in the middle that water spills from. */
function fountain(world: World) {
  const [cx, , cz] = FOUNTAIN.at;
  const [ci, ck] = columnAt(cx, cz);
  const reach = Math.ceil(FOUNTAIN.radius / BLOCK) + 1;
  for (let dk = -reach; dk <= reach; dk += 1) {
    for (let di = -reach; di <= reach; di += 1) {
      const d = Math.hypot(columnX(ci + di) - cx, columnZ(ck + dk) - cz);
      if (d > FOUNTAIN.radius + BLOCK) continue;
      if (d > FOUNTAIN.radius) put(world, ci + di, 1, ck + dk, BLOCKS.stoneBricks);
      else {
        put(world, ci + di, 0, ck + dk, BLOCKS.water);
        put(world, ci + di, -1, ck + dk, BLOCKS.stoneBricks);
      }
    }
  }
  for (let level = 0; level < FOUNTAIN_COLUMN; level += 1) put(world, ci, level, ck, BLOCKS.stoneBricks);
  put(world, ci, FOUNTAIN_COLUMN, ck, BLOCKS.water);
}

function oak(world: World, i: number, k: number, tall: number) {
  for (let level = 1; level <= tall; level += 1) put(world, i, level, k, BLOCKS.oakLog);
  for (let dy = tall - 1; dy <= tall + 2; dy += 1) {
    const radius = dy < tall + 1 ? 2 : 1;
    for (let dk = -radius; dk <= radius; dk += 1) {
      for (let di = -radius; di <= radius; di += 1) {
        if (Math.abs(di) === radius && Math.abs(dk) === radius) continue;
        if (di === 0 && dk === 0 && dy <= tall) continue;
        put(world, i + di, dy, k + dk, BLOCKS.oakLeaves);
      }
    }
  }
}

/** Flower beds: a ring of grass planted with red and yellow flowers. */
function flowerBeds(world: World) {
  FLOWER_BEDS.forEach(({ at: [x, , z], radius }, bed) => {
    const [ci, ck] = columnAt(x, z);
    const reach = Math.ceil(radius / BLOCK);
    for (let dk = -reach; dk <= reach; dk += 1) {
      for (let di = -reach; di <= reach; di += 1) {
        if (Math.hypot(di, dk) * BLOCK > radius) continue;
        put(world, ci + di, 0, ck + dk, BLOCKS.grass);
        put(world, ci + di, 1, ck + dk, hash(di + bed * 7, dk, 13) < 0.5 ? BLOCKS.poppy : BLOCKS.dandelion);
      }
    }
  });
}

export const FAIRGROUND: Site = {
  key: 'fairground',
  seed: 19,
  flat: FLAT,
  biomes: FAIR_BIOMES,
  floor: fairFloor,
  plantable: fairPlantable,
  build(world) {
    fountain(world);
    flowerBeds(world);
    FAIR_TREES.forEach(([x, , z], i) => {
      const [ci, ck] = columnAt(x, z);
      oak(world, ci, ck, 4 + (i % 3));
    });
  },
};

export function fairgroundWorld(): World {
  return buildWorld(FAIRGROUND);
}
