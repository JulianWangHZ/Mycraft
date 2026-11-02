import type { Session } from '@mycraft/core';
import { describe, expect, it } from 'vitest';
import { boardLanes, statusCounts } from './status-counts.js';

const s = (sessionId: string, state: Session['state'], parentSessionId?: string, updatedAt = 0): Session => ({
  agent: 'claude',
  sessionId,
  cwd: '/w',
  project: 'w',
  state,
  startedAt: 0,
  updatedAt,
  ...(parentSessionId ? { parentSessionId } : {}),
});

describe('statusCounts', () => {
  it('counts needs-you (including errors), working and done', () => {
    const sessions = [s('a', 'waiting'), s('b', 'error'), s('c', 'running'), s('d', 'thinking'), s('e', 'done'), s('f', 'idle')];
    expect(statusCounts(sessions)).toEqual({ needsYou: 2, working: 2, done: 2 });
  });

  it('leaves interns out so each agent counts once', () => {
    expect(statusCounts([s('a', 'running'), s('a/i', 'running', 'a')])).toEqual({ needsYou: 0, working: 1, done: 0 });
  });

  it('is all zeros with no sessions', () => {
    expect(statusCounts([])).toEqual({ needsYou: 0, working: 0, done: 0 });
  });
});

describe('boardLanes', () => {
  it('puts each main agent in its lane, most recent first', () => {
    const lanes = boardLanes([s('old', 'running', undefined, 1), s('new', 'thinking', undefined, 5), s('w', 'waiting'), s('d', 'done')]);
    expect(lanes.working.map((x) => x.sessionId)).toEqual(['new', 'old']);
    expect(lanes.needsYou.map((x) => x.sessionId)).toEqual(['w']);
    expect(lanes.done.map((x) => x.sessionId)).toEqual(['d']);
  });

  it('leaves interns out', () => {
    expect(boardLanes([s('a', 'running'), s('a/i', 'running', 'a')]).working).toHaveLength(1);
  });

  it('does not reorder the list it was given', () => {
    const sessions = [s('a', 'running', undefined, 1), s('b', 'running', undefined, 2)];
    boardLanes(sessions);
    expect(sessions.map((x) => x.sessionId)).toEqual(['a', 'b']);
  });
});
