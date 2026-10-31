import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Mesh } from 'three';
import { SLIDE, SLIDE_LEGS, slideCurve, SPLASH_POOL, WATER } from '../../../lib/scenes/pool-layout.js';
import { Cube, Post } from '../voxel/parts.js';

/** How many straight pieces the flume is built from, start to splash. */
const PIECES = 34;
const WIDTH = SLIDE.width;
const WALL = 0.16;
const STEPS = 12;

/**
 * The flume as a chain of short trough pieces: a floor and two low walls each, turned to follow
 * the slide's curve, so it reads as built from blocks yet riders still glide down it smoothly.
 */
function Flume() {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => {
        const a = slideCurve.getPointAt(i / PIECES);
        const b = slideCurve.getPointAt((i + 1) / PIECES);
        const run = Math.hypot(b.x - a.x, b.z - a.z);
        return {
          at: [(a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2] as const,
          heading: Math.atan2(b.x - a.x, b.z - a.z),
          pitch: Math.atan2(a.y - b.y, run),
          length: Math.hypot(run, b.y - a.y) + 0.04,
        };
      }),
    [],
  );
  return (
    <group>
      {pieces.map(({ at, heading, pitch, length }, i) => (
        <group key={i} position={at} rotation={[0, heading, 0]}>
          <group rotation={[pitch, 0, 0]}>
            <Cube at={[0, -0.06, 0]} size={[WIDTH, 0.06, length]} top="concreteYellow" side="concreteOrange" />
            {[-1, 1].map((side) => (
              <Cube key={side} at={[(side * (WIDTH + 0.06)) / 2, -0.06, 0]} size={[0.06, WALL + 0.06, length]} top="concreteOrange" side="concreteOrange" />
            ))}
            <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[WIDTH * 0.6, length]} />
              <meshLambertMaterial color="#8fe3ff" transparent opacity={0.55} depthWrite={false} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

/** Upright supports under the flume wherever it is off the deck and clear of the splash pool. */
function supports() {
  return Array.from({ length: 6 }, (_, i) => slideCurve.getPointAt(0.18 + i * 0.13)).filter(
    (p) => p.y > 0.4 && !(p.x > SPLASH_POOL.x1 - 0.3 && p.x < SPLASH_POOL.x2 + 0.3 && p.z > SPLASH_POOL.z1 - 0.3 && p.z < SPLASH_POOL.z2 + 0.3),
  );
}

/** Water slide: a cyan block tower with a ladder of steps up the back, a striped roof, and the flume down to the splash pool. */
export function BlockSlide({ night }: { night: boolean }) {
  const [tx, , tz] = SLIDE.tower;
  const top = SLIDE.top;
  const legs = useMemo(() => supports(), []);
  const end = useMemo(() => slideCurve.getPointAt(1), []);
  const splash = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!splash.current) return;
    const t = (clock.elapsedTime * 1.4) % 1;
    splash.current.scale.setScalar(0.4 + t * 1.2);
    (splash.current.material as { opacity: number }).opacity = 0.5 * (1 - t);
  });
  return (
    <group>
      {SLIDE_LEGS.map(([x, , z]) => (
        <Cube key={`${x},${z}`} at={[x, 0, z]} size={[0.2, top + 1.3, 0.2]} top="concreteCyan" side="concreteCyan" />
      ))}
      <Cube at={[tx, top - 0.14, tz]} size={[1.8, 0.14, 1.8]} top="deck" side="concreteWhite" />
      {/* Glass rails round the sides and back; the front, where the flume leaves, stays open. */}
      {[
        [tx - 0.85, tz, Math.PI / 2],
        [tx, tz - 0.85, 0],
        [tx + 0.85, tz, Math.PI / 2],
      ].map(([x, z, turn]) => (
        <Cube key={`${x},${z}`} at={[x as number, top, z as number]} size={[1.7, 0.8, 0.05]} top="glass" side="glass" turn={turn as number} />
      ))}
      {[0, 1, 2].map((step) => (
        <Cube key={step} at={[tx, top + 1.3 + step * 0.16, tz]} size={[2.0 - step * 0.6, 0.16, 2.0 - step * 0.6]} top={step % 2 ? 'woolWhite' : 'woolBlue'} side={step % 2 ? 'woolWhite' : 'woolBlue'} />
      ))}
      {/* A straight stair of slabs up the back of the tower. */}
      {Array.from({ length: STEPS }, (_, i) => (
        <Cube key={`s${i}`} at={[tx, ((i + 1) / STEPS) * top - 0.1, tz - 0.85 - (STEPS - i) * 0.24]} size={[0.6, 0.1, 0.26]} top="deck" side="concreteWhite" />
      ))}
      {[-0.34, 0.34].map((side) => (
        <Post key={side} at={[tx + side, 0, tz - 0.85 - STEPS * 0.24]} height={1.0} thick={0.06} />
      ))}
      <Flume />
      {legs.map((p, i) => (
        <Cube key={i} at={[p.x, 0, p.z]} size={[0.16, p.y - 0.1, 0.16]} top="concreteCyan" side="concreteCyan" />
      ))}
      <mesh ref={splash} position={[end.x, WATER + 0.02, end.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.4, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {night ? <pointLight position={[tx, top + 0.8, tz]} color="#7fc8ff" intensity={4} distance={6} decay={1.5} /> : null}
    </group>
  );
}
