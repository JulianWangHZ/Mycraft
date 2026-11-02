import type { Session } from '@mycraft/core';
import { AGENT_ICONS } from '../../lib/agent-icons.js';
import { projectLabel, tagLabel } from '../../lib/labels.js';
import { stateGroup } from '@mycraft/core';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Vector3, type Group } from 'three';
import { AGENT_NAMES } from '../../lib/agents.js';
import type { Pose } from '../../lib/island/behavior.js';
import { lapAt } from '../../lib/scenes/pool-layout.js';
import { riderPose } from '../../lib/scenes/rides.js';
import type { Outfit, Spot } from '../../lib/scenes/types.js';
import { lookFor } from '../../lib/characters/look.js';
import { AgentBadge } from './characters/AgentBadge.js';
import { Blocky } from './characters/Blocky.js';
import { Mini } from './characters/Mini.js';
import type { Motion } from './characters/motion.js';
import { useIslandStore } from './island-store.js';
import { ModelCharacter } from './ModelCharacter.js';

export const AGENT_COLORS = { claude: '#e07a5f', codex: '#10a37f', gemini: '#4285f4' } as const;

// Units per second, scaled with the character so big indoor scenes do not take forever to cross.
const WALK_SPEED = 2.4;
/** Poses done sitting: desk work in the office chair, and dozing. Waving stands up. */
const DESK_SEATED: ReadonlySet<Pose> = new Set(['think', 'type', 'typeSlow', 'slump', 'nap']);
const ARRIVED = 0.02;

interface CharacterProps {
  session: Session;
  spot: Spot;
  pose: Pose;
  outfit: Outfit;
  model: { url: string; scale: number } | null;
  nameTag: boolean;
  /** Rounded figure, or one built from pixel-skinned blocks. */
  figure: 'mini' | 'blocky';
  scale: number;
  htmlPortal: RefObject<HTMLDivElement | null>;
  reducedMotion: boolean;
}

function hashPhase(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}

