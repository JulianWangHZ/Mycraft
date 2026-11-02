import { describe, expect, it } from 'vitest';
import { cameraFloor, GROUND_MARGIN, SIGHT_TUNNEL, sightFade } from './sight-line.js';

describe('cameraFloor', () => {
  it('keeps the camera just above flat ground', () => {
    expect(cameraFloor(0, 0, () => 0)).toBeCloseTo(GROUND_MARGIN);
  });

  it('clears a hill right beside the camera too', () => {
    expect(cameraFloor(0, 0, (x) => (x > 0.5 ? 5 : 0))).toBeCloseTo(5 + GROUND_MARGIN);
  });
});

describe('sightFade', () => {
  const camera = [0, 10, 40] as const;
  const target = [0, 1, 0] as const;

  it('ghosts a hill right on the sight line', () => {
    expect(sightFade([0, 5.5, 20], camera, target)).toBeCloseTo(SIGHT_TUNNEL.ghost);
  });

  it('leaves things well off the line solid', () => {
    expect(sightFade([20, 5.5, 20], camera, target)).toBe(1);
  });

  it('never fades the floor, anything behind the camera, or the target itself', () => {
    expect(sightFade([0, 0.1, 20], camera, target)).toBe(1);
    expect(sightFade([0, 12, 50], camera, target)).toBe(1);
    expect(sightFade([0, 1.2, 1], camera, target)).toBe(1);
  });

  it('fades smoothly at the edge of the tunnel', () => {
    const at = (x: number) => sightFade([x, 5.5, 20], camera, target);
    expect(at(2.5)).toBeGreaterThan(at(1));
    expect(at(2.5)).toBeLessThan(1);
  });

  it('fades ground under the line less than things the same distance over it', () => {
    expect(sightFade([0, 3.5, 20], camera, target)).toBeGreaterThan(sightFade([0, 7.5, 20], camera, target));
  });
});
