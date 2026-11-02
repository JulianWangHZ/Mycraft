import { cityWorld } from './blocks/city.js';
import { topAt } from './blocks/world.js';
import { office } from './office.js';
import { park } from './park.js';
import { pool } from './pool.js';
import { village } from './village.js';
import { SCENE_IDS, type Activity, type SceneDefinition, type SceneId, type Spot, type Vec3 } from './types.js';

/**
 * The city is laid out round the office tower, so the office cannot read its own terrain without
 * a circular import; it is joined to it here instead.
 */
const officeInCity: SceneDefinition = { ...office, terrainAt: (x, z) => topAt(cityWorld(), x, z) };

export const SCENES: Readonly<Record<SceneId, SceneDefinition>> = { office: officeInCity, park, pool, village };

export function sceneFor(id: string): SceneDefinition {
  return (SCENE_IDS as readonly string[]).includes(id) ? SCENES[id as SceneId] : office;
}

const SEATS_PER_CIRCLE = 4;

export function activitySeat([cx, cy, cz]: Vec3, seat: number, baseRadius = 0.7): Spot {
  const circle = Math.floor(seat / SEATS_PER_CIRCLE);
  const angle = ((seat % SEATS_PER_CIRCLE) / SEATS_PER_CIRCLE) * Math.PI * 2 + Math.PI / 4 + circle * 0.4;
  const radius = baseRadius + circle * 0.35;
  const x = Math.sin(angle) * radius;
  const z = Math.cos(angle) * radius;
  return { position: [cx + x, cy, cz + z], facing: Math.atan2(-x, -z) };
}

export function internSpot({ position: [x, y, z], facing }: Spot): Spot {
  return { position: [x + 0.45, y, z + 0.2], facing };
}

/** Where the n-th person at an activity stands: on a fixed seat if the scene has one, otherwise around the spot. */
export function spotAtActivity(scene: SceneDefinition, activity: Activity, seat: number): Spot {
  const centre = scene.activities[activity];
  const ride = scene.rides?.[activity];
  if (ride && seat < ride.seats) {
    return {
      position: centre,
      facing: 0,
      seated: true,
      ...(ride.id === 'carousel' ? { astride: true } : {}),
      ride: { id: ride.id, seat, centre: ride.centre, board: ride.board },
    };
  }
  if (ride) return activitySeat(centre, seat - ride.seats, scene.activityRadius?.[activity] ?? 0.7);
  const fixed = scene.activitySeats?.[activity];
  const own = fixed?.[seat];
  if (own) {
    return {
      position: [centre[0] + own.position[0], centre[1] + own.position[1], centre[2] + own.position[2]],
      facing: own.facing,
      ...(own.seated ? { seated: true } : {}),
    };
  }
  return activitySeat(centre, seat - (fixed?.length ?? 0), (scene.activityRadius?.[activity] ?? 0.7) + (fixed ? 0.5 : 0));
}
