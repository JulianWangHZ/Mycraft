import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { RIDES, STATION, STATION_CANOPY, STATION_PLATFORM, STATION_POSTS, dropTowerHeight } from '../../../lib/scenes/park-layout.js';
import { CAROUSEL, carPose, coasterTrack, COASTER, DROP, dropSeatAngle, gondolaPivot, horsePose, trackFrame, WHEEL } from '../../../lib/scenes/rides.js';
import type { Tile } from '../../../lib/scenes/blocks/blocks.js';
import type { Vec3 } from '../../../lib/scenes/types.js';
import { blockFaces } from '../blocks/materials.js';
import { Beam, Cube, Post } from '../blocks/parts.js';

/** A flat octagon of blocks: two squares, one turned an eighth of a turn. */
function Octagon({ y, width, height, top, side = top }: { y: number; width: number; height: number; top: Tile; side?: Tile }) {
  return (
    <>
      <Cube at={[0, y, 0]} size={[width * 0.83, height, width * 0.83]} top={top} side={side} />
      <Cube at={[0, y, 0]} size={[width * 0.83, height, width * 0.83]} top={top} side={side} turn={Math.PI / 4} />
    </>
  );
}

/** A glowing lantern block, lit after dark. */
function Lantern({ at, size = 0.2, night }: { at: Vec3; size?: number; night: boolean }) {
  return <Cube at={at} size={[size, size, size]} top="lantern" side="lantern" glow={night} />;
}

// Carousel ---------------------------------------------------------------------------------------

const DECK_WIDTH = 4.1;
const ROOF_Y = 2.55;
const COATS: ReadonlyArray<{ body: Tile; mane: Tile }> = [
  { body: 'woolWhite', mane: 'woolYellow' },
  { body: 'clayBrown', mane: 'woolWhite' },
  { body: 'jukeboxSide', mane: 'woolWhite' },
  { body: 'woolWhite', mane: 'woolPink' },
];

/**
 * A carousel horse in blocks, its origin at the saddle: body, neck and head, legs reaching
 * forward and back in a gallop, a wool mane and a red saddle.
 */
function Horse({ coat }: { coat: { body: Tile; mane: Tile } }) {
  return (
    <group>
      <Cube at={[0, -0.32, 0]} size={[0.24, 0.26, 0.62]} top={coat.body} side={coat.body} />
      <Cube at={[0, -0.08, 0]} size={[0.26, 0.04, 0.26]} top="woolRed" side="woolRed" />
      <group position={[0, -0.12, 0.3]} rotation={[-0.6, 0, 0]}>
        <Cube at={[0, 0, 0]} size={[0.16, 0.34, 0.16]} top={coat.body} side={coat.body} />
        <Cube at={[0, 0.06, -0.09]} size={[0.06, 0.3, 0.04]} top={coat.mane} side={coat.mane} />
      </group>
      <Cube at={[0, 0.02, 0.5]} size={[0.15, 0.15, 0.3]} top={coat.body} side={coat.body} />
      {[
        [0.07, 0.24, -0.9],
        [-0.07, 0.24, -0.6],
        [0.07, -0.24, 0.7],
        [-0.07, -0.24, 0.5],
      ].map(([x, z, swing]) => (
        <group key={`${x},${z}`} position={[x as number, -0.32, z as number]} rotation={[swing as number, 0, 0]}>
          <Cube at={[0, -0.36, 0]} size={[0.07, 0.36, 0.07]} top={coat.body} side={coat.body} />
        </group>
      ))}
      <group position={[0, -0.24, -0.3]} rotation={[-0.9, 0, 0]}>
        <Cube at={[0, -0.24, 0]} size={[0.05, 0.24, 0.05]} top={coat.mane} side={coat.mane} />
      </group>
    </group>
  );
}

