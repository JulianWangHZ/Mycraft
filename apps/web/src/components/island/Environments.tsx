import type { ReactNode } from 'react';
import type { SceneDefinition, SceneId } from '../../lib/scenes/types.js';
import { BlockCityGrounds } from './office/BlockCity.js';
import { FairGrounds } from './park/FairGrounds.js';
import { ResortGrounds } from './pool/ResortGrounds.js';
import { VillageGrounds } from './blocks/VillageGrounds.js';

interface EnvironmentProps {
  scene: SceneDefinition;
  seatCount: number;
  time: 'day' | 'night';
}

const ENVIRONMENTS: Record<SceneId, (props: EnvironmentProps) => ReactNode> = {
  office: BlockCityGrounds,
  park: FairGrounds,
  pool: ResortGrounds,
  village: VillageGrounds,
};

export function Environment(props: EnvironmentProps) {
  const Scene = ENVIRONMENTS[props.scene.id];
  return <Scene {...props} />;
}

