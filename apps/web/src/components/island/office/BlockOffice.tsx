import { useMemo } from 'react';
import type { SessionState } from '@mycraft/core';
import type { Tile } from '../../../lib/scenes/blocks/blocks.js';
import { BUILDING, FLOOR_HEIGHT, FLOORS, ROOMS, STAIR, STAIR_OPENING, type Room, type RoomId } from '../../../lib/scenes/office.js';
import { slabAround } from '../../../lib/scenes/slab.js';
import type { Spot, Vec3 } from '../../../lib/scenes/types.js';
import { Beam, Cube, Post } from '../blocks/parts.js';

type Time = 'day' | 'night';

const SLAB = 0.26;
const WALL = 0.25;
const WINDOW_BOTTOM = 1.0;
const WINDOW_TOP = 2.75;
const ROOF = FLOORS * FLOOR_HEIGHT;

/** Each room's colour, as the wool that trims its floor edge, its rug and its back wall. */
export const ROOM_WOOL: Readonly<Record<RoomId, Tile>> = {
  claude: 'woolOrange',
  codex: 'woolCyan',
  gemini: 'woolBlue',
  lounge: 'woolPink',
  rec: 'woolYellow',
};

/** What each room's floor is laid in. */
const FLOOR_TILE: Readonly<Record<RoomId, Tile>> = {
  claude: 'planks',
  codex: 'planks',
  gemini: 'planks',
  lounge: 'sprucePlanks',
  rec: 'deck',
};

function roomsOn(floor: number): Room[] {
  return Object.values(ROOMS).filter((room) => room.floor === floor);
}

/**
 * The slab under one floor: a stone underside, each room's floor laid in its own boards, and a
 * wool strip along the front edge in the room's colour. The lounge leaves a hole for the stair.
 */
function Slab({ floor }: { floor: number }) {
  const y = floor * FLOOR_HEIGHT;
  const full = { x1: BUILDING.left, x2: BUILDING.right, z1: BUILDING.back, z2: BUILDING.front };
  const hole = STAIR_OPENING.floor === floor ? STAIR_OPENING : null;
  return (
    <group>
      {slabAround(full, hole).map((r) => {
        const room = roomsOn(floor).find((candidate) => (r.x1 + r.x2) / 2 > candidate.left && (r.x1 + r.x2) / 2 < candidate.right);
        const top = room ? FLOOR_TILE[room.id] : 'deck';
        return <Cube key={`${r.x1},${r.z1}`} at={[(r.x1 + r.x2) / 2, y - SLAB, (r.z1 + r.z2) / 2]} size={[r.x2 - r.x1, SLAB, r.z2 - r.z1]} top={top} side="stoneBricks" bottom="quartzTop" />;
      })}
      {roomsOn(floor).map((room) => (
        // Proud of the slab's own front face by a hair, not flush with it: flush put the wool and the stone on the exact same plane, flickering the whole strip. Still short of the corner posts, so nothing overhangs past them.
        <Cube key={room.id} at={[(room.left + room.right) / 2, y - SLAB - 0.005, BUILDING.front - 0.02]} size={[room.right - room.left, SLAB + 0.01, 0.06]} top={ROOM_WOOL[room.id]} side={ROOM_WOOL[room.id]} />
      ))}
    </group>
  );
}

/** Back wall of a room: white plaster below and above a band of glass, with quartz mullions. */
function BackWall({ room }: { room: Room }) {
  const y = room.floor * FLOOR_HEIGHT;
  const width = room.right - room.left;
  const centre = (room.left + room.right) / 2;
  const z = BUILDING.back + WALL / 2;
  const top = FLOOR_HEIGHT - SLAB;
  const bays = Math.max(2, Math.round(width / 2.4));
  return (
    <group>
      <Cube at={[centre, y, z]} size={[width, WINDOW_BOTTOM, WALL]} top="concreteWhite" side="concreteWhite" />
      <Cube at={[centre, y + WINDOW_TOP, z]} size={[width, top - WINDOW_TOP, WALL]} top="concreteWhite" side="concreteWhite" />
      <Cube at={[centre, y + WINDOW_BOTTOM, z - 0.05]} size={[width, WINDOW_TOP - WINDOW_BOTTOM, 0.04]} top="glass" side="glass" />
      {Array.from({ length: bays + 1 }, (_, i) => (
        <Cube key={i} at={[room.left + (i * width) / bays, y + WINDOW_BOTTOM, z]} size={[0.16, WINDOW_TOP - WINDOW_BOTTOM, WALL]} top="quartzTop" side="quartzPillar" />
      ))}
      {/* A band of the room's wool along the skirting. */}
      <Cube at={[centre, y + 0.1, z + WALL / 2 + 0.01]} size={[width, 0.16, 0.02]} top={ROOM_WOOL[room.id]} side={ROOM_WOOL[room.id]} />
    </group>
  );
}

