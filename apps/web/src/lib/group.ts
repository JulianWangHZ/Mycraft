import { stateGroup, type Session } from '@mycraft/core';

export interface SessionGroups {
  needsYou: Session[];
  working: Session[];
  resting: Session[];
}

export function groupSessions(sessions: readonly Session[]): SessionGroups {
  const newestFirst = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  const inGroup = (...groups: string[]) => newestFirst.filter((s) => groups.includes(stateGroup(s.state)));
  return {
    needsYou: inGroup('needsYou', 'trouble'),
    working: inGroup('working'),
    resting: inGroup('resting'),
  };
}
