import type { Vec3 } from '../types.js';

/** Edge of one block in scene units. Characters are about two blocks tall. */
export const BLOCK = 0.5;

/**
 * World size in blocks. The village sits in the middle; the wilds rise and fall around it, far
 * enough out that the camera always stays over land and the edge is lost in the fog.
 */
export const WORLD = { width: 192, depth: 192, bottom: -12, top: 52 } as const;

/** Blocks at or below this height that are not land fill with water. */
export const SEA_LEVEL = -1;

export interface Rect {
  x1: number;
  x2: number;
  z1: number;
  z2: number;
}

/** Workbenches stand in rows across the workshop yard, facing the front. */
export const WORKSHOP = { x: -12.6, z: 2.2, columns: 8, spacing: 1.4, rowSpacing: 1.6 } as const;

/** Ground that is kept flat at height 0: the village, and the workshop yard behind it on the left. */
export const FLAT: readonly Rect[] = [
  { x1: -14.5, x2: 13.5, z1: -7.5, z2: 9 },
  { x1: -14.5, x2: -1, z1: -12, z2: 4 },
];

/** Planked floor under the first rows of workbenches. */
export const WORKSHOP_FLOOR: Rect = { x1: -13.5, x2: -1.9, z1: -5.6, z2: 3.2 };
/** Everywhere a workbench can stand, however many agents there are. */
export const WORKSHOP_YARD: Rect = { x1: -14, x2: -1.5, z1: -12, z2: 3.4 };

export const WELL = { at: [2.6, 0, -0.6] as Vec3, benchRadius: 2.0, benches: 6 } as const;
export const CAMPFIRE = { at: [0.4, 0, 4.6] as Vec3 } as const;
export const FARM: Rect = { x1: -9.5, x2: -3, z1: 5.4, z2: 8.4 };
export const DOCK = { x: -0.4, z1: 8.6, z2: 13.4, width: 1.5 } as const;
export const HUT = { at: [10.6, 0, -5.2] as Vec3, beds: 3 } as const;

/** Houses built from blocks, by the corner nearest -x and -z. Doors face the front, +z. */
export const HOUSE_SIZE = { width: 5, depth: 5 } as const;
export const HOUSES: readonly Vec3[] = [
  [10.6, 0, 4.4],
  [0, 0, -7.4],
];

/** Ground a house and its eaves cover, in scene units. */
export function houseRect([x, , z]: Vec3): Rect {
  return { x1: x - BLOCK, x2: x + (HOUSE_SIZE.width + 1) * BLOCK, z1: z - BLOCK, z2: z + (HOUSE_SIZE.depth + 1) * BLOCK };
}

/** Packed-dirt paths from the well out to everything in the village. */
export const PATHS: ReadonlyArray<readonly [Vec3, Vec3]> = [
  [WELL.at, [-2.2, 0, 0.4]],
  [WELL.at, CAMPFIRE.at],
  [CAMPFIRE.at, [DOCK.x, 0, DOCK.z1]],
  [WELL.at, [5.6, 0, -4]],
  [WELL.at, [8, 0, 2.8]],
  [WELL.at, [9, 0, -1.6]],
  [[9, 0, -1.6], HUT.at],
  [CAMPFIRE.at, [4.8, 0, 6.4]],
  [CAMPFIRE.at, [-3, 0, 6.8]],
];
export const PATH_WIDTH = 1.1;

/** Lamp posts along the paths. */
export const LAMPS: readonly Vec3[] = [
  [-1.6, 0, 3.4],
  [6.4, 0, 0.9],
  [3.4, 0, -3.4],
  [0.6, 0, 8.4],
  [10.2, 0, -3.4],
];

/** Where the n-th working agent stands, behind its workbench. Rows run back from the front. */
export function workSpot(index: number): Vec3 {
  const column = index % WORKSHOP.columns;
  const row = Math.floor(index / WORKSHOP.columns);
  return [WORKSHOP.x + column * WORKSHOP.spacing, 0, WORKSHOP.z - row * WORKSHOP.rowSpacing];
}

/** Bench seat round the well, facing it. */
export function benchSpot(seat: number): { position: Vec3; facing: number } {
  const angle = (seat / WELL.benches) * Math.PI * 2 + Math.PI / 6;
  const x = Math.sin(angle) * WELL.benchRadius;
  const z = Math.cos(angle) * WELL.benchRadius;
  return { position: [x, 0, z], facing: Math.atan2(-x, -z) };
}

export function inRect(x: number, z: number, r: Rect, margin = 0): boolean {
  return x >= r.x1 - margin && x <= r.x2 + margin && z >= r.z1 - margin && z <= r.z2 + margin;
}

/** Distance from a point to the nearest of some rectangles; 0 inside one. */
export function rectDistance(rects: readonly Rect[], x: number, z: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (const r of rects) {
    const dx = Math.max(r.x1 - x, 0, x - r.x2);
    const dz = Math.max(r.z1 - z, 0, z - r.z2);
    best = Math.min(best, Math.hypot(dx, dz));
  }
  return best;
}

/** Distance from a point to the village's flat ground; 0 inside it. */
export function flatDistance(x: number, z: number): number {
  return rectDistance(FLAT, x, z);
}

/** Distance from a point to a path segment on the ground. */
export function segmentDistance(x: number, z: number, [a, b]: readonly [Vec3, Vec3]): number {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const length = dx * dx + dz * dz;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[2]) * dz) / length));
  return Math.hypot(x - (a[0] + dx * t), z - (a[2] + dz * t));
}
