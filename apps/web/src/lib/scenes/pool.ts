import { BAR, barStool, CABANA, HOT_TUB, hotTubSeat, LAP_POOL, laneSpot, LOUNGERS, loungerSpot } from './pool-layout.js';
import { RIDE_SEATS, SIT_DROP } from './rides.js';
import type { SceneDefinition, Spot, Vec3 } from './types.js';
import { resortWorld } from './voxel/resort.js';
import { topAt } from './voxel/world.js';

/** A seat relative to its activity centre: the seat surface height minus how far a sitter drops into it. */
const sit = ([x, y, z]: Vec3, surface: number, facing: number): Spot => ({ position: [x, surface - SIT_DROP + y, z], facing, seated: true });

const NAP_AT: Vec3 = [5.0, 0, 7.4];
const SLIDE_QUEUE: Vec3 = [7.0, 0, -2.0];

/** Working agents swim, one to a lane; resting ones use the bar, hot tub, slide, cabana and loungers. */
export const pool: SceneDefinition = {
  id: 'pool',
  // Working agents swim laps of their lane; they are never drawn sitting.
  seatAt: (index) => ({ position: laneSpot(index), facing: 0, seated: false, lap: { from: LAP_POOL.z1 + 0.7, to: LAP_POOL.z2 - 0.7, seconds: 9 + (index % 4) } }),
  workPose: 'swim',
  naps: false,
  activities: {
    coffee: BAR.at,
    kitchen: [6.0, 0, -3.0],
    ktv: [3.4, 0, -1.2],
    gym: SLIDE_QUEUE,
    massage: CABANA.at,
    ballpit: HOT_TUB.at,
    pingpong: [-3.4, 0, -5.4],
    sofa: LOUNGERS.at,
    nap: NAP_AT,
  },
  activitySeats: {
    // Bar stools face the counter.
    coffee: Array.from({ length: BAR.stools }, (_, i) => sit(barStool(i), 0.66, Math.PI)),
    // Sitting on the bench inside the hot tub, chest-deep.
    ballpit: Array.from({ length: HOT_TUB.seats }, (_, i) => {
      const seat = hotTubSeat(i);
      return sit([seat.position[0], 0, seat.position[2]], HOT_TUB.bench, seat.facing);
    }),
    // Lying back on the loungers and the cabana daybed, looking out to sea.
    sofa: Array.from({ length: LOUNGERS.count }, (_, i) => {
      const [x, , z] = loungerSpot(i);
      return sit([x - LOUNGERS.at[0], 0, z - LOUNGERS.at[2]], 0.34, 0);
    }),
    nap: [-0.6, 0.6].map((dx) => sit([dx, 0, 0], 0.34, 0)),
    massage: [-0.45, 0.45].map((dx) => sit([dx, 0, 0.1], 0.5, 0)),
  },
  rides: {
    gym: { id: 'slide', seats: RIDE_SEATS.slide, board: 0.8, centre: [0, 0, 0] },
  },
  // Anyone past the bar stools waits further out, clear of the counter.
  activityRadius: { kitchen: 0.9, ktv: 0.9, pingpong: 1.2, gym: 0.6, coffee: 1.1, ballpit: 1.45 },
  activityPose: { gym: 'lounge', ballpit: 'lounge', sofa: 'lounge', massage: 'lounge', nap: 'nap' },
  outfits: {
    working: { body: null, headwear: 'swimcap', headwearColor: '#ffffff', extra: 'none' },
    needsYou: { body: '#ff5d5d', headwear: 'cap', headwearColor: '#ff5d5d', extra: 'whistle' },
    resting: { body: null, headwear: 'none', headwearColor: '#000000', extra: 'none' },
    trouble: { body: null, headwear: 'swimcap', headwearColor: '#ffffff', extra: 'floatRing' },
  },
  characterScale: 1,
  nameTags: false,
  figure: 'blocky',
  terrainAt: (x, z) => topAt(resortWorld(), x, z),
  fog: [52, 120],
  maxDistance: 46,
  cameraTarget: [0.8, 0.8, 0.2],
  closeOffset: [4.5, 5.5, 6],
  cameraOffset: [20, 13, 27],
};
