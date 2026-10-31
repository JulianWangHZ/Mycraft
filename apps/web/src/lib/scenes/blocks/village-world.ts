import { hash } from '../../textures/relief.js';
import { village } from '../village.js';
import { BLOCKS, type BlockId } from './blocks.js';
import { BLOCK, CAMPFIRE, DOCK, FARM, FLAT, HOUSE_SIZE, HOUSES, houseRect, inRect, LAMPS, PATH_WIDTH, PATHS, segmentDistance, WELL, WORKSHOP_FLOOR, WORKSHOP_YARD } from './layout.js';
import { blockAt, buildWorld, columnAt, columnX, columnZ, put, type Site, type World } from './world.js';

/** The village floor: paths, the cobbled square round the well, the workshop decking and the farm. */
function villageTop(x: number, z: number): BlockId | null {
  if (Math.hypot(x - WELL.at[0], z - WELL.at[2]) < 1.5) return hash(Math.round(x * 2), Math.round(z * 2), 3) < 0.3 ? BLOCKS.mossyCobble : BLOCKS.cobble;
  if (Math.hypot(x - CAMPFIRE.at[0], z - CAMPFIRE.at[2]) < 1.2) return BLOCKS.gravel;
  if (inRect(x, z, WORKSHOP_FLOOR)) return BLOCKS.planks;
  if (inRect(x, z, FARM)) return BLOCKS.farmland;
  if (PATHS.some((path) => segmentDistance(x, z, path) < PATH_WIDTH / 2)) return BLOCKS.path;
  return null;
}

/** Space round every prop and workbench that must stay free of plants. */
const KEEP_CLEAR = 1.9;

function villageClear(x: number, z: number): boolean {
  if (villageTop(x, z) !== null || inRect(x, z, WORKSHOP_YARD) || HOUSES.some((h) => inRect(x, z, houseRect(h), 0.5))) return false;
  return Object.values(village.activities).every(([ax, , az]) => Math.hypot(x - ax, z - az) > KEEP_CLEAR) && !LAMPS.some(([lx, , lz]) => Math.hypot(x - lx, z - lz) < 0.6);
}

/** Ripe wheat in every farm row but the middle one, which carries water down the field. */
function farm(world: World) {
  for (let k = 0; k < world.depth; k += 1) {
    for (let i = 0; i < world.width; i += 1) {
      if (!inRect(columnX(i), columnZ(k), FARM)) continue;
      const middle = Math.abs(columnZ(k) - (FARM.z1 + FARM.z2) / 2) < BLOCK / 2;
      if (middle) put(world, i, 0, k, BLOCKS.water);
      else put(world, i, 1, k, BLOCKS.wheat);
    }
  }
}

/** Planks out over the sea at village level, on log piles that reach down to the sea bed. */
function dock(world: World) {
  for (let k = 0; k < world.depth; k += 1) {
    for (let i = 0; i < world.width; i += 1) {
      const x = columnX(i);
      const z = columnZ(k);
      if (Math.abs(x - DOCK.x) > DOCK.width / 2 || z < DOCK.z1 || z > DOCK.z2) continue;
      put(world, i, 0, k, BLOCKS.planks);
      for (let level = 1; level < 4; level += 1) put(world, i, level, k, BLOCKS.air);
      const edge = Math.abs(x - DOCK.x) > DOCK.width / 2 - BLOCK;
      if (!edge || k % 3 !== 0) continue;
      for (let level = -1; level > world.bottom && [BLOCKS.water, BLOCKS.air, BLOCKS.sand].includes(blockAt(world, i, level, k) as never); level -= 1) {
        put(world, i, level, k, BLOCKS.oakLog);
      }
    }
  }
}

/**
 * A plank house on a cobble footing: log corners, glass windows, a door at the front and a
 * stepped gable roof that runs front to back.
 */
function house(world: World, i0: number, k0: number) {
  const { width: w, depth: d } = HOUSE_SIZE;
  const mid = Math.floor(w / 2);
  for (let dk = 0; dk < d; dk += 1) {
    for (let di = 0; di < w; di += 1) {
      const i = i0 + di;
      const k = k0 + dk;
      put(world, i, 0, k, BLOCKS.cobble);
      const wall = di === 0 || dk === 0 || di === w - 1 || dk === d - 1;
      const corner = (di === 0 || di === w - 1) && (dk === 0 || dk === d - 1);
      for (let level = 1; level <= 3; level += 1) {
        let id: BlockId = BLOCKS.air;
        if (corner) id = BLOCKS.oakLog;
        else if (wall) {
          id = BLOCKS.planks;
          const window = level === 2 && (dk === d - 1 ? Math.abs(di - mid) === 1 : di === mid || dk === Math.floor(d / 2));
          if (window) id = BLOCKS.glass;
          if (dk === d - 1 && di === mid && level < 3) id = level === 1 ? BLOCKS.doorLower : BLOCKS.doorUpper;
        }
        put(world, i, level, k, id);
      }
    }
  }
  // Each step of the roof comes in one block from both sides, and the gable ends fill the triangle under it.
  for (let step = 0; step * 2 <= w + 1; step += 1) {
    const level = 4 + step;
    const left = -1 + step;
    const right = w - step;
    for (let dk = -1; dk <= d; dk += 1) {
      put(world, i0 + left, level, k0 + dk, BLOCKS.sprucePlanks);
      put(world, i0 + right, level, k0 + dk, BLOCKS.sprucePlanks);
    }
    for (let di = left + 1; di < right; di += 1) {
      for (const dk of [0, d - 1]) put(world, i0 + di, level, k0 + dk, BLOCKS.planks);
      for (let dk = 1; dk < d - 1; dk += 1) put(world, i0 + di, level, k0 + dk, BLOCKS.air);
    }
  }
}

/** The village and the wild land round it. */
export const VILLAGE: Site = {
  key: 'village',
  seed: 7,
  flat: FLAT,
  floor: villageTop,
  plantable: villageClear,
  build(world) {
    farm(world);
    dock(world);
    for (const [x, , z] of HOUSES) house(world, ...columnAt(x + BLOCK / 2, z + BLOCK / 2));
  },
};

export function villageWorld(): World {
  return buildWorld(VILLAGE);
}
