import type { Session } from '@mycraft/core';
import { describe, expect, it } from 'vitest';
import { placeAgents, seatIndexes } from './behavior.js';

const MIN = 60_000;
const NOW = 100 * MIN;

const session = (sessionId: string, state: Session['state'], ageMs = 5 * MIN, parentSessionId?: string): Session => ({
  agent: 'claude',
  sessionId,
  cwd: '/w/a',
  project: 'a',
  state,
  startedAt: 0,
  updatedAt: NOW - ageMs,
  ...(parentSessionId ? { parentSessionId } : {}),
});

describe('placeAgents', () => {
  it('keeps working agents at their desks with a pose per state', () => {
    const placed = placeAgents([session('a', 'thinking'), session('b', 'running'), session('c', 'writing')], NOW);
    expect(placed.get('a')).toEqual({ at: { kind: 'desk' }, pose: 'think' });
    expect(placed.get('b')?.pose).toBe('type');
    expect(placed.get('c')?.pose).toBe('typeSlow');
  });

  it('keeps an agent that needs the user at the desk, waving', () => {
    expect(placeAgents([session('a', 'waiting')], NOW).get('a')).toEqual({ at: { kind: 'desk' }, pose: 'wave' });
  });

  it('slumps at the desk on error', () => {
    expect(placeAgents([session('a', 'error')], NOW).get('a')?.pose).toBe('slump');
  });

  it('sends a just-finished agent to the coffee bar first', () => {
    expect(placeAgents([session('a', 'done', 20_000)], NOW).get('a')).toEqual({
      at: { kind: 'activity', activity: 'coffee', seat: 0 },
      pose: 'sip',
    });
  });

  it('sends long-idle agents to the nap pods', () => {
    expect(placeAgents([session('a', 'idle', 26 * MIN)], NOW).get('a')?.at).toEqual({
      kind: 'activity',
      activity: 'nap',
      seat: 0,
    });
  });

  it('moves resting agents to a new activity every few minutes', () => {
    const agent = session('a', 'done');
    const visited = new Set(
      Array.from({ length: 8 }, (_, i) => {
        const at = placeAgents([agent], NOW + i * 1.5 * MIN).get('a')?.at;
        return at?.kind === 'activity' ? at.activity : 'desk';
      }),
    );
    expect(visited.size).toBeGreaterThanOrEqual(4);
    expect(visited.has('desk')).toBe(false);
    expect(visited.has('nap')).toBe(false);
  });

  it('moves at most once in any 90 seconds', () => {
    for (const id of ['a', 'b', 'c']) {
      const agent = session(id, 'done');
      const samples = Array.from({ length: 10 }, (_, i) => JSON.stringify(placeAgents([agent], NOW + i * 9_000).get(id)));
      const moves = samples.filter((spot, i) => i > 0 && spot !== samples[i - 1]).length;
      expect(moves).toBeLessThanOrEqual(1);
    }
  });

  it('spreads resting agents across activities instead of moving them in lockstep', () => {
    const resting = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => session(id, 'done'));
    const placed = placeAgents(resting, NOW);
    const spots = new Set(resting.map((s) => JSON.stringify((placed.get(s.sessionId)?.at as { activity: string }).activity)));
    expect(spots.size).toBeGreaterThanOrEqual(3);
  });

  it('gives agents that share an activity their own seat there', () => {
    const resting = Array.from({ length: 14 }, (_, i) => session(`s${i}`, 'done'));
    const placed = [...placeAgents(resting, NOW).values()].map((p) => p.at);
    const keys = placed.map((at) => (at.kind === 'activity' ? `${at.activity}:${at.seat}` : at.kind));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('goes straight back to the desk when new work arrives', () => {
    expect(placeAgents([session('a', 'thinking', 10 * MIN)], NOW).get('a')?.at).toEqual({ kind: 'desk' });
  });

  it('makes interns follow their parent', () => {
    const placed = placeAgents([session('p', 'done', 20_000), session('p/i', 'running', 1000, 'p')], NOW);
    expect(placed.get('p/i')).toEqual({ at: { kind: 'withParent', parentSessionId: 'p' }, pose: 'type' });
  });
});

describe('seatIndexes', () => {
  it('orders main agents by start time, counts per kind and skips interns', () => {
    const a = { ...session('a', 'running'), startedAt: 20 };
    const b = { ...session('b', 'done'), startedAt: 10 };
    const c = { ...session('c', 'running'), agent: 'codex' as const, startedAt: 15 };
    const intern = session('a/i', 'running', 0, 'a');
    expect([...seatIndexes([a, b, c, intern])]).toEqual([
      ['b', { index: 0, agentIndex: 0 }],
      ['c', { index: 1, agentIndex: 0 }],
      ['a', { index: 2, agentIndex: 1 }],
    ]);
  });
});

describe('placeAgents naps option', () => {
  const idle = (id: string, minutes: number) =>
    ({ agent: 'claude', sessionId: id, cwd: '/w', project: 'w', state: 'done', startedAt: 0, updatedAt: 1_000_000 - minutes * 60_000 }) as const;

  it('sends long-idle agents to nap by default', () => {
    expect(placeAgents([idle('a', 40)], 1_000_000).get('a')?.at).toMatchObject({ kind: 'activity', activity: 'nap' });
  });

  it('keeps long-idle agents going round the attractions when naps are off', () => {
    const at = placeAgents([idle('a', 40)], 1_000_000, { naps: false }).get('a')?.at;
    expect(at).toMatchObject({ kind: 'activity' });
    expect(at && 'activity' in at ? at.activity : null).not.toBe('nap');
  });
});
