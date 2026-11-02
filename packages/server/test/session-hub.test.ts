import type { AgentEvent, ServerMessage } from '@mycraft/core';
import { describe, expect, it } from 'vitest';
import { SessionHub } from '../src/session-hub.js';

const event = (overrides: Partial<AgentEvent> = {}): AgentEvent => ({
  agent: 'claude',
  sessionId: 's1',
  cwd: '/w/a',
  project: 'a',
  state: 'thinking',
  ts: 1000,
  ...overrides,
});

describe('SessionHub', () => {
  it('broadcasts an upsert for each accepted event', () => {
    const hub = new SessionHub();
    const messages: ServerMessage[] = [];
    hub.subscribe((message) => messages.push(message));
    hub.publish(event());
    expect(messages).toEqual([{ type: 'upsert', session: hub.sessions()[0] }]);
  });

  it('does not broadcast stale events', () => {
    const hub = new SessionHub();
    hub.publish(event({ ts: 2000 }));
    const messages: ServerMessage[] = [];
    hub.subscribe((message) => messages.push(message));
    hub.publish(event({ ts: 1000 }));
    expect(messages).toEqual([]);
  });

  it('lists sessions newest first', () => {
    const hub = new SessionHub();
    hub.publish(event({ sessionId: 'a', ts: 1000 }));
    hub.publish(event({ sessionId: 'b', ts: 3000 }));
    expect(hub.sessions().map((s) => s.sessionId)).toEqual(['b', 'a']);
  });

  it('broadcasts removals when sweeping', () => {
    const hub = new SessionHub();
    hub.publish(event({ ts: 0 }));
    const messages: ServerMessage[] = [];
    hub.subscribe((message) => messages.push(message));
    hub.sweep(10_000, 1000);
    expect(messages).toEqual([{ type: 'remove', sessionId: 's1' }]);
    expect(hub.sessions()).toEqual([]);
  });

  it('stops notifying after unsubscribe', () => {
    const hub = new SessionHub();
    const messages: ServerMessage[] = [];
    const unsubscribe = hub.subscribe((message) => messages.push(message));
    unsubscribe();
    hub.publish(event());
    expect(messages).toEqual([]);
  });
});
