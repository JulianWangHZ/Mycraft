import type { AgentKind } from '@mycraft/core';
import claude from '@lobehub/icons-static-svg/icons/claude-color.svg?url';
import codex from '@lobehub/icons-static-svg/icons/codex-color.svg?url';
import gemini from '@lobehub/icons-static-svg/icons/gemini-color.svg?url';

/** Product logos for each agent, bundled from the icon package at build time. */
export const AGENT_ICONS: Readonly<Record<AgentKind, string>> = { claude, codex, gemini };
