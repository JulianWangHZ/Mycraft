import { stateGroup, type Session, type SessionState } from '@mycraft/core';
import type { Activity } from '../scenes/types.js';

export type Pose = 'think' | 'type' | 'typeSlow' | 'wave' | 'slump' | 'sip' | 'sing' | 'play' | 'lounge' | 'workout' | 'nap' | 'swim';

export type Spot =
  | { kind: 'desk' }
  | { kind: 'activity'; activity: Activity; seat: number }
  | { kind: 'withParent'; parentSessionId: string };

export interface Placement {
  at: Spot;
  pose: Pose;
}

const COFFEE_MS = 60_000;
const NAP_MS = 25 * 60_000;

const DESK_POSES: Partial<Record<SessionState, Pose>> = {
  thinking: 'think',
  running: 'type',
  writing: 'typeSlow',
  waiting: 'wave',
  error: 'slump',
};

/** Where an idle agent hangs out, in visiting order. Each agent starts at a different point in the list. */
const LOUNGE: ReadonlyArray<{ activity: Activity; pose: Pose }> = [
  { activity: 'kitchen', pose: 'sip' },
  { activity: 'massage', pose: 'lounge' },
  { activity: 'ktv', pose: 'sing' },
  { activity: 'gym', pose: 'workout' },
  { activity: 'ballpit', pose: 'play' },
  { activity: 'pingpong', pose: 'play' },
  { activity: 'sofa', pose: 'lounge' },
];

/** How long an idle agent stays at one spot before wandering to the next. */
const ROTATE_MS = 90_000;

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}

/** Each agent moves on its own schedule and starts at its own place in the loop, so the crowd never moves in step. */
function loungeSpot(sessionId: string, now: number) {
  const seed = hash(sessionId);
  const turn = Math.floor((now + (seed % ROTATE_MS)) / ROTATE_MS);
  return LOUNGE[(seed + turn) % LOUNGE.length] as { activity: Activity; pose: Pose };
}

function deskPose(session: Session): Pose {
  return DESK_POSES[session.state] ?? 'sip';
}

export interface PlaceOptions {
  /** Long-idle agents doze. Outdoor scenes turn this off so they keep using the attractions. */
  naps?: boolean;
}

/** Decides where every agent stands and what it does. Pure, so the scene just follows it. */
export function placeAgents(sessions: readonly Session[], now: number, { naps = true }: PlaceOptions = {}): Map<string, Placement> {
  const placed = new Map<string, Placement>();
  const seatsTaken = new Map<Activity, number>();
  const sit = (sessionId: string, activity: Activity, pose: Pose) => {
    const seat = seatsTaken.get(activity) ?? 0;
    seatsTaken.set(activity, seat + 1);
    placed.set(sessionId, { at: { kind: 'activity', activity, seat }, pose });
  };

  const main = [...sessions].filter((s) => !s.parentSessionId).sort((a, b) => a.sessionId.localeCompare(b.sessionId));

  for (const session of main) {
    const idleFor = now - session.updatedAt;
    if (stateGroup(session.state) !== 'resting') {
      placed.set(session.sessionId, { at: { kind: 'desk' }, pose: deskPose(session) });
    } else if (idleFor < COFFEE_MS) {
      sit(session.sessionId, 'coffee', 'sip');
    } else if (naps && idleFor > NAP_MS) {
      sit(session.sessionId, 'nap', 'nap');
    } else {
      const spot = loungeSpot(session.sessionId, now);
      sit(session.sessionId, spot.activity, spot.pose);
    }
  }

  for (const intern of sessions.filter((s) => s.parentSessionId)) {
    const parentSessionId = intern.parentSessionId as string;
    placed.set(intern.sessionId, { at: { kind: 'withParent', parentSessionId }, pose: DESK_POSES[intern.state] ?? 'sip' });
  }
  return placed;
}

export interface SeatIndex {
  /** Position among every main agent, by start time. */
  index: number;
  /** Position among main agents of the same kind, by start time. */
  agentIndex: number;
}

/** Every main agent keeps one desk while it is on the island, ordered by when it started. */
export function seatIndexes(sessions: readonly Session[]): Map<string, SeatIndex> {
  const main = sessions
    .filter((session) => !session.parentSessionId)
    .sort((a, b) => a.startedAt - b.startedAt || a.sessionId.localeCompare(b.sessionId));
  const perAgent = new Map<string, number>();
  return new Map(
    main.map((session, index) => {
      const agentIndex = perAgent.get(session.agent) ?? 0;
      perAgent.set(session.agent, agentIndex + 1);
      return [session.sessionId, { index, agentIndex }];
    }),
  );
}
