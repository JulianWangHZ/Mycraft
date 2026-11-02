import { SIT_DROP } from './rides.js';
import type { SceneDefinition, Spot, Vec3 } from './types.js';
import { benchSpot, CAMPFIRE, DOCK, FARM, HUT, WELL, workSpot } from './blocks/layout.js';
import { villageWorld } from './blocks/village-world.js';
import { topAt } from './blocks/world.js';

/** A seat relative to its activity centre: the seat surface height minus how far a sitter drops into it. */
const sit = ([x, y, z]: Vec3, surface: number, facing: number): Spot => ({ position: [x, surface - SIT_DROP + y, z], facing, seated: true });

export const BENCH_HEIGHT = 0.26;
export const BED_HEIGHT = 0.3;
export const BED_SPACING = 0.9;

const DOCK_END: Vec3 = [DOCK.x, 0, DOCK.z2 - 0.8];

/** A village in a block world: agents work at benches in the yard and spend their breaks round the village. */
export const village: SceneDefinition = {
  id: 'village',
  // Stand behind the bench, facing it and the camera; benches are waist high, so nobody sits.
  seatAt: (index) => ({ position: workSpot(index), facing: 0, seated: false }),
  activities: {
    coffee: CAMPFIRE.at,
    kitchen: [5.6, 0, -4],
    ktv: [8, 0, 2.8],
    gym: [4.8, 0, 6.4],
    massage: [9, 0, -1.6],
    ballpit: [(FARM.x1 + FARM.x2) / 2, 0, (FARM.z1 + FARM.z2) / 2],
    pingpong: DOCK_END,
    sofa: WELL.at,
    nap: HUT.at,
  },
  activitySeats: {
    // On the benches round the well, facing it.
    sofa: Array.from({ length: WELL.benches }, (_, i) => {
      const { position, facing } = benchSpot(i);
      return sit(position, BENCH_HEIGHT, facing);
    }),
    // Fishing off both sides of the dock, out over the water.
    pingpong: [0, -0.9, -1.8].flatMap((dz) => [
      { position: [-0.45, 0, dz] as Vec3, facing: -Math.PI / 2 },
      { position: [0.45, 0, dz] as Vec3, facing: Math.PI / 2 },
    ]),
    nap: Array.from({ length: HUT.beds }, (_, i) => sit([(i - (HUT.beds - 1) / 2) * BED_SPACING, 0, 0], BED_HEIGHT, 0)),
  },
  activityRadius: { coffee: 1.1, kitchen: 1.0, ktv: 1.1, gym: 1.1, massage: 1.0, ballpit: 1.3, pingpong: 0.5, sofa: 0.6, nap: 1.0 },
  activityPose: { massage: 'lounge', pingpong: 'sip', sofa: 'lounge', nap: 'nap' },
  naps: true,
  outfits: {
    working: { body: null, headwear: 'cap', headwearColor: '#f2c14e', extra: 'apron' },
    needsYou: { body: '#e8574a', headwear: 'cap', headwearColor: '#e8574a', extra: 'none' },
    resting: { body: null, headwear: 'none', headwearColor: '#000000', extra: 'none' },
    trouble: { body: '#8d8d93', headwear: 'none', headwearColor: '#000000', extra: 'none' },
  },
  characterScale: 1,
  nameTags: false,
  figure: 'blocky',
  terrainAt: (x, z) => topAt(villageWorld(), x, z),
  // Distance fog, so the world fades out well before its edge.
  fog: [52, 120],
  maxDistance: 46,
  cameraTarget: [-1.2, 1, 0],
  closeOffset: [4.5, 5.5, 6],
  cameraOffset: [24, 20, 32],
};
