import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BoxGeometry, type Group } from 'three';
import type { Tile } from '../../../lib/scenes/blocks/blocks.js';
import { BLOCK } from '../../../lib/scenes/blocks/layout.js';
import type { Vec3 } from '../../../lib/scenes/types.js';
import { blockFaces } from './materials.js';

/** Building pieces shared by every block-world scene's props. */

export interface CubeProps {
  /** Centre of the bottom face. */
  at: Vec3;
  size?: Vec3;
  top: Tile;
  side?: Tile;
  bottom?: Tile;
  front?: Tile;
  turn?: number;
  glow?: boolean;
}

/** A box dressed as a block. Most props are a few of these stacked together. */
export function Cube({ at: [x, y, z], size = [BLOCK, BLOCK, BLOCK], top, side, bottom, front, turn = 0, glow = false }: CubeProps) {
  return (
    <mesh position={[x, y + size[1] / 2, z]} rotation={[0, turn, 0]} material={blockFaces(top, side, bottom, front, glow)} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

/** Three.js's box face order: right, left, top, bottom, front, back, four vertices each. */
function tileBoxUV(geometry: BoxGeometry, size: Vec3) {
  const [width, height, depth] = size;
  const repeats: Vec3[] = [
    [depth, height, 0],
    [depth, height, 0],
    [width, depth, 0],
    [width, depth, 0],
    [width, height, 0],
    [width, height, 0],
  ];
  const uv = geometry.attributes.uv;
  if (!uv) return;
  for (let face = 0; face < 6; face += 1) {
    const [ru, rv] = repeats[face] as [number, number, number];
    for (let v = 0; v < 4; v += 1) {
      const i = face * 4 + v;
      uv.setXY(i, uv.getX(i) * (ru / BLOCK), uv.getY(i) * (rv / BLOCK));
    }
  }
  uv.needsUpdate = true;
}

/**
 * A box dressed as a block, like `Cube`, but its texture repeats once per block along each face
 * instead of stretching one tile over the whole thing — for a big slab to read as built from many
 * blocks (a tower's facade) rather than a single tile smeared across it.
 */
export function TiledCube({ at: [x, y, z], size = [BLOCK, BLOCK, BLOCK], top, side, bottom, front, glow = false }: CubeProps) {
  const geometry = useMemo(() => {
    const box = new BoxGeometry(...size);
    tileBoxUV(box, size);
    return box;
  }, [size[0], size[1], size[2]]);
  return (
    <mesh position={[x, y + size[1] / 2, z]} geometry={geometry} material={blockFaces(top, side, bottom, front, glow)} castShadow receiveShadow />
  );
}

/** A thin upright log, for fence posts, lamp posts and roof supports. */
export function Post({ at, height, thick = 0.12 }: { at: Vec3; height: number; thick?: number }) {
  return <Cube at={at} size={[thick, height, thick]} top="oakLogTop" side="oakLog" />;
}

/** Flames that never hold still, scaled with a few out-of-step sine waves. */
export function Flames() {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    group.current?.children.forEach((flame, i) => {
      flame.scale.y = 0.75 + Math.sin(t * (7 + i * 2.3) + i) * 0.2 + Math.sin(t * 13 + i * 4) * 0.08;
    });
  });
  return (
    <group ref={group} position={[0, 0.2, 0]}>
      {[
        { at: [0, 0, 0], size: 0.22, color: '#ff7a1c' },
        { at: [0.07, 0, 0.05], size: 0.14, color: '#ffc23a' },
        { at: [-0.06, 0, -0.04], size: 0.12, color: '#ffe680' },
      ].map(({ at, size, color }, i) => (
        <mesh key={i} position={at as Vec3}>
          <boxGeometry args={[size, size * 2, size]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Notes float up off the jukebox and fade back in, one after another. */
export function Notes() {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    group.current?.children.forEach((note, i) => {
      const t = (clock.elapsedTime * 0.5 + i / 3) % 1;
      note.position.set(Math.sin(t * 6 + i) * 0.25, 0.7 + t * 1.1, 0);
      note.scale.setScalar(Math.sin(t * Math.PI));
    });
  });
  return (
    <group ref={group}>
      {['#5ad16a', '#f2c14e', '#7aa8ff'].map((color) => (
        <mesh key={color}>
          <boxGeometry args={[0.1, 0.16, 0.04]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export const FENCE = { post: 0.125, height: 0.5, rails: [0.19, 0.38], rail: 0.06 } as const;

/** A run of fence between two points on the ground: posts at every block, two rails between them. */
export function Fence({ from, to }: { from: Vec3; to: Vec3 }) {
  const length = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const count = Math.max(1, Math.round(length / BLOCK));
  const turn = Math.atan2(to[0] - from[0], to[2] - from[2]);
  const mid: Vec3 = [(from[0] + to[0]) / 2, 0, (from[2] + to[2]) / 2];
  return (
    <group>
      {Array.from({ length: count + 1 }, (_, i) => {
        const t = i / count;
        return <Post key={i} at={[from[0] + (to[0] - from[0]) * t, 0, from[2] + (to[2] - from[2]) * t]} height={FENCE.height} thick={FENCE.post} />;
      })}
      {FENCE.rails.map((y) => (
        <Cube key={y} at={[mid[0], y, mid[2]]} size={[FENCE.rail / 2, FENCE.rail * 1.5, length]} top="planks" side="planks" turn={turn} />
      ))}
    </group>
  );
}

/** A square beam of blocks from one point to another, for frames, spokes and braces. */
export function Beam({ from, to, thick = 0.14, tile = 'quartzPillar', end = tile }: { from: Vec3; to: Vec3; thick?: number; tile?: Tile; end?: Tile }) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dy, dz);
  // Point the box's +y along the beam: yaw round to face it, then pitch down from upright.
  const yaw = Math.atan2(dx, dz);
  const pitch = Math.acos(Math.max(-1, Math.min(1, dy / (length || 1))));
  return (
    <group position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]} rotation={[0, yaw, 0]}>
      <mesh rotation={[pitch, 0, 0]} material={blockFaces(end, tile)} castShadow>
        <boxGeometry args={[thick, length, thick]} />
      </mesh>
    </group>
  );
}
