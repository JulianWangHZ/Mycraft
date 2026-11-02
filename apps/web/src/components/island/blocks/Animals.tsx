import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ReactNode } from 'react';
import { Vector3, type Group } from 'three';
import { grazeTarget, placeAnimals, VILLAGE_HERDS, type Animal, type AnimalKind, type Herd } from '../../../lib/scenes/blocks/animals.js';
import { groundAt, type World } from '../../../lib/scenes/blocks/world.js';

const SPEED: Readonly<Record<AnimalKind, number>> = { sheep: 0.45, cow: 0.4, pig: 0.45, chicken: 0.5, wolf: 0.7, rabbit: 0.6, turtle: 0.15 };
/** Rabbits hop rather than walk. */
const HOP = 0.08;

type Size = [number, number, number];
type At = [number, number, number];

function Box({ at, size, color }: { at: At; size: Size; color: string }) {
  return (
    <mesh position={at} castShadow>
      <boxGeometry args={size} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

interface Build {
  body: ReactNode;
  head: ReactNode;
  /** Where the neck joins, so the head can dip to graze. */
  neck: At;
  legs: { size: Size; color: string; spread: [number, number]; pairs: number };
}

/** Each animal is a body on legs with a head that dips to graze; only the blocks differ. */
const BUILDS: Readonly<Record<AnimalKind, Build>> = {
  sheep: {
    body: <Box at={[0, 0.36, 0]} size={[0.38, 0.32, 0.56]} color="#ece9e2" />,
    head: (
      <>
        <Box at={[0, 0, 0.1]} size={[0.2, 0.2, 0.18]} color="#c9c3b8" />
        <Box at={[0, 0.02, 0.19]} size={[0.14, 0.1, 0.02]} color="#d8b9a0" />
        {[-0.05, 0.05].map((x) => (
          <Box key={x} at={[x, 0.04, 0.2]} size={[0.03, 0.03, 0.01]} color="#1f1f1f" />
        ))}
      </>
    ),
    neck: [0, 0.44, 0.26],
    legs: { size: [0.09, 0.22, 0.09], color: '#d8b9a0', spread: [0.11, 0.18], pairs: 2 },
  },
  cow: {
    body: (
      <>
        <Box at={[0, 0.42, 0]} size={[0.42, 0.36, 0.66]} color="#4a3324" />
        <Box at={[0.212, 0.46, 0.05]} size={[0.01, 0.18, 0.22]} color="#efe9df" />
        <Box at={[-0.212, 0.4, -0.14]} size={[0.01, 0.16, 0.18]} color="#efe9df" />
      </>
    ),
    head: (
      <>
        <Box at={[0, 0, 0.1]} size={[0.26, 0.24, 0.2]} color="#4a3324" />
        <Box at={[0, -0.06, 0.21]} size={[0.16, 0.1, 0.03]} color="#e7c3b0" />
        {[-1, 1].map((side) => (
          <Box key={side} at={[side * 0.15, 0.12, 0.08]} size={[0.05, 0.08, 0.04]} color="#e2dccd" />
        ))}
      </>
    ),
    neck: [0, 0.5, 0.32],
    legs: { size: [0.1, 0.26, 0.1], color: '#3b2a1e', spread: [0.13, 0.22], pairs: 2 },
  },
  pig: {
    body: <Box at={[0, 0.27, 0]} size={[0.34, 0.28, 0.5]} color="#efa3a6" />,
    head: (
      <>
        <Box at={[0, 0, 0.1]} size={[0.24, 0.22, 0.2]} color="#efa3a6" />
        <Box at={[0, -0.03, 0.21]} size={[0.12, 0.08, 0.03]} color="#e07f88" />
      </>
    ),
    neck: [0, 0.3, 0.24],
    legs: { size: [0.09, 0.14, 0.09], color: '#e48f95', spread: [0.1, 0.16], pairs: 2 },
  },
  wolf: {
    body: (
      <>
        <Box at={[0, 0.32, -0.02]} size={[0.24, 0.22, 0.5]} color="#c9c6c0" />
        <Box at={[0, 0.34, 0.12]} size={[0.3, 0.28, 0.2]} color="#d8d5cf" />
        <group position={[0, 0.38, -0.27]} rotation={[0.7, 0, 0]}>
          <Box at={[0, 0, -0.12]} size={[0.08, 0.08, 0.26]} color="#b8b4ad" />
        </group>
      </>
    ),
    head: (
      <>
        <Box at={[0, 0, 0.08]} size={[0.22, 0.2, 0.16]} color="#c9c6c0" />
        <Box at={[0, -0.04, 0.2]} size={[0.11, 0.09, 0.1]} color="#b8b4ad" />
        <Box at={[0, -0.01, 0.255]} size={[0.04, 0.03, 0.01]} color="#1f1f1f" />
        {[-1, 1].map((side) => (
          <Box key={side} at={[side * 0.07, 0.13, 0.06]} size={[0.06, 0.07, 0.03]} color="#a8a49d" />
        ))}
        {[-1, 1].map((side) => (
          <Box key={`e${side}`} at={[side * 0.06, 0.03, 0.165]} size={[0.035, 0.025, 0.01]} color="#2a2a2a" />
        ))}
      </>
    ),
    neck: [0, 0.4, 0.24],
    legs: { size: [0.07, 0.22, 0.07], color: '#b8b4ad', spread: [0.07, 0.18], pairs: 2 },
  },
  turtle: {
    body: (
      <>
        <Box at={[0, 0.13, -0.02]} size={[0.36, 0.12, 0.42]} color="#3f7a4a" />
        <Box at={[0, 0.2, -0.02]} size={[0.26, 0.04, 0.32]} color="#5a9a5a" />
        <Box at={[0, 0.08, -0.02]} size={[0.34, 0.03, 0.4]} color="#e2d49c" />
      </>
    ),
    head: (
      <>
        <Box at={[0, 0, 0.06]} size={[0.12, 0.1, 0.12]} color="#7fb07a" />
        {[-1, 1].map((side) => (
          <Box key={side} at={[side * 0.045, 0.02, 0.121]} size={[0.025, 0.02, 0.005]} color="#1f1f1f" />
        ))}
      </>
    ),
    neck: [0, 0.12, 0.2],
    legs: { size: [0.1, 0.08, 0.14], color: '#7fb07a', spread: [0.19, 0.14], pairs: 2 },
  },
  rabbit: {
    body: (
      <>
        <Box at={[0, 0.12, 0]} size={[0.14, 0.12, 0.2]} color="#a77d55" />
        <Box at={[0, 0.15, -0.11]} size={[0.06, 0.06, 0.04]} color="#efe9df" />
      </>
    ),
    head: (
      <>
        <Box at={[0, 0.02, 0.04]} size={[0.1, 0.1, 0.09]} color="#a77d55" />
        {[-1, 1].map((side) => (
          <Box key={side} at={[side * 0.025, 0.12, 0.02]} size={[0.025, 0.11, 0.02]} color="#9a7049" />
        ))}
        <Box at={[0, 0.0, 0.09]} size={[0.025, 0.02, 0.01]} color="#e9a3a8" />
      </>
    ),
    neck: [0, 0.16, 0.1],
    legs: { size: [0.04, 0.06, 0.06], color: '#946a43', spread: [0.04, 0.06], pairs: 2 },
  },
  chicken: {
    body: (
      <>
        <Box at={[0, 0.2, 0]} size={[0.16, 0.14, 0.2]} color="#f3f1ea" />
        {[-1, 1].map((side) => (
          <Box key={side} at={[side * 0.09, 0.21, -0.01]} size={[0.02, 0.1, 0.14]} color="#e3e0d6" />
        ))}
      </>
    ),
    head: (
      <>
        <Box at={[0, 0.06, 0.03]} size={[0.1, 0.14, 0.08]} color="#f3f1ea" />
        <Box at={[0, 0.06, 0.09]} size={[0.06, 0.03, 0.05]} color="#f0b23a" />
        <Box at={[0, 0.02, 0.085]} size={[0.03, 0.04, 0.02]} color="#d33a2f" />
      </>
    ),
    neck: [0, 0.24, 0.08],
    legs: { size: [0.025, 0.13, 0.025], color: '#f0b23a', spread: [0.04, 0], pairs: 1 },
  },
};

function Creature({ world, animal, index, still }: { world: World; animal: Animal; index: number; still: boolean }) {
  const group = useRef<Group>(null);
  const head = useRef<Group>(null);
  const legs = useRef<Group>(null);
  const goal = useMemo(() => new Vector3(), []);
  const build = BUILDS[animal.kind];
  useFrame(({ clock }, delta) => {
    const node = group.current;
    if (!node) return;
    goal.set(...grazeTarget(animal, index, still ? 0 : clock.elapsedTime));
    const dx = goal.x - node.position.x;
    const dz = goal.z - node.position.z;
    const distance = Math.hypot(dx, dz);
    const walking = !still && distance > 0.05;
    if (walking) {
      const step = Math.min(1, (SPEED[animal.kind] * delta) / distance);
      node.position.x += dx * step;
      node.position.z += dz * step;
      node.rotation.y = Math.atan2(dx, dz);
    }
    // Feet follow the ground, block by block.
    const hop = animal.kind === 'rabbit' && walking ? Math.abs(Math.sin(clock.elapsedTime * 9 + index)) * HOP : 0;
    node.position.y = groundAt(world, node.position.x, node.position.z) + hop;
    const t = clock.elapsedTime * 9 + index;
    legs.current?.children.forEach((leg, i) => {
      leg.rotation.x = walking ? Math.sin(t + (i % 2) * Math.PI + Math.floor(i / 2) * Math.PI) * 0.6 : 0;
    });
    if (head.current) head.current.rotation.x = walking ? 0 : 0.55 + Math.sin(clock.elapsedTime * 2 + index) * 0.15;
  });
  const { size, color, spread, pairs } = build.legs;
  const legSpots: At[] = [];
  for (let p = 0; p < pairs; p += 1) for (const side of [-1, 1]) legSpots.push([side * spread[0], size[1], pairs === 1 ? 0 : (p ? -1 : 1) * spread[1]]);
  return (
    <group ref={group} position={animal.home}>
      {build.body}
      <group ref={legs}>
        {legSpots.map((at) => (
          <group key={`${at}`} position={at}>
            <Box at={[0, -size[1] / 2, 0]} size={size} color={color} />
          </group>
        ))}
      </group>
      <group ref={head} position={build.neck}>
        {build.head}
      </group>
    </group>
  );
}

/** Farm animals grazing round the village, wolves prowling the woods and rabbits on open ground. */
export function Animals({ world, herds = VILLAGE_HERDS, still = false }: { world: World; herds?: readonly Herd[]; still?: boolean }) {
  const animals = useMemo(() => placeAnimals(world, herds), [world, herds]);
  return (
    <group>
      {animals.map((animal, index) => (
        <Creature key={index} world={world} animal={animal} index={index} still={still} />
      ))}
    </group>
  );
}