/** Lights set into the ceiling: a row of glowing panes down the middle of each room. */
function CeilingLights({ room, night }: { room: Room; night: boolean }) {
  // 0.04 clear of the slab above: its top face would otherwise sit exactly on the slab's underside and the two flicker as they fight for the same depth.
  const y = (room.floor + 1) * FLOOR_HEIGHT - SLAB - 0.1;
  const count = Math.max(2, Math.round((room.right - room.left) / 2.2));
  const step = (room.right - room.left) / count;
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <Cube key={i} at={[room.left + step * (i + 0.5), y, -0.2]} size={[0.9, 0.06, 0.4]} top="glowPane" side="glowPane" glow={night} />
      ))}
      {night ? <pointLight position={[(room.left + room.right) / 2, y - 0.4, 0.4]} color="#ffe2b8" intensity={5} distance={7} decay={1.5} /> : null}
    </group>
  );
}

/** A glass partition between the two rooms on an upper floor, framed in quartz. */
function Divider({ floor }: { floor: number }) {
  const y = floor * FLOOR_HEIGHT;
  const height = FLOOR_HEIGHT - SLAB;
  return (
    <group>
      <Cube at={[0, y, 0]} size={[0.06, height, BUILDING.front - BUILDING.back - WALL]} top="glass" side="glass" />
      <Cube at={[0, y, BUILDING.front - 0.12]} size={[0.2, height, 0.2]} top="quartzTop" side="quartzPillar" />
    </group>
  );
}

/** A side of the tower: glass panes between quartz posts, floor to roof. */
function SideWall({ x }: { x: number }) {
  return (
    <group>
      {/* Stops short of the posts' outer faces: reaching all the way out there put glass and post on the same plane, flickering along the whole wall. */}
      <Cube at={[x, 0, 0]} size={[0.06, ROOF, BUILDING.front - BUILDING.back - 0.24]} top="glass" side="glass" />
      {/* Short of the roof deck, not touching it: sharing its exact top plane with the parapet's base still fought at the seam, so leave a sliver of clearance. */}
      {[BUILDING.back + 0.12, BUILDING.front - 0.12].map((z) => (
        <Cube key={z} at={[x, 0, z]} size={[0.24, ROOF - 0.02, 0.24]} top="quartzTop" side="quartzPillar" />
      ))}
    </group>
  );
}

