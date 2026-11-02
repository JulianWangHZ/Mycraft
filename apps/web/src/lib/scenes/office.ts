import type { AgentKind } from '@mycraft/core';
import type { SceneDefinition, Spot } from './types.js';

export const FLOOR_HEIGHT = 3.4;
export const FLOORS = 3;
export const BUILDING = { left: -9.8, right: 9.8, back: -2.3, front: 2.3 } as const;
export const DESKS_PER_ROOM = 8;

/** The floor tag on each slab edge: where it sits from the room's left wall, its size, and its centre below the floor. */
export const FLOOR_TAG = { inset: 0.15, width: 4.1, height: 0.46, y: -0.14 } as const;

/** The rec-room stair runs along the back wall from the ground floor up into the lounge. */
export const STAIR = { from: [4.4, 0, -1.55] as const, to: [7.6, FLOOR_HEIGHT, -1.55] as const, width: 0.95 };

/** Opening in the lounge floor above the stair: wherever a person on the stair would hit their head. */
export const STAIR_OPENING = { floor: 1, x1: 5.0, x2: STAIR.to[0] + 0.02, z1: BUILDING.back, z2: STAIR.from[2] + STAIR.width / 2 + 0.08 };

export type RoomId = AgentKind | 'lounge' | 'rec';

export interface Room {
  id: RoomId;
  floor: number;
  left: number;
  right: number;
}

/** Top floor: Claude and Codex. Middle: Gemini and the lounge. Ground: the rec room. */
export const ROOMS: Readonly<Record<RoomId, Room>> = {
  claude: { id: 'claude', floor: 2, left: -9.6, right: -0.15 },
  codex: { id: 'codex', floor: 2, left: 0.15, right: 9.6 },
  gemini: { id: 'gemini', floor: 1, left: -9.6, right: -0.15 },
  lounge: { id: 'lounge', floor: 1, left: 0.15, right: 9.6 },
  rec: { id: 'rec', floor: 0, left: -9.6, right: 9.6 },
};

const COLUMNS = 4;
const ROWS = 3;

/** Desks in rows of four, everyone facing the open front of the building. Past twelve, desks slot in between. */
function seatAt(_index: number, agent: AgentKind, agentIndex: number): Spot {
  const room = ROOMS[agent];
  const col = agentIndex % COLUMNS;
  const row = Math.floor(agentIndex / COLUMNS) % ROWS;
  const wrap = Math.floor(agentIndex / (COLUMNS * ROWS));
  return {
    position: [room.left + 1.25 + col * 2.3 + wrap * 0.85, room.floor * FLOOR_HEIGHT, 0.75 - row * 1.15],
    facing: 0,
  };
}

const LOUNGE_Y = ROOMS.lounge.floor * FLOOR_HEIGHT;

export const office: SceneDefinition = {
  id: 'office',
  seatAt,
  activities: {
    coffee: [1.7, LOUNGE_Y, -0.5],
    kitchen: [3.4, LOUNGE_Y, -1.2],
    ktv: [6.3, LOUNGE_Y, 0.95],
    massage: [8.6, LOUNGE_Y, -0.2],
    pingpong: [-4.6, 0, 0.1],
    // The office has no gym: this spot is in front of the arcade cabinet.
    gym: [2.1, 0, -0.75],
    ballpit: [3.4, 0, 0.3],
    sofa: [0, 0, -0.2],
    // Clear of the stair, which reaches back to z -2.025 at this x: any closer and the near armchair sinks into the steps.
    nap: [7.3, 0, -0.3],
  },
  activityRadius: { pingpong: 1.2, coffee: 0.8, ballpit: 1.15, gym: 0.45 },
  activityPose: { gym: 'type' },
  // Three cushions on the rec-room sofa, everyone facing the room.
  // Offsets are in world units; office props are drawn at 1.35x, so these match the scaled furniture.
  activitySeats: {
    // Raised so the legs rest on top of the cushion instead of sinking into it.
    sofa: [-0.68, 0, 0.68].map((dx) => ({ position: [dx, 0.29, 0.02] as [number, number, number], facing: 0, seated: true })),
    // On the two bar stools, facing the counter.
    coffee: [-0.43, 0.43].map((dx) => ({ position: [dx, 0.5, 0.5] as [number, number, number], facing: Math.PI, seated: true })),
    // Dozing in the two lounge armchairs.
    nap: [-0.61, 0.61].map((dx) => ({ position: [dx, 0.29, -0.05] as [number, number, number], facing: 0, seated: true })),
    // Inside the pit, waist-deep in balls.
    ballpit: [
      { position: [-0.3, 0.1, -0.25] as [number, number, number], facing: 0.4 },
      { position: [0.32, 0.1, 0.22] as [number, number, number], facing: -0.5 },
      { position: [-0.28, 0.1, 0.3] as [number, number, number], facing: 0.2 },
      { position: [0.3, 0.1, -0.32] as [number, number, number], facing: -0.2 },
    ],
  },

  outfits: {
    working: { body: null, headwear: 'none', headwearColor: '#000000', extra: 'none' },
    needsYou: { body: null, headwear: 'none', headwearColor: '#000000', extra: 'tie' },
    resting: { body: '#b8c4e8', headwear: 'none', headwearColor: '#000000', extra: 'none' },
    trouble: { body: null, headwear: 'none', headwearColor: '#000000', extra: 'none' },
  },
  characterScale: 1.3,
  nameTags: true,
  figure: 'blocky',
  fog: [60, 140],
  maxDistance: 60,
  cameraTarget: [0, 6.4, 0],
  cameraOffset: [0, 9, 47],
  closeOffset: [0, 1.6, 7.5],
};
