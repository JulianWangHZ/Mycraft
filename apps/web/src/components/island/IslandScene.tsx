import type { AgentKind, Session } from '@unpaidinterns/core';
import { stateGroup } from '@unpaidinterns/core';
import { ContactShadows } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useMemo, type RefObject } from 'react';
import type { Placement, SeatIndex } from '../../lib/island/behavior.js';
import { internSpot, spotAtActivity } from '../../lib/scenes/index.js';
import { modelUrl, type SceneManifest } from '../../lib/scenes/manifest.js';
import { DESKS_PER_ROOM } from '../../lib/scenes/office.js';
import { WORKSHOP } from '../../lib/scenes/blocks/layout.js';
import { ACTIVITIES, type SceneDefinition, type Spot, type Vec3 } from '../../lib/scenes/types.js';
import { ActivityProps } from './ActivityProps.js';
import { Backdrop, SKIES } from './Backdrops.js';
import { CameraRig } from './CameraRig.js';
import { Character } from './Character.js';
import { Desk } from './Desk.js';
import { BlockBooth } from './park/FairProps.js';
import { Environment } from './Environments.js';
import { FitToWindow } from './FitToWindow.js';
import { useIslandStore } from './island-store.js';
import { OfficeLabels } from './office/OfficeLabels.js';
import { PulseRing } from './PulseRing.js';
import { skyTexture } from './textures.js';
import { useSettingsStore } from '../../lib/settings.js';
import { Workbench } from './blocks/VillageProps.js';

interface SceneProps {
  scene: SceneDefinition;
  manifest: SceneManifest | null;
  sessions: Session[];
  placements: Map<string, Placement>;
  seats: Map<string, SeatIndex>;
  reducedMotion: boolean;
  /** False while the office is hidden behind another view: the scene stops drawing frames. */
  active?: boolean;
  /** Container for label overlays; it exists before the canvas, so labels never have to remount. */
  htmlPortal: RefObject<HTMLDivElement | null>;
}

const KINDS: readonly AgentKind[] = ['claude', 'codex', 'gemini'];
const BENCH_ROWS = 2;

function deskSpot(scene: SceneDefinition, session: Session, seat: SeatIndex): Spot {
  return scene.seatAt(seat.index, session.agent, seat.agentIndex);
}

function spotsFor(scene: SceneDefinition, sessions: Session[], placements: Map<string, Placement>, seats: Map<string, SeatIndex>) {
  const spots = new Map<string, Spot>();
  for (const session of sessions.filter((s) => !s.parentSessionId)) {
    const placement = placements.get(session.sessionId);
    const seat = seats.get(session.sessionId);
    if (!placement || !seat) continue;
    const at = placement.at;
    spots.set(session.sessionId, at.kind === 'activity' ? spotAtActivity(scene, at.activity, at.seat) : deskSpot(scene, session, seat));
  }
  for (const intern of sessions.filter((s) => s.parentSessionId)) {
    const parent = spots.get(intern.parentSessionId as string);
    if (parent) spots.set(intern.sessionId, internSpot(parent));
  }
  return spots;
}

/** Office rooms always show a full set of desks; occupied ones light up in their agent's state colour. */
function OfficeDesks({ scene, sessions, placements, seats }: Omit<SceneProps, 'manifest' | 'reducedMotion' | 'htmlPortal'>) {
  const byKindIndex = new Map<string, Session>();
  for (const session of sessions) {
    const seat = seats.get(session.sessionId);
    if (seat) byKindIndex.set(`${session.agent}:${seat.agentIndex}`, session);
  }
  return (
    <>
      {KINDS.flatMap((agent) => {
        const used = sessions.filter((s) => s.agent === agent && seats.has(s.sessionId)).length;
        return Array.from({ length: Math.max(DESKS_PER_ROOM, used) }, (_, agentIndex) => {
          const session = byKindIndex.get(`${agent}:${agentIndex}`);
          const atDesk = session && placements.get(session.sessionId)?.at.kind === 'desk';
          return (
            <Desk key={`${agent}-${agentIndex}`} spot={scene.seatAt(0, agent, agentIndex)} state={atDesk ? session.state : undefined} />
          );
        });
      })}
    </>
  );
}

/** The workshop yard always shows its first two rows of benches, plus one for every agent beyond them. */
function Benches({ scene, seats }: Omit<SceneProps, 'manifest' | 'reducedMotion' | 'htmlPortal'>) {
  const used = Math.max(0, ...[...seats.values()].map((seat) => seat.index + 1));
  return (
    <>
      {Array.from({ length: Math.max(BENCH_ROWS * WORKSHOP.columns, used) }, (_, index) => (
        <Workbench key={index} spot={scene.seatAt(index, 'claude', index)} />
      ))}
    </>
  );
}

