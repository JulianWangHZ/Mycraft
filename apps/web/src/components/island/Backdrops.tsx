import { useMemo, type ReactNode } from 'react';
import { buildBackdropTowers, seeded } from '../../lib/scenes/skyline.js';
import type { SceneId } from '../../lib/scenes/types.js';
import { LEVEL } from '../../lib/scenes/street.js';
import { ParkingLot } from './city/ParkingLot.js';
import { Street } from './city/Street.js';
import { FairSky } from './park/FairGrounds.js';
import { ResortSky } from './pool/ResortGrounds.js';
import { VillageSky } from './blocks/VillageGrounds.js';
import { facade, nightFacade } from './textures.js';

const FLOOR_UNIT = 1.6;

function Clouds({ seed, height, spread }: { seed: number; height: number; spread: number }) {
  const clouds = useMemo(() => {
    const random = seeded(seed);
    return Array.from({ length: 14 }, () => ({
      at: [(random() - 0.5) * spread, height + random() * 10, (random() - 0.5) * spread - spread * 0.25] as [number, number, number],
      scale: 3 + random() * 5,
    }));
  }, [seed, height, spread]);
  return (
    <>
      {clouds.map(({ at, scale }, index) => (
        <mesh key={index} position={at} scale={[scale * 2.2, scale * 0.6, scale]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.85} />
        </mesh>
      ))}
    </>
  );
}

type Time = 'day' | 'night';

function SkylineTower({ x, z, width, depth, top, time }: { x: number; z: number; width: number; depth: number; top: number; time: Time }) {
  const columns = Math.max(1, Math.round(width / 2));
  const rows = Math.max(1, Math.round(top / FLOOR_UNIT / 8));
  const map = useMemo(() => (time === 'night' ? nightFacade(columns, rows) : facade(columns, rows)), [time, columns, rows]);
  return (
    // Stands on the ground below the street, not at the office floor.
    <mesh position={[x, (top + LEVEL.base) / 2, z]}>
      <boxGeometry args={[width, top - LEVEL.base, depth]} />
      {time === 'night' ? (
        <meshStandardMaterial color="#ffffff" map={map} emissiveMap={map} emissive="#ffffff" emissiveIntensity={0.85} />
      ) : (
        <meshStandardMaterial color="#c9d3ec" map={map} roughness={0.8} />
      )}
    </mesh>
  );
}

/** The skyline behind the office tower, with the street and parking lot around it; lit windows at night, blue glass by day. */
function City({ time }: { time: Time }) {
  const towers = useMemo(() => buildBackdropTowers(60), []);
  const night = time === 'night';
  return (
    <>
      <mesh position={[0, LEVEL.base - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color={night ? '#1b1834' : '#b9c2d6'} />
      </mesh>
      <Street time={time} />
      <ParkingLot time={time} />
      {towers.map((tower, index) => (
        <SkylineTower key={index} {...tower} time={time} />
      ))}
      {night ? null : <Clouds seed={5} height={30} spread={200} />}
    </>
  );
}

/** Rolling hills and a far-off town round the park; the hills fall dark and the clouds clear at night. */
const BACKDROPS: Record<SceneId, (props: { time: Time }) => ReactNode> = { office: City, park: FairSky, pool: ResortSky, village: VillageSky };

/** Sky gradient (top, horizon) for each scene at each time of day. */
export const SKIES: Record<SceneId, Record<Time, [string, string]>> = {
  office: { day: ['#6fb1ec', '#e4eefb'], night: ['#120d2b', '#4a3470'] },
  park: { day: ['#74a6ff', '#cfe2fc'], night: ['#0c0f2a', '#33305e'] },
  pool: { day: ['#6fa8ff', '#cfe6fc'], night: ['#0a0d24', '#2a2f5c'] },
  village: { day: ['#79a8ff', '#c9defc'], night: ['#0a0d24', '#2a2f5c'] },
};

export function Backdrop({ scene, time }: { scene: SceneId; time: Time }) {
  const Scene = BACKDROPS[scene];
  return <Scene time={time} />;
}
