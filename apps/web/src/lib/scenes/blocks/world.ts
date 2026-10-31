import { hash } from '../../textures/relief.js';
import { BIOMES, biomeWeights, dominant, groundHeight, VILLAGE_BIOMES, type Biome, type BiomeLayout } from './biomes.js';
import { BLOCKS, type BlockId } from './blocks.js';
import { BLOCK, rectDistance, SEA_LEVEL, WORLD, type Rect } from './layout.js';
import { fbm } from './noise.js';

/**
 * A block world: a box of block ids, one byte each. Level `l` is the block whose top face is at
 * height `l * BLOCK`, so a scene's flat ground, level 0, is flush with the scene floor.
 */
export interface World {
  width: number;
  depth: number;
  bottom: number;
  top: number;
  blocks: Uint8Array;
  /** Top solid level of each column, row by row along x. */
  surface: Int16Array;
  biome: Biome[];
  /** Grass and leaf colour of each column, as three 0..1 multipliers, blended across biome borders. */
  tint: Float32Array;
}

/** Grass colour by biome: lush on the plains, cool in the taiga, dry and yellow near the desert. */
const TINTS: Readonly<Record<Biome, readonly [number, number, number]>> = {
  plains: [1, 1, 1],
  forest: [0.86, 0.97, 0.82],
  taiga: [0.7, 0.86, 0.8],
  mountains: [0.78, 0.9, 0.85],
  desert: [1, 0.95, 0.66],
  mesa: [1, 0.9, 0.62],
  ocean: [0.88, 1, 0.92],
};

export function columnX(i: number): number {
  return (i - WORLD.width / 2 + 0.5) * BLOCK;
}

export function columnZ(k: number): number {
  return (k - WORLD.depth / 2 + 0.5) * BLOCK;
}

/** The column under a point in scene units, as [i, k]. */
export function columnAt(x: number, z: number): [number, number] {
  return [Math.floor(x / BLOCK + WORLD.width / 2), Math.floor(z / BLOCK + WORLD.depth / 2)];
}

function indexOf(world: World, i: number, level: number, k: number): number {
  return ((level - world.bottom) * world.depth + k) * world.width + i;
}

/**
 * Height of the highest thing in the column under a point, trees included, in scene units.
 * Points off the world read as sea level.
 */
export function topAt(world: World, x: number, z: number): number {
  const [i, k] = columnAt(x, z);
  if (i < 0 || k < 0 || i >= world.width || k >= world.depth) return SEA_LEVEL * BLOCK;
  for (let level = world.top - 1; level > world.bottom; level -= 1) {
    if (blockAt(world, i, level, k) !== BLOCKS.air) return level * BLOCK;
  }
  return world.bottom * BLOCK;
}

/** Height of the ground under a point, in scene units: where an animal's feet go. */
export function groundAt(world: World, x: number, z: number): number {
  const [i, k] = columnAt(x, z);
  if (i < 0 || k < 0 || i >= world.width || k >= world.depth) return 0;
  return (world.surface[k * world.width + i] as number) * BLOCK;
}

export function blockAt(world: World, i: number, level: number, k: number): number {
  if (i < 0 || k < 0 || i >= world.width || k >= world.depth || level < world.bottom || level >= world.top) return BLOCKS.air;
  return world.blocks[indexOf(world, i, level, k)] as number;
}

export function put(world: World, i: number, level: number, k: number, id: BlockId) {
  if (i < 0 || k < 0 || i >= world.width || k >= world.depth || level < world.bottom || level >= world.top) return;
  world.blocks[indexOf(world, i, level, k)] = id;
}

/** Layered colours of mesa cliffs, by height. */
const MESA_BANDS: readonly BlockId[] = [
  BLOCKS.clayOrange,
  BLOCKS.clayOrange,
  BLOCKS.clayCream,
  BLOCKS.clayRed,
  BLOCKS.clayOrange,
  BLOCKS.clayBrown,
  BLOCKS.clayCream,
  BLOCKS.clayRed,
];

const SNOW_LINE = 17;

