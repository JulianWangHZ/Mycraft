import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';
import { BAR, barStool, CABANA, HOT_TUB, LIFEGUARD, LOUNGERS } from '../../../lib/scenes/pool-layout.js';
import type { Vec3 } from '../../../lib/scenes/types.js';
import { Cube, Flames, Notes, Post } from '../voxel/parts.js';

/** Torch on a pole: a fence post topped with a flame, lit after dark. */
function Torch({ at, night }: { at: Vec3; night: boolean }) {
  return (
    <group position={at}>
      <Post at={[0, 0, 0]} height={1.5} thick={0.1} />
      <group position={[0, 1.3, 0]} scale={0.6}>
        <Flames />
      </group>
      {night ? <pointLight position={[0, 1.8, 0]} color="#ffaa55" intensity={3} distance={4.5} decay={1.6} /> : null}
    </group>
  );
}

/** A bar stool: a log leg and a round seat of planks, its top at the height people sit at. */
function Stool({ at }: { at: Vec3 }) {
  return (
    <group position={at}>
      <Post at={[0, 0, 0]} height={0.6} thick={0.1} />
      <Cube at={[0, 0.6, 0]} size={[0.32, 0.06, 0.32]} top="planks" side="planks" />
    </group>
  );
}

/** Beach bar: a plank counter under a thatched roof on log posts, stools along the front, bottles on the back shelf. */
export function TikiBar({ night }: { night: boolean }) {
  const length = BAR.length;
  return (
    <group>
      <Cube at={[0, 0, 0.2]} size={[length, 0.95, 0.5]} top="planks" side="sprucePlanks" />
      <Cube at={[0, 0.95, 0.3]} size={[length + 0.2, 0.1, 0.72]} top="planks" side="planks" />
      <Cube at={[0, 0, -0.55]} size={[length, 0.9, 0.3]} top="planks" side="sprucePlanks" />
      {['#3a8a4a', '#c0392b', '#e9c34a', '#4a7ac0', '#e9e4d6', '#8a4a2c'].map((colour, i) => (
        <mesh key={colour} position={[-length / 2 + 0.35 + i * 0.46, 1.02, -0.55]}>
          <boxGeometry args={[0.08, 0.22, 0.08]} />
          <meshLambertMaterial color={colour} />
        </mesh>
      ))}
      {[-1, 1].flatMap((sx) => [-0.6, 0.9].map((z) => <Post key={`${sx}${z}`} at={[(sx * (length + 0.1)) / 2, 0, z]} height={2.2} thick={0.14} />))}
      {[0, 1, 2].map((step) => (
        <Cube key={step} at={[0, 2.2 + step * 0.2, 0.15]} size={[length + 1.0 - step * 0.8, 0.2, 2.2 - step * 0.6]} top="hayTop" side="haySide" />
      ))}
      {Array.from({ length: BAR.stools }, (_, i) => (
        <Stool key={i} at={barStool(i)} />
      ))}
      {night ? <pointLight position={[0, 1.8, 0.6]} color="#ffbf73" intensity={8} distance={6} decay={1.5} /> : null}
    </group>
  );
}

/** Grill: a furnace-fronted barbecue with a chopping counter beside it and a smoking fire. */
export function GrillStation({ night }: { night: boolean }) {
  return (
    <group position={[0, 0, -0.4]}>
      <Cube at={[-0.5, 0, 0]} size={[0.8, 0.9, 0.55]} top="furnaceSide" side="furnaceSide" front="furnaceFront" />
      <group position={[-0.5, 0.9, 0]} scale={0.7}>
        <Flames />
      </group>
      <Cube at={[0.45, 0, 0]} size={[0.9, 0.9, 0.55]} top="craftingTop" side="craftingSide" />
      <pointLight position={[-0.5, 1.2, 0.2]} color="#ff8a3d" intensity={night ? 3 : 1} distance={3} decay={1.6} />
    </group>
  );
}

/** Speakers that pulse to the beat. */
function Speaker({ at }: { at: Vec3 }) {
  const cone = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const beat = 1 + Math.max(0, Math.sin(clock.elapsedTime * 8)) * 0.08;
    cone.current?.scale.set(beat, beat, 1);
  });
  return (
    <group position={at}>
      <Cube at={[0, 0, 0]} size={[0.45, 1.0, 0.4]} top="jukeboxSide" side="jukeboxSide" />
      <mesh ref={cone} position={[0, 0.6, 0.205]}>
        <boxGeometry args={[0.26, 0.26, 0.02]} />
        <meshLambertMaterial color="#1d1d22" />
      </mesh>
    </group>
  );
}

