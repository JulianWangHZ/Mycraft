import type { AgentKind } from '@mycraft/core';
import { describe, expect, it } from 'vitest';

const KINDS = ['claude', 'codex', 'gemini'];
import { ACTIVITIES, SCENE_IDS } from './types.js';
import { activitySeat, internSpot, sceneFor, SCENES } from './index.js';

describe.each(SCENE_IDS)('scene %s', (id) => {
  const scene = SCENES[id];

  it('has a matching id', () => {
    expect(scene.id).toBe(id);
  });

  const seat = (i: number) => scene.seatAt(i, KINDS[i % 3] as AgentKind, Math.floor(i / 3));

  it('gives every working agent its own seat', () => {
    const keys = Array.from({ length: 60 }, (_, i) => seat(i).position.map((v) => v.toFixed(2)).join());
    expect(new Set(keys).size).toBe(60);
  });

  it('keeps seats apart from every activity spot', () => {
    for (let i = 0; i < 36; i += 1) {
      const [sx, sy, sz] = seat(i).position;
      for (const [ax, ay, az] of Object.values(scene.activities)) {
        expect(Math.hypot(sx - ax, (sy - ay) * 3, sz - az)).toBeGreaterThan(1);
      }
    }
  });

  it('places every activity', () => {
    expect(Object.keys(scene.activities).sort()).toEqual([...ACTIVITIES].sort());
  });

  it('dresses every state group', () => {
    expect(Object.keys(scene.outfits).sort()).toEqual(['needsYou', 'resting', 'trouble', 'working']);
  });
});

describe('sceneFor', () => {
  it('falls back to the office for unknown ids', () => {
    expect(sceneFor('moon').id).toBe('office');
    expect(sceneFor('pool').id).toBe('pool');
  });
});

describe('activitySeat', () => {
  it('spreads seats around the spot and faces the middle', () => {
    const seats = [0, 1, 2, 3].map((seat) => activitySeat([0, 0, 0], seat));
    expect(new Set(seats.map((s) => s.position.map((v) => v.toFixed(2)).join())).size).toBe(4);
    for (const { position, facing } of seats) {
      const [x, , z] = position;
      expect(Math.cos(facing - Math.atan2(-x, -z))).toBeCloseTo(1);
    }
  });

  it('wraps the fifth seat onto a wider circle', () => {
    const near = activitySeat([0, 0, 0], 0).position;
    const far = activitySeat([0, 0, 0], 4).position;
    expect(Math.hypot(far[0], far[2])).toBeGreaterThan(Math.hypot(near[0], near[2]));
  });
});

describe('internSpot', () => {
  it('stands next to the parent, facing the same way', () => {
    const spot = internSpot({ position: [1, 0, 1], facing: 2 });
    expect(spot.facing).toBe(2);
    expect(Math.hypot(spot.position[0] - 1, spot.position[2] - 1)).toBeGreaterThan(0.3);
  });
});

describe('office rooms', () => {
  it('seats each agent kind in its own room, inside the building', async () => {
    const { BUILDING, ROOMS, office } = await import('./office.js');
    for (const kind of KINDS as AgentKind[]) {
      for (let i = 0; i < 12; i += 1) {
        const [x, , z] = office.seatAt(0, kind, i).position;
        expect(x).toBeGreaterThan(ROOMS[kind].left);
        expect(x).toBeLessThan(ROOMS[kind].right);
        expect(z).toBeGreaterThan(BUILDING.back);
        expect(z).toBeLessThan(BUILDING.front);
      }
    }
  });

  it('puts Claude and Codex upstairs and Gemini on the middle floor', async () => {
    const { FLOOR_HEIGHT, office } = await import('./office.js');
    expect(office.seatAt(0, 'claude', 0).position[1]).toBe(2 * FLOOR_HEIGHT);
    expect(office.seatAt(0, 'codex', 0).position[1]).toBe(2 * FLOOR_HEIGHT);
    expect(office.seatAt(0, 'gemini', 0).position[1]).toBe(FLOOR_HEIGHT);
  });
});

describe('activity radius', () => {
  it('stands people further out around large props', async () => {
    const { office } = await import('./office.js');
    const near = activitySeat([0, 0, 0], 0).position;
    const far = activitySeat([0, 0, 0], 0, office.activityRadius?.pingpong).position;
    expect(Math.hypot(far[0], far[2])).toBeGreaterThan(Math.hypot(near[0], near[2]) + 0.4);
  });
});

