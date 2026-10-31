import { RoundedBox } from '@react-three/drei';
import type { ReactNode } from 'react';
import type { Activity, SceneId, Vec3 } from '../../lib/scenes/types.js';
import { Mini } from './characters/Mini.js';
import { DozeCorner } from './furniture/Armchair.js';
import { BallPit } from './furniture/BallPit.js';
import { CoffeeBar as Cafe } from './furniture/CoffeeBar.js';
import { PoolTable } from './furniture/PoolTable.js';
import { VILLAGE_PROPS } from './voxel/VillageProps.js';
import { BlockPingPong, Cabana, DjBooth, GrillStation, HotTub, LoungerPair, LoungerRow, TikiBar } from './pool/ResortProps.js';
import { Bandstand, Carousel as ParkCarousel, FoodStand as ParkFoodStand, GameStall, IceCreamCart, Picnic } from './park/Stalls.js';

type V3 = Vec3;

/** The outdoor scenes' coffee cart vendor. */
const OUTDOOR_BARISTA = { gender: 'male', skirt: false, skin: '#d9a47a', hair: 'short', hairColor: '#2b1d16', pants: '#2f3a5a', shoes: '#1b1b22', glasses: false } as const;

function Box({ size, at, color, round }: { size: V3; at: V3; color: string; round?: boolean }) {
  return (
    <mesh position={at} castShadow receiveShadow>
      {round ? <cylinderGeometry args={[size[0], size[0], size[1], 24]} /> : <boxGeometry args={size} />}
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

function CoffeeBar() {
  return (
    <>
      <Box size={[0.42, 0.42, 0]} at={[0, 0.21, 0]} color="#f3e3d3" round />
      <Box size={[0.46, 0.04, 0]} at={[0, 0.44, 0]} color="#d4a982" round />
      <Box size={[0.12, 0.16, 0.1]} at={[0.12, 0.54, -0.1]} color="#5b5f97" />
      {/* The barista NPC always works the bar, so it never looks empty. */}
      <group position={[0, 0, -0.05]}>
        <Mini look={OUTDOOR_BARISTA} shirt="#8a5f38" extra="apron" pose="sip" seated={false} />
      </group>
    </>
  );
}

function Kitchen() {
  return (
    <>
      <Box size={[0.8, 0.4, 0.26]} at={[0, 0.2, -0.45]} color="#fff3c4" />
      <Box size={[0.24, 0.7, 0.24]} at={[0.52, 0.35, -0.4]} color="#e3ecff" />
      <Box size={[0.28, 0.04, 0]} at={[0, 0.36, 0.2]} color="#ffe8d6" round />
      <Box size={[0.04, 0.34, 0]} at={[0, 0.17, 0.2]} color="#f2c6d3" round />
    </>
  );
}

function Ktv() {
  return (
    <>
      <mesh position={[0, 0.5, -0.55]} castShadow>
        <boxGeometry args={[0.8, 0.46, 0.05]} />
        <meshStandardMaterial color="#ff8fc0" emissive="#ff8fc0" emissiveIntensity={0.45} />
      </mesh>
      <Box size={[0.7, 0.18, 0.26]} at={[0, 0.09, 0.4]} color="#e9e1ff" />
      <Box size={[0.02, 0.5, 0]} at={[0.3, 0.25, -0.1]} color="#4a4e7a" round />
    </>
  );
}

function Gym() {
  return (
    <>
      <Box size={[0.36, 0.08, 0.7]} at={[-0.2, 0.04, 0]} color="#4a4e7a" />
      <Box size={[0.3, 0.02, 0.6]} at={[-0.2, 0.09, 0]} color="#9aa0c8" />
      <Box size={[0.04, 0.45, 0.04]} at={[-0.2, 0.3, -0.33]} color="#4a4e7a" />
      {[0.15, 0.3, 0.45].map((dz) => (
        <Box key={dz} size={[0.05, 0.22, 0]} at={[0.42, 0.05, dz - 0.3]} color="#ff9f1c" round />
      ))}
    </>
  );
}

function Massage() {
  return (
    <>
      {[-0.25, 0.25].map((dx) => (
        <group key={dx} position={[dx, 0, -0.1]}>
          <Box size={[0.3, 0.2, 0.36]} at={[0, 0.1, 0]} color="#e9e1ff" />
          <Box size={[0.3, 0.38, 0.1]} at={[0, 0.3, -0.16]} color="#c9b8f5" />
        </group>
      ))}
    </>
  );
}

function PingPong() {
  return (
    <group>
      <RoundedBox args={[0.62, 0.035, 1.1]} radius={0.01} smoothness={2} position={[0, 0.4, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2f8f6d" roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0.419, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.006, 1.06]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0.419, side * 0.535]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.6, 0.01]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      <mesh position={[0, 0.46, 0]}>
        <boxGeometry args={[0.68, 0.08, 0.008]} />
        <meshStandardMaterial color="#f5f5ff" transparent opacity={0.7} />
      </mesh>
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 0.26, 0.19, sz * 0.46]}>
            <boxGeometry args={[0.03, 0.38, 0.03]} />
            <meshStandardMaterial color="#2b2d3a" metalness={0.5} roughness={0.4} />
          </mesh>
        )),
      )}
      {[-1, 1].map((side) => (
        <group key={side} position={[0.18 * side, 0.43, side * 0.35]} rotation={[-Math.PI / 2, 0, side * 0.6]}>
          <mesh>
            <cylinderGeometry args={[0.05, 0.05, 0.012, 16]} />
            <meshStandardMaterial color={side > 0 ? '#e0473f' : '#2b2d3a'} />
          </mesh>
          <mesh position={[0, -0.06, 0]}>
            <boxGeometry args={[0.02, 0.06, 0.012]} />
            <meshStandardMaterial color="#c99d76" />
          </mesh>
        </group>
      ))}
      <mesh position={[0.08, 0.44, 0.1]}>
        <sphereGeometry args={[0.012, 10, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function NapPods() {
  return (
    <>
      {[-0.26, 0.26].map((dx) => (
        <mesh key={dx} position={[dx, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <capsuleGeometry args={[0.17, 0.5, 6, 16]} />
          <meshStandardMaterial color="#f0f0f7" transparent opacity={0.85} roughness={0.3} />
        </mesh>
      ))}
    </>
  );
}

type Props = (props: { night: boolean }) => ReactNode;

const OFFICE: Record<Activity, Props> = {
  coffee: CoffeeBar,
  kitchen: Kitchen,
  ktv: Ktv,
  gym: Gym,
  massage: Massage,
  ballpit: BallPit,
  pingpong: PingPong,
  // The office sofa is part of the rec-room furniture, so the activity adds nothing extra there.
  sofa: () => null,
  nap: NapPods,
};

const BY_SCENE: Record<SceneId, Record<Activity, Props>> = {
  office: { ...OFFICE, coffee: Cafe, pingpong: PoolTable, gym: () => null, nap: DozeCorner },
  park: {
    ...OFFICE,
    coffee: IceCreamCart,
    kitchen: ParkFoodStand,
    ktv: Bandstand,
    gym: ParkCarousel,
    // The coaster, ferris wheel and drop tower are part of the grounds; their gathering spots need no prop.
    ballpit: () => null,
    massage: () => null,
    sofa: () => null,
    pingpong: GameStall,
    nap: Picnic,
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
  voxel: VILLAGE_PROPS,
};

/** The office tower is built at a larger scale than the outdoor scenes, so its props are scaled up to match. */
const PROP_SCALE: Record<SceneId, number> = { office: 1.35, park: 1, pool: 1, voxel: 1 };

export function ActivityProps({ scene, activity, position, night }: { scene: SceneId; activity: Activity; position: Vec3; night: boolean }) {
  const Props = BY_SCENE[scene][activity];
  return (
    <group position={position} scale={PROP_SCALE[scene]}>
      <Props night={night} />
    </group>
  );
}
