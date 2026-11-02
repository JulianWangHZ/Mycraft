import type { Session, Task } from '@mycraft/core';
import { describe, expect, it } from 'vitest';
import { boardStats, workingCount } from './office-stats.js';

const NOW = new Date(2026, 9, 26, 15, 0).getTime();
const YESTERDAY = new Date(2026, 9, 25, 15, 0).getTime();

const task = (id: string, column: Task['column'], updatedAt: number): Task => ({
  id,
  title: id,
  note: '',
  project: '',
  column,
  order: 1,
  sessionIds: [],
  createdAt: 0,
  updatedAt,
});

const session = (id: string, agent: Session['agent'], state: Session['state']): Session => ({
  agent,
  sessionId: id,
  cwd: '/w',
  project: 'w',
  state,
  startedAt: 0,
  updatedAt: 0,
});

describe('boardStats', () => {
  it('counts tasks in progress, agents that need you and tasks done today', () => {
    const tasks = [
      task('a', 'doing', NOW - 10),
      task('b', 'doing', NOW - 5),
      task('c', 'done', NOW - 1000),
      task('d', 'done', YESTERDAY),
      task('e', 'todo', NOW),
    ];
    const sessions = [session('s1', 'claude', 'waiting'), session('s2', 'codex', 'running')];
    expect(boardStats(tasks, sessions, NOW)).toEqual({ inProgress: 2, needsYou: 1, doneToday: 1, doing: ['b', 'a'] });
  });

  it('lists at most three tasks in progress', () => {
    const tasks = ['a', 'b', 'c', 'd'].map((id, i) => task(id, 'doing', NOW - i));
    expect(boardStats(tasks, [], NOW).doing).toEqual(['a', 'b', 'c']);
  });
});

describe('workingCount', () => {
  it('counts only working agents of the given kind', () => {
    const sessions = [
      session('1', 'claude', 'running'),
      session('2', 'claude', 'thinking'),
      session('3', 'claude', 'done'),
      session('4', 'codex', 'running'),
    ];
    expect(workingCount(sessions, 'claude')).toBe(2);
    expect(workingCount(sessions, 'gemini')).toBe(0);
  });
});
