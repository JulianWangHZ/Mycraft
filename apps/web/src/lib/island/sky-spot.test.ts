import { describe, expect, it } from 'vitest';
import { skySpot, skyline } from './sky-spot.js';

describe('skySpot', () => {
  const camera = [0, 5, 0] as const;

  it('measures how far up the hills reach towards a heading', () => {
    expect(skyline(camera, 0, () => 0)).toBeLessThan(0);
    expect(skyline(camera, 0, (_, z) => (z > 10 && z < 12 ? 15 : 0))).toBeGreaterThan(0.6);
  });

  it('hangs the disc just over open sky, ahead of the camera', () => {
    const spot = skySpot(camera, 0, 0.3, 0.4, () => 0);
    expect(spot?.heading).toBeCloseTo(0);
    expect(spot?.rise).toBeCloseTo(0.05);
  });

  it('moves the disc sideways to where the hills are lower', () => {
    // A tall tower straight ahead, open sky either side; the right is clearer than the left.
    const spot = skySpot(camera, 0, 0.3, 0.4, (x, z) => (z > 10 && x < 1 && x > -6 ? 30 : 0));
    expect(spot?.heading).toBeGreaterThan(0);
  });

  it('gives up when hills fill the whole view', () => {
    expect(skySpot(camera, 0, 0.3, 0.4, () => 60)).toBeNull();
  });
});
