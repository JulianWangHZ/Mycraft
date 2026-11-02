import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import type { Tile } from '../../../lib/scenes/blocks/blocks.js';
import { BALLOON_CART, BENCHES, BINS, GATE, GROUNDS, QUEUE_LANES, queueLines, queueSignSpot, type QueueLane } from '../../../lib/scenes/park-layout.js';
import type { Spot, Vec3 } from '../../../lib/scenes/types.js';
import { useCanvasTexture } from '../office/canvas-texture.js';
import { Beam, Cube, Fence, Flames, Notes, Post } from '../blocks/parts.js';
import { Octagon } from './BlockRides.js';

/** A wool awning in stripes over a stall, `y` high, overhanging the front. */
function Awning({ width, depth, y, tiles }: { width: number; depth: number; y: number; tiles: readonly Tile[] }) {
  const strips = 6;
  return (
    <group>
      {Array.from({ length: strips }, (_, i) => (
        <Cube key={i} at={[-width / 2 + (i + 0.5) * (width / strips), y, 0.1]} size={[width / strips, 0.14, depth]} top={tiles[i % tiles.length] as Tile} side={tiles[i % tiles.length] as Tile} />
      ))}
    </group>
  );
}

const CANDY: readonly Tile[] = ['woolRed', 'woolWhite'];

/** Ice cream cart: a quartz box on wheels under a pink and white awning, tubs of colour on top. */
export function BlockIceCream() {
  return (
    <group>
      <Cube at={[0, 0.15, 0]} size={[1.1, 0.7, 0.6]} top="quartzTop" side="woolPink" />
      {[-0.4, 0.4].map((x) => (
        <Cube key={x} at={[x, 0, 0.32]} size={[0.28, 0.28, 0.06]} top="jukeboxSide" side="jukeboxSide" />
      ))}
      {(['woolPink', 'woolYellow', 'woolGreen', 'woolWhite'] as const).map((tub, i) => (
        <Cube key={tub} at={[-0.36 + i * 0.24, 0.85, 0]} size={[0.18, 0.12, 0.18]} top={tub} side="quartzPillar" />
      ))}
      {[-0.5, 0.5].map((x) => (
        <Post key={x} at={[x, 0.85, -0.25]} height={1.0} thick={0.05} />
      ))}
      <Awning width={1.3} depth={0.9} y={1.85} tiles={['woolPink', 'woolWhite']} />
    </group>
  );
}

/** Food stand: a plank kiosk with a furnace grill behind the counter and a striped awning. */
export function BlockFoodStand({ night }: { night: boolean }) {
  return (
    <group position={[0, 0, -0.3]}>
      <Cube at={[0, 0, 0]} size={[1.6, 0.95, 0.6]} top="planks" side="sprucePlanks" />
      <Cube at={[-0.4, 0, -0.6]} size={[0.5, 0.95, 0.5]} top="furnaceSide" side="furnaceSide" front="furnaceFront" />
      <group position={[-0.4, 0.95, -0.6]} scale={0.6}>
        <Flames />
      </group>
      <Cube at={[0.4, 0, -0.6]} size={[0.5, 0.95, 0.5]} top="workbenchTop" side="workbenchSide" />
      {[-1, 1].flatMap((sx) => [-0.9, 0.3].map((z) => <Post key={`${sx}${z}`} at={[sx * 0.8, 0, z]} height={2.1} thick={0.1} />))}
      <Awning width={1.9} depth={1.6} y={2.1} tiles={['woolYellow', 'woolRed']} />
      {night ? <pointLight position={[0, 1.6, 0.4]} color="#ffbf73" intensity={5} distance={4} decay={1.6} /> : null}
    </group>
  );
}

