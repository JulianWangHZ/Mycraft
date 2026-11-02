import type { ReactNode } from 'react';
import type { SceneId } from '../../lib/scenes/types.js';
import { VillageSky } from './blocks/VillageGrounds.js';
import { CitySky } from './office/BlockCity.js';
import { FairSky } from './park/FairGrounds.js';
import { ResortSky } from './pool/ResortGrounds.js';

type Time = 'day' | 'night';

const BACKDROPS: Record<SceneId, (props: { time: Time }) => ReactNode> = { office: CitySky, park: FairSky, pool: ResortSky, village: VillageSky };

/** Sky gradient (top, horizon) for each scene at each time of day. */
export const SKIES: Record<SceneId, Record<Time, [string, string]>> = {
  office: { day: ['#74a6ff', '#d2e4fc'], night: ['#0c0f2a', '#33305e'] },
  park: { day: ['#74a6ff', '#cfe2fc'], night: ['#0c0f2a', '#33305e'] },
  pool: { day: ['#6fa8ff', '#cfe6fc'], night: ['#0a0d24', '#2a2f5c'] },
  village: { day: ['#79a8ff', '#c9defc'], night: ['#0a0d24', '#2a2f5c'] },
};

export function Backdrop({ scene, time }: { scene: SceneId; time: Time }) {
  const Scene = BACKDROPS[scene];
  return <Scene time={time} />;
}
