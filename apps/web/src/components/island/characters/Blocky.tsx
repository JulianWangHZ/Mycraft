import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { DataTexture, MeshLambertMaterial, NearestFilter, SRGBColorSpace, type Group } from 'three';
import { armFace, headFaces, legFace, SKIN_SIZE, torsoFace } from '../../../lib/characters/blocky-skin.js';
import type { Look } from '../../../lib/characters/look.js';
import { animate, type MiniProps, type Rig } from './Mini.js';

/** Proportions in scene units: legs and torso the same height, a big square head on top. */
const LIMB = 0.14;
const HIP = 0.28;
const NECK = 0.56;
const HEAD = 0.36;
const TORSO = { width: 0.28, depth: 0.14 } as const;

const textures = new Map<string, DataTexture>();

function texture(key: string, paint: () => Uint8Array): DataTexture {
  const hit = textures.get(key);
  if (hit) return hit;
  const made = new DataTexture(paint(), SKIN_SIZE, SKIN_SIZE);
  made.magFilter = NearestFilter;
  made.minFilter = NearestFilter;
  made.colorSpace = SRGBColorSpace;
  made.needsUpdate = true;
  textures.set(key, made);
  return made;
}

function lookKey(look: Look): string {
  return `${look.skin}${look.hair}${look.hairColor}${look.pants}${look.shoes}${look.glasses}${look.skirt}`;
}

/** Materials in box face order: right, left, top, bottom, front, back. */
function useSkin(look: Look, shirt: string, opacity: number) {
  return useMemo(() => {
    const key = lookKey(look);
    const make = (map: DataTexture) => new MeshLambertMaterial({ map, transparent: opacity < 1, opacity });
    const faces = headFaces(look);
    const head = (['side', 'side', 'top', 'bottom', 'front', 'back'] as const).map((face) => make(texture(`${key}:head:${face}`, () => faces[face])));
    const torso = make(texture(`torso:${shirt}`, () => torsoFace(shirt)));
    const arm = make(texture(`${key}:arm:${shirt}`, () => armFace(shirt, look)));
    const leg = make(texture(`${key}:leg`, () => legFace(look)));
    return { head, torso, arm, leg };
  }, [look, shirt, opacity]);
}

function Cap({ color }: { color: string }) {
  return (
    <group position={[0, HEAD, 0]}>
      <mesh position={[0, 0.03, 0]} castShadow>
        <boxGeometry args={[HEAD + 0.02, 0.07, HEAD + 0.02]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.005, HEAD / 2 + 0.07]}>
        <boxGeometry args={[HEAD * 0.8, 0.025, 0.14]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  );
}

/** A tight cap over the top and sides of the head, as swimmers wear. */
function SwimCap({ color }: { color: string }) {
  return (
    <mesh position={[0, HEAD * 0.82, 0]} castShadow>
      <boxGeometry args={[HEAD + 0.02, HEAD * 0.4, HEAD + 0.02]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

/** A square float ring round the waist, red and white in quarters. */
function FloatRing() {
  const span = TORSO.width + 0.2;
  return (
    <group position={[0, HIP + 0.06, 0]}>
      {[0, 1, 2, 3].map((side) => (
        <mesh key={side} rotation={[0, (side * Math.PI) / 2, 0]} position={[Math.sin((side * Math.PI) / 2) * (span / 2), 0, Math.cos((side * Math.PI) / 2) * (span / 2)]}>
          <boxGeometry args={[span + 0.08, 0.09, 0.08]} />
          <meshLambertMaterial color={side % 2 ? '#ffffff' : '#e8574a'} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A figure built from six boxes, every face a small pixel painting: square head, flat torso, and
 * arms and legs that swing from the shoulder and hip. It plays the same poses as the rounded figure.
 * About 0.92 units tall with feet at the origin, facing +Z.
 */
export function Blocky({ look, shirt, pose, seated, astride = false, headwear = 'none', headwearColor = '#ffffff', extra = 'none', opacity = 1, still = false, motion }: MiniProps) {
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
  const skin = useSkin(look, shirt, opacity);
  useFrame(({ clock }) => {
    const rig = Object.fromEntries(Object.entries(refs).map(([key, ref]) => [key, ref.current])) as unknown as Rig;
    if (Object.values(rig).some((part) => !part)) return;
    const t = still ? 0 : clock.elapsedTime + seed.current;
    animate(rig, pose, t, seated, motion?.current.walking ?? false, astride);
  });
  return (
    <group ref={refs.root}>
      {[-1, 1].map((side) => (
        <group key={side} ref={side < 0 ? refs.legL : refs.legR} position={[(side * LIMB) / 2, HIP, 0]}>
          <mesh position={[0, -HIP / 2, 0]} material={skin.leg} castShadow>
            <boxGeometry args={[LIMB, HIP, LIMB]} />
          </mesh>
        </group>
      ))}
      <group ref={refs.body}>
        <mesh position={[0, (HIP + NECK) / 2, 0]} material={skin.torso} castShadow>
          <boxGeometry args={[TORSO.width, NECK - HIP, TORSO.depth]} />
        </mesh>
        {extra === 'floatRing' ? <FloatRing /> : null}
        {extra === 'apron' ? (
          <mesh position={[0, HIP + 0.1, TORSO.depth / 2 + 0.006]}>
            <boxGeometry args={[TORSO.width - 0.04, 0.2, 0.01]} />
            <meshLambertMaterial color="#e9e1cf" />
          </mesh>
        ) : null}
        {[-1, 1].map((side) => (
          <group key={side} ref={side < 0 ? refs.armL : refs.armR} position={[side * (TORSO.width / 2 + LIMB / 2), NECK - 0.02, 0]}>
            <mesh position={[0, -(NECK - HIP) / 2 + 0.02, 0]} material={skin.arm} castShadow>
              <boxGeometry args={[LIMB, NECK - HIP, LIMB]} />
            </mesh>
          </group>
        ))}
        <group ref={refs.head} position={[0, NECK, 0]}>
          <mesh position={[0, HEAD / 2, 0]} material={skin.head} castShadow>
            <boxGeometry args={[HEAD, HEAD, HEAD]} />
          </mesh>
          {headwear === 'cap' ? <Cap color={headwearColor} /> : null}
          {headwear === 'swimcap' ? <SwimCap color={headwearColor} /> : null}
        </group>
      </group>
    </group>
  );
}
