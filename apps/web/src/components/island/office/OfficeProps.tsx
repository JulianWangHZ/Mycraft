import { useMemo } from 'react';
import type { Tile } from '../../../lib/scenes/blocks/blocks.js';
import { hash } from '../../../lib/textures/relief.js';
import { Blocky } from '../characters/Blocky.js';
import { Cube, Notes, Post } from '../blocks/parts.js';

/**
 * Office furniture in blocks, in the office's prop units: the scene draws these at 1.35x, so
 * every seat height here is the world seat height divided by that.
 */

const BARISTA = { gender: 'female', skirt: false, skin: '#efc29b', hair: 'bun', hairColor: '#4a2f22', pants: '#1f2430', shoes: '#1b1b22', glasses: false } as const;

function Stool({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Cube at={[0, 0, 0]} size={[0.06, 0.48, 0.06]} top="ironBlock" side="ironBlock" />
      <Cube at={[0, 0.48, 0]} size={[0.26, 0.06, 0.26]} top="woolOrange" side="woolOrange" />
    </group>
  );
}

/** Café: a plank counter with an iron coffee machine and cups, a barista behind and two stools in front. */
export function BlockCafe() {
  return (
    <group>
      <group position={[0, 0, -0.15]}>
        <Cube at={[0, 0, 0]} size={[1.1, 0.53, 0.44]} top="planks" side="sprucePlanks" />
        <Cube at={[0, 0.53, 0]} size={[1.2, 0.05, 0.52]} top="quartzTop" side="quartzTop" />
        <Cube at={[-0.25, 0.58, -0.08]} size={[0.3, 0.3, 0.24]} top="ironBlock" side="ironBlock" front="furnaceFront" />
        {(['woolWhite', 'woolPink', 'woolWhite'] as const).map((tile, i) => (
          <Cube key={i} at={[0.15 + i * 0.13, 0.58, 0.06]} size={[0.07, 0.09, 0.07]} top="jukeboxSide" side={tile} />
        ))}
        <Cube at={[0, 0, -0.55]} size={[1.1, 0.9, 0.2]} top="planks" side="planks" />
        <group position={[0, 0, -0.3]}>
          <Blocky look={BARISTA} shirt="#8a5f38" extra="apron" pose="sip" seated={false} />
        </group>
      </group>
      {[-0.32, 0.32].map((x) => (
        <Stool key={x} x={x} z={0.37} />
      ))}
    </group>
  );
}

/** Kitchenette: cupboards with a sink, a fridge and a small table. */
export function BlockKitchen() {
  return (
    <group>
      <Cube at={[0, 0, -0.45]} size={[0.8, 0.4, 0.26]} top="quartzTop" side="planks" />
      <Cube at={[-0.15, 0.4, -0.45]} size={[0.24, 0.02, 0.18]} top="ironBlock" side="ironBlock" />
      <Cube at={[0.52, 0, -0.4]} size={[0.26, 0.72, 0.26]} top="concreteWhite" side="concreteWhite" />
      <Cube at={[0, 0, 0.2]} size={[0.06, 0.34, 0.06]} top="oakLog" side="oakLog" />
      <Cube at={[0, 0.34, 0.2]} size={[0.36, 0.04, 0.36]} top="planks" side="planks" />
    </group>
  );
}

/** Karaoke: a glowing screen on a stand, a jukebox and a mic stand, notes rising off it. */
export function BlockKtv() {
  return (
    <group>
      <Cube at={[0, 0.27, -0.55]} size={[0.8, 0.46, 0.05]} top="woolPink" side="screen" glow />
      <Post at={[0, 0, -0.55]} height={0.27} thick={0.05} />
      <Cube at={[0, 0, 0.4]} size={[0.7, 0.18, 0.26]} top="woolPink" side="woolPink" />
      <Cube at={[0.3, 0, -0.1]} size={[0.03, 0.5, 0.03]} top="ironBlock" side="ironBlock" />
      <Cube at={[-0.45, 0, -0.45]} size={[0.24, 0.32, 0.24]} top="jukeboxTop" side="jukeboxSide" />
      <group position={[-0.45, 0.1, -0.45]} scale={0.6}>
        <Notes />
      </group>
    </group>
  );
}

/** Massage corner: two wool recliners side by side. */
export function BlockMassage() {
  return (
    <group>
      {[-0.25, 0.25].map((dx) => (
        <group key={dx} position={[dx, 0, -0.1]}>
          <Cube at={[0, 0, 0]} size={[0.3, 0.2, 0.36]} top="woolPurple" side="woolPurple" />
          <Cube at={[0, 0.2, -0.16]} size={[0.3, 0.38, 0.08]} top="woolPurple" side="woolPurple" />
        </group>
      ))}
    </group>
  );
}

