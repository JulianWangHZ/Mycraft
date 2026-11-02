import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, type MutableRefObject } from 'react';
import type { Group } from 'three';
import { shade, type Look } from '../../../lib/characters/look.js';
import type { Pose } from '../../../lib/island/behavior.js';
import type { Extra, Headwear } from '../../../lib/scenes/types.js';
import type { Motion } from './motion.js';
import { ClownNose, ExtraPiece, Face, HEAD, HeadwearPiece, Skin } from './MiniParts.js';

const HIP = 0.24;
const SHOULDER = 0.47;
const NECK = 0.5;

export interface MiniProps {
  look: Look;
  shirt: string;
  pose: Pose;
  seated: boolean;
  /** Seated astride, legs hanging either side, as on a carousel horse. */
  astride?: boolean;
  headwear?: Headwear;
  headwearColor?: string;
  extra?: Extra;
  opacity?: number;
  still?: boolean;
  motion?: MutableRefObject<Motion>;
}

export interface Rig {
  root: Group;
  body: Group;
  head: Group;
  armL: Group;
  armR: Group;
  legL: Group;
  legR: Group;
}

function reset(rig: Rig) {
  for (const part of [rig.body, rig.head, rig.armL, rig.armR, rig.legL, rig.legR]) part.rotation.set(0, 0, 0);
  rig.root.position.y = 0;
  rig.root.rotation.z = 0;
  rig.body.position.y = 0;
}

/** One frame of a pose. `t` is seconds; poses are short loops so a crowd never looks frozen. */
export function animate(rig: Rig, pose: Pose, t: number, seated: boolean, walking: boolean, astride = false) {
  reset(rig);
  if (walking) {
    const swing = Math.sin(t * 11) * 0.7;
    rig.legL.rotation.x = swing;
    rig.legR.rotation.x = -swing;
    rig.armL.rotation.x = -swing * 0.8;
    rig.armR.rotation.x = swing * 0.8;
    rig.root.position.y = Math.abs(Math.sin(t * 11)) * 0.03;
    return;
  }
  if (seated && astride) {
    // Thighs splay out over the horse's flanks and the shins hang down, so nothing cuts into it.
    rig.legL.rotation.set(-0.35, 0, -0.75);
    rig.legR.rotation.set(-0.35, 0, 0.75);
    rig.body.position.y = -0.06;
  } else if (seated) {
    rig.legL.rotation.x = -Math.PI / 2;
    rig.legR.rotation.x = -Math.PI / 2;
    rig.body.position.y = -0.06;
  }
  switch (pose) {
    case 'type':
    case 'typeSlow': {
      const speed = pose === 'type' ? 18 : 7;
      rig.armL.rotation.x = -1.25 + Math.sin(t * speed) * 0.12;
      rig.armR.rotation.x = -1.25 + Math.sin(t * speed + Math.PI) * 0.12;
      rig.head.rotation.x = 0.08;
      break;
    }
    case 'think':
      rig.armR.rotation.x = -2.4;
      rig.armR.rotation.z = 0.35;
      rig.head.rotation.z = Math.sin(t * 1.4) * 0.1;
      rig.head.rotation.x = -0.12;
      break;
    case 'wave':
      rig.armR.rotation.z = 2.7 + Math.sin(t * 8) * 0.35;
      rig.root.position.y = Math.abs(Math.sin(t * 4)) * 0.03;
      rig.head.rotation.z = Math.sin(t * 4) * 0.08;
      break;
    case 'slump':
      rig.body.rotation.x = 0.45;
      rig.head.rotation.x = 0.4;
      rig.armL.rotation.x = -1.3;
      rig.armR.rotation.x = -1.3;
      break;
    case 'sip':
      rig.armR.rotation.x = -1.3 - Math.max(0, Math.sin(t * 1.2)) * 1.0;
      rig.armR.rotation.z = 0.2;
      break;
    case 'sing':
      rig.armR.rotation.x = -2.6;
      rig.armL.rotation.z = -0.5 + Math.sin(t * 3) * 0.3;
      rig.body.rotation.z = Math.sin(t * 3) * 0.1;
      break;
    case 'play':
      rig.root.position.y = Math.abs(Math.sin(t * 5)) * 0.1;
      rig.armL.rotation.z = -0.6 - Math.abs(Math.sin(t * 5)) * 1.2;
      rig.armR.rotation.z = 0.6 + Math.abs(Math.sin(t * 5)) * 1.2;
      break;
    case 'lounge':
      // A gentle lean; any more and the head sinks into the sofa back.
      rig.body.rotation.x = -0.1;
      rig.armL.rotation.x = -0.5;
      rig.armR.rotation.x = -0.5;
      rig.head.rotation.x = -0.1 + Math.sin(t * 0.8) * 0.05;
      break;
    case 'workout':
      rig.root.position.y = Math.abs(Math.sin(t * 10)) * 0.05;
      rig.armL.rotation.x = Math.sin(t * 10) * 0.9;
      rig.armR.rotation.x = -Math.sin(t * 10) * 0.9;
      break;
    case 'swim': {
      // Front crawl: arms windmill in turn, legs flutter, the body bobs and rolls a little.
      const stroke = t * 5;
      rig.body.rotation.x = 0.35;
      rig.body.rotation.z = Math.sin(stroke) * 0.12;
      rig.armL.rotation.x = -Math.PI + ((stroke % (Math.PI * 2)) - Math.PI);
      rig.armR.rotation.x = -Math.PI + (((stroke + Math.PI) % (Math.PI * 2)) - Math.PI);
      rig.legL.rotation.x = Math.sin(t * 14) * 0.35;
      rig.legR.rotation.x = -Math.sin(t * 14) * 0.35;
      rig.head.rotation.y = Math.sin(stroke) * 0.25;
      rig.root.position.y = Math.sin(t * 2.5) * 0.03;
      break;
    }
    case 'nap': {
      // Sitting and nodding off: head drops forward, jerks up a little, drops again.
      const nod = Math.max(0, Math.sin(t * 0.7));
      rig.body.rotation.x = 0.12;
      rig.head.rotation.x = 0.5 - nod * nod * 0.35;
      rig.armL.rotation.x = -0.6;
      rig.armR.rotation.x = -0.6;
      rig.armL.rotation.z = -0.15;
      rig.armR.rotation.z = 0.15;
      break;
    }
  }
}

