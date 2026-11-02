import type { Vec3 } from '../types.js';
import { PATHS } from './layout.js';

export interface Villager {
  /** Robe colour, which reads as their trade. */
  robe: string;
  /** Trim: belt, apron or stole. */
  trim: string;
  /** The path they stroll up and down. */
  path: number;
}

/** Farmer, librarian, smith, cleric and fisher, each with their own beat round the village. */
export const VILLAGERS: readonly Villager[] = [
  { robe: '#8a6a45', trim: '#d9b24a', path: 7 },
  { robe: '#e9e4d6', trim: '#7a4e33', path: 3 },
  { robe: '#5a4636', trim: '#2b2522', path: 4 },
  { robe: '#7a4a8a', trim: '#e9c34a', path: 6 },
  { robe: '#3d6a8a', trim: '#e9e4d6', path: 2 },
];

const SPEED = 0.6;
/** Pause at each end of the beat. */
const PAUSE = 3;
/** Only the middle of a path is walked, so nobody stands in the well or the campfire. */
const FROM = 0.2;
const TO = 0.8;

export interface VillagerPose {
  position: Vec3;
  facing: number;
  walking: boolean;
}

/** Where a villager is at a moment: walking one way, pausing, walking back, pausing again. */
export function villagerAt(index: number, seconds: number): VillagerPose {
  const villager = VILLAGERS[index % VILLAGERS.length] as Villager;
  const [a, b] = PATHS[villager.path % PATHS.length] as readonly [Vec3, Vec3];
  const at = (t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, 0, a[2] + (b[2] - a[2]) * t];
  const walk = (Math.hypot(b[0] - a[0], b[2] - a[2]) * (TO - FROM)) / SPEED;
  const cycle = (walk + PAUSE) * 2;
  const phase = (((seconds + index * 4.3) % cycle) + cycle) % cycle;
  const out = Math.atan2(b[0] - a[0], b[2] - a[2]);
  if (phase < walk) return { position: at(FROM + (TO - FROM) * (phase / walk)), facing: out, walking: true };
  if (phase < walk + PAUSE) return { position: at(TO), facing: out, walking: false };
  if (phase < walk * 2 + PAUSE) return { position: at(TO - (TO - FROM) * ((phase - walk - PAUSE) / walk)), facing: out + Math.PI, walking: true };
  return { position: at(FROM), facing: out + Math.PI, walking: false };
}
