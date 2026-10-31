import { fbm, ridged, smoothstep } from './noise.js';

export const BIOMES = ['mountains', 'mesa', 'desert', 'ocean', 'plains', 'forest', 'taiga'] as const;
export type Biome = (typeof BIOMES)[number];

/**
 * Where each biome lies round a scene: its direction as a compass angle (0 is straight back, a
 * quarter turn is to the right) and how wide it spreads, in radians. Neighbours blend across the
 * overlap. A biome with no spread does not appear.
 */
export type BiomeLayout = Readonly<Record<Biome, { bearing: number; spread: number }>>;

/**
 * Round the village. The camera looks in from the front right, so the tall biomes sit behind the
 * village and the low ones in front, where they cannot hide it. The sea gets the whole front.
 */
export const VILLAGE_BIOMES: BiomeLayout = {
  mountains: { bearing: 0, spread: 0.55 },
  mesa: { bearing: 0.95, spread: 0.45 },
  desert: { bearing: 2.05, spread: 0.45 },
  ocean: { bearing: Math.PI, spread: 1.0 },
  plains: { bearing: -2.3, spread: 0.45 },
  forest: { bearing: -1.65, spread: 0.5 },
  taiga: { bearing: -0.8, spread: 0.5 },
};
/** How far the ground takes to climb from the flat village up to the wild heights. */
const RAMP = 6;

function turn(a: number, b: number): number {
  const d = Math.abs(a - b) % (Math.PI * 2);
  return d > Math.PI ? Math.PI * 2 - d : d;
}

/** Biome blend at a point: weights that sum to 1, wobbled by noise so borders wander. */
export function biomeWeights(x: number, z: number, seed: number, layout: BiomeLayout = VILLAGE_BIOMES): Record<Biome, number> {
  const bearing = Math.atan2(x, -z) + (fbm(x / 22, z / 22, seed + 7, 2) - 0.5) * 1.4;
  const raw = BIOMES.map((b) => (layout[b].spread > 0 ? Math.exp(-((turn(bearing, layout[b].bearing) / layout[b].spread) ** 2)) : 0));
  const total = raw.reduce((sum, w) => sum + w, 0);
  return Object.fromEntries(BIOMES.map((b, i) => [b, (raw[i] as number) / total])) as Record<Biome, number>;
}

export function dominant(weights: Record<Biome, number>): Biome {
  return BIOMES.reduce((best, b) => (weights[b] > weights[best] ? b : best), BIOMES[0] as Biome);
}

/** Cliffs between level steps, as on a mesa: mostly flat shelves joined by short steep rises. */
function terrace(height: number, step: number): number {
  const t = height / step;
  const floor = Math.floor(t);
  return (floor + smoothstep(0.7, 1, t - floor)) * step;
}

/** Ground height in blocks for one biome on its own, before blending. */
export function biomeHeight(biome: Biome, x: number, z: number, seed: number): number {
  const rolling = fbm(x / 14, z / 14, seed);
  // The far wilds rise higher than the ground near the village.
  const reach = smoothstep(8, 26, Math.hypot(x, z));
  switch (biome) {
    case 'mountains':
      return 5 + 46 * ridged(x / 16, z / 16, seed + 3) ** 1.2 * (0.25 + reach * 0.75);
    case 'mesa':
      return terrace(4 + 22 * fbm(x / 12, z / 12, seed + 5) * (0.4 + reach * 0.6), 4);
    case 'desert': {
      const dune = Math.sin(x * 0.45 + z * 0.2 + rolling * 4) * 0.5 + 0.5;
      return 1 + 2 * rolling + 2.5 * dune;
    }
    case 'ocean':
      return -8 + 4 * rolling;
    case 'plains':
      return 1 + 3 * rolling;
    case 'forest':
      return 2 + 7 * rolling;
    case 'taiga':
      return 3 + 14 * rolling * (0.5 + reach * 0.5);
  }
}

/**
 * Ground height in blocks at a point, `away` from the scene's flat ground: 0 on the flats, then
 * the blended biomes beyond.
 */
export function groundHeight(x: number, z: number, seed: number, away: number, layout: BiomeLayout = VILLAGE_BIOMES): number {
  const weights = biomeWeights(x, z, seed, layout);
  const wild = BIOMES.reduce((sum, b) => sum + (weights[b] > 0.01 ? weights[b] * biomeHeight(b, x, z, seed) : 0), 0);
  // `|| 0` turns the -0 a sunken biome rounds to on the flats into a plain 0.
  return Math.round(wild * smoothstep(0, RAMP, away)) || 0;
}