/** Bandstand: a raised octagon stage of planks under a stepped roof on log posts, with a jukebox playing. */
export function BlockBandstand({ night }: { night: boolean }) {
  return (
    <group position={[0, 0, -0.6]}>
      <Octagon y={0} width={2.05} height={0.3} top="planks" side="stoneBricks" />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return <Post key={i} at={[Math.cos(a) * 0.95, 0.3, Math.sin(a) * 0.95]} height={1.8} thick={0.1} />;
      })}
      {[0, 1, 2].map((step) => (
        <Cube key={step} at={[0, 2.1 + step * 0.2, 0]} size={[2.4 - step * 0.7, 0.2, 2.4 - step * 0.7]} top={step % 2 ? 'woolWhite' : 'woolGreen'} side={step % 2 ? 'woolWhite' : 'woolGreen'} turn={Math.PI / 8} />
      ))}
      <Cube at={[0, 0.3, -0.4]} size={[0.45, 0.45, 0.45]} top="jukeboxTop" side="jukeboxSide" />
      <group position={[0, 0.5, -0.4]}>
        <Notes />
      </group>
      {night ? <pointLight position={[0, 1.8, 0]} color="#ffd9a0" intensity={4} distance={5} decay={1.6} /> : null}
    </group>
  );
}

/** Game stall: a counter of prizes under a red and white awning, a row of targets at the back. */
export function BlockGameStall({ night }: { night: boolean }) {
  return (
    <group position={[0, 0, -0.4]}>
      <Cube at={[0, 0, 0]} size={[1.8, 0.9, 0.4]} top="planks" side="woolRed" />
      <Cube at={[0, 0, -0.9]} size={[1.8, 1.6, 0.1]} top="planks" side="planks" />
      {(['woolRed', 'woolYellow', 'woolBlue', 'woolGreen', 'woolPurple'] as const).map((tile, i) => (
        <Cube key={tile} at={[-0.7 + i * 0.35, 0.9, -0.82]} size={[0.24, 0.24, 0.04]} top={tile} side={tile} />
      ))}
      {(['woolPink', 'woolBlue', 'woolYellow'] as const).map((tile, i) => (
        <Cube key={tile} at={[-0.5 + i * 0.5, 0.9, 0]} size={[0.22, 0.26, 0.22]} top={tile} side={tile} />
      ))}
      {[-1, 1].flatMap((sx) => [-0.9, 0.2].map((z) => <Post key={`${sx}${z}`} at={[sx * 0.9, 0, z]} height={2.1} thick={0.1} />))}
      <Awning width={2.0} depth={1.5} y={2.1} tiles={CANDY} />
      {night ? <pointLight position={[0, 1.7, 0.2]} color="#ffcf8a" intensity={4} distance={4} decay={1.6} /> : null}
    </group>
  );
}

/** A plank bench with log legs and a back rest. */
function Bench() {
  return (
    <group>
      <Cube at={[0, 0.24, 0]} size={[1.0, 0.08, 0.34]} top="planks" side="planks" />
      <Cube at={[0, 0.32, -0.16]} size={[1.0, 0.3, 0.06]} top="planks" side="planks" />
      {[-0.42, 0.42].map((x) => (
        <Cube key={x} at={[x, 0, 0]} size={[0.08, 0.24, 0.3]} top="oakLog" side="oakLog" />
      ))}
    </group>
  );
}

/** Picnic: a check blanket on the lawn with a hamper, and a bench beside it. */
export function BlockPicnic() {
  return (
    <group>
      {Array.from({ length: 16 }, (_, i) => (
        <Cube key={i} at={[-0.6 + (i % 4) * 0.4, 0, -0.6 + Math.floor(i / 4) * 0.4]} size={[0.4, 0.03, 0.4]} top={(i + Math.floor(i / 4)) % 2 ? 'woolRed' : 'woolWhite'} side="woolWhite" />
      ))}
      <Cube at={[0.2, 0.03, 0]} size={[0.36, 0.26, 0.26]} top="haySide" side="haySide" />
      <group position={[0, 0, -1.3]}>
        <Bench />
      </group>
    </group>
  );
}

