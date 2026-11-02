type Terrain = (x: number, z: number) => number;

const HEADINGS = 9;
const SAMPLES = 32;
const REACH = 70;
/** Clearance between the disc's centre and the hills under it, in radians. */
const CLEAR = 0.06;
/** The disc and its glow must sit wholly inside the view, this far below the top edge. */
const TOP_MARGIN = 0.1;

/** How high hills rise towards one heading, as the steepest angle up from the camera. */
export function skyline([cx, cy, cz]: readonly [number, number, number], heading: number, terrainAt: Terrain): number {
  let steepest = -Math.PI / 2;
  for (let s = 1; s <= SAMPLES; s += 1) {
    const d = (s / SAMPLES) * REACH;
    steepest = Math.max(steepest, Math.atan2(terrainAt(cx + Math.sin(heading) * d, cz + Math.cos(heading) * d) - cy, d));
  }
  return steepest;
}

/**
 * Where to hang the sun or moon so it shows: the heading in view with the lowest hills, just
 * above them, but never past the top of the view. Null when no sky shows anywhere in view.
 */
export function skySpot(
  camera: readonly [number, number, number],
  heading: number,
  halfWidth: number,
  top: number,
  terrainAt: Terrain,
): { heading: number; rise: number } | null {
  let best: { heading: number; rise: number } | null = null;
  for (let h = 0; h < HEADINGS; h += 1) {
    // Search out from the middle, so ties go to the heading nearest straight ahead.
    const step = Math.ceil(h / 2) * (h % 2 ? 1 : -1);
    const at = heading + (step / ((HEADINGS - 1) / 2)) * halfWidth * 0.8;
    const rise = Math.max(0.05, skyline(camera, at, terrainAt) + CLEAR);
    if (rise < top - TOP_MARGIN && (!best || rise < best.rise - 0.02)) best = { heading: at, rise };
  }
  return best;
}
