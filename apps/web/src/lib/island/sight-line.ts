/** How far above the terrain the camera must stay. */
export const GROUND_MARGIN = 0.8;
/** The camera's own footprint: it must clear the ground this far round it, not just straight below. */
const REACH = 1;

/** The lowest the camera may sit at a spot: just above the highest ground under and round it. */
export function cameraFloor(x: number, z: number, terrainAt: (x: number, z: number) => number): number {
  let highest = terrainAt(x, z);
  for (const [dx, dz] of [[REACH, 0], [-REACH, 0], [0, REACH], [0, -REACH]] as const) highest = Math.max(highest, terrainAt(x + dx, z + dz));
  return highest + GROUND_MARGIN;
}

/**
 * Whatever stands between the camera and what it looks at fades out, through a tunnel round the
 * sight line: narrow at the camera, wider out towards the target.
 */
export const SIGHT_TUNNEL = {
  /** Tunnel radius at the camera and at the target, in scene units. */
  near: 1.2,
  far: 5,
  /** The tunnel stops short of the target, so the ground round it stays solid. */
  until: 0.9,
  /** Only things above the village floor fade; the floor itself never does. */
  above: 0.3,
  /** What is left of a faded block, so the hill still reads as a ghost of itself. */
  ghost: 0.35,
  /** Ground below the sight line counts as this much further away, so the floor under the camera stays put. */
  below: 2,
} as const;

type V3 = readonly [number, number, number];

/** How solid a point should be drawn, 0..1: the same sum the terrain shader does per pixel. */
export function sightFade(point: V3, camera: V3, target: V3): number {
  const seg = [target[0] - camera[0], target[1] - camera[1], target[2] - camera[2]] as const;
  const length2 = seg[0] * seg[0] + seg[1] * seg[1] + seg[2] * seg[2];
  const rel = [point[0] - camera[0], point[1] - camera[1], point[2] - camera[2]] as const;
  const t = (rel[0] * seg[0] + rel[1] * seg[1] + rel[2] * seg[2]) / length2;
  if (t <= 0 || t >= SIGHT_TUNNEL.until || point[1] <= SIGHT_TUNNEL.above) return 1;
  const off = [rel[0] - seg[0] * t, rel[1] - seg[1] * t, rel[2] - seg[2] * t] as const;
  const d = Math.hypot(...off) * (off[1] < 0 ? SIGHT_TUNNEL.below : 1);
  const radius = SIGHT_TUNNEL.near + (SIGHT_TUNNEL.far - SIGHT_TUNNEL.near) * t;
  const edge = Math.min(1, Math.max(0, (d - radius * 0.65) / (radius * 0.35)));
  const smooth = edge * edge * (3 - 2 * edge);
  return SIGHT_TUNNEL.ghost + (1 - SIGHT_TUNNEL.ghost) * smooth;
}