/** What a column is built from: its top block, the few under it, and what is deep below. */
function layers(biome: Biome, height: number, x: number, z: number, seed: number, flat: boolean): { top: BlockId; under: BlockId; depth: number } {
  // Flat ground is lawn right down to the shore; sand starts where the ground falls away.
  const beach = !flat && height <= SEA_LEVEL + 1 && height >= SEA_LEVEL - 3;
  if (biome === 'desert') return { top: BLOCKS.sand, under: BLOCKS.sandstone, depth: 4 };
  if (biome === 'mesa') return { top: BLOCKS.clayOrange, under: BLOCKS.clayOrange, depth: 0 };
  if (height < SEA_LEVEL - 3) return { top: fbm(x / 4, z / 4, seed + 11, 2) > 0.55 ? BLOCKS.gravel : BLOCKS.sand, under: BLOCKS.sand, depth: 2 };
  if (beach) return { top: BLOCKS.sand, under: BLOCKS.sand, depth: 3 };
  const snowLine = SNOW_LINE + (fbm(x / 6, z / 6, seed + 13, 2) - 0.5) * 6;
  if ((biome === 'mountains' || biome === 'taiga') && height >= snowLine) return { top: BLOCKS.snow, under: BLOCKS.stone, depth: 1 };
  if (biome === 'mountains' && height > 9) return { top: BLOCKS.stone, under: BLOCKS.stone, depth: 0 };
  return { top: BLOCKS.grass, under: BLOCKS.dirt, depth: 3 };
}

/** Deep rock: mostly stone, with veins of andesite and the odd ore, richer the deeper it goes. */
function rock(i: number, level: number, k: number, seed: number): BlockId {
  const roll = hash(i * 31 + level, k * 17 - level, seed + 43);
  if (roll < 0.022) return BLOCKS.coalOre;
  if (roll < 0.032) return BLOCKS.ironOre;
  if (roll < 0.036 && level < 6) return BLOCKS.goldOre;
  return fbm(i / 7 + level * 0.31, k / 7 - level * 0.17, seed + 41, 2) > 0.66 ? BLOCKS.andesite : BLOCKS.stone;
}

function blendTint(world: World, column: number, weights: Record<Biome, number> | null) {
  for (let c = 0; c < 3; c += 1) {
    world.tint[column * 3 + c] = weights ? BIOMES.reduce((sum, b) => sum + weights[b] * (TINTS[b][c] as number), 0) : (TINTS.plains[c] as number);
  }
}

/** Trees a scene grows, by biome; null leaves the biome bare. */
export type TreeKind = 'oak' | 'spruce' | 'palm' | 'cactus';

/**
 * Everything that makes one scene's world its own: where its flat ground is, which biomes lie
 * round it, what its floor is paved with and what it builds on top.
 */
export interface Site {
  /** Cache key; one world is built per site. */
  key: string;
  seed: number;
  /** Ground kept flat at level 0, in scene units. */
  flat: readonly Rect[];
  biomes?: BiomeLayout;
  /** Top block for a column of flat ground, or null to keep the biome's own. */
  floor?(x: number, z: number): BlockId | null;
  /** Whether the odd tuft of grass may grow on flat ground here. */
  plantable?(x: number, z: number): boolean;
  /** Overrides which tree grows in a biome. */
  trees?: Partial<Record<Biome, TreeKind | null>>;
  /** Biomes that grow no small plants here, such as a swept beach. */
  bare?: readonly Biome[];
  /** Structures built after the ground and trees: buildings, pools, docks. */
  build?(world: World): void;
}

function fillColumns(world: World, site: Site) {
  const { seed } = site;
  const layout = site.biomes ?? VILLAGE_BIOMES;
  for (let k = 0; k < world.depth; k += 1) {
    for (let i = 0; i < world.width; i += 1) {
      const x = columnX(i);
      const z = columnZ(k);
      const away = rectDistance(site.flat, x, z);
      const flat = away === 0;
      const weights = flat ? null : biomeWeights(x, z, seed, layout);
      const biome = weights ? dominant(weights) : 'plains';
      blendTint(world, k * world.width + i, weights);
      const height = Math.min(world.top - 12, Math.max(world.bottom + 2, groundHeight(x, z, seed, away, layout)));
      const { top, under, depth } = layers(biome, height, x, z, seed, flat);
      world.surface[k * world.width + i] = height;
      world.biome[k * world.width + i] = biome;
      for (let level = world.bottom; level <= height; level += 1) {
        const below = height - level;
        let id: BlockId = below === 0 ? top : below <= depth ? under : BLOCKS.stone;
        // Only rock near the surface can ever show, so only that is worth dressing.
        if (id === BLOCKS.stone && below < 8) id = rock(i, level, k, seed);
        if (biome === 'mesa') id = MESA_BANDS[(((level + 64) % MESA_BANDS.length) + MESA_BANDS.length) % MESA_BANDS.length] as BlockId;
        if (flat && below === 0) id = site.floor?.(x, z) ?? id;
        put(world, i, level, k, id);
      }
      for (let level = height + 1; level <= SEA_LEVEL; level += 1) put(world, i, level, k, BLOCKS.water);
    }
  }
}

