import type { Session, Task } from '@mycraft/core';
import { describe, expect, it } from 'vitest';
import { cardStatus } from './task-status.js';

const session = (sessionId: string, state: Session['state']): Session => ({
  agent: 'claude',
  sessionId,
  cwd: '/w/a',
  project: 'a',
  state,
  startedAt: 0,
  updatedAt: 0,
});

const task = (sessionIds: string[], column: Task['column'] = 'doing'): Task => ({
  id: 't',
  title: 't',
  note: '',
  project: 'a',
  column,
  order: 1,
  sessionIds,
  createdAt: 0,
  updatedAt: 0,
});

describe('cardStatus', () => {
  it('lists only sessions that are still live', () => {
    const status = cardStatus(task(['s1', 'gone']), { s1: session('s1', 'running') });
    expect(status.bound.map((s) => s.sessionId)).toEqual(['s1']);
    expect(status.ended).toBe(1);
  });

  it('flags a card when a bound session needs the user', () => {
    expect(cardStatus(task(['s1']), { s1: session('s1', 'waiting') }).needsYou).toBe(true);
    expect(cardStatus(task(['s1']), { s1: session('s1', 'error') }).needsYou).toBe(true);
    expect(cardStatus(task(['s1']), { s1: session('s1', 'running') }).needsYou).toBe(false);
  });

  it('suggests Done when every bound session is resting', () => {
    const sessions = { s1: session('s1', 'done'), s2: session('s2', 'idle') };
    expect(cardStatus(task(['s1', 's2']), sessions).suggestDone).toBe(true);
  });

  it('does not suggest Done for cards already in Done or without sessions', () => {
    expect(cardStatus(task(['s1'], 'done'), { s1: session('s1', 'done') }).suggestDone).toBe(false);
    expect(cardStatus(task([]), {}).suggestDone).toBe(false);
  });

  it('does not suggest Done while a session is still working', () => {
    const sessions = { s1: session('s1', 'done'), s2: session('s2', 'running') };
    expect(cardStatus(task(['s1', 's2']), sessions).suggestDone).toBe(false);
  });
});
