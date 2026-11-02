import type { Session } from '@mycraft/core';
import { describe, expect, it } from 'vitest';
import { resumeCommand, shellQuote, timeLabel } from './session-card.js';

const session = (overrides: Partial<Session> = {}): Session => ({
  agent: 'claude',
  sessionId: 's1',
  cwd: '/work/my app',
  project: 'my app',
  state: 'done',
  startedAt: 0,
  updatedAt: 0,
  ...overrides,
});

describe('shellQuote', () => {
  it('wraps in single quotes so nothing inside is expanded', () => {
    expect(shellQuote('a $(rm -rf ~) `x` $HOME')).toBe("'a $(rm -rf ~) `x` $HOME'");
  });

  it('escapes embedded single quotes', () => {
    expect(shellQuote("it's")).toBe("'it'\\''s'");
  });
});

describe('resumeCommand', () => {
  it('resumes Claude from its folder', () => {
    expect(resumeCommand(session())).toBe("cd '/work/my app' && claude --resume 's1'");
  });

  it('resumes the parent session for a subagent', () => {
    expect(resumeCommand(session({ sessionId: 's1/agent-a', parentSessionId: 's1' }))).toBe("cd '/work/my app' && claude --resume 's1'");
  });

  it('uses each CLI\'s own resume syntax', () => {
    expect(resumeCommand(session({ agent: 'codex', sessionId: 'c1' }))).toBe("cd '/work/my app' && codex resume 'c1'");
    expect(resumeCommand(session({ agent: 'gemini', sessionId: 'g1' }))).toBe("cd '/work/my app' && gemini --resume 'g1'");
  });
});

describe('timeLabel', () => {
  const now = 10 * 60_000;

  it('shows how long the current turn has run while working', () => {
    expect(timeLabel(session({ state: 'running', turnStartedAt: now - 75_000 }), now, 'en')).toBe('1m 15s');
  });

  it('falls back to time since the last update when working without a turn start', () => {
    expect(timeLabel(session({ state: 'thinking', updatedAt: now - 3 * 60_000 }), now, 'en')).toBe('3 minutes ago');
  });

  it('shows how long ago a finished agent last did something', () => {
    expect(timeLabel(session({ updatedAt: now - 2 * 60 * 60_000 }), now, 'en')).toBe('2 hours ago');
    expect(timeLabel(session({ updatedAt: now - 10_000 }), now, 'en')).toBe('now');
  });
});