/** Ticket booth where a working agent stands, facing the visitors: a plank kiosk with a wool roof. */
export function BlockBooth({ spot }: { spot: Spot }) {
  const [x, , z] = spot.position;
  const ahead = 0.5;
  return (
    <group position={[x + Math.sin(spot.facing) * ahead, 0, z + Math.cos(spot.facing) * ahead]} rotation={[0, spot.facing, 0]}>
      <Cube at={[0, 0, 0]} size={[0.9, 0.6, 0.24]} top="planks" side="sprucePlanks" />
      <Cube at={[0, 0.6, 0.02]} size={[0.98, 0.06, 0.34]} top="planks" side="planks" />
      {[-0.45, 0.45].map((post) => (
        <Post key={post} at={[post, 0.6, -0.08]} height={1.0} thick={0.06} />
      ))}
      <Awning width={1.1} depth={0.6} y={1.6} tiles={CANDY} />
    </group>
  );
}

function drawBoard(text: string) {
  return (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#b88c56';
    ctx.fillRect(0, 0, width, height);
    // Board grain: a few darker lines across.
    ctx.fillStyle = 'rgba(80, 50, 20, 0.25)';
    for (let y = height / 4; y < height; y += height / 4) ctx.fillRect(0, y, width, 3);
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, width - 10, height - 10);
    ctx.fillStyle = '#2b1d16';
    ctx.font = '700 46px "IBM Plex Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2 + 2);
  };
}

/** A plank signboard on a post, its name burnt into the wood. */
function Signboard({ at, text, turn = 0, width = 1.4, height = 1.6 }: { at: Vec3; text: string; turn?: number; width?: number; height?: number }) {
  const texture = useCanvasTexture(512, 128, drawBoard(text), `board:${text}`);
  return (
    <group position={at} rotation={[0, turn, 0]}>
      <Post at={[0, 0, 0]} height={height} thick={0.1} />
      <mesh position={[0, height + 0.15, 0.06]} castShadow>
        <boxGeometry args={[width, width / 4, 0.08]} />
        <meshLambertMaterial attach="material-0" color="#8a6a45" />
        <meshLambertMaterial attach="material-1" color="#8a6a45" />
        <meshLambertMaterial attach="material-2" color="#8a6a45" />
        <meshLambertMaterial attach="material-3" color="#8a6a45" />
        <meshLambertMaterial attach="material-4" map={texture} />
        <meshLambertMaterial attach="material-5" color="#8a6a45" />
      </mesh>
    </group>
  );
}

/** A queue: fence posts in rows with a rope rail between them, snaking back and forth to the gate. */
function Queue({ lane }: { lane: QueueLane }) {
  const lines = useMemo(() => queueLines(lane), [lane]);
  return (
    <group>
      {lines.map((posts, k) => (
        <group key={k}>
          {posts.map((at) => (
            <Post key={`${at}`} at={at} height={0.6} thick={0.08} />
          ))}
          {posts.slice(1).map((at, i) => {
            const from = posts[i] as Vec3;
            return <Beam key={`${at}`} from={[from[0], 0.5, from[2]]} to={[at[0], 0.5, at[2]]} thick={0.04} tile="woolRed" />;
          })}
        </group>
      ))}
    </group>
  );
}

const SIGNED_QUEUES = [
  { lane: QUEUE_LANES.coaster, text: 'LOOP RUNNER' },
  { lane: QUEUE_LANES.wheel, text: 'SKY WHEEL' },
  { lane: QUEUE_LANES.drop, text: 'FREE FALL' },
] as const;

/** A barrel bin. */
function Bin({ at }: { at: Vec3 }) {
  return <Cube at={at} size={[0.34, 0.5, 0.34]} top="oakLogTop" side="sprucePlanks" />;
}

const BALLOON_TILES: readonly Tile[] = ['woolRed', 'woolBlue', 'woolYellow', 'woolGreen', 'woolPink'];