function Limb({ size, colour, hand, look }: { size: [number, number, number]; colour: string; hand?: boolean; look: Look }) {
  return (
    <group>
      <RoundedBox args={size} radius={0.025} smoothness={2} position={[0, -size[1] / 2, 0]} castShadow>
        <meshStandardMaterial color={colour} roughness={0.75} />
      </RoundedBox>
      {hand ? (
        <RoundedBox args={[size[0] * 0.95, 0.06, size[2] * 0.95]} radius={0.02} smoothness={2} position={[0, -size[1] - 0.025, 0]}>
          <Skin look={look} />
        </RoundedBox>
      ) : null}
    </group>
  );
}

/**
 * A chunky chibi character: big rounded head with a face and hair, boxy torso, stubby arms and legs.
 * About 0.95 units tall with feet at the origin, facing +Z.
 */
export function Mini({ look, shirt, pose, seated, astride = false, headwear = 'none', headwearColor = '#ffffff', extra = 'none', opacity = 1, still = false, motion }: MiniProps) {
  const refs = {
    root: useRef<Group>(null),
    body: useRef<Group>(null),
    head: useRef<Group>(null),
    armL: useRef<Group>(null),
    armR: useRef<Group>(null),
    legL: useRef<Group>(null),
    legR: useRef<Group>(null),
  };
  const seed = useRef(Math.random() * 10);

  useFrame(({ clock }) => {
    const rig = Object.fromEntries(Object.entries(refs).map(([key, ref]) => [key, ref.current])) as unknown as Rig;
    if (Object.values(rig).some((part) => !part)) return;
    const t = still ? 0 : clock.elapsedTime + seed.current;
    animate(rig, pose, t, seated, motion?.current.walking ?? false, astride);
  });

  const transparent = opacity < 1;
  const collar = shade(shirt, 0.35);
  const female = look.gender === 'female';
  const torsoWidth = female ? 0.24 : 0.27;
  return (
    <group ref={refs.root}>
      {[-1, 1].map((side) => (
        <group key={side} ref={side < 0 ? refs.legL : refs.legR} position={[side * 0.065, HIP, 0]}>
          <Limb size={[0.09, 0.19, 0.105]} colour={look.skirt ? look.skin : look.pants} look={look} />
          <RoundedBox args={[0.1, 0.05, 0.14]} radius={0.02} smoothness={2} position={[0, -0.215, 0.015]} castShadow>
            <meshStandardMaterial color={look.shoes} roughness={0.5} />
          </RoundedBox>
        </group>
      ))}
      <group ref={refs.body}>
        <RoundedBox args={[torsoWidth, 0.27, 0.17]} radius={0.05} smoothness={3} position={[0, (HIP + NECK) / 2, 0]} castShadow>
          <meshStandardMaterial color={shirt} roughness={0.7} transparent={transparent} opacity={opacity} />
        </RoundedBox>
        <mesh position={[0, NECK - 0.012, 0]}>
          <boxGeometry args={[0.2, 0.025, 0.15]} />
          <meshStandardMaterial color={collar} roughness={0.7} />
        </mesh>
        {look.skirt ? (
          // A flared skirt over the hips; the legs below show bare skin with shoes.
          <mesh position={[0, HIP - 0.02, 0]} castShadow>
            <cylinderGeometry args={[torsoWidth / 2 + 0.01, torsoWidth / 2 + 0.07, 0.15, 16]} />
            <meshStandardMaterial color={look.pants} roughness={0.75} />
          </mesh>
        ) : null}
        <ExtraPiece kind={extra} />
        {[-1, 1].map((side) => (
          <group key={side} ref={side < 0 ? refs.armL : refs.armR} position={[side * (torsoWidth / 2 + 0.035), SHOULDER, 0]}>
            <Limb size={[0.075, 0.17, 0.085]} colour={shirt} hand look={look} />
          </group>
        ))}
        <group ref={refs.head} position={[0, NECK, 0]}>
          {headwear === 'mascot' ? null : (
            <>
              <RoundedBox args={[HEAD.width, HEAD.height, HEAD.depth]} radius={0.075} smoothness={4} position={[0, HEAD.centre, 0]} castShadow>
                <meshStandardMaterial color={look.skin} roughness={0.65} transparent={transparent} opacity={opacity} />
              </RoundedBox>
              <Face look={look} />
              {extra === 'clownNose' ? <ClownNose /> : null}
            </>
          )}
          <HeadwearPiece kind={headwear} color={headwearColor} look={look} />
        </group>
      </group>
    </group>
  );
}
