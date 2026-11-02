import type { Session } from '@mycraft/core';
import { describe, expect, it } from 'vitest';
import { groupSessions } from './group.js';

const session = (sessionId: string, state: Session['state'], updatedAt: number): Session => ({
  agent: 'claude',
  sessionId,
  cwd: '/w/a',
  project: 'a',
  state,
  startedAt: 0,
  updatedAt,
});

describe('groupSessions', () => {
  it('sorts each group newest first and sends errors to needsYou', () => {
    const groups = groupSessions([
      session('w1', 'running', 1),
      session('w2', 'thinking', 3),
      session('n1', 'waiting', 2),
      session('e1', 'error', 4),
      session('r1', 'done', 5),
      session('r2', 'interrupted', 6),
    ]);
    expect(groups.needsYou.map((s) => s.sessionId)).toEqual(['e1', 'n1']);
    expect(groups.working.map((s) => s.sessionId)).toEqual(['w2', 'w1']);
    expect(groups.resting.map((s) => s.sessionId)).toEqual(['r2', 'r1']);
  });

  it('returns empty groups for no sessions', () => {
    expect(groupSessions([])).toEqual({ needsYou: [], working: [], resting: [] });
  });
});
