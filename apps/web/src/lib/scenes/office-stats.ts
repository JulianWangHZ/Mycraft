import type { AgentKind, Session, Task } from '@mycraft/core';
import { stateGroup } from '@mycraft/core';

export interface BoardStats {
  inProgress: number;
  needsYou: number;
  doneToday: number;
  /** Titles of up to three tasks in progress, most recently updated first. */
  doing: string[];
}

function startOfDay(now: number): number {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
}

export function boardStats(tasks: readonly Task[], sessions: readonly Session[], now: number): BoardStats {
  const doing = tasks.filter((task) => task.column === 'doing').sort((a, b) => b.updatedAt - a.updatedAt);
  return {
    inProgress: doing.length,
    needsYou: sessions.filter((session) => stateGroup(session.state) === 'needsYou').length,
    doneToday: tasks.filter((task) => task.column === 'done' && task.updatedAt >= startOfDay(now)).length,
    doing: doing.slice(0, 3).map((task) => task.title),
  };
}

/** How many agents of one kind are working right now (thinking, running a tool or writing). */
export function workingCount(sessions: readonly Session[], agent: AgentKind): number {
  return sessions.filter((session) => session.agent === agent && stateGroup(session.state) === 'working').length;
}