/** The rooftop: a parapet, a grass garden with blocky trees and benches, solar panels and the stair hut. */
function Rooftop({ night }: { night: boolean }) {
  const y = ROOF;
  return (
    <group position={[0, y, 0]}>
      <Cube at={[0, -SLAB, 0]} size={[BUILDING.right - BUILDING.left, SLAB, BUILDING.front - BUILDING.back]} top="deck" side="stoneBricks" />
      {/* The front and back rails stop short of the side rails' width, rather than running under them: full-width rails buried their ends in the corner posts, flickering where both filled the same corner. */}
      {[
        [0, BUILDING.back + 0.1, BUILDING.right - BUILDING.left - 0.4, 0.2],
        [0, BUILDING.front - 0.1, BUILDING.right - BUILDING.left - 0.4, 0.2],
        [BUILDING.left + 0.1, 0, 0.2, BUILDING.front - BUILDING.back],
        [BUILDING.right - 0.1, 0, 0.2, BUILDING.front - BUILDING.back],
      ].map(([x, z, w, d]) => (
        <Cube key={`${x},${z}`} at={[x as number, 0, z as number]} size={[w as number, 0.5, d as number]} top="quartzTop" side="concreteWhite" />
      ))}
      <Cube at={[-5.2, 0, -0.4]} size={[7.4, 0.3, 3.4]} top="grassTop" side="grassSide" bottom="dirt" />
      {[-7.6, -2.8].map((x) => (
        <group key={x} position={[x, 0.3, -0.6]}>
          <Post at={[0, 0, 0]} height={1.1} thick={0.18} />
          <Cube at={[0, 1.0, 0]} size={[1.1, 0.9, 1.1]} top="oakLeaves" side="oakLeaves" />
          <Cube at={[0, 1.9, 0]} size={[0.6, 0.4, 0.6]} top="oakLeaves" side="oakLeaves" />
        </group>
      ))}
      {[-6.2, -4.2].map((x) => (
        <group key={x} position={[x, 0.3, 0.6]}>
          <Cube at={[0, 0.24, 0]} size={[1.0, 0.08, 0.34]} top="planks" side="planks" />
          {[-0.42, 0.42].map((dx) => (
            <Cube key={dx} at={[dx, 0, 0]} size={[0.08, 0.24, 0.3]} top="oakLog" side="oakLog" />
          ))}
        </group>
      ))}
      {[2.2, 3.8, 5.4].map((x) => (
        <group key={x} position={[x, 0, -0.6]} rotation={[-0.4, 0, 0]}>
          <Cube at={[0, 0.25, 0]} size={[1.4, 0.06, 1.0]} top="woolBlue" side="ironBlock" />
        </group>
      ))}
      <group position={[7.9, 0, -0.9]}>
        <Cube at={[0, 0, 0]} size={[1.8, 2.2, 1.6]} top="quartzTop" side="concreteWhite" />
        <Cube at={[0, 0, 0.81]} size={[0.6, 1.6, 0.02]} top="doorBottom" side="doorBottom" />
        <Cube at={[0, 2.2, 0]} size={[2.0, 0.14, 1.8]} top="terracotta" side="terracotta" />
        <Cube at={[0, 1.7, 0.85]} size={[0.24, 0.24, 0.24]} top="lantern" side="lantern" glow={night} />
      </group>
    </group>
  );
}

/** Steps of stone brick up the back wall from the rec room to the lounge, with a log handrail on posts and a pale nosing on each tread. */
function Stair() {
  const steps = 14;
  const [x1, y1, z] = STAIR.from;
  const [x2, y2] = STAIR.to;
  const run = (x2 - x1) / steps;
  const rise = (y2 - y1) / steps;
  const railZ = z + STAIR.width / 2;
  const railY = (x: number) => y1 + 1.0 + ((x - x1) / (x2 - x1)) * (y2 - y1);
  return (
    <group>
      {Array.from({ length: steps }, (_, i) => {
        const stepX = x1 + run * (i + 0.5);
        const stepY = rise * (i + 1);
        return (
          <group key={i}>
            <Cube at={[stepX, 0, z]} size={[run + 0.01, stepY, STAIR.width]} top="stoneBricks" side="stoneBricks" />
            <Cube at={[stepX - run / 2 + 0.01, stepY, z]} size={[0.03, 0.02, STAIR.width]} top="quartzTop" side="quartzTop" />
          </group>
        );
      })}
      {Array.from({ length: 4 }, (_, i) => {
        const postX = x1 + ((x2 - x1) * (i + 0.5)) / 4;
        const postY = rise * steps * ((i + 0.5) / 4);
        return <Post key={i} at={[postX, postY, railZ]} height={railY(postX) - postY} thick={0.05} />;
      })}
      <Beam from={[x1, 1.0, railZ]} to={[x2, y2 + 1.0, railZ]} thick={0.06} tile="oakLog" />
      {/* A closed stringer along each side, under the nosing line, so the steps read as built on something rather than floating blocks. */}
      {[z - STAIR.width / 2 + 0.03, z + STAIR.width / 2 - 0.03].map((railWidthZ) => (
        <Beam key={railWidthZ} from={[x1, y1 + 0.08, railWidthZ]} to={[x2, y2 + 0.08, railWidthZ]} thick={0.05} tile="ironBlock" />
      ))}
    </group>
  );
}

