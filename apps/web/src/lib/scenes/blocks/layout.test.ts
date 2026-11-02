import { describe, expect, it } from 'vitest';
import { benchSpot, flatDistance, inRect, segmentDistance, WELL, workSpot } from './layout.js';

describe('village layout', () => {
  it('gives every workbench its own spot, in rows running back', () => {
    const spots = Array.from({ length: 40 }, (_, i) => workSpot(i).join());
    expect(new Set(spots).size).toBe(40);
    expect(workSpot(8)[2]).toBeLessThan(workSpot(0)[2]);
  });

  it('turns every bench seat towards the well', () => {
    for (let seat = 0; seat < WELL.benches; seat += 1) {
      const { position, facing } = benchSpot(seat);
      const [x, , z] = position;
      expect(Math.hypot(x, z)).toBeCloseTo(WELL.benchRadius);
      expect(Math.cos(facing - Math.atan2(-x, -z))).toBeCloseTo(1);
    }
  });

  it('measures distance to the flat ground and to paths', () => {
    expect(flatDistance(0, 0)).toBe(0);
    expect(flatDistance(16.5, 0)).toBeCloseTo(3);
    expect(segmentDistance(1, 1, [[0, 0, 0], [2, 0, 0]])).toBeCloseTo(1);
    expect(segmentDistance(3, 0, [[0, 0, 0], [0, 0, 0]])).toBeCloseTo(3);
    expect(inRect(0, 0, { x1: -1, x2: 1, z1: -1, z2: 1 })).toBe(true);
    expect(inRect(1.2, 0, { x1: -1, x2: 1, z1: -1, z2: 1 }, 0.1)).toBe(false);
  });
});