describe('stair opening', () => {
  it('keeps every lounge activity off the stairwell opening', async () => {
    const { FLOOR_HEIGHT, STAIR_OPENING, office } = await import('./office.js');
    const lounge = Object.values(office.activities).filter(([, y]) => y === STAIR_OPENING.floor * FLOOR_HEIGHT);
    expect(lounge.length).toBeGreaterThan(0);
    for (const [x, , z] of lounge) {
      const inside = x > STAIR_OPENING.x1 - 0.6 && x < STAIR_OPENING.x2 + 0.6 && z > STAIR_OPENING.z1 && z < STAIR_OPENING.z2 + 0.5;
      expect(inside).toBe(false);
    }
  });

  it('opens the floor all the way to where the stair arrives', async () => {
    const { STAIR, STAIR_OPENING } = await import('./office.js');
    expect(STAIR_OPENING.x2).toBeGreaterThanOrEqual(STAIR.to[0]);
    expect(STAIR_OPENING.z2).toBeGreaterThan(STAIR.from[2] + STAIR.width / 2);
  });
});

describe('spotAtActivity', () => {
  it('puts the first sofa sitters on the cushions, facing the room', async () => {
    const { office } = await import('./office.js');
    const { spotAtActivity } = await import('./index.js');
    const seats = [0, 1, 2].map((i) => spotAtActivity(office, 'sofa', i));
    expect(new Set(seats.map((s) => s.position[0])).size).toBe(3);
    expect(seats.every((s) => s.facing === 0 && s.position[1] > 0)).toBe(true);
  });

  it('stands extra people around the sofa once the cushions are full', async () => {
    const { office } = await import('./office.js');
    const { spotAtActivity } = await import('./index.js');
    const extra = spotAtActivity(office, 'sofa', 3);
    const [cx, , cz] = office.activities.sofa;
    expect(Math.hypot(extra.position[0] - cx, extra.position[2] - cz)).toBeGreaterThan(1);
    expect(extra.position[1]).toBe(0);
  });

  it('falls back to standing around activities without fixed seats', async () => {
    const { park } = await import('./park.js');
    const { spotAtActivity } = await import('./index.js');
    expect(spotAtActivity(park, 'coffee', 0)).toEqual(activitySeat(park.activities.coffee, 0, park.activityRadius?.coffee));
  });

  it('puts the first people at a ride on its seats, and has the rest wait beside it', async () => {
    const { park } = await import('./park.js');
    const { spotAtActivity } = await import('./index.js');
    const ride = park.rides?.sofa;
    expect(ride?.id).toBe('drop');
    const rider = spotAtActivity(park, 'sofa', 0);
    expect(rider.ride).toMatchObject({ id: 'drop', seat: 0 });
    expect(rider.seated).toBe(true);
    const waiting = spotAtActivity(park, 'sofa', ride?.seats ?? 0);
    expect(waiting.ride).toBeUndefined();
    expect(waiting).toEqual(activitySeat(park.activities.sofa, 0, park.activityRadius?.sofa));
  });

  it('rides the carousel astride', async () => {
    const { park } = await import('./park.js');
    const { spotAtActivity } = await import('./index.js');
    expect(spotAtActivity(park, 'gym', 2)).toMatchObject({ astride: true, ride: { id: 'carousel', seat: 2 } });
    expect(spotAtActivity(park, 'ballpit', 0).astride).toBeUndefined();
  });
});

describe('office seats on furniture', () => {
  it('sits coffee drinkers up on the bar stools, facing the counter', async () => {
    const { office } = await import('./office.js');
    const { spotAtActivity } = await import('./index.js');
    const stools = [0, 1].map((i) => spotAtActivity(office, 'coffee', i));
    for (const stool of stools) {
      expect(stool.position[1] - office.activities.coffee[1]).toBeGreaterThan(0.3);
      expect(stool.seated).toBe(true);
      expect(stool.facing).toBeCloseTo(Math.PI);
    }
  });

  it('puts ball pit players inside the pit walls', async () => {
    const { office } = await import('./office.js');
    const { spotAtActivity } = await import('./index.js');
    const [cx, , cz] = office.activities.ballpit;
    const inner = (1.3 / 2 - 0.14) * 1.35;
    for (let i = 0; i < 4; i += 1) {
      const [x, , z] = spotAtActivity(office, 'ballpit', i).position;
      expect(Math.abs(x - cx)).toBeLessThan(inner);
      expect(Math.abs(z - cz)).toBeLessThan(inner);
    }
  });
});

describe('office nap chairs', () => {
  it('seats dozing agents in the two armchairs, facing the room', async () => {
    const { office } = await import('./office.js');
    const { spotAtActivity } = await import('./index.js');
    const chairs = [0, 1].map((i) => spotAtActivity(office, 'nap', i));
    expect(chairs.every((c) => c.seated === true && c.facing === 0 && c.position[1] > 0)).toBe(true);
    expect(chairs[0]?.position[0]).not.toBe(chairs[1]?.position[0]);
  });
});