/** Carousel: a plank deck under a striped wool roof, horses riding up and down golden poles. */
export function BlockCarousel({ night }: { night: boolean }) {
  const horses = useRef<Array<Group | null>>([]);
  const poles = useRef<Array<Group | null>>([]);
  useFrame(({ clock }) => {
    for (let i = 0; i < CAROUSEL.horses; i += 1) {
      const pose = horsePose(i, clock.elapsedTime);
      horses.current[i]?.position.copy(pose.position);
      horses.current[i]?.quaternion.copy(pose.quaternion);
      poles.current[i]?.position.set(pose.position.x, 0, pose.position.z);
    }
  });
  return (
    <group>
      <Octagon y={0} width={DECK_WIDTH + 0.4} height={0.12} top="stoneBricks" />
      <Octagon y={0.12} width={DECK_WIDTH} height={CAROUSEL.deck - 0.12} top="planks" side="woolYellow" />
      <Cube at={[0, CAROUSEL.deck, 0]} size={[0.6, ROOF_Y - CAROUSEL.deck, 0.6]} top="quartzTop" side="quartzPillar" />
      {[0, 1, 2, 3].map((i) => (
        <Cube key={i} at={[0, 1.0, 0]} size={[0.66, 0.6, 0.66]} top="glass" side="woolYellow" turn={(i * Math.PI) / 8} />
      ))}
      {[
        { y: ROOF_Y, width: DECK_WIDTH + 0.6, tile: 'woolRed' as Tile },
        { y: ROOF_Y + 0.25, width: DECK_WIDTH - 0.4, tile: 'woolWhite' as Tile },
        { y: ROOF_Y + 0.5, width: DECK_WIDTH - 1.4, tile: 'woolRed' as Tile },
        { y: ROOF_Y + 0.75, width: DECK_WIDTH - 2.4, tile: 'woolWhite' as Tile },
      ].map(({ y, width, tile }) => (
        <Octagon key={y} y={y} width={width} height={0.25} top={tile} />
      ))}
      <Lantern at={[0, ROOF_Y + 1.0, 0]} size={0.3} night={night} />
      <Post at={[0, ROOF_Y + 1.3, 0]} height={0.5} thick={0.05} />
      <Cube at={[0.15, ROOF_Y + 1.6, 0]} size={[0.3, 0.18, 0.03]} top="woolPink" side="woolPink" />
      {Array.from({ length: CAROUSEL.horses }, (_, i) => (
        <group key={i}>
          <group ref={(node) => void (poles.current[i] = node)}>
            <Cube at={[0, CAROUSEL.deck, 0]} size={[0.05, ROOF_Y - CAROUSEL.deck, 0.05]} top="woolYellow" side="woolYellow" />
          </group>
          <group ref={(node) => void (horses.current[i] = node)}>
            <Horse coat={COATS[i % COATS.length] as (typeof COATS)[number]} />
          </group>
        </group>
      ))}
      {night
        ? Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <Lantern key={i} at={[Math.cos(a) * (DECK_WIDTH / 2 + 0.25), ROOF_Y - 0.15, Math.sin(a) * (DECK_WIDTH / 2 + 0.25)]} size={0.14} night />;
          })
        : null}
      {night ? <pointLight position={[0, ROOF_Y - 0.5, 0]} color="#ffcf8a" intensity={7} distance={7} decay={1.6} /> : null}
    </group>
  );
}

// Ferris wheel -----------------------------------------------------------------------------------

const RIM_BLOCKS = 40;
const SPOKES = 10;
const SIDE = 0.55;
const CAR_TILES: readonly Tile[] = ['woolRed', 'woolBlue', 'woolYellow', 'woolGreen', 'woolPink', 'woolPurple'];