const BALL_TILES: readonly Tile[] = ['woolRed', 'woolBlue', 'woolYellow', 'woolGreen', 'woolPink'];

/** Ball pit: four wool walls in four colours, filled with little cube balls. */
export function BlockBallPit() {
  const half = 0.65;
  const balls = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        at: [(hash(i, 1, 3) - 0.5) * 1.15, 0.02 + hash(i, 2, 3) * 0.14, (hash(i, 3, 3) - 0.5) * 1.15] as [number, number, number],
        tile: BALL_TILES[i % BALL_TILES.length] as Tile,
      })),
    [],
  );
  return (
    <group>
      <Cube at={[0, 0, 0]} size={[1.3, 0.04, 1.3]} top="woolWhite" side="woolWhite" />
      {[
        { at: [0, 0, -half], size: [1.3, 0.3, 0.08], tile: 'woolPink' },
        { at: [0, 0, half], size: [1.3, 0.3, 0.08], tile: 'woolBlue' },
        { at: [-half, 0, 0], size: [0.08, 0.3, 1.3], tile: 'woolYellow' },
        { at: [half, 0, 0], size: [0.08, 0.3, 1.3], tile: 'woolGreen' },
      ].map(({ at, size, tile }) => (
        <Cube key={tile} at={at as [number, number, number]} size={size as [number, number, number]} top={tile as Tile} side={tile as Tile} />
      ))}
      {balls.map(({ at, tile }, i) => (
        <Cube key={i} at={at} size={[0.09, 0.09, 0.09]} top={tile} side={tile} />
      ))}
    </group>
  );
}

/** Pool table: green wool cloth in a plank frame on log legs, with a few balls. */
export function BlockPoolTable() {
  const top = 0.62;
  return (
    <group>
      {[-0.75, 0.75].flatMap((x) => [-0.38, 0.38].map((z) => <Cube key={`${x}${z}`} at={[x, 0, z]} size={[0.12, top - 0.14, 0.12]} top="oakLog" side="oakLog" />))}
      <Cube at={[0, top - 0.14, 0]} size={[2.0, 0.14, 1.15]} top="woolGreen" side="sprucePlanks" />
      {[-0.55, 0.55].map((z) => (
        <Cube key={z} at={[0, top, z]} size={[2.0, 0.05, 0.06]} top="sprucePlanks" side="sprucePlanks" />
      ))}
      {[-0.97, 0.97].map((x) => (
        <Cube key={x} at={[x, top, 0]} size={[0.06, 0.05, 1.15]} top="sprucePlanks" side="sprucePlanks" />
      ))}
      {(['woolWhite', 'woolRed', 'woolYellow', 'woolBlue'] as const).map((tile, i) => (
        <Cube key={tile} at={[-0.4 + i * 0.25, top, (i % 2) * 0.2 - 0.1]} size={[0.06, 0.06, 0.06]} top={tile} side={tile} />
      ))}
    </group>
  );
}

/** A wool armchair whose cushion top is where a sitter's seat goes. */
function Armchair({ tile }: { tile: Tile }) {
  return (
    <group>
      <Cube at={[0, 0, 0]} size={[0.7, 0.22, 0.62]} top={tile} side={tile} />
      <Cube at={[0, 0.22, 0.04]} size={[0.5, 0.1, 0.48]} top="woolWhite" side="woolWhite" />
      <Cube at={[0, 0.22, -0.25]} size={[0.7, 0.45, 0.14]} top={tile} side={tile} />
      {[-0.3, 0.3].map((x) => (
        <Cube key={x} at={[x, 0.22, 0]} size={[0.12, 0.2, 0.6]} top={tile} side={tile} />
      ))}
    </group>
  );
}

/** Doze corner: two armchairs with a lamp table between them. */
export function BlockDozeCorner() {
  return (
    <group>
      {[-0.45, 0.45].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Armchair tile="woolPurple" />
        </group>
      ))}
      <group position={[0, 0, -0.2]}>
        <Cube at={[0, 0, 0]} size={[0.2, 0.4, 0.2]} top="planks" side="sprucePlanks" />
        <Cube at={[0, 0.4, 0]} size={[0.16, 0.18, 0.16]} top="lantern" side="lantern" />
      </group>
    </group>
  );
}