/** DJ booth: decks on a jukebox stand, a speaker stack either side, notes rising off it. */
export function DjBooth({ night }: { night: boolean }) {
  return (
    <group position={[0, 0, -0.45]}>
      <Cube at={[0, 0, 0]} size={[1.3, 0.95, 0.55]} top="jukeboxTop" side="jukeboxSide" />
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, 0.97, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.03, 8]} />
          <meshLambertMaterial color="#24201e" />
        </mesh>
      ))}
      <Speaker at={[-0.95, 0, 0]} />
      <Speaker at={[0.95, 0, 0]} />
      <group position={[0, 0.3, 0]}>
        <Notes />
      </group>
      {night ? <pointLight position={[0, 1.6, 0.6]} color="#c18cff" intensity={5} distance={5} decay={1.5} /> : null}
    </group>
  );
}

/** Cabana: a striped wool canopy on four log posts over a cushioned daybed, curtains tied back. */
export function Cabana({ night }: { night: boolean }) {
  const { width, depth } = CABANA;
  return (
    <group>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Post key={`${sx}${sz}`} at={[(sx * width) / 2, 0, (sz * depth) / 2]} height={2.3} thick={0.14} />))}
      {Array.from({ length: 6 }, (_, i) => (
        <Cube key={i} at={[-width / 2 + (i + 0.5) * (width / 6), 2.3, 0]} size={[width / 6, 0.14, depth + 0.3]} top={i % 2 ? 'woolWhite' : 'woolBlue'} side={i % 2 ? 'woolWhite' : 'woolBlue'} />
      ))}
      <Cube at={[0, 0, -depth / 2 + 0.05]} size={[width, 2.1, 0.08]} top="woolWhite" side="woolWhite" />
      <Cube at={[0, 0, 0.05]} size={[width - 0.2, 0.36, depth - 0.3]} top="planks" side="planks" />
      <Cube at={[0, 0.36, 0.05]} size={[width - 0.3, 0.1, depth - 0.4]} top="woolWhite" side="woolWhite" />
      {[-0.5, 0.5].map((x) => (
        <Cube key={x} at={[x, 0.46, -depth / 2 + 0.35]} size={[0.5, 0.24, 0.16]} top="woolBlue" side="woolBlue" />
      ))}
      {night ? <pointLight position={[0, 1.9, 0.3]} color="#ffd9a0" intensity={3} distance={4} decay={1.6} /> : null}
    </group>
  );
}

const TUB_RING = 16;

/**
 * Hot tub: a raised ring of quartz with a step up to it, a bench round the inside and bubbling,
 * lit water. Built from blocks set round the circle, so it reads blocky but seats people round it.
 */
export function HotTub({ night }: { night: boolean }) {
  const { radius, rim, water, bench, floor } = HOT_TUB;
  const bubbles = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (bubbles.current) bubbles.current.position.y = water + 0.01 + Math.sin(clock.elapsedTime * 6) * 0.01;
  });
  return (
    <group>
      {Array.from({ length: TUB_RING }, (_, i) => {
        const a = (i / TUB_RING) * Math.PI * 2;
        const span = ((radius + 0.13) * Math.PI * 2) / TUB_RING + 0.04;
        return (
          <group key={i} position={[Math.cos(a) * (radius + 0.13), 0, Math.sin(a) * (radius + 0.13)]} rotation={[0, -a, 0]}>
            <Cube at={[0, 0, 0]} size={[0.26, rim, span]} top="quartzTop" side="quartzPillar" />
          </group>
        );
      })}
      <mesh position={[0, floor, 0]}>
        <cylinderGeometry args={[radius, radius, 0.02, TUB_RING]} />
        <meshLambertMaterial color="#4fb8d6" />
      </mesh>
      <mesh position={[0, bench / 2, 0]}>
        <cylinderGeometry args={[radius, radius, bench, TUB_RING, 1, true]} />
        <meshLambertMaterial color="#e9e4d6" />
      </mesh>
      <mesh ref={bubbles} position={[0, water, 0]}>
        <cylinderGeometry args={[radius, radius, 0.02, TUB_RING]} />
        <meshLambertMaterial color="#7fd6ee" transparent opacity={0.72} emissive="#2aa6b8" emissiveIntensity={night ? 0.6 : 0.15} />
      </mesh>
      <Cube at={[0, 0, radius + 0.55]} size={[0.8, 0.25, 0.3]} top="quartzTop" side="quartzPillar" />
      {night ? <pointLight position={[0, water - 0.2, 0]} color="#5fe0ff" intensity={6} distance={4} decay={1.5} /> : null}
    </group>
  );
}

