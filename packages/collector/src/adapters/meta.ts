import type { AgentEvent } from '@mycraft/core';

export const PROMPT_MAX = 240;

const INTERRUPT = '[Request interrupted by user';
// The CLIs record their own notices as user turns wrapped in a bare lowercase tag.
const INJECTED = /^<[a-z][a-z0-9_-]*>/;
const PASTE_TAG = /<\/?pasted_content[^>]*>/g;

export type SessionMeta = Pick<AgentEvent, 'title' | 'prompt' | 'model' | 'turnStartedAt'>;

/** Text a person typed, as one short line; null for CLI notices, interrupts and empty input. */
export function personPrompt(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith(INTERRUPT) || INJECTED.test(trimmed)) return null;
  const flat = trimmed.replace(PASTE_TAG, ' ').replace(/\s+/g, ' ').trim();
  if (!flat) return null;
  return flat.length > PROMPT_MAX ? `${flat.slice(0, PROMPT_MAX - 1)}…` : flat;
}

/** Copies only the metadata fields that are set, so events stay free of undefined keys. */
export function withMeta(event: AgentEvent, meta: SessionMeta): AgentEvent {
  const extra = Object.fromEntries(Object.entries(meta).filter(([, value]) => value !== undefined));
  return { ...event, ...extra };
}