function Workstations(props: Omit<SceneProps, 'manifest' | 'reducedMotion' | 'htmlPortal'>) {
  const { scene, sessions, seats } = props;
  if (scene.id === 'office') return <OfficeDesks {...props} />;
  if (scene.id === 'village') return <Benches {...props} />;
  if (scene.id !== 'park') return null;
  return (
    <>
      {sessions.map((session) => {
        const seat = seats.get(session.sessionId);
        return seat ? <BlockBooth key={session.sessionId} spot={deskSpot(scene, session, seat)} /> : null;
      })}
    </>
  );
}

/** Working agents at their spot may do the scene's own work (swimming laps) instead of desk work. */
function workPose(scene: SceneDefinition, session: Session, pose: Placement['pose']): Placement['pose'] {
  return scene.workPose && stateGroup(session.state) === 'working' ? scene.workPose : pose;
}

function Lights({ night }: { night: boolean }) {
  return night ? (
    <>
      <hemisphereLight args={['#9a90d8', '#2a2445', 0.9]} />
      <directionalLight position={[4, 14, 18]} intensity={0.55} color="#c9c3ff" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005}>
        <orthographicCamera attach="shadow-camera" args={[-14, 14, 14, -14, 1, 60]} />
      </directionalLight>
    </>
  ) : (
    <>
      <hemisphereLight args={['#ffffff', '#c3c9ee', 1.6]} />
      <directionalLight position={[6, 14, 8]} intensity={1.3} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005}>
        <orthographicCamera attach="shadow-camera" args={[-14, 14, 14, -14, 1, 45]} />
      </directionalLight>
    </>
  );
}

export function IslandScene({ scene, manifest, sessions, placements, seats, reducedMotion, htmlPortal, active = true }: SceneProps) {
  const spots = useMemo(() => spotsFor(scene, sessions, placements, seats), [scene, sessions, placements, seats]);
  // The camera stays put while a card is pinned, so the card keeps pointing at its character.
  const focus: Vec3 | null = null;
  const time = useSettingsStore((state) => state.theme);
  const night = time === 'night';
  const [skyTop, skyBottom] = SKIES[scene.id][time];

  return (
    <Canvas
      flat
      shadows="percentage"
      camera={{ position: [0, 7, 33], fov: 26, far: 700 }}
      dpr={[1, 2]}
      frameloop={active ? 'always' : 'never'}
      onPointerMissed={() => useIslandStore.getState().select(null)}
    >
      <primitive attach="background" object={skyTexture(skyTop, skyBottom)} />
      <fog attach="fog" args={[skyBottom, ...(scene.fog ?? (night ? [60, 200] : [70, 230]))]} />
      {/* Keyed so switching scenes rebuilds the lights; R3F does not reset props that are dropped. */}
      <FitToWindow />
      <Lights key={time} night={night} />
      <Backdrop scene={scene.id} time={time} />
      <Environment scene={scene} seatCount={seats.size} time={time} />
      {night ? null : <ContactShadows position={[0, 0.005, 0]} scale={30} blur={2} opacity={0.18} far={2} />}
      {ACTIVITIES.map((activity) => (
        <ActivityProps key={activity} scene={scene.id} activity={activity} position={scene.activities[activity]} night={night} />
      ))}
      <Workstations scene={scene} sessions={sessions} placements={placements} seats={seats} />
      {scene.id === 'office' ? <OfficeLabels sessions={sessions} /> : null}
      {sessions.map((session) => {
        const spot = spots.get(session.sessionId);
        const placement = placements.get(session.sessionId);
        if (!spot || !placement) return null;
        const group = stateGroup(session.state);
        const character = manifest?.characters[group];
        return (
          <group key={session.sessionId}>
            {group === 'needsYou' || group === 'trouble' ? <PulseRing position={spot.position} still={reducedMotion} /> : null}
            <Character
              session={session}
              spot={spot}
              pose={placement.at.kind === 'activity' ? (scene.activityPose?.[placement.at.activity] ?? placement.pose) : workPose(scene, session, placement.pose)}
              outfit={scene.outfits[group]}
              model={character ? { url: modelUrl(scene.id, character.file), scale: character.scale } : null}
              nameTag={scene.nameTags}
              figure={scene.figure ?? 'mini'}
              scale={scene.characterScale}
              htmlPortal={htmlPortal}
              reducedMotion={reducedMotion}
            />
          </group>
        );
      })}
      <CameraRig
        focus={focus}
        overviewTarget={scene.cameraTarget}
        overviewOffset={scene.cameraOffset}
        closeOffset={scene.closeOffset}
        terrainAt={scene.terrainAt}
        maxDistance={scene.maxDistance}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}
