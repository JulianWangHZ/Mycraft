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
import { DeckTorches, LifeguardTower } from './ResortProps.js';

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
    </group>
  );
}

export function ResortSky({ time }: { time: Time }) {
  return <BlockSky time={time} world={resortWorld()} />;
}