/** The office tower, cut open at the front: three floors of rooms behind white walls and glass. */
export function BlockTower({ time }: { time: Time }) {
  const night = time === 'night';
  return (
    <group>
      {Array.from({ length: FLOORS - 1 }, (_, i) => (
        <Slab key={i} floor={i + 1} />
      ))}
      {Object.values(ROOMS).map((room) => (
        <group key={room.id}>
          <BackWall room={room} />
          <CeilingLights room={room} night={night} />
        </group>
      ))}
      <Divider floor={1} />
      <Divider floor={2} />
      <SideWall x={BUILDING.left} />
      <SideWall x={BUILDING.right} />
      <Stair />
      <Rooftop night={night} />
    </group>
  );
}

// Furnishing -------------------------------------------------------------------------------------

const WALL_Z = BUILDING.back + WALL + 0.2;

function Bookshelf({ at, seed }: { at: Vec3; seed: number }) {
  const books = useMemo(() => Array.from({ length: 18 }, (_, i) => (['woolRed', 'woolBlue', 'woolYellow', 'woolGreen', 'woolPurple', 'woolWhite'] as const)[(i * 7 + seed) % 6]), [seed]);
  return (
    <group position={at}>
      <Cube at={[0, 0, 0]} size={[1.2, 1.8, 0.36]} top="planks" side="planks" />
      {[0.3, 0.9, 1.5].map((shelf, row) => (
        <group key={shelf}>
          {books.slice(row * 6, row * 6 + 6).map((tile, i) => (
            <Cube key={i} at={[-0.45 + i * 0.18, shelf, 0.17]} size={[0.14, 0.4 - (i % 3) * 0.05, 0.04]} top={tile as Tile} side={tile as Tile} />
          ))}
        </group>
      ))}
    </group>
  );
}

function PottedPlant({ at }: { at: Vec3 }) {
  return (
    <group position={at}>
      <Cube at={[0, 0, 0]} size={[0.4, 0.4, 0.4]} top="dirt" side="terracotta" />
      <Cube at={[0, 0.4, 0]} size={[0.5, 0.5, 0.5]} top="oakLeaves" side="oakLeaves" />
      <Cube at={[0, 0.9, 0]} size={[0.3, 0.3, 0.3]} top="oakLeaves" side="oakLeaves" />
    </group>
  );
}

function Whiteboard({ at }: { at: Vec3 }) {
  return (
    <group position={at}>
      <Cube at={[0, 0, 0]} size={[1.6, 0.9, 0.05]} top="quartzTop" side="quartzTop" />
      {(['woolRed', 'woolBlue', 'woolGreen'] as const).map((tile, i) => (
        <Cube key={tile} at={[-0.4 + i * 0.35, 0.25 + i * 0.15, 0.03]} size={[0.5 - i * 0.1, 0.05, 0.01]} top={tile} side={tile} />
      ))}
    </group>
  );
}

function Rug({ at, size, tile }: { at: Vec3; size: [number, number]; tile: Tile }) {
  return <Cube at={at} size={[size[0], 0.02, size[1]]} top={tile} side={tile} />;
}

function FloorLamp({ at, night }: { at: Vec3; night: boolean }) {
  return (
    <group position={at}>
      <Cube at={[0, 0, 0]} size={[0.3, 0.06, 0.3]} top="ironBlock" side="ironBlock" />
      <Post at={[0, 0.06, 0]} height={1.4} thick={0.05} />
      <Cube at={[0, 1.4, 0]} size={[0.32, 0.3, 0.32]} top="lantern" side="lantern" glow={night} />
    </group>
  );
}

/** A games cabinet: a tall block with a lit screen and a control deck. */
function Arcade({ tile }: { tile: Tile }) {
  return (
    <group>
      <Cube at={[0, 0, 0]} size={[0.6, 1.7, 0.6]} top={tile} side={tile} />
      <Cube at={[0, 1.05, 0.301]} size={[0.46, 0.4, 0.01]} top="screen" side="screen" />
      <Cube at={[0, 0.85, 0.3]} size={[0.56, 0.08, 0.2]} top="jukeboxSide" side="jukeboxSide" />
    </group>
  );
}

