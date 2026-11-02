import { stateGroup, type Session, type Task } from '@mycraft/core';
import type { SessionMap } from '../store.js';

export interface CardStatus {
  bound: Session[];
  ended: number;
  needsYou: boolean;
  suggestDone: boolean;
}

export function cardStatus(task: Task, sessions: SessionMap): CardStatus {
  const bound = task.sessionIds.flatMap((id) => (sessions[id] ? [sessions[id]] : []));
  const groups = bound.map((session) => stateGroup(session.state));
  return {
    bound,
    ended: task.sessionIds.length - bound.length,
    needsYou: groups.some((group) => group === 'needsYou' || group === 'trouble'),
    suggestDone: task.column !== 'done' && groups.length > 0 && groups.every((group) => group === 'resting'),
  };
}