/** A sun lounger: wool cushion on a plank frame, back propped up at the head end, facing +z. */
function Lounger({ at, colour }: { at: Vec3; colour: 'woolWhite' | 'woolBlue' | 'woolYellow' }) {
  return (
    <group position={at}>
      <Cube at={[0, 0.12, 0.4]} size={[0.62, 0.12, 1.1]} top="planks" side="planks" />
      <Cube at={[0, 0.24, 0.42]} size={[0.56, 0.07, 1.04]} top={colour} side={colour} />
      <group position={[0, 0.26, -0.12]} rotation={[0.85, 0, 0]}>
        <Cube at={[0, 0, -0.32]} size={[0.56, 0.08, 0.64]} top={colour} side={colour} />
      </group>
      {[-0.26, 0.26].flatMap((x) => [-0.1, 0.9].map((z) => <Cube key={`${x}${z}`} at={[x, 0, z]} size={[0.06, 0.12, 0.06]} top="oakLog" side="oakLog" />))}
    </group>
  );
}

/** Beach umbrella: a pole and a stepped wool canopy in two colours. */
function Umbrella({ at, colour }: { at: Vec3; colour: 'woolRed' | 'woolBlue' | 'woolYellow' }) {
  return (
    <group position={at}>
      <Post at={[0, 0, 0]} height={2.1} thick={0.08} />
      <Cube at={[0, 1.95, 0]} size={[1.9, 0.12, 1.9]} top={colour} side={colour} />
      <Cube at={[0, 2.07, 0]} size={[1.2, 0.12, 1.2]} top="woolWhite" side="woolWhite" />
      <Cube at={[0, 2.19, 0]} size={[0.5, 0.1, 0.5]} top={colour} side={colour} />
    </group>
  );
}

const CUSHIONS = ['woolWhite', 'woolBlue', 'woolYellow', 'woolWhite'] as const;
const SHADES = ['woolRed', 'woolBlue', 'woolYellow'] as const;

/** Loungers in a row along the front of the deck, with umbrellas between pairs. */
export function LoungerRow() {
  const half = (LOUNGERS.count - 1) / 2;
  return (
    <group>
      {Array.from({ length: LOUNGERS.count }, (_, i) => (
        <Lounger key={i} at={[(i - half) * LOUNGERS.gap, 0, 0]} colour={CUSHIONS[i % CUSHIONS.length] as (typeof CUSHIONS)[number]} />
      ))}
      {Array.from({ length: Math.ceil(LOUNGERS.count / 2) }, (_, i) => (
        <Umbrella key={i} at={[(i * 2 + 0.5 - half) * LOUNGERS.gap, 0, -0.75]} colour={SHADES[i % SHADES.length] as (typeof SHADES)[number]} />
      ))}
    </group>
  );
}

/** Two loungers under one umbrella, for a nap in the shade. */
export function LoungerPair() {
  return (
    <group>
      {[-0.6, 0.6].map((x) => (
        <Lounger key={x} at={[x, 0, 0]} colour="woolWhite" />
      ))}
      <Umbrella at={[0, 0, -0.8]} colour="woolRed" />
    </group>
  );
}

/** Lifeguard tower: a tall plank chair on log legs, with a red flag and a float ring. */
export function LifeguardTower() {
  const [x, , z] = LIFEGUARD;
  return (
    <group position={[x, 0, z]}>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Post key={`${sx}${sz}`} at={[sx * 0.3, 0, sz * 0.3]} height={1.3} thick={0.1} />))}
      <Cube at={[0, 1.3, 0]} size={[0.75, 0.1, 0.75]} top="planks" side="planks" />
      <Cube at={[0, 1.4, -0.3]} size={[0.75, 0.6, 0.1]} top="planks" side="planks" />
      <Post at={[0.33, 1.4, -0.33]} height={1.1} thick={0.05} />
      <Cube at={[0.53, 2.2, -0.33]} size={[0.38, 0.24, 0.03]} top="woolRed" side="woolRed" />
      <Cube at={[-0.42, 0.5, 0]} size={[0.06, 0.36, 0.36]} top="woolRed" side="woolWhite" />
    </group>
  );
}

/** Table tennis on the deck: a green plank top on log legs, a white line and a wool net. */
export function BlockPingPong() {
  return (
    <group>
      <Cube at={[0, 0.34, 0]} size={[0.66, 0.08, 1.14]} top="concreteCyan" side="planks" />
      <mesh position={[0, 0.425, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.02, 1.1]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <Cube at={[0, 0.42, 0]} size={[0.72, 0.1, 0.03]} top="woolWhite" side="woolWhite" />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Post key={`${sx}${sz}`} at={[sx * 0.26, 0, sz * 0.46]} height={0.34} thick={0.06} />))}
    </group>
  );
}

/** Torches round the deck, lit at night. */
const TORCHES: readonly Vec3[] = [
  [-9.2, 0, -3.4],
  [-9.2, 0, 4.6],
  [10.6, 0, 3.2],
  [1.6, 0, 8.6],
  [-6.6, 0, 8.6],
  [8.2, 0, 8.6],
  [0.6, 0, -7.2],
];

export function DeckTorches({ night }: { night: boolean }) {
  return (
    <group>
      {TORCHES.map((at) => (
        <Torch key={`${at}`} at={at} night={night} />
      ))}
    </group>
  );
}
