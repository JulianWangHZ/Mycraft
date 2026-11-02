import { stateGroup, type Session } from '@mycraft/core';

export type Lane = 'needsYou' | 'working' | 'done';

export const LANES: readonly Lane[] = ['needsYou', 'working', 'done'];

export type StatusCounts = Record<Lane, number>;

/** Which headline a session falls under. Errors and interruptions need the user too. */
export function laneOf(session: Session): Lane {
  const group = stateGroup(session.state);
  if (group === 'working') return 'working';
  if (group === 'resting') return 'done';
  return 'needsYou';
}

/**
 * Main agents sorted into the three lanes, most recently active first. Interns follow their
 * parent, so they are left out and each agent appears once.
 */
export function boardLanes(sessions: readonly Session[]): Record<Lane, Session[]> {
  const lanes: Record<Lane, Session[]> = { needsYou: [], working: [], done: [] };
  const latestFirst = sessions.filter((session) => !session.parentSessionId).sort((a, b) => b.updatedAt - a.updatedAt);
  for (const session of latestFirst) lanes[laneOf(session)].push(session);
  return lanes;
}

/** Headline counts for the top bar, matching the board lanes. */
export function statusCounts(sessions: readonly Session[]): StatusCounts {
  const lanes = boardLanes(sessions);
  return { needsYou: lanes.needsYou.length, working: lanes.working.length, done: lanes.done.length };
}
