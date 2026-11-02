import { BLOCK, benchSpot, FARM, HUT, LAMPS, WELL } from '../../../lib/scenes/blocks/layout.js';
import { BED_HEIGHT, BED_SPACING, BENCH_HEIGHT, village } from '../../../lib/scenes/village.js';
import type { Spot, Vec3 } from '../../../lib/scenes/types.js';
import { Cube, Fence, FENCE, Flames, Notes, Post } from './parts.js';

/** The workbench a working agent stands at. */
export function Workbench({ spot }: { spot: Spot }) {
  const [x, y, z] = spot.position;
  const ahead = 0.5;
  return <Cube at={[x + Math.sin(spot.facing) * ahead, y, z + Math.cos(spot.facing) * ahead]} top="workbenchTop" side="workbenchSide" bottom="planks" turn={spot.facing} />;
}

function Campfire({ night }: { night: boolean }) {
  return (
    <group>
      {[-0.12, 0.12].map((dz) => (
        <Cube key={`x${dz}`} at={[0, 0, dz]} size={[0.7, 0.12, 0.12]} top="oakLog" side="oakLog" />
      ))}
      {[-0.12, 0.12].map((dx) => (
        <Cube key={`z${dx}`} at={[dx, 0.12, 0]} size={[0.12, 0.12, 0.7]} top="oakLog" side="oakLog" />
      ))}
      <Flames />
      <pointLight position={[0, 0.6, 0]} color="#ff9a3c" intensity={night ? 6 : 1.2} distance={night ? 7 : 3} decay={1.5} />
    </group>
  );
}

function Kitchen() {
  return (
    <group>
      <Cube at={[-0.25, 0, 0]} top="furnaceSide" side="furnaceSide" front="furnaceFront" />
      <Cube at={[0.25, 0, 0]} top="furnaceSide" side="furnaceSide" front="furnaceFront" />
      <Cube at={[0.8, 0, 0]} top="workbenchTop" side="workbenchSide" bottom="planks" />
      <Cube at={[-0.8, 0, 0]} size={[0.44, 0.44, 0.44]} top="planks" side="oakLog" />
    </group>
  );
}

function Jukebox() {
  return (
    <group>
      <Cube at={[0, 0, 0]} top="jukeboxTop" side="jukeboxSide" />
      {[-0.65, 0.65].map((dx) => (
        <Cube key={dx} at={[dx, 0, -0.1]} size={[0.4, 0.4, 0.4]} top="jukeboxSide" side="jukeboxSide" />
      ))}
      <Notes />
    </group>
  );
}

/** Straw dummies on posts, with pumpkin heads, for sparring practice. */
function TrainingYard() {
  return (
    <group>
      {[-0.45, 0.45].map((dx) => (
        <group key={dx} position={[dx, 0, 0]}>
          <Post at={[0, 0, 0]} height={0.6} />
          <Cube at={[0, 0.5, 0]} size={[0.36, 0.4, 0.24]} top="hayTop" side="haySide" />
          <Cube at={[0, 0.9, 0]} size={[0.26, 0.26, 0.26]} top="pumpkin" side="pumpkin" />
        </group>
      ))}
    </group>
  );
}

function HayBales() {
  return (
    <group>
      <Cube at={[-0.26, 0, 0]} top="hayTop" side="haySide" />
      <Cube at={[0.26, 0, 0.04]} top="hayTop" side="haySide" turn={0.1} />
      <Cube at={[0, 0, -0.5]} top="hayTop" side="haySide" turn={-0.08} />
      <Cube at={[-0.05, 0.5, -0.25]} top="hayTop" side="haySide" turn={0.3} />
    </group>
  );
}

