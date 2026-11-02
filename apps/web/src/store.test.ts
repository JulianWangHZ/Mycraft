import type { Session, Task } from '@mycraft/core';
import { describe, expect, it } from 'vitest';
import { applyTaskPatch, reduceMessage, useSessionStore } from './store.js';

const s1: Session = {
  agent: 'claude',
  sessionId: 's1',
  cwd: '/w/a',
  project: 'a',
  state: 'running',
  startedAt: 0,
  updatedAt: 1,
};

const t1: Task = {
  id: 't1',
  title: 'One',
  note: '',
  project: 'a',
  column: 'todo',
  order: 1,
  sessionIds: [],
  createdAt: 0,
  updatedAt: 0,
};

describe('reduceMessage', () => {
  it('replaces everything on snapshot', () => {
    expect(reduceMessage({ old: { ...s1, sessionId: 'old' } }, { type: 'snapshot', sessions: [s1] })).toEqual({ s1 });
  });

  it('inserts or replaces on upsert without mutating', () => {
    const before = { s1 };
    const after = reduceMessage(before, { type: 'upsert', session: { ...s1, state: 'done' } });
    expect(after.s1?.state).toBe('done');
    expect(before.s1.state).toBe('running');
  });

  it('drops a session on remove', () => {
    expect(reduceMessage({ s1 }, { type: 'remove', sessionId: 's1' })).toEqual({});
  });

  it('leaves sessions alone on a tasks message', () => {
    const sessions = { s1 };
    expect(reduceMessage(sessions, { type: 'tasks', tasks: [] })).toBe(sessions);
  });
});

describe('applyTaskPatch', () => {
  it('patches only the matching task', () => {
    const t2 = { ...t1, id: 't2' };
    const result = applyTaskPatch([t1, t2], 't2', { column: 'done' });
    expect(result.map((t) => t.column)).toEqual(['todo', 'done']);
    expect(t2.column).toBe('todo');
  });
});

describe('useSessionStore', () => {
  it('applies messages, tracks status and patches tasks', () => {
    const store = useSessionStore.getState();
    store.apply({ type: 'snapshot', sessions: [s1] });
    store.apply({ type: 'tasks', tasks: [t1] });
    store.setStatus('open');
    store.patchTask('t1', { title: 'Renamed' });
    const state = useSessionStore.getState();
    expect(state.sessions).toEqual({ s1 });
    expect(state.status).toBe('open');
    expect(state.tasks[0]?.title).toBe('Renamed');
    store.setTasks([]);
    expect(useSessionStore.getState().tasks).toEqual([]);
  });
});