/** A wheel car in blocks, hanging from its pivot: a roof, four corner posts and a floor with low walls. */
function WheelCar({ tile }: { tile: Tile }) {
  const { width, depth, floorDrop, roofDrop } = WHEEL.cabin;
  const wall = 0.36;
  return (
    <group>
      <Post at={[0, -roofDrop, 0]} height={roofDrop} thick={0.05} />
      <Cube at={[0, -roofDrop - 0.08, 0]} size={[width + 0.08, 0.1, depth + 0.08]} top={tile} side={tile} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Cube key={`${sx}${sz}`} at={[(sx * width) / 2, -floorDrop, (sz * depth) / 2]} size={[0.05, floorDrop - roofDrop - 0.08, 0.05]} top="ironBlock" side="ironBlock" />))}
      <Cube at={[0, -floorDrop - 0.06, 0]} size={[width, 0.06, depth]} top={tile} side={tile} />
      <Cube at={[0, -floorDrop, -depth / 2]} size={[width, wall, 0.04]} top={tile} side={tile} />
      {[-1, 1].map((sx) => (
        <Cube key={sx} at={[(sx * width) / 2, -floorDrop, 0]} size={[0.04, wall, depth]} top={tile} side={tile} />
      ))}
    </group>
  );
}

/** Ferris wheel: a quartz rim on two sides joined to the hub by spokes, on A-frame legs over a stone platform. */
export function BlockWheel({ night }: { night: boolean }) {
  const wheel = useRef<Group>(null);
  const cars = useRef<Array<Group | null>>([]);
  const R = WHEEL.radius;
  const hub = WHEEL.hub;
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (wheel.current) wheel.current.rotation.z = t * WHEEL.spin;
    cars.current.forEach((car, i) => car?.position.set(...gondolaPivot(i, t)));
  });
  return (
    <group position={RIDES.ferrisWheel.at} rotation={[0, WHEEL.facing, 0]}>
      <Cube at={[0, 0, 0]} size={[2.8, WHEEL.platformTop, 2.0]} top="stoneBricks" side="stoneBricks" />
      {[0, 1, 2].map((i) => (
        <Cube key={i} at={[0, 0, 1.15 + (2 - i) * 0.22]} size={[1.2, 0.1 + i * 0.1, 0.22]} top="stoneBricks" side="stoneBricks" />
      ))}
      {[-1, 1].flatMap((side) =>
        [-1, 1].map((foot) => <Beam key={`${side}${foot}`} from={[foot * 2.3, 0, side * (SIDE + 0.5)]} to={[0, hub, side * SIDE]} thick={0.2} tile="ironBlock" />),
      )}
      <Beam from={[0, hub, -SIDE - 0.2]} to={[0, hub, SIDE + 0.2]} thick={0.3} tile="ironBlock" />
      <group ref={wheel} position={[0, hub, 0]}>
        {[-1, 1].map((side) => (
          <group key={side} position={[0, 0, side * SIDE]}>
            {Array.from({ length: RIM_BLOCKS }, (_, i) => {
              const a = (i / RIM_BLOCKS) * Math.PI * 2;
              return (
                <group key={i} position={[Math.cos(a) * R, Math.sin(a) * R, 0]} rotation={[0, 0, a]}>
                  <Cube at={[0, -0.1, 0]} size={[0.2, 0.2, 0.2]} top="quartzTop" side={i % 4 === 0 ? 'woolPink' : 'quartzPillar'} glow={night && i % 4 === 0} />
                </group>
              );
            })}
            {Array.from({ length: SPOKES }, (_, i) => {
              const a = (i / SPOKES) * Math.PI * 2;
              return <Beam key={i} from={[0, 0, 0]} to={[Math.cos(a) * R, Math.sin(a) * R, 0]} thick={0.08} tile="concreteWhite" />;
            })}
          </group>
        ))}
      </group>
      {Array.from({ length: WHEEL.cars }, (_, i) => (
        <group key={i} ref={(node) => void (cars.current[i] = node)}>
          <WheelCar tile={CAR_TILES[i % CAR_TILES.length] as Tile} />
        </group>
      ))}
      <group position={[1.9, 0, 1.2]}>
        <Cube at={[0, 0, 0]} size={[0.7, 1.2, 0.7]} top="planks" side="sprucePlanks" />
        <Cube at={[0, 1.2, 0]} size={[0.86, 0.12, 0.86]} top="woolPink" side="woolPink" />
      </group>
    </group>
  );
}