/** One agent in the scene. It walks to its spot, then plays the pose for its state. */
export function Character({ session, spot, pose, outfit, model, nameTag, figure: style, scale, htmlPortal, reducedMotion }: CharacterProps) {
  const { t } = useTranslation();
  const group = useRef<Group>(null);
  const motion = useRef<Motion>({ walking: false });
  const target = useRef(new Vector3());
  // Only the first spot is passed as a prop; later spots are walked to in useFrame.
  const start = useRef(spot.position);
  const { hover, select } = useIslandStore.getState();
  const hovered = useIslandStore((state) => state.hoveredSession === session.sessionId);
  const selected = useIslandStore((state) => state.selectedSession === session.sessionId);
  const intern = Boolean(session.parentSessionId);
  const alert = ['needsYou', 'trouble'].includes(stateGroup(session.state));
  const brand = AGENT_COLORS[session.agent];
  const look = useMemo(() => lookFor(session.sessionId), [session.sessionId]);
  const seated = spot.seated ?? DESK_SEATED.has(pose);
  const height = ((outfit.headwear === 'mascot' ? 1.12 : 1.0) - (seated ? 0.06 : 0)) * scale;

  // Each swimmer starts its laps at its own point, so a lane full of them never moves in step.
  const lapPhase = useMemo(() => (hashPhase(session.sessionId) % 1000) / 1000, [session.sessionId]);
  // Set once a rider has reached the ride; it then follows its seat until it is sent elsewhere.
  const riding = useRef<string | null>(null);

  useFrame(({ clock }, delta) => {
    const node = group.current;
    if (!node) return;
    const ride = spot.ride;
    const rideKey = ride ? `${ride.id}:${ride.seat}` : null;
    if (riding.current !== rideKey) riding.current = null;
    if (ride && rideKey) {
      const boardAt = target.current.set(...spot.position);
      if (riding.current || reducedMotion || node.position.distanceTo(boardAt) <= ride.board || node.position.distanceTo(boardAt) > 14) {
        riding.current = rideKey;
        const seat = riderPose(ride.id, ride.seat, clock.elapsedTime, ride.centre);
        node.position.copy(seat.position);
        node.quaternion.copy(seat.quaternion);
        motion.current.walking = false;
        return;
      }
    }
    // Off a ride the figure stands upright again; rides can tilt it.
    node.rotation.x = 0;
    node.rotation.z = 0;
    target.current.set(...spot.position);
    // A lap swimmer's spot slides up and down its lane; once in the water it just follows it.
    const lap = spot.lap && pose === 'swim' ? lapAt(spot.lap, clock.elapsedTime, lapPhase) : null;
    if (lap) {
      target.current.z = lap.z;
      if (node.position.distanceTo(target.current) < 0.6) {
        node.position.copy(target.current);
        node.rotation.y = lap.facing;
        motion.current.walking = false;
        return;
      }
    }
    const offset = target.current.clone().sub(node.position);
    const distance = offset.length();
    // Changing floors jumps straight there; walking would cut through the ceiling.
    if (reducedMotion || distance > 14 || Math.abs(offset.y) > 0.5) {
      node.position.copy(target.current);
    } else if (distance > ARRIVED) {
      node.position.add(offset.multiplyScalar(Math.min(1, (WALK_SPEED * scale * delta) / distance)));
      node.rotation.y = Math.atan2(offset.x, offset.z);
    }
    motion.current.walking = !reducedMotion && distance > ARRIVED;
    if (!motion.current.walking) node.rotation.y = spot.facing;
  });

  const Figure = style === 'blocky' ? Blocky : Mini;
  const figure = (
    <Figure
      look={look}
      shirt={outfit.body ?? brand}
      pose={pose}
      seated={seated}
      astride={spot.astride ?? false}
      headwear={outfit.headwear}
      headwearColor={outfit.headwearColor}
      extra={outfit.extra}
      motion={motion}
      still={reducedMotion}
      opacity={intern ? 0.85 : 1}
    />
  );

  return (
    <group
      ref={group}
      position={start.current}
      scale={(intern ? 0.72 : 1) * scale}
      onPointerOver={(event) => {
        event.stopPropagation();
        hover(session.sessionId, { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY });
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        hover(session.sessionId, { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY });
      }}
      onPointerOut={() => hover(null)}
      onClick={(event) => {
        event.stopPropagation();
        select(session.sessionId, { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY });
      }}
    >
      {model ? (
        <Suspense fallback={figure}>
          <ModelCharacter url={model.url} scale={model.scale} pose={pose} motion={motion} />
        </Suspense>
      ) : (
        figure
      )}
      <AgentBadge color={brand} height={height / scale} />
      {/* Always mounted, into a fixed container: remounting drei Html under React 19 can leave it empty. */}
      <Html
        portal={htmlPortal as RefObject<HTMLElement>}
        position={[0, (height + 0.22) / scale, 0]}
        center
        zIndexRange={[40, 21]}
        style={{ pointerEvents: 'none' }}
      >
        {nameTag ? (
          <div className="nametag" data-alert={alert || undefined} data-selected={hovered || selected || undefined}>
            <span className="nt-name" style={{ background: brand }}>
              <img className="nt-icon" src={AGENT_ICONS[session.agent]} alt={AGENT_NAMES[session.agent]} />
              {tagLabel(session)}
              {intern ? ` · ${t('list.intern')}` : ''}
            </span>
            <span className="nt-state">{t(`state.${session.state}`)}</span>
          </div>
        ) : (
          <div className="bubble" data-alert={alert || undefined} hidden={!(alert || hovered || selected)}>
            <strong>{AGENT_NAMES[session.agent]}</strong> · {t(`state.${session.state}`)}
            {hovered || selected ? <span className="bubble-tool">{projectLabel(session)}{session.tool ? ` · ${session.tool}` : ''}</span> : null}
          </div>
        )}
      </Html>
    </group>
  );
}
