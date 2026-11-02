import { stateGroup, type Session } from '@mycraft/core';
import { formatDuration } from './duration.js';

/** POSIX single quotes: nothing inside is expanded, so a folder or id cannot run anything when pasted. */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** The command that reopens this session in a terminal. Subagents reopen their parent. */
export function resumeCommand(session: Session): string {
  const id = shellQuote(session.parentSessionId ?? session.sessionId);
  const cd = `cd ${shellQuote(session.cwd)} && `;
  if (session.agent === 'codex') return `${cd}codex resume ${id}`;
  if (session.agent === 'gemini') return `${cd}gemini --resume ${id}`;
  return `${cd}claude --resume ${id}`;
}

const UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
];

function ago(ms: number, language: string): string {
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (ms >= size) return format.format(-Math.round(ms / size), unit);
  }
  return format.format(0, 'second');
}

/** Turn duration while the agent works or waits; otherwise how long ago it last did something. */
export function timeLabel(session: Session, now: number, language: string): string {
  const group = stateGroup(session.state);
  if ((group === 'working' || group === 'needsYou') && session.turnStartedAt) return formatDuration(now - session.turnStartedAt);
  return ago(now - session.updatedAt, language);
}