function VendingMachine() {
  return (
    <group>
      <Cube at={[0, 0, 0]} size={[0.8, 1.8, 0.6]} top="ironBlock" side="woolRed" />
      <Cube at={[-0.1, 0.5, 0.301]} size={[0.5, 1.1, 0.01]} top="glass" side="glass" />
      {(['woolBlue', 'woolYellow', 'woolGreen'] as const).map((tile, row) => (
        <Cube key={tile} at={[-0.1, 0.65 + row * 0.32, 0.25]} size={[0.44, 0.12, 0.08]} top={tile} side={tile} />
      ))}
    </group>
  );
}

function Beanbag({ at, tile }: { at: Vec3; tile: Tile }) {
  return (
    <group position={at}>
      <Cube at={[0, 0, 0]} size={[0.6, 0.3, 0.6]} top={tile} side={tile} />
      <Cube at={[0, 0.3, -0.18]} size={[0.5, 0.2, 0.24]} top={tile} side={tile} />
    </group>
  );
}

/** The rec room sofa: three wool cushions on a plank frame with a back and arms. */
function Sofa({ at }: { at: Vec3 }) {
  return (
    <group position={at}>
      <Cube at={[0, 0.06, 0]} size={[2.2, 0.22, 0.8]} top="planks" side="sprucePlanks" />
      {[-0.68, 0, 0.68].map((x) => (
        <Cube key={x} at={[x, 0.28, 0.06]} size={[0.66, 0.15, 0.62]} top="woolGrey" side="woolGrey" />
      ))}
      <Cube at={[0, 0.28, -0.32]} size={[2.2, 0.5, 0.18]} top="woolGrey" side="woolGrey" />
      {[-1.1, 1.1].map((x) => (
        <Cube key={x} at={[x, 0.06, 0]} size={[0.2, 0.5, 0.82]} top="woolGrey" side="woolGrey" />
      ))}
    </group>
  );
}

function AgentRoomDecor({ room, seed, night }: { room: Room; seed: number; night: boolean }) {
  const y = room.floor * FLOOR_HEIGHT;
  const centre = (room.left + room.right) / 2;
  return (
    <group>
      <Rug at={[centre, y, -0.2]} size={[room.right - room.left - 1, 3.6]} tile={ROOM_WOOL[room.id]} />
      <Bookshelf at={[room.right - 0.85, y, WALL_Z]} seed={seed} />
      <FloorLamp at={[room.left + 0.45, y, WALL_Z + 0.15]} night={night} />
      <PottedPlant at={[room.right - 1.8, y, BUILDING.back + 0.6]} />
      <Whiteboard at={[room.left + 1.6, y + 1.4, BUILDING.back + WALL + 0.03]} />
    </group>
  );
}

/** Rugs, shelves, plants, lamps, games, beanbags and the sofa through the whole tower. */
export function BlockDecor({ time }: { time: Time }) {
  const night = time === 'night';
  const rec = ROOMS.rec;
  const lounge = ROOMS.lounge;
  const loungeY = lounge.floor * FLOOR_HEIGHT;
  return (
    <group>
      <AgentRoomDecor room={ROOMS.claude} seed={11} night={night} />
      <AgentRoomDecor room={ROOMS.codex} seed={23} night={night} />
      <AgentRoomDecor room={ROOMS.gemini} seed={37} night={night} />
      <Rug at={[(lounge.left + lounge.right) / 2, loungeY, 0.4]} size={[lounge.right - lounge.left - 0.6, 2.4]} tile={ROOM_WOOL.lounge} />
      <PottedPlant at={[9.2, loungeY, 1.6]} />
      <Rug at={[-4.8, 0, 0.1]} size={[5, 3]} tile="woolCyan" />
      <Rug at={[0, 0, 0.4]} size={[3.2, 2.6]} tile={ROOM_WOOL.rec} />
      <Sofa at={[0, 0, -0.2]} />
      <Bookshelf at={[rec.left + 0.9, 0, WALL_Z]} seed={53} />
      <FloorLamp at={[-1.7, 0, -1.5]} night={night} />
      <PottedPlant at={[rec.left + 0.4, 0, 1.7]} />
      <PottedPlant at={[rec.right - 0.4, 0, 1.7]} />
      <group position={[-9.0, 0, -0.9]} rotation={[0, 0.7, 0]}>
        <Arcade tile="woolPurple" />
      </group>
      <group position={[2.2, 0, -1.65]} rotation={[0, -0.25, 0]}>
        <Arcade tile="woolCyan" />
      </group>
      <group position={[9.0, 0, -1.6]}>
        <VendingMachine />
      </group>
      <Beanbag at={[1.6, 0, 1.4]} tile="woolPink" />
      <Beanbag at={[-1.6, 0, 1.5]} tile="woolBlue" />
    </group>
  );
}

