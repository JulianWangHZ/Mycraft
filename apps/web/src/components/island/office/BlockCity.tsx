import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import type { Tile } from '../../../lib/scenes/blocks/blocks.js';
import { cityTowers, cityWorld, ROAD_LEVEL } from '../../../lib/scenes/blocks/city.js';
import { BLOCK } from '../../../lib/scenes/blocks/layout.js';
import { buildBackdropTowers, seeded } from '../../../lib/scenes/skyline.js';
import { LANES, lampSpots, LOT, parkingBays, TRAFFIC, trafficX } from '../../../lib/scenes/street.js';
import { BlockSky } from '../blocks/BlockSky.js';
import { BlockTerrain } from '../blocks/BlockTerrain.js';
import { lightWindows } from '../blocks/materials.js';
import { Beam, Cube, Post, TiledCube } from '../blocks/parts.js';
import { BlockDecor, BlockTower } from './BlockOffice.js';

type Time = 'day' | 'night';

// A level's top face sits at level * BLOCK, not (level + 1) * BLOCK: that off-by-one block was floating every car half a block above the road.
const ROAD_Y = ROAD_LEVEL * BLOCK;

/** Car paint as wool, by the colour the street layout asks for. */
const PAINT: Readonly<Record<string, Tile>> = {
  '#e8e9ec': 'woolWhite',
  '#f2f3f5': 'woolWhite',
  '#1d1f24': 'jukeboxSide',
  '#b3202c': 'woolRed',
  '#c7ccd3': 'woolGrey',
  '#2b4f8e': 'woolBlue',
};

/**
 * A car in blocks, facing +z: a body, a glass cabin with a roof, four black wheels, and lights
 * front and back that glow after dark.
 */
function Car({ paint, night }: { paint: Tile; night: boolean }) {
  return (
    <group>
      <Cube at={[0, 0.18, 0]} size={[1.0, 0.36, 2.1]} top={paint} side={paint} />
      <Cube at={[0, 0.54, -0.1]} size={[0.9, 0.32, 1.1]} top={paint} side="glass" />
      <Cube at={[0, 0.86, -0.1]} size={[0.92, 0.06, 1.12]} top={paint} side={paint} />
      {[-0.5, 0.5].flatMap((x) => [-0.65, 0.65].map((z) => <Cube key={`${x}${z}`} at={[x, 0, z]} size={[0.12, 0.34, 0.34]} top="jukeboxSide" side="jukeboxSide" />))}
      {[-0.32, 0.32].map((x) => (
        <group key={x}>
          <Cube at={[x, 0.3, 1.06]} size={[0.2, 0.1, 0.02]} top="lantern" side="lantern" glow={night} />
          <Cube at={[x, 0.3, -1.06]} size={[0.2, 0.1, 0.02]} top="woolRed" side="woolRed" glow={night} />
        </group>
      ))}
    </group>
  );
}

/** Cars driving along both lanes, wrapping round at either end of the street. */
function Traffic({ night }: { night: boolean }) {
  const cars = useRef<Array<Group | null>>([]);
  useFrame(({ clock }) => {
    TRAFFIC.forEach((car, i) => cars.current[i]?.position.setX(trafficX(car, clock.elapsedTime, 96)));
  });
  return (
    <group>
      {TRAFFIC.map((car, i) => (
        <group key={i} ref={(node) => void (cars.current[i] = node)} position={[0, ROAD_Y, LANES[car.lane].z]} rotation={[0, (LANES[car.lane].direction * Math.PI) / 2, 0]}>
          <Car paint={PAINT[car.color] ?? 'woolWhite'} night={night} />
        </group>
      ))}
    </group>
  );
}

/** The lot: bays painted on the asphalt, a charger at the head of each, cars backed in. */
function Lot({ night }: { night: boolean }) {
  const bays = useMemo(() => parkingBays(), []);
  return (
    <group>
      {Array.from({ length: bays.length + 1 }, (_, i) => (
        <Cube key={i} at={[LOT.x1 + i * LOT.bayWidth, 0, LOT.z1 + LOT.bayDepth / 2]} size={[0.1, 0.01, LOT.bayDepth]} top="woolWhite" side="woolWhite" />
      ))}
      {bays.map((bay) => (
        <group key={bay.x}>
          <group position={[bay.x - 0.8, 0, LOT.z1 + 0.35]}>
            <Cube at={[0, 0, 0]} size={[0.36, 1.2, 0.3]} top="ironBlock" side="ironBlock" />
            <Cube at={[0, 0.8, 0.151]} size={[0.24, 0.16, 0.01]} top={bay.charging ? 'woolGreen' : 'woolGrey'} side={bay.charging ? 'woolGreen' : 'woolGrey'} glow={night && bay.charging} />
          </group>
          <group position={[bay.x, 0, bay.carZ]}>
            <Car paint={PAINT[bay.color] ?? 'woolWhite'} night={false} />
          </group>
        </group>
      ))}
    </group>
  );
}

