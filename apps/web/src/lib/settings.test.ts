import type { Session } from '@mycraft/core';
import { describe, expect, it } from 'vitest';
import { HIDDEN_AGENTS_KEY, loadHiddenAgents, saveHiddenAgents, useSettingsStore, visibleSessions } from './settings.js';

const session = (sessionId: string, agent: Session['agent']): Session => ({
  agent,
  sessionId,
  cwd: '/w',
  project: 'w',
  state: 'running',
  startedAt: 0,
  updatedAt: 0,
});

function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), data };
}

describe('visibleSessions', () => {
  it('drops sessions of hidden agents', () => {
    const sessions = { a: session('a', 'claude'), b: session('b', 'codex') };
    expect(Object.keys(visibleSessions(sessions, ['codex']))).toEqual(['a']);
  });

  it('returns the same map when nothing is hidden', () => {
    const sessions = { a: session('a', 'claude') };
    expect(visibleSessions(sessions, [])).toBe(sessions);
  });
});

describe('hidden agent storage', () => {
  it('round-trips the hidden list', () => {
    const storage = memory();
    saveHiddenAgents(storage, ['gemini']);
    expect(loadHiddenAgents(storage)).toEqual(['gemini']);
  });

  it.each(['nope', '["robot"]', '{}'])('ignores a bad saved value %s', (raw) => {
    expect(loadHiddenAgents(memory({ [HIDDEN_AGENTS_KEY]: raw }))).toEqual([]);
  });
});

describe('useSettingsStore', () => {
  it('toggles an agent on and off', () => {
    useSettingsStore.getState().toggleAgent('codex');
    expect(useSettingsStore.getState().hiddenAgents).toEqual(['codex']);
    useSettingsStore.getState().toggleAgent('codex');
    expect(useSettingsStore.getState().hiddenAgents).toEqual([]);
  });

  it('replaces the hidden list', () => {
    useSettingsStore.getState().setHiddenAgents(['claude']);
    expect(useSettingsStore.getState().hiddenAgents).toEqual(['claude']);
  });
});

describe('theme setting', () => {
  it('switches between day and night', () => {
    useSettingsStore.getState().setTheme('night');
    expect(useSettingsStore.getState().theme).toBe('night');
    useSettingsStore.getState().setTheme('day');
    expect(useSettingsStore.getState().theme).toBe('day');
  });
});
