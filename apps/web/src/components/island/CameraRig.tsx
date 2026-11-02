import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { cameraFloor } from '../../lib/island/sight-line.js';
import type { Vec3 } from '../../lib/scenes/types.js';
import { useIslandStore } from './island-store.js';

interface CameraRigProps {
  focus: Vec3 | null;
  overviewTarget: Vec3;
  overviewOffset: Vec3;
  closeOffset: Vec3;
  /** Terrain the camera has to stay above, for hilly scenes. */
  terrainAt?: (x: number, z: number) => number;
  maxDistance?: number;
  reducedMotion: boolean;
}

/**
 * Swing the camera up its orbit, keeping its distance from the target, until it clears the
 * ground under it. Hills between it and the target are left alone: those fade out instead.
 */
function liftOverTerrain(target: Vector3, position: Vector3, terrainAt: (x: number, z: number) => number) {
  const floor = cameraFloor(position.x, position.z, terrainAt);
  if (position.y >= floor) return;
  const radius = position.distanceTo(target);
  const rise = Math.min(floor - target.y, radius * 0.98);
  const across = Math.hypot(position.x - target.x, position.z - target.z) || 1;
  const scale = Math.sqrt(radius * radius - rise * rise) / across;
  position.set(target.x + (position.x - target.x) * scale, target.y + rise, target.z + (position.z - target.z) * scale);
}

/** Orbit controls plus a short glide back to the scene overview when asked. */
export function CameraRig({ focus, overviewTarget, overviewOffset, closeOffset, terrainAt, maxDistance = 70, reducedMotion }: CameraRigProps) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const goal = useRef<{ target: Vector3; position: Vector3 } | null>(null);
  const handling = useRef(false);
  const overviewRequest = useIslandStore((state) => state.overviewRequest);

  useEffect(() => {
    const target = new Vector3(...(focus ?? overviewTarget));
    const offset = new Vector3(...(focus ? closeOffset : overviewOffset));
    goal.current = { target, position: target.clone().add(offset) };
    // overviewRequest re-runs this when the Overview button asks for the starting view again.
  }, [focus, overviewTarget, overviewOffset, closeOffset, overviewRequest]);

  useFrame((_, delta) => {
    const orbit = controls.current;
    if (orbit && terrainAt) liftOverTerrain(orbit.target, camera.position, terrainAt);
    const next = goal.current;
    if (!orbit || !next) return;
    const step = reducedMotion ? 1 : 1 - Math.exp(-delta * 4);
    orbit.target.lerp(next.target, step);
    camera.position.lerp(next.position, step);
    orbit.update();
    if (camera.position.distanceTo(next.position) < 0.01) goal.current = null;
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      minPolarAngle={0.3}
      maxPolarAngle={1.6}
      minDistance={3}
      maxDistance={maxDistance}
      // Only user input fires onStart, so the glide back to the overview never counts as a move.
      // A press alone (clicking a character) is not a move: wait until the view actually changes.
      onStart={() => {
        goal.current = null;
        handling.current = true;
      }}
      onChange={() => {
        if (handling.current) useIslandStore.getState().setCameraMoved(true);
      }}
      onEnd={() => {
        handling.current = false;
      }}
    />
  );
}
