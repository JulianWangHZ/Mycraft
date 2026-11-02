import { tileNoise } from '../../textures/relief.js';

/** Large enough that the lattice never visibly repeats inside the world. */
const NEVER = 1 << 20;

/** Smooth noise in 0..1 summed over several octaves, each twice as fine and half as strong. */
export function fbm(x: number, z: number, seed: number, octaves = 4): number {
  let total = 0;
  let weight = 0;
  for (let o = 0, amplitude = 1, frequency = 1; o < octaves; o += 1, amplitude /= 2, frequency *= 2) {
    total += tileNoise(x * frequency, z * frequency, NEVER, seed + o * 101) * amplitude;
    weight += amplitude;
  }
  return total / weight;
}

/** Noise folded at its middle, so it forms sharp crests: mountain ridges rather than round hills. */
export function ridged(x: number, z: number, seed: number, octaves = 4): number {
  let total = 0;
  let weight = 0;
  for (let o = 0, amplitude = 1, frequency = 1; o < octaves; o += 1, amplitude /= 2, frequency *= 2) {
    const crest = 1 - Math.abs(tileNoise(x * frequency, z * frequency, NEVER, seed + o * 131) * 2 - 1);
    total += crest * crest * amplitude;
    weight += amplitude;
  }
  return total / weight;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
