import { projectName, type AgentEvent } from '@mycraft/core';
import type { SessionHub } from './session-hub.js';

type DemoIdentity = Pick<AgentEvent, 'agent' | 'sessionId' | 'cwd' | 'parentSessionId' | 'worktree' | 'title' | 'prompt' | 'model'> & {
  project?: string;
};
type DemoStep = Pick<AgentEvent, 'state' | 'tool' | 'detail'>;

const DEMO_SESSIONS: readonly DemoIdentity[] = [
  { agent: 'claude', sessionId: 'demo-1', cwd: '/demo/web-app', title: 'Move login to server actions', prompt: 'Move the login form to a server action and keep the redirect', model: 'claude-opus-5-5' },
  { agent: 'claude', sessionId: 'demo-1/agent-a', cwd: '/demo/web-app', parentSessionId: 'demo-1', prompt: 'Find every caller of signIn()', model: 'claude-sonnet-5' },
  { agent: 'codex', sessionId: 'demo-2', cwd: '/demo/api-server', prompt: 'Add rate limiting to the public API', model: 'gpt-5-codex' },
  { agent: 'gemini', sessionId: 'demo-3', cwd: '/demo/docs-site', title: 'Docs search', prompt: 'Make the docs search fuzzy', model: 'gemini-3-pro' },
  { agent: 'claude', sessionId: 'demo-4', cwd: '/demo/api-server/.claude/worktrees/fix-auth', project: 'api-server', worktree: 'fix-auth', title: 'Fix token refresh', prompt: 'Why do tokens expire early?', model: 'claude-opus-5-5' },
];

// The script length equals the session count so each tick shows every state once.
const SCRIPT: readonly DemoStep[] = [
  { state: 'thinking' },
  { state: 'running', tool: 'Bash: npm test' },
  { state: 'writing' },
  { state: 'waiting', tool: 'AskUserQuestion' },
  { state: 'done', detail: 'Refactor finished and tests pass.' },
];

export const DEMO_SESSION_COUNT = DEMO_SESSIONS.length;

export function startDemo(
  hub: SessionHub,
  { intervalMs = 5000, now = Date.now }: { intervalMs?: number; now?: () => number } = {},
): () => void {
  let tick = 0;
  const emit = () => {
    DEMO_SESSIONS.forEach((identity, index) => {
      const step = SCRIPT[(tick + index) % SCRIPT.length] ?? { state: 'idle' };
      hub.publish({ ...identity, project: identity.project ?? projectName(identity.cwd), ...step, ts: now() });
    });
    tick += 1;
  };
  emit();
  const timer = setInterval(emit, intervalMs);
  return () => clearInterval(timer);
}
