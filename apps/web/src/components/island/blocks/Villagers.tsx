import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { villagerAt, VILLAGERS, type Villager } from '../../../lib/scenes/blocks/villagers.js';

const SKIN = '#c79a72';

function Box({ at, size, color }: { at: [number, number, number]; size: [number, number, number]; color: string }) {
  return (
    <mesh position={at} castShadow>
      <boxGeometry args={size} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

/**
 * A villager: a long robe to the ankles, arms folded across the chest, a tall head with a big
 * nose and a single brow. They stroll their beat and stop to look about at each end.
 */
function Villager({ villager, index, still }: { villager: Villager; index: number; still: boolean }) {
  const group = useRef<Group>(null);
  const legs = useRef<Group>(null);
  const head = useRef<Group>(null);
  useFrame(({ clock }) => {
    const node = group.current;
    if (!node) return;
    const seconds = still ? 0 : clock.elapsedTime;
    const pose = villagerAt(index, seconds);
    node.position.set(...pose.position);
    node.rotation.y = pose.facing;
    legs.current?.children.forEach((leg, i) => {
      leg.rotation.x = pose.walking ? Math.sin(seconds * 8 + i * Math.PI) * 0.5 : 0;
    });
    // Standing still, they look slowly from side to side.
    if (head.current) head.current.rotation.y = pose.walking ? 0 : Math.sin(seconds * 0.9 + index) * 0.6;
  });
  const { robe, trim } = villager;
  return (
    <group ref={group}>
      <group ref={legs}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.065, 0.24, 0]}>
            <Box at={[0, -0.12, 0]} size={[0.12, 0.24, 0.12]} color="#4a3a2c" />
          </group>
        ))}
      </group>
      <Box at={[0, 0.42, 0]} size={[0.28, 0.38, 0.17]} color={robe} />
      <Box at={[0, 0.28, 0.001]} size={[0.29, 0.05, 0.175]} color={trim} />
      {/* Folded arms: one bar across the chest with the hands showing in the middle. */}
      <Box at={[0, 0.48, 0.13]} size={[0.32, 0.1, 0.1]} color={robe} />
      <Box at={[0, 0.48, 0.18]} size={[0.12, 0.08, 0.02]} color={SKIN} />
      <group ref={head} position={[0, 0.61, 0]}>
        <Box at={[0, 0.17, 0]} size={[0.26, 0.34, 0.26]} color={SKIN} />
        <Box at={[0, 0.12, 0.155]} size={[0.06, 0.12, 0.06]} color="#b3845d" />
        <Box at={[0, 0.235, 0.131]} size={[0.2, 0.025, 0.005]} color="#4a3324" />
        {[-1, 1].map((side) => (
          <Box key={side} at={[side * 0.06, 0.2, 0.131]} size={[0.04, 0.035, 0.005]} color="#2f6a3a" />
        ))}
      </group>
    </group>
  );
}

export function Villagers({ still = false }: { still?: boolean }) {
  return (
    <group>
      {VILLAGERS.map((villager, index) => (
        <Villager key={index} villager={villager} index={index} still={still} />
      ))}
    </group>
  );
}