/** A balloon seller's cart, a bunch of wool balloons bobbing on strings above it. */
function BalloonCart({ at }: { at: Vec3 }) {
  const bunch = useRef<Group>(null);
  useFrame(({ clock }) => {
    bunch.current?.children.forEach((balloon, i) => {
      balloon.position.y = 1.9 + (i % 3) * 0.22 + Math.sin(clock.elapsedTime * 1.6 + i) * 0.05;
    });
  });
  return (
    <group position={at}>
      <Cube at={[0, 0.1, 0]} size={[0.7, 0.5, 0.45]} top="planks" side="woolBlue" />
      <Post at={[0, 0.6, 0]} height={1.2} thick={0.04} />
      <group ref={bunch}>
        {BALLOON_TILES.map((tile, i) => {
          const a = (i / BALLOON_TILES.length) * Math.PI * 2;
          return (
            <group key={tile} position={[Math.cos(a) * 0.22, 1.9, Math.sin(a) * 0.22]}>
              <Cube at={[0, 0, 0]} size={[0.22, 0.26, 0.22]} top={tile} side={tile} />
            </group>
          );
        })}
      </group>
    </group>
  );
}

/** A tall pole flying a wool banner that ripples. */
function Banner({ at, tile }: { at: Vec3; tile: Tile }) {
  const cloth = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (cloth.current) cloth.current.rotation.y = Math.sin(clock.elapsedTime * 2 + at[0]) * 0.25;
  });
  return (
    <group position={at}>
      <Post at={[0, 0, 0]} height={2.8} thick={0.08} />
      <group ref={cloth} position={[0, 2.2, 0]}>
        <Cube at={[0.3, 0, 0]} size={[0.6, 0.5, 0.03]} top={tile} side={tile} />
      </group>
    </group>
  );
}

const BANNERS: readonly Vec3[] = [
  [-12.6, 0, 10.6],
  [-6, 0, 10.6],
  [6.5, 0, 10.6],
  [16.6, 0, 10.6],
  [16.6, 0, 0],
  [-12.6, 0, 0],
];

/** A string of lanterns hung between two points, sagging in the middle. */
function LanternString({ from, to, night, sag = 0.5 }: { from: Vec3; to: Vec3; night: boolean; sag?: number }) {
  const count = 9;
  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const t = (i + 0.5) / count;
        const at: Vec3 = [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t - Math.sin(t * Math.PI) * sag, from[2] + (to[2] - from[2]) * t];
        return <Cube key={i} at={at} size={[0.1, 0.12, 0.1]} top="lantern" side={BALLOON_TILES[i % BALLOON_TILES.length] as Tile} glow={night} />;
      })}
    </group>
  );
}

/** Lamp posts round the plaza: a stone foot, a post and a lantern. */
const LAMPS: readonly Vec3[] = [
  [-3.6, 0, 4.6],
  [6.4, 0, 3.4],
  [6.8, 0, -3.0],
  [-2.4, 0, -3.6],
  [1.4, 0, 9.8],
];

function Lamp({ at, night }: { at: Vec3; night: boolean }) {
  return (
    <group position={at}>
      <Cube at={[0, 0, 0]} size={[0.4, 0.3, 0.4]} top="stoneBricks" side="stoneBricks" />
      <Post at={[0, 0.3, 0]} height={2.0} thick={0.1} />
      <Cube at={[0, 2.3, 0]} size={[0.3, 0.32, 0.3]} top="lantern" side="lantern" glow={night} />
      {night ? <pointLight position={[0, 2.4, 0]} color="#ffcf7a" intensity={4} distance={6} decay={1.5} /> : null}
    </group>
  );
}

/** Oak fence round the grounds, open at the gate. */
function GroundsFence() {
  const { x1, x2, z1, z2 } = GROUNDS;
  const gateLeft = GATE.x - GATE.width / 2;
  const gateRight = GATE.x + GATE.width / 2;
  const runs: Array<[Vec3, Vec3]> = [
    [[x1, 0, z1], [x2, 0, z1]],
    [[x1, 0, z1], [x1, 0, z2]],
    [[x2, 0, z1], [x2, 0, z2]],
    [[x1, 0, z2], [gateLeft, 0, z2]],
    [[gateRight, 0, z2], [x2, 0, z2]],
  ];
  return (
    <group>
      {runs.map(([from, to]) => (
        <Fence key={`${from}${to}`} from={from} to={to} />
      ))}
    </group>
  );
}