// Drop tower -------------------------------------------------------------------------------------

/** Drop tower: a white block column banded with glowing panes, and a ring of seats that climbs and falls. */
export function BlockDropTower({ night }: { night: boolean }) {
  const carriage = useRef<Group>(null);
  const { height, radius } = RIDES.dropTower;
  useFrame(({ clock }) => {
    if (carriage.current) carriage.current.position.y = dropTowerHeight(clock.elapsedTime);
  });
  return (
    <group position={RIDES.dropTower.at}>
      <Octagon y={0} width={(radius + 0.4) * 2} height={DROP.deck} top="stoneBricks" />
      <Cube at={[0, 0, 0]} size={[0.8, height, 0.8]} top="quartzTop" side="concreteWhite" />
      {Array.from({ length: Math.floor(height / 1.5) }, (_, i) => (
        <Cube key={i} at={[0, 0.8 + i * 1.5, 0]} size={[0.84, 0.2, 0.84]} top="glowPane" side="glowPane" glow={night} />
      ))}
      <Cube at={[0, height, 0]} size={[1.4, 0.3, 1.4]} top="woolPurple" side="woolPurple" />
      <Cube at={[0, height + 0.3, 0]} size={[0.8, 0.3, 0.8]} top="woolWhite" side="woolWhite" />
      <Lantern at={[0, height + 0.6, 0]} size={0.3} night={night} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <Post key={i} at={[Math.cos(a) * (radius + 0.35), DROP.deck, Math.sin(a) * (radius + 0.35)]} height={0.5} thick={0.06} />;
      })}
      <group ref={carriage}>
        <Octagon y={-0.12} width={DROP.ring * 2} height={0.12} top="ironBlock" />
        {Array.from({ length: DROP.seats }, (_, i) => {
          const a = dropSeatAngle(i);
          return (
            <group key={i} position={[Math.cos(a) * DROP.seatRing, 0, Math.sin(a) * DROP.seatRing]} rotation={[0, Math.atan2(Math.cos(a), Math.sin(a)), 0]}>
              <Cube at={[0, DROP.seatY - 0.08, 0]} size={[0.34, 0.08, 0.3]} top="woolPurple" side="woolPurple" />
              <Cube at={[0, DROP.seatY - 0.08, -0.16]} size={[0.34, 0.6, 0.06]} top="woolPurple" side="woolPurple" />
              <Cube at={[0, DROP.seatY - DROP.footrest, 0.2]} size={[0.3, 0.05, 0.14]} top="ironBlock" side="ironBlock" />
            </group>
          );
        })}
      </group>
      <group position={[radius + 0.9, 0, 0.6]}>
        <Cube at={[0, 0, 0]} size={[0.7, 1.2, 0.7]} top="planks" side="sprucePlanks" />
        <Cube at={[0, 1.2, 0]} size={[0.85, 0.12, 0.85]} top="woolPurple" side="woolPurple" />
      </group>
    </group>
  );
}

// Coaster ----------------------------------------------------------------------------------------

const SAMPLES = 220;
const GAUGE = 0.84;

/** A coaster car: an open iron box, dark inside, with a bumper at each end. */
function Cart({ lead }: { lead: boolean }) {
  const { carWidth: w, carLength: l, carHeight: h } = COASTER;
  return (
    <group>
      <Cube at={[0, 0.06, 0]} size={[w, 0.06, l]} top="jukeboxSide" side="ironBlock" />
      {[-1, 1].map((s) => (
        <Cube key={`x${s}`} at={[(s * (w - 0.06)) / 2, 0.06, 0]} size={[0.06, h, l]} top="ironBlock" side="ironBlock" />
      ))}
      {[-1, 1].map((s) => (
        <Cube key={`z${s}`} at={[0, 0.06, (s * (l - 0.06)) / 2]} size={[w, h, 0.06]} top="ironBlock" side="ironBlock" />
      ))}
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <Cube key={`${sx}${sz}`} at={[sx * (w / 2 - 0.1), -0.04, sz * (l / 2 - 0.16)]} size={[0.08, 0.1, 0.1]} top="jukeboxSide" side="jukeboxSide" />))}
      {lead ? <Cube at={[0, 0.2, l / 2 + 0.02]} size={[0.3, 0.14, 0.04]} top="woolRed" side="woolRed" /> : null}
    </group>
  );
}

