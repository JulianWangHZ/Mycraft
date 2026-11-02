import { FAIR_HERDS } from '../../../lib/scenes/blocks/animals.js';
import { fairgroundWorld } from '../../../lib/scenes/blocks/fairground.js';
import { Animals } from '../blocks/Animals.js';
import { BlockSky } from '../blocks/BlockSky.js';
import { BlockTerrain } from '../blocks/BlockTerrain.js';
import { BlockCoaster, BlockDropTower, BlockWheel } from './BlockRides.js';
import { FairAmenities } from './FairProps.js';
import { NightLights } from './NightLights.js';

type Time = 'day' | 'night';

/** The theme park in its block world: the big rides, the fence, gate and everything round them. */
export function FairGrounds({ time }: { time: Time }) {
  const night = time === 'night';
  const world = fairgroundWorld();
  return (
    <group>
      <BlockTerrain world={world} />
      <BlockWheel night={night} />
      <BlockDropTower night={night} />
      <BlockCoaster night={night} />
      <FairAmenities night={night} />
      {night ? <NightLights /> : null}
      <Animals world={world} herds={FAIR_HERDS} />
    </group>
  );
}

export function FairSky({ time }: { time: Time }) {
  return <BlockSky time={time} world={fairgroundWorld()} />;
}