function drawGateSign(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.fillStyle = '#c2352f';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#eceae4';
  for (let x = 0; x < width; x += 32) ctx.fillRect(x, 0, 16, 10);
  for (let x = 16; x < width; x += 32) ctx.fillRect(x, height - 10, 16, 10);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 64px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MYCRAFT PARK', width / 2, height / 2 + 4);
}

/** Entrance arch: two stone brick towers with lantern tops and a wool sign across them. */
function Gate({ night }: { night: boolean }) {
  const sign = useCanvasTexture(1024, 160, drawGateSign, 'block-gate');
  const half = GATE.width / 2 + 0.4;
  return (
    <group position={[GATE.x, 0, GATE.z]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * half, 0, 0]}>
          <Cube at={[0, 0, 0]} size={[0.8, 3.2, 0.8]} top="stoneBricks" side="stoneBricks" />
          <Cube at={[0, 3.2, 0]} size={[1.0, 0.2, 1.0]} top="stoneBricks" side="stoneBricks" />
          <Cube at={[0, 3.4, 0]} size={[0.4, 0.4, 0.4]} top="lantern" side="lantern" glow={night} />
        </group>
      ))}
      <Cube at={[0, 2.5, 0]} size={[half * 2, 0.7, 0.3]} top="woolRed" side="woolRed" />
      <mesh position={[0, 2.85, 0.16]}>
        <planeGeometry args={[half * 2 - 0.2, 0.6]} />
        <meshLambertMaterial map={sign} />
      </mesh>
      {night ? <pointLight position={[0, 3, 0.8]} color="#ffd68a" intensity={6} distance={6} decay={1.5} /> : null}
    </group>
  );
}

/** Ticket kiosk by the gate. */
function TicketKiosk({ night }: { night: boolean }) {
  return (
    <group position={[GATE.x + 2.8, 0, GATE.z - 1.4]}>
      <Cube at={[0, 0, 0]} size={[1.0, 1.5, 0.9]} top="planks" side="sprucePlanks" />
      <Cube at={[0, 0.7, 0.46]} size={[0.6, 0.4, 0.02]} top="glass" side="glass" />
      <Cube at={[0, 1.5, 0]} size={[1.3, 0.16, 1.2]} top="woolRed" side="woolRed" />
      {night ? <pointLight position={[0, 1.2, 0.8]} color="#ffcf8a" intensity={3} distance={3} decay={1.6} /> : null}
    </group>
  );
}

/** Everything round the rides: fence, gate, queues, signs, lamps, benches, bins, banners and bunting. */
export function FairAmenities({ night }: { night: boolean }) {
  return (
    <group>
      <GroundsFence />
      <Gate night={night} />
      <TicketKiosk night={night} />
      {SIGNED_QUEUES.map(({ lane, text }) => (
        <group key={text}>
          <Queue lane={lane} />
          <Signboard at={queueSignSpot(lane)} text={text} turn={lane.facing} />
        </group>
      ))}
      <BalloonCart at={BALLOON_CART} />
      {BENCHES.map(({ at, facing }) => (
        <group key={`${at}`} position={at} rotation={[0, facing, 0]}>
          <Bench />
        </group>
      ))}
      {BINS.map((at) => (
        <Bin key={`${at}`} at={at} />
      ))}
      {BANNERS.map((at, i) => (
        <Banner key={`${at}`} at={at} tile={BALLOON_TILES[i % BALLOON_TILES.length] as Tile} />
      ))}
      {LAMPS.map((at) => (
        <Lamp key={`${at}`} at={at} night={night} />
      ))}
      <LanternString from={[-1.8, 2.5, 9.4]} to={[2.2, 2.5, 9.4]} night={night} />
      <LanternString from={[-3.6, 2.5, 4.6]} to={[-1.8, 2.5, 9.4]} night={night} sag={0.6} />
      <LanternString from={[2.2, 2.5, 9.4]} to={[6.4, 2.5, 3.4]} night={night} sag={0.7} />
      <LanternString from={[6.4, 2.5, 3.4]} to={[6.8, 2.5, -3.0]} night={night} sag={0.6} />
    </group>
  );
}