/** Street lamps: a post on the pavement with an arm out over the road and a lantern at its end. */
function StreetLamps({ night }: { night: boolean }) {
  const lamps = useMemo(() => lampSpots().filter(({ x }) => Math.abs(x) < 46), []);
  return (
    <group>
      {lamps.map(({ x, z, facing }) => (
        <group key={`${x},${z}`} position={[x, 0, z]}>
          <Post at={[0, 0, 0]} height={2.6} thick={0.1} />
          <Cube at={[0, 2.5, facing * 0.35]} size={[0.08, 0.08, 0.7]} top="oakLog" side="oakLog" />
          <Cube at={[0, 2.26, facing * 0.68]} size={[0.24, 0.24, 0.24]} top="lantern" side="lantern" glow={night} />
          {night ? <pointLight position={[0, 2.1, facing * 0.68]} color="#ffcf7a" intensity={4} distance={6} decay={1.5} /> : null}
        </group>
      ))}
    </group>
  );
}

/**
 * A skyline built from the game's bright block colours, the way a Minecraft city actually looks:
 * mostly bold wool and concrete, only a couple of towers in pale glass or stone, so the skyline
 * doesn't default back to a wash of blue and white.
 */
const BUILDING_STYLES: readonly { body: Tile; top: Tile; trim: Tile }[] = [
  { body: 'woolRed', top: 'woolRed', trim: 'woolGrey' },
  { body: 'woolOrange', top: 'woolOrange', trim: 'concreteWhite' },
  { body: 'woolYellow', top: 'woolYellow', trim: 'ironBlock' },
  { body: 'woolGreen', top: 'woolGreen', trim: 'concreteWhite' },
  { body: 'woolCyan', top: 'woolCyan', trim: 'ironBlock' },
  { body: 'woolPurple', top: 'woolPurple', trim: 'concreteWhite' },
  { body: 'woolPink', top: 'woolPink', trim: 'ironBlock' },
  { body: 'terracotta', top: 'terracotta', trim: 'woolGrey' },
  { body: 'concreteOrange', top: 'concreteOrange', trim: 'quartzTop' },
  { body: 'concreteYellow', top: 'concreteYellow', trim: 'ironBlock' },
  { body: 'stoneBricks', top: 'stoneBricks', trim: 'ironBlock' },
  { body: 'facade', top: 'concreteWhite', trim: 'ironBlock' },
];

/**
 * A tower set back in tiers as it rises, each tier a fraction of the one below, the way a real
 * block-built skyscraper reads: a broad podium, a narrower shaft, and a small crown, rather than
 * one plain prism window-to-window.
 */
const TIERS: readonly { rise: number; scale: number }[] = [
  { rise: 0.56, scale: 1 },
  { rise: 0.28, scale: 0.72 },
  { rise: 0.16, scale: 0.46 },
];

/**
 * Clutter scattered on a flat roof, kept a block clear of the parapet so nothing overhangs the
 * edge: a water tank on some towers, a scatter of vent boxes on others, picked and placed by a
 * seed unique to this tower so the same tower always looks the same but no two look alike.
 */
function RoofClutter({ x, y, z, width, depth, seed }: { x: number; y: number; z: number; width: number; depth: number; seed: number }) {
  const random = useMemo(() => seeded(seed), [seed]);
  const margin = 1;
  const spanX = Math.max(0, width / 2 - margin);
  const spanZ = Math.max(0, depth / 2 - margin);
  const spot = () => [x + (random() - 0.5) * 2 * spanX, z + (random() - 0.5) * 2 * spanZ] as const;
  const kind = random();
  if (spanX < 0.5 || spanZ < 0.5) return null;
  if (kind < 0.4) {
    const [tx, tz] = spot();
    return (
      <group>
        <TiledCube at={[tx, y, tz]} size={[0.9, 0.7, 0.9]} top="woolGrey" side="oakLog" />
        <Cube at={[tx, y + 0.7, tz]} size={[0.5, 0.15, 0.5]} top="ironBlock" side="ironBlock" />
      </group>
    );
  }
  if (kind < 0.75) {
    const count = 2 + Math.floor(random() * 2);
    return (
      <group>
        {Array.from({ length: count }, (_, i) => {
          const [vx, vz] = spot();
          return <Cube key={i} at={[vx, y, vz]} size={[0.4, 0.3 + random() * 0.3, 0.4]} top="ironBlock" side="ironBlock" />;
        })}
      </group>
    );
  }
  return null;
}

/**
 * One far tower: tiered mass, corner pilasters on the podium, a trim band between every tier, and
 * an antenna on the crown — so it reads as something built from blocks, not a single smooth slab.
 */