/** Fence round the farm field, open at the front for a gate, with a scarecrow in the middle. */
function Farm() {
  const [cx, , cz] = village.activities.ballpit;
  const x1 = FARM.x1 - cx - 0.2;
  const x2 = FARM.x2 - cx + 0.2;
  const z1 = FARM.z1 - cz - 0.2;
  const z2 = FARM.z2 - cz + 0.2;
  const gate = (x1 + x2) / 2;
  return (
    <group>
      <Fence from={[x1, 0, z1]} to={[x2, 0, z1]} />
      <Fence from={[x1, 0, z1]} to={[x1, 0, z2]} />
      <Fence from={[x2, 0, z1]} to={[x2, 0, z2]} />
      <Fence from={[x1, 0, z2]} to={[gate - 0.5, 0, z2]} />
      <Fence from={[gate + 0.5, 0, z2]} to={[x2, 0, z2]} />
      <group position={[1.6, 0, 0.7]}>
        <Post at={[0, 0, 0]} height={1.1} />
        <Cube at={[0, 0.7, 0]} size={[0.7, 0.08, 0.08]} top="oakLog" side="oakLog" />
        <Cube at={[0, 1.05, 0]} size={[0.28, 0.28, 0.28]} top="pumpkin" side="pumpkin" />
      </group>
    </group>
  );
}

/** Cobbled well under a little roof, ringed by benches. */
function Well() {
  const ring: Vec3[] = [];
  for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) if (dx || dz) ring.push([dx * BLOCK, 0, dz * BLOCK]);
  return (
    <group>
      {ring.map((at) => (
        <Cube key={`${at}`} at={at} top="cobble" side="cobble" />
      ))}
      <mesh position={[0, 0.38, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BLOCK, BLOCK]} />
        <meshLambertMaterial color="#3f74d8" />
      </mesh>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Post key={`${sx}${sz}`} at={[sx * 0.65, 0.5, sz * 0.65]} height={1.0} />))}
      <Cube at={[0, 1.5, 0]} size={[1.8, 0.2, 1.8]} top="planks" side="planks" />
      {Array.from({ length: WELL.benches }, (_, i) => {
        const { position, facing } = benchSpot(i);
        const [x, , z] = position;
        return <Cube key={i} at={[x, 0, z]} size={[0.8, BENCH_HEIGHT, 0.4]} top="planks" side="planks" turn={facing} />;
      })}
    </group>
  );
}

/** An open-fronted hut with a row of beds. */
function Hut() {
  const width = HUT.beds * BED_SPACING + 0.6;
  return (
    <group>
      {Array.from({ length: HUT.beds }, (_, i) => (
        <group key={i} position={[(i - (HUT.beds - 1) / 2) * BED_SPACING, 0, 0]}>
          <Cube at={[0, 0, 0]} size={[0.6, BED_HEIGHT, 1.1]} top="woolRed" side="woolRed" bottom="planks" />
          <Cube at={[0, BED_HEIGHT, -0.38]} size={[0.56, 0.08, 0.3]} top="woolWhite" side="woolWhite" />
        </group>
      ))}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Post key={`${sx}${sz}`} at={[(sx * width) / 2, 0, sz * 0.9]} height={1.9} thick={0.2} />))}
      <Cube at={[0, 0, -0.95]} size={[width, 1.9, 0.12]} top="planks" side="planks" />
      {/* A stepped roof, each course of planks a block narrower than the one below. */}
      {[0, 1, 2].map((step) => (
        <Cube key={step} at={[0, 1.9 + step * 0.25, -0.1]} size={[width + 0.5 - step * 1.0, 0.25, 2.4]} top="sprucePlanks" side="sprucePlanks" />
      ))}
    </group>
  );
}

export const VILLAGE_PROPS = {
  coffee: Campfire,
  kitchen: Kitchen,
  ktv: Jukebox,
  gym: TrainingYard,
  massage: HayBales,
  ballpit: Farm,
  // The dock is built into the world itself; anglers need nothing more.
  pingpong: () => null,
  sofa: Well,
  nap: Hut,
} as const;


/** Lamp posts along the paths; they light up after dark. */
export function VillageLights({ night }: { night: boolean }) {
  return (
    <group>
      {LAMPS.map((at) => (
        <group key={`${at}`} position={at}>
          <Cube at={[0, 0, 0]} top="cobble" side="cobble" />
          <Post at={[0, BLOCK, 0]} height={1.0} thick={FENCE.post} />
          <Cube at={[0, 1.5, 0]} size={[0.32, 0.32, 0.32]} top="lamp" side="lamp" glow={night} />
          {night ? <pointLight position={[0, 1.6, 0]} color="#ffcf7a" intensity={4} distance={6} decay={1.5} /> : null}
        </group>
      ))}
    </group>
  );
}
