import { villageWorld } from '../../../lib/scenes/blocks/village-world.js';
import { Animals } from './Animals.js';
import { BlockSky } from './BlockSky.js';
import { BlockTerrain } from './BlockTerrain.js';
import { Villagers } from './Villagers.js';
import { VillageLights } from './VillageProps.js';

type Time = 'day' | 'night';

/** The village and the wild land round it, with its villagers and animals. */
export function VillageGrounds({ time }: { time: Time }) {
  const world = villageWorld();
  return (
    <group>
      <BlockTerrain world={world} />
      <VillageLights night={time === 'night'} />
      <Animals world={world} />
      <Villagers />
    </group>
  );
}

export function VillageSky({ time }: { time: Time }) {
  return <BlockSky time={time} world={villageWorld()} />;
}
