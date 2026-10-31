import { QUEUE_LANES, queueEntrance, RIDES, STATION } from './park-layout.js';
import { RIDE_SEATS } from './rides.js';
import type { SceneDefinition, Vec3 } from './types.js';
import { fairgroundWorld } from './blocks/fairground.js';
import { topAt } from './blocks/world.js';

export const CAROUSEL_AT: Vec3 = [5.2, 0, 4.6];

/** Ride booths stand in an arc on the left; staff work the booths facing visitors. */
export const park: SceneDefinition = {
  id: 'park',
  seatAt: (index) => {
    const ring = Math.floor(index / 6);
    const angle = Math.PI * (0.62 + (index % 6) * 0.15) + ring * 0.07;
    const radius = 6 + ring * 2;
    return {
      position: [Math.cos(angle) * radius + 1, 0, Math.sin(angle) * radius * 0.8],
      facing: Math.atan2(-Math.cos(angle), -Math.sin(angle)),
    };
  },
  // Each activity is dressed as a park attraction. Four of them are rides people actually sit on:
  // the carousel, the roller coaster, the ferris wheel and the drop tower. Riders gather at the
  // entrance of the ride's queue, then board.
  activities: {
    coffee: [1.2, 0, -1.6],
    kitchen: [3.4, 0, -3.4],
    ktv: [6.8, 0, 0.2],
    gym: CAROUSEL_AT,
    massage: queueEntrance(QUEUE_LANES.wheel),
    ballpit: queueEntrance(QUEUE_LANES.coaster),
    pingpong: [2.6, 0, 1.8],
    sofa: queueEntrance(QUEUE_LANES.drop),
    nap: [8.8, 0, -2.4],
  },
  rides: {
    gym: { id: 'carousel', seats: RIDE_SEATS.carousel, board: 2.6, centre: CAROUSEL_AT },
    ballpit: { id: 'coaster', seats: RIDE_SEATS.coaster, board: 0.8, centre: STATION.from },
    massage: { id: 'wheel', seats: RIDE_SEATS.wheel, board: 0.8, centre: RIDES.ferrisWheel.at },
    sofa: { id: 'drop', seats: RIDE_SEATS.drop, board: 0.8, centre: RIDES.dropTower.at },
  },
  activityRadius: { kitchen: 0.95, ktv: 1.0, pingpong: 0.9, coffee: 0.8, gym: 2.2, ballpit: 0.5, massage: 0.5, sofa: 0.5 },
  // Riders sit back and enjoy it.
  activityPose: { gym: 'lounge', ballpit: 'lounge', massage: 'lounge', sofa: 'lounge' },
  outfits: {
    working: { body: null, headwear: 'cap', headwearColor: '#ff5d8f', extra: 'none' },
    needsYou: { body: '#c9a27a', headwear: 'mascot', headwearColor: '#c9a27a', extra: 'none' },
    resting: { body: null, headwear: 'none', headwearColor: '#000000', extra: 'balloon' },
    trouble: { body: '#ffe08a', headwear: 'none', headwearColor: '#000000', extra: 'clownNose' },
  },
  naps: false,
  characterScale: 1,
  nameTags: false,
  figure: 'blocky',
  terrainAt: (x, z) => topAt(fairgroundWorld(), x, z),
  fog: [56, 125],
  maxDistance: 50,
  cameraTarget: [1.5, 3, -2],
  closeOffset: [4.5, 5.5, 6],
  cameraOffset: [24, 14, 33],
};
