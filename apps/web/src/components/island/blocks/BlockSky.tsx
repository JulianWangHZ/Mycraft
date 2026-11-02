import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Vector3, type Group, type PerspectiveCamera } from 'three';
import { skySpot } from '../../../lib/island/sky-spot.js';
import { seeded } from '../../../lib/scenes/skyline.js';
import { topAt, type World } from '../../../lib/scenes/blocks/world.js';
import { tileTexture } from './materials.js';

type Time = 'day' | 'night';

const CLOUD_HEIGHT = 26;
const DRIFT = 0.25;
const SPAN = 160;

/** Flat slabs of cloud built from a few overlapping blocks each, drifting slowly sideways. */
function Clouds() {
  const group = useRef<Group>(null);
  const clouds = useMemo(() => {
    const random = seeded(33);
    return Array.from({ length: 18 }, () => ({
      at: [(random() - 0.5) * SPAN, CLOUD_HEIGHT + random() * 6, (random() - 0.5) * SPAN - 30] as [number, number, number],
      parts: Array.from({ length: 2 + Math.floor(random() * 3) }, () => ({
        offset: [(random() - 0.5) * 8, 0, (random() - 0.5) * 5] as [number, number, number],
        size: [4 + random() * 6, 1.2, 3 + random() * 4] as [number, number, number],
      })),
    }));
  }, []);
  useFrame((_, delta) => {
    group.current?.children.forEach((cloud) => {
      cloud.position.x += delta * DRIFT;
      if (cloud.position.x > SPAN / 2) cloud.position.x -= SPAN;
    });
  });
  return (
    <group ref={group}>
      {clouds.map(({ at, parts }, index) => (
        <group key={index} position={at}>
          {parts.map(({ offset, size }, p) => (
            <mesh key={p} position={offset}>
              <boxGeometry args={size} />
              <meshBasicMaterial map={tileTexture('woolWhite')} transparent opacity={0.92} fog={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** How far off the sun and moon hang, and how fast they glide to a new spot. */
const DISC = { distance: 150, glide: 3 } as const;

/**
 * A square sun by day, a square moon by night. It finds open sky in whatever the camera is
 * looking at, just over the hills, and glides there, so it stays in view from any angle.
 */
function Disc({ night, world }: { night: boolean; world: World }) {
  const group = useRef<Group>(null);
  const ahead = useMemo(() => new Vector3(), []);
  const spot = useRef({ heading: 0, rise: 0.3 });
  const terrainAt = useMemo(() => (x: number, z: number) => topAt(world, x, z), [world]);
  useFrame(({ camera, size }, delta) => {
    const node = group.current;
    if (!node) return;
    camera.getWorldDirection(ahead);
    const fov = ((camera as PerspectiveCamera).fov ?? 30) * (Math.PI / 180);
    const heading = Math.atan2(ahead.x, ahead.z);
    const top = Math.asin(ahead.y) + fov / 2;
    const halfWidth = Math.atan(Math.tan(fov / 2) * (size.width / Math.max(1, size.height)));
    const goal = skySpot([camera.position.x, camera.position.y, camera.position.z], heading, halfWidth, top, terrainAt) ?? { heading, rise: top - 0.1 };
    const step = Math.min(1, delta * DISC.glide);
    // Headings wrap round, so glide the short way.
    const turn = Math.atan2(Math.sin(goal.heading - spot.current.heading), Math.cos(goal.heading - spot.current.heading));
    spot.current.heading += turn * step;
    spot.current.rise += (goal.rise - spot.current.rise) * step;
    const across = Math.cos(spot.current.rise) * DISC.distance;
    node.position.set(
      camera.position.x + Math.sin(spot.current.heading) * across,
      camera.position.y + Math.sin(spot.current.rise) * DISC.distance,
      camera.position.z + Math.cos(spot.current.heading) * across,
    );
    node.lookAt(camera.position);
  });
  return (
    <group ref={group}>
      {/* Pixelated, hard-edged like every other block face: no soft gradient, matches the world's style. */}
      <mesh>
        <planeGeometry args={[9, 9]} />
        <meshBasicMaterial map={tileTexture(night ? 'moonDisc' : 'sunDisc')} transparent alphaTest={0.5} fog={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[12, 12]} />
        <meshBasicMaterial map={tileTexture(night ? 'moonDisc' : 'sunDisc')} transparent alphaTest={0.5} opacity={0.3} fog={false} />
      </mesh>
    </group>
  );
}

/** Sky of a block-world scene: a sun or moon that keeps to open sky over `world`, and clouds by day. */
export function BlockSky({ time, world }: { time: Time; world: World }) {
  const night = time === 'night';
  return (
    <>
      <Disc night={night} world={world} />
      {night ? null : <Clouds />}
    </>
  );
}