/**
 * Coaster: rails of plank sleepers and iron bars laid along the circuit on log trestles, a stone
 * station with a striped roof, and a train of iron carts.
 */
export function BlockCoaster({ night }: { night: boolean }) {
  const cars = useRef<Array<Group | null>>([]);
  const rail = useMemo(() => blockFaces('rail', 'ironBlock'), []);
  const pieces = useMemo(
    () =>
      Array.from({ length: SAMPLES }, (_, i) => {
        const u = (i + 0.5) / SAMPLES;
        const a = coasterTrack.getPointAt(i / SAMPLES);
        const b = coasterTrack.getPointAt((i + 1) / SAMPLES);
        return { at: coasterTrack.getPointAt(u), frame: trackFrame(u), length: a.distanceTo(b) + 0.02 };
      }),
    [],
  );
  const trestles = useMemo(() => pieces.filter((p, i) => i % 9 === 0 && p.at.y > 0.6), [pieces]);
  useFrame(({ clock }) => {
    cars.current.forEach((car, i) => {
      if (!car) return;
      const pose = carPose(i, clock.elapsedTime);
      car.position.copy(pose.position);
      car.quaternion.copy(pose.quaternion);
    });
  });
  const [sx, , sz] = STATION.from;
  const length = STATION.to[0] - sx;
  return (
    <group>
      {pieces.map(({ at, frame, length: run }, i) => (
        <mesh key={i} position={at} quaternion={frame} material={rail}>
          <boxGeometry args={[GAUGE, 0.05, run]} />
        </mesh>
      ))}
      {trestles.map(({ at }, i) => (
        <group key={`t${i}`}>
          <Beam from={[at.x, 0, at.z]} to={[at.x, at.y - 0.05, at.z]} thick={0.18} tile="oakLog" end="oakLogTop" />
          <Cube at={[at.x, 0, at.z]} size={[0.4, 0.12, 0.4]} top="stoneBricks" side="stoneBricks" />
        </group>
      ))}
      <group position={[sx + length / 2, 0, sz]}>
        <Cube at={[0, 0, 1.0]} size={[length + 0.6, STATION_PLATFORM.top, 1.2]} top="planks" side="stoneBricks" />
        {Array.from({ length: 10 }, (_, i) => (
          <Cube key={i} at={[-length / 2 - 0.4 + (i + 0.5) * ((length + 0.8) / 10), STATION_CANOPY.bottom, 0.3]} size={[(length + 0.8) / 10, 0.14, 3.0]} top={i % 2 ? 'woolWhite' : 'woolRed'} side={i % 2 ? 'woolWhite' : 'woolRed'} />
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <Lantern key={i} at={[-length / 2 + (i * length) / 4, STATION_CANOPY.bottom - 0.2, -0.9]} size={0.14} night={night} />
        ))}
      </group>
      {STATION_POSTS.map(([x, , z]) => (
        <Beam key={`${x},${z}`} from={[x, 0, z]} to={[x, STATION_CANOPY.bottom, z]} thick={0.16} tile="oakLog" end="oakLogTop" />
      ))}
      {night
        ? pieces
            .filter((_, i) => i % 11 === 0)
            .map(({ at }, i) => <Lantern key={`l${i}`} at={[at.x, at.y + 0.05, at.z]} size={0.1} night />)
        : null}
      {Array.from({ length: COASTER.cars }, (_, i) => (
        <group key={i} ref={(node) => void (cars.current[i] = node)}>
          <Cart lead={i === 0} />
        </group>
      ))}
    </group>
  );
}
