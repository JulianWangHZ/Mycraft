import type { AgentKind } from '@mycraft/core';

export const AGENT_KINDS: readonly AgentKind[] = ['claude', 'codex', 'gemini'];
export const AGENT_NAMES: Readonly<Record<AgentKind, string>> = { claude: 'Claude', codex: 'Codex', gemini: 'Gemini' };
