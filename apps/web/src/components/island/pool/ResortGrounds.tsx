import { RESORT_HERDS } from '../../../lib/scenes/voxel/animals.js';
import { HOTEL, resortWorld } from '../../../lib/scenes/voxel/resort.js';
import { BLOCK } from '../../../lib/scenes/voxel/layout.js';
import { columnsIn, columnX, columnZ } from '../../../lib/scenes/voxel/world.js';
import { hash } from '../../../lib/textures/relief.js';
import { LAP_POOL, SPLASH_POOL, WATER } from '../../../lib/scenes/pool-layout.js';
import { Animals } from '../voxel/Animals.js';
import { BlockSky } from '../voxel/BlockSky.js';
import { BlockTerrain } from '../voxel/BlockTerrain.js';
import { BlockSlide } from './BlockSlide.js';
import { Cube, Post } from '../voxel/parts.js';
import { DeckTorches, LifeguardTower } from './ResortProps.js';
import type { Vec3 } from '../../../lib/scenes/types.js';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';

type Time = 'day' | 'night';

/** Lights set into the pool walls, glowing up through the water after dark. */
function PoolGlow() {
  const lights = [
    [(LAP_POOL.x1 + LAP_POOL.x2) / 2, LAP_POOL.z1 + 1.5],
    [(LAP_POOL.x1 + LAP_POOL.x2) / 2, LAP_POOL.z2 - 1.5],
    [(SPLASH_POOL.x1 + SPLASH_POOL.x2) / 2, (SPLASH_POOL.z1 + SPLASH_POOL.z2) / 2],
  ] as const;
  return (
    <group>
      {lights.map(([x, z]) => (
        <pointLight key={`${x},${z}`} position={[x, WATER - 0.3, z]} color="#4fd8ff" intensity={8} distance={7} decay={1.5} />
      ))}
    </group>
  );
}

const SAILS: ReadonlyArray<{ at: Vec3; turn: number; sail: 'woolWhite' | 'woolRed' | 'woolYellow' }> = [
  { at: [-14, -0.55, 22], turn: 0.6, sail: 'woolWhite' },
  { at: [12, -0.55, 26], turn: -0.9, sail: 'woolRed' },
  { at: [30, -0.55, 16], turn: 2.2, sail: 'woolYellow' },
  { at: [-32, -0.55, 14], turn: -2.4, sail: 'woolWhite' },
];

/** Little sailing boats riding the swell offshore: a plank hull, a mast and a wool sail. */
function Sailboats() {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    group.current?.children.forEach((boat, i) => {
      const t = clock.elapsedTime + i * 1.7;
      boat.position.y = (SAILS[i]?.at[1] ?? 0) + Math.sin(t * 1.3) * 0.06;
      boat.rotation.z = Math.sin(t * 0.9) * 0.06;
    });
  });
  return (
    <group ref={group}>
      {SAILS.map(({ at, turn, sail }) => (
        <group key={`${at}`} position={at} rotation={[0, turn, 0]}>
          <Cube at={[0, 0, 0]} size={[0.9, 0.35, 2.2]} top="planks" side="sprucePlanks" />
          <Cube at={[0, 0.35, -0.3]} size={[0.5, 0.25, 0.8]} top="planks" side="planks" />
          <Post at={[0, 0.35, 0.2]} height={2.6} thick={0.1} />
          <Cube at={[0, 0.8, 0.55]} size={[0.06, 1.9, 0.7]} top={sail} side={sail} />
        </group>
      ))}
    </group>
  );
}

/** Rooms whose lights are on after dark, by bay and floor, so the lit windows look lived in. */
function HotelWindows() {
  const columns = columnsIn(HOTEL);
  const is = columns.map(([i]) => i);
  const ks = columns.map(([, k]) => k);
  const [i1, i2] = [Math.min(...is), Math.max(...is)];
  // The inside face of the front wall, where the glow shows through the glass.
  const front = columnZ(Math.max(...ks)) - BLOCK / 2 - 0.01;
  const bays: Array<{ x: number; y: number }> = [];
  for (let start = i1 + 1; start + 2 <= i2; start += 4) {
    for (let floor = 0; floor < HOTEL.floors; floor += 1) {
      if (hash(start, floor, 5) < 0.4) continue;
      bays.push({ x: (columnX(start) + columnX(start + 2)) / 2, y: (floor * HOTEL.storey + 1.5) * BLOCK });
    }
  }
  return (
    <group>
      {bays.map(({ x, y }) => (
        <mesh key={`${x},${y}`} position={[x, y, front]}>
          <planeGeometry args={[BLOCK * 3, BLOCK]} />
          <meshBasicMaterial color="#ffd79a" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** The beach club in its block world: deck, pools, hotel, slide, torches and turtles on the sand. */
export function ResortGrounds({ time }: { time: Time }) {
  const night = time === 'night';
  const world = resortWorld();
  return (
    <group>
      <BlockTerrain world={world} />
      <BlockSlide night={night} />
      <LifeguardTower />
      <DeckTorches night={night} />
      {night ? <PoolGlow /> : null}
      {night ? <HotelWindows /> : null}
      <Animals world={world} herds={RESORT_HERDS} />
      <Sailboats />
    </group>
  );
}

export function ResortSky({ time }: { time: Time }) {
  return <BlockSky time={time} world={resortWorld()} />;
}