// Desks ------------------------------------------------------------------------------------------

const DESK_TOP = 0.46;

/** Screen colour by what the agent at the desk is doing. */
const SCREEN: Partial<Record<SessionState, string>> = {
  running: '#9be3c0',
  writing: '#bfe3ff',
  thinking: '#e3e6ff',
  waiting: '#ffd9a3',
  error: '#ffb4a8',
};

/** A desk of planks on iron legs, a monitor lit in the agent's state colour, a keyboard and a wool office chair. */
export function BlockDesk({ spot, state }: { spot: Spot; state: SessionState | undefined }) {
  const tint = (state && SCREEN[state]) ?? null;
  return (
    <group position={spot.position} rotation={[0, spot.facing, 0]}>
      <group position={[0, 0, 0.42]}>
        <Cube at={[0, DESK_TOP - 0.05, 0]} size={[1.12, 0.05, 0.58]} top="planks" side="planks" />
        {/* Legs run 0.03 up into the tabletop rather than stopping flush under it: a flush cap shared the tabletop's own underside, flickering there. */}
        {[-0.5, 0.5].flatMap((x) => [-0.24, 0.24].map((z) => <Cube key={`${x}${z}`} at={[x, 0, z]} size={[0.05, DESK_TOP - 0.02, 0.05]} top="ironBlock" side="ironBlock" />))}
        <Cube at={[0, DESK_TOP, 0.12]} size={[0.08, 0.12, 0.06]} top="ironBlock" side="ironBlock" />
        <Cube at={[0, DESK_TOP + 0.08, 0.13]} size={[0.5, 0.3, 0.04]} top="jukeboxSide" side="jukeboxSide" />
        {/* Clear of the bezel's own front face by a real gap, not a hair's width: the screen used to sit almost flush with it and the two fought for the same plane. */}
        <mesh position={[0, DESK_TOP + 0.23, 0.09]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.44, 0.24]} />
          <meshBasicMaterial color={tint ?? '#22303a'} toneMapped={false} />
        </mesh>
        <Cube at={[0, DESK_TOP, -0.08]} size={[0.42, 0.02, 0.14]} top="woolGrey" side="woolGrey" />
      </group>
      <Cube at={[0, 0, 0]} size={[0.26, 0.03, 0.26]} top="ironBlock" side="ironBlock" />
      {(
        [
          [0.1, 0.1],
          [-0.1, 0.1],
          [0.1, -0.1],
          [-0.1, -0.1],
        ] as const
      ).map(([cx, cz]) => (
        <Cube key={`${cx}${cz}`} at={[cx, 0, cz]} size={[0.05, 0.03, 0.05]} top="jukeboxSide" side="jukeboxSide" />
      ))}
      <Cube at={[0, 0.03, 0]} size={[0.08, 0.31, 0.08]} top="ironBlock" side="ironBlock" />
      <Cube at={[0, 0.34, 0]} size={[0.42, 0.07, 0.4]} top="woolGrey" side="woolGrey" />
      {[-0.21, 0.21].map((x) => (
        <Cube key={x} at={[x, 0.34, -0.02]} size={[0.04, 0.12, 0.26]} top="ironBlock" side="ironBlock" />
      ))}
      <Cube at={[0, 0.41, -0.2]} size={[0.4, 0.46, 0.06]} top="woolGrey" side="woolGrey" />
    </group>
  );
}
