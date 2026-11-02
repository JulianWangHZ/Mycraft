import type { ReactNode } from 'react';
import type { Activity, SceneId, Vec3 } from '../../lib/scenes/types.js';
import { VILLAGE_PROPS } from './blocks/VillageProps.js';
import { BlockBallPit, BlockCafe, BlockDozeCorner, BlockKitchen, BlockKtv, BlockMassage, BlockPoolTable } from './office/OfficeProps.js';
import { BlockCarousel } from './park/BlockRides.js';
import { BlockBandstand, BlockFoodStand, BlockGameStall, BlockIceCream, BlockPicnic } from './park/FairProps.js';
import { BlockPingPong, Cabana, DjBooth, GrillStation, HotTub, LoungerPair, LoungerRow, TikiBar } from './pool/ResortProps.js';

type Props = (props: { night: boolean }) => ReactNode;

const OFFICE: Record<Activity, Props> = {
  coffee: BlockCafe,
  kitchen: BlockKitchen,
  ktv: BlockKtv,
  // The office has no gym: its spot is in front of an arcade cabinet, part of the rec room.
  gym: () => null,
  massage: BlockMassage,
  ballpit: BlockBallPit,
  pingpong: BlockPoolTable,
  // The office sofa is part of the rec-room furniture, so the activity adds nothing extra there.
  sofa: () => null,
  nap: BlockDozeCorner,
};

const BY_SCENE: Record<SceneId, Record<Activity, Props>> = {
  office: OFFICE,
  park: {
    ...OFFICE,
    coffee: BlockIceCream,
    kitchen: BlockFoodStand,
    ktv: BlockBandstand,
    gym: BlockCarousel,
    // The coaster, ferris wheel and drop tower are part of the grounds; their gathering spots need no prop.
    ballpit: () => null,
    massage: () => null,
    sofa: () => null,
    pingpong: BlockGameStall,
    nap: BlockPicnic,
  },
  pool: {
    ...OFFICE,
    coffee: TikiBar,
    kitchen: GrillStation,
    ktv: DjBooth,
    // The slide is part of the grounds; its riders gather at the foot of the tower stairs.
    gym: () => null,
    massage: Cabana,
    ballpit: HotTub,
    pingpong: BlockPingPong,
    sofa: LoungerRow,
    nap: LoungerPair,
  },
  village: VILLAGE_PROPS,
};

/** The office tower is built at a larger scale than the outdoor scenes, so its props are scaled up to match. */
const PROP_SCALE: Record<SceneId, number> = { office: 1.35, park: 1, pool: 1, village: 1 };

export function ActivityProps({ scene, activity, position, night }: { scene: SceneId; activity: Activity; position: Vec3; night: boolean }) {
  const Props = BY_SCENE[scene][activity];
  return (
    <group position={position} scale={PROP_SCALE[scene]}>
      <Props night={night} />
    </group>
  );
}
