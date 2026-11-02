import type { AgentEvent } from '@mycraft/core';
import { describe, expect, it } from 'vitest';
import { applyEvent, expireStale, type Snapshot } from '../src/session-store.js';

const event = (overrides: Partial<AgentEvent> = {}): AgentEvent => ({
  agent: 'claude',
  sessionId: 's1',
  cwd: '/work/web-app',
  project: 'web-app',
  state: 'thinking',
  ts: 1000,
  ...overrides,
});

describe('applyEvent', () => {
  it('creates a session from its first event', () => {
    const next = applyEvent({}, event());
    expect(next.s1).toEqual({
      agent: 'claude',
      sessionId: 's1',
      cwd: '/work/web-app',
      project: 'web-app',
      state: 'thinking',
      startedAt: 1000,
      updatedAt: 1000,
    });
  });

  it('keeps startedAt and replaces the rest on later events', () => {
    const first = applyEvent({}, event({ state: 'running', tool: 'Bash: ls' }));
    const second = applyEvent(first, event({ state: 'done', ts: 2000 }));
    expect(second.s1).toMatchObject({ state: 'done', startedAt: 1000, updatedAt: 2000 });
    expect(second.s1).not.toHaveProperty('tool');
  });

  it('does not mutate the previous snapshot', () => {
    const first = applyEvent({}, event());
    const frozen = structuredClone(first);
    applyEvent(first, event({ state: 'done', ts: 2000 }));
    expect(first).toEqual(frozen);
  });

  it('ignores events older than the stored session', () => {
    const first = applyEvent({}, event({ ts: 2000 }));
    expect(applyEvent(first, event({ state: 'done', ts: 1000 }))).toBe(first);
  });
});

describe('expireStale', () => {
  const snapshot: Snapshot = applyEvent(applyEvent({}, event({ sessionId: 'old', ts: 0 })), event({ ts: 5000 }));

  it('removes sessions idle longer than the limit', () => {
    const result = expireStale(snapshot, 6000, 2000);
    expect(result.removed).toEqual(['old']);
    expect(Object.keys(result.snapshot)).toEqual(['s1']);
  });

  it('returns the same snapshot when nothing expires', () => {
    const result = expireStale(snapshot, 1000, 2000);
    expect(result.snapshot).toBe(snapshot);
    expect(result.removed).toEqual([]);
  });
});