function oak(world: World, i: number, base: number, k: number, tall: number) {
  for (let y = 0; y < tall; y += 1) put(world, i, base + y, k, BLOCKS.oakLog);
  const crown = base + tall - 2;
  for (let dy = 0; dy <= 3; dy += 1) {
    const radius = dy < 2 ? 2 : 1;
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        // Clip the corners so the crown reads round.
        if (Math.abs(dx) === radius && Math.abs(dz) === radius && (radius === 1 || dy === 1)) continue;
        if (blockAt(world, i + dx, crown + dy, k + dz) === BLOCKS.air) put(world, i + dx, crown + dy, k + dz, BLOCKS.oakLeaves);
      }
    }
  }
}

function spruce(world: World, i: number, base: number, k: number, tall: number) {
  for (let y = 0; y < tall; y += 1) put(world, i, base + y, k, BLOCKS.spruceLog);
  // Rings of needles that narrow towards the tip.
  for (let y = 2; y <= tall; y += 1) {
    const radius = y === tall ? 0 : (tall - y) % 2 === 0 ? 1 : 2;
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        if (radius === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        if (blockAt(world, i + dx, base + y, k + dz) === BLOCKS.air) put(world, i + dx, base + y, k + dz, BLOCKS.spruceLeaves);
      }
    }
  }
}

/** Chance per tree slot, and per plain column for small plants, by biome. */
const GROWTH: Readonly<Record<Biome, { tree: number; plants: ReadonlyArray<readonly [BlockId, number]> }>> = {
  plains: { tree: 0.12, plants: [[BLOCKS.tallGrass, 0.22], [BLOCKS.poppy, 0.03], [BLOCKS.dandelion, 0.04]] },
  forest: { tree: 0.75, plants: [[BLOCKS.tallGrass, 0.14], [BLOCKS.poppy, 0.02], [BLOCKS.dandelion, 0.02]] },
  taiga: { tree: 0.7, plants: [[BLOCKS.tallGrass, 0.06]] },
  mountains: { tree: 0.25, plants: [[BLOCKS.tallGrass, 0.04]] },
  desert: { tree: 0.22, plants: [[BLOCKS.deadBush, 0.015]] },
  mesa: { tree: 0, plants: [[BLOCKS.deadBush, 0.01]] },
  ocean: { tree: 0, plants: [] },
};

const TREES: Readonly<Record<Biome, TreeKind | null>> = {
  plains: 'oak',
  forest: 'oak',
  taiga: 'spruce',
  mountains: 'spruce',
  desert: 'cactus',
  mesa: null,
  ocean: null,
};

/** Trees grow at most one per slot of this many blocks square, so crowns never merge into a wall. */
const SLOT = 5;
const EDGE = 3;

/**
 * A palm: a trunk, leaning a block to one side halfway up if `lean` is set, topped with a square
 * of fronds and four long fronds reaching out from it, their tips hanging down. Every block
 * touches the next face to face, so no frond ever floats beside the trunk.
 */
export function palm(world: World, i: number, base: number, k: number, tall: number, lean = 0) {
  let ti = i;
  for (let y = 0; y < tall; y += 1) {
    if (lean && y === Math.floor(tall / 2)) {
      // Step over, with the trunk doubled up at the step so it stays joined.
      ti += lean;
      put(world, ti, base + y - 1, k, BLOCKS.palmLog);
    }
    put(world, ti, base + y, k, BLOCKS.palmLog);
  }
  const top = base + tall;
  const leaf = (di: number, level: number, dk: number) => {
    if (blockAt(world, ti + di, level, k + dk) === BLOCKS.air) put(world, ti + di, level, k + dk, BLOCKS.palmLeaves);
  };
  for (let dk = -1; dk <= 1; dk += 1) for (let di = -1; di <= 1; di += 1) leaf(di, top, dk);
  for (const [di, dk] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    for (let step = 2; step <= 3; step += 1) leaf(di * step, top, dk * step);
    leaf(di * 3, top - 1, dk * 3);
  }
}

