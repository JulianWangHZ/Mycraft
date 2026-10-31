import { hash } from '../../textures/relief.js';
import type { Vec3 } from '../types.js';
import { BLOCKS } from './blocks.js';
import { BLOCK, flatDistance } from './layout.js';
import { blockAt, columnAt, columnX, columnZ, type World } from './world.js';

import type { Biome } from './biomes.js';

export const ANIMAL_KINDS = ['sheep', 'cow', 'pig', 'chicken', 'wolf', 'rabbit', 'turtle'] as const;
export type AnimalKind = (typeof ANIMAL_KINDS)[number];

export interface Herd {
  kind: AnimalKind;
  count: number;
  /** Biomes it lives in, and the ground it will stand on. */
  biomes: readonly Biome[];
  ground: readonly number[];
  /** How far out from the village it lives. */
  near: number;
  far: number;
}

/** Farm animals graze just outside the village; wolves keep to the woods; rabbits to open ground. */
export const VILLAGE_HERDS: readonly Herd[] = [
  { kind: 'sheep', count: 5, biomes: ['plains', 'forest', 'mountains', 'ocean'], ground: [BLOCKS.grass], near: 1.5, far: 9 },
  { kind: 'cow', count: 4, biomes: ['plains', 'forest', 'mountains', 'ocean'], ground: [BLOCKS.grass], near: 1.5, far: 9 },
  { kind: 'pig', count: 3, biomes: ['plains', 'forest', 'ocean'], ground: [BLOCKS.grass], near: 1.5, far: 9 },
  { kind: 'chicken', count: 4, biomes: ['plains', 'forest', 'ocean'], ground: [BLOCKS.grass], near: 1, far: 7 },
  { kind: 'wolf', count: 4, biomes: ['taiga', 'forest'], ground: [BLOCKS.grass, BLOCKS.snow], near: 3, far: 16 },
  { kind: 'rabbit', count: 4, biomes: ['desert', 'plains'], ground: [BLOCKS.sand, BLOCKS.grass], near: 1.5, far: 12 },
];

export interface Animal {
  kind: AnimalKind;
  home: Vec3;
}

/** How far an animal strays from home while it grazes. */
export const ROAM = 1.6;
const SEARCH = 30;

/** Open, level ground of the right kind, with nothing standing on it. */
function grazing(world: World, i: number, k: number, ground: readonly number[]): boolean {
  const level = world.surface[k * world.width + i] as number;
  if (level < 0 || level > 12 || !ground.includes(blockAt(world, i, level, k)) || blockAt(world, i, level + 1, k) !== BLOCKS.air) return false;
  // Level ground all round, so the animal is not stood on a cliff edge.
  for (const [di, dk] of [[2, 0], [-2, 0], [0, 2], [0, -2]] as const) {
    if (Math.abs((world.surface[(k + dk) * world.width + i + di] as number) - level) > 1) return false;
  }
  return true;
}

/** Every herd round the village, the same for every load of the same world. */
export function placeAnimals(world: World, herds: readonly Herd[] = VILLAGE_HERDS, seed = 7): Animal[] {
  const found: Animal[] = [];
  herds.forEach((herd, h) => {
    let placed = 0;
    for (let attempt = 0; attempt < 6000 && placed < herd.count; attempt += 1) {
      const [i, k] = columnAt((hash(attempt, h * 2 + 1, seed + 51) * 2 - 1) * SEARCH, (hash(attempt, h * 2 + 2, seed + 51) * 2 - 1) * SEARCH);
      const x = columnX(i);
      const z = columnZ(k);
      const away = flatDistance(x, z);
      const biome = world.biome[k * world.width + i] as Biome;
      if (away < herd.near || away > herd.far || !herd.biomes.includes(biome) || !grazing(world, i, k, herd.ground)) continue;
      if (found.some(({ home }) => Math.hypot(home[0] - x, home[2] - z) < ROAM * 1.5)) continue;
      found.push({ kind: herd.kind, home: [x, (world.surface[k * world.width + i] as number) * BLOCK, z] });
      placed += 1;
    }
  });
  return found;
}

/** Turtles amble along the beach; rabbits hop among the dunes behind the hotel. */
export const RESORT_HERDS: readonly Herd[] = [
  { kind: 'turtle', count: 6, biomes: ['ocean', 'desert'], ground: [BLOCKS.sand], near: 0.3, far: 12 },
  { kind: 'rabbit', count: 3, biomes: ['desert'], ground: [BLOCKS.sand], near: 2, far: 14 },
];

/**
 * Where an animal is heading at a moment: it picks a fresh spot near home every few seconds,
 * and pauses there to graze before moving on.
 */
export function grazeTarget(animal: Animal, index: number, seconds: number): Vec3 {
  const period = 6 + (index % 4);
  const turn = Math.floor((seconds + index * 1.7) / period);
  const angle = hash(index, turn, 61) * Math.PI * 2;
  const reach = hash(index, turn, 62) * ROAM;
  const [hx, hy, hz] = animal.home;
  return [hx + Math.cos(angle) * reach, hy, hz + Math.sin(angle) * reach];
}