function FarTower({ x, z, width, depth, top, body, roofTop, trim, seed }: { x: number; z: number; width: number; depth: number; top: number; body: Tile; roofTop: Tile; trim: Tile; seed: number }) {
  const pillar = Math.min(width, depth) * 0.18;
  const corners = [
    [width / 2 - pillar / 2, depth / 2 - pillar / 2],
    [-(width / 2 - pillar / 2), depth / 2 - pillar / 2],
    [width / 2 - pillar / 2, -(depth / 2 - pillar / 2)],
    [-(width / 2 - pillar / 2), -(depth / 2 - pillar / 2)],
  ] as const;
  // Each tier's trim band fills the gap between its body top and the next tier's base exactly,
  // rather than sitting on the same ground as the tier above it: a shared boundary, not an overlap.
  const TRIM = 0.25;
  let y = 0;
  const tiers = TIERS.map(({ rise, scale }) => {
    const h = top * rise;
    const bodyH = Math.max(0.1, h - TRIM);
    const tier = { y, h, bodyH, w: width * scale, d: depth * scale };
    y += h;
    return tier;
  });
  const crown = tiers[tiers.length - 1] as (typeof tiers)[number];
  return (
    <group>
      {tiers.map((tier, i) => (
        <group key={i}>
          <TiledCube at={[x, tier.y, z]} size={[tier.w, tier.bodyH, tier.d]} top={roofTop} side={body} />
          <Cube at={[x, tier.y + tier.bodyH, z]} size={[tier.w + 0.25, tier.h - tier.bodyH, tier.d + 0.25]} top={trim} side={trim} />
        </group>
      ))}
      {corners.map(([dx, dz]) => (
        <TiledCube key={`${dx}${dz}`} at={[x + dx, 0, z + dz]} size={[pillar, tiers[0]!.h, pillar]} top={trim} side={trim} />
      ))}
      {corners.map(([dx, dz]) => (
        <Cube
          key={`roof${dx}${dz}`}
          at={[x + (dx * crown.w) / width, crown.y + crown.h + 0.25, z + (dz * crown.d) / depth]}
          size={[pillar, 0.6, pillar]}
          top={trim}
          side={trim}
        />
      ))}
      <Beam from={[x, crown.y + crown.h + 0.25, z]} to={[x, crown.y + crown.h + 2.2, z]} thick={0.1} tile={trim} />
      <RoofClutter x={x} y={crown.y + crown.h + 0.25} z={z} width={crown.w} depth={crown.d} seed={seed} />
    </group>
  );
}

/** Towers past the edge of the world, so the city runs on to the horizon behind the office. */
function FarTowers({ night }: { night: boolean }) {
  const towers = useMemo(() => {
    const near = new Set(cityTowers().map(({ x, z }) => `${x},${z}`));
    const candidates = buildBackdropTowers(60).filter(({ x, z }) => !near.has(`${x},${z}`) && (Math.abs(x) > 46 || z < -46));
    // Skip any tower whose (padded) footprint overlaps one already placed, so neighbours never clip through each other.
    const placed: { x1: number; x2: number; z1: number; z2: number }[] = [];
    return candidates.filter(({ x, z, width, depth }) => {
      const r = { x1: x - width / 2 - 1, x2: x + width / 2 + 1, z1: z - depth / 2 - 1, z2: z + depth / 2 + 1 };
      if (placed.some((p) => p.x1 < r.x2 && p.x2 > r.x1 && p.z1 < r.z2 && p.z2 > r.z1)) return false;
      placed.push(r);
      return true;
    });
  }, []);
  return (
    <group>
      {towers.map(({ x, z, width, depth, top }, i) => {
        const style = BUILDING_STYLES[i % BUILDING_STYLES.length] as (typeof BUILDING_STYLES)[number];
        const body = night && style.body === 'facade' ? 'facadeLit' : style.body;
        return <FarTower key={i} x={x} z={z} width={width} depth={depth} top={top} body={body} roofTop={style.top} trim={style.trim} seed={i * 97 + 11} />;
      })}
    </group>
  );
}

/** The office tower downtown: the street, the lot, the towers behind and the tower itself. */
export function BlockCityGrounds({ time }: { time: Time }) {
  const night = time === 'night';
  const world = cityWorld();
  useEffect(() => {
    lightWindows(night);
    return () => lightWindows(false);
  }, [night]);
  return (
    <group>
      <BlockTerrain world={world} />
      <BlockTower time={time} />
      <BlockDecor time={time} />
      <Traffic night={night} />
      <Lot night={night} />
      <StreetLamps night={night} />
      <FarTowers night={night} />
    </group>
  );
}

export function CitySky({ time }: { time: Time }) {
  return <BlockSky time={time} world={cityWorld()} />;
}