function grow(world: World, site: Site) {
  const { seed } = site;
  for (let k = EDGE; k < world.depth - EDGE; k += 1) {
    for (let i = EDGE; i < world.width - EDGE; i += 1) {
      const column = k * world.width + i;
      const height = world.surface[column] as number;
      const biome = world.biome[column] as Biome;
      const top = blockAt(world, i, height, k);
      const x = columnX(i);
      const z = columnZ(k);
      if (height <= SEA_LEVEL) continue;
      if (rectDistance(site.flat, x, z) < 1.5) {
        // Only the odd tuft on open lawn, where the scene allows it.
        if (top === BLOCKS.grass && site.plantable?.(x, z) && hash(i, k, seed + 31) < 0.06) put(world, i, height + 1, k, hash(i, k, seed + 37) < 0.7 ? BLOCKS.tallGrass : BLOCKS.dandelion);
        continue;
      }
      const slotI = Math.floor(i / SLOT);
      const slotK = Math.floor(k / SLOT);
      const pick = Math.floor(hash(slotI, slotK, seed + 17) * SLOT * SLOT);
      const inSlot = i % SLOT === pick % SLOT && k % SLOT === Math.floor(pick / SLOT);
      const growth = GROWTH[biome];
      if (inSlot && hash(slotI, slotK, seed + 19) < growth.tree) {
        const tall = 4 + Math.floor(hash(i, k, seed + 23) * 3);
        const kind = biome in (site.trees ?? {}) ? site.trees?.[biome] : TREES[biome];
        if (kind === 'cactus' && top === BLOCKS.sand) for (let y = 1; y <= tall - 2; y += 1) put(world, i, height + y, k, BLOCKS.cactus);
        else if (kind === 'palm' && (top === BLOCKS.grass || top === BLOCKS.sand)) palm(world, i, height + 1, k, tall + 2, (i + k) % 2 ? 1 : -1);
        else if (kind === 'spruce' && top === BLOCKS.grass) spruce(world, i, height + 1, k, tall + 2);
        else if (kind === 'oak' && top === BLOCKS.grass) oak(world, i, height + 1, k, tall);
        continue;
      }
      let roll = hash(i, k, seed + 29);
      for (const [plant, chance] of site.bare?.includes(biome) ? [] : growth.plants) {
        const fits = plant === BLOCKS.deadBush ? top === BLOCKS.sand || top === BLOCKS.clayOrange : top === BLOCKS.grass;
        if (roll < chance && fits && blockAt(world, i, height + 1, k) === BLOCKS.air) {
          put(world, i, height + 1, k, plant);
          break;
        }
        roll -= chance;
      }
    }
  }
}

const cache = new Map<string, World>();

/** The whole world for a site. Built once and shared: generating it takes a moment. */
export function buildWorld(site: Site): World {
  const hit = cache.get(site.key);
  if (hit) return hit;
  const columns = WORLD.width * WORLD.depth;
  const world: World = {
    width: WORLD.width,
    depth: WORLD.depth,
    bottom: WORLD.bottom,
    top: WORLD.top,
    blocks: new Uint8Array(columns * (WORLD.top - WORLD.bottom)),
    surface: new Int16Array(columns),
    biome: new Array<Biome>(columns),
    tint: new Float32Array(columns * 3),
  };
  fillColumns(world, site);
  grow(world, site);
  site.build?.(world);
  cache.set(site.key, world);
  return world;
}

/** Every column whose centre lies inside a rectangle, as [i, k]. */
export function columnsIn(r: Rect): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const [i1, k1] = columnAt(r.x1, r.z1);
  const [i2, k2] = columnAt(r.x2, r.z2);
  for (let k = k1; k <= k2; k += 1) {
    for (let i = i1; i <= i2; i += 1) {
      const x = columnX(i);
      const z = columnZ(k);
      if (x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2) out.push([i, k]);
    }
  }
  return out;
}
