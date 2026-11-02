import type { Session } from '@mycraft/core';

/** Project name as shown to people; worktree sessions read as `project · worktree`. */
export function projectLabel(session: Pick<Session, 'project' | 'worktree'>): string {
  return session.worktree ? `${session.project} · ${session.worktree}` : session.project;
}

/** Short label for the name tag over a character: the worktree when there is one, otherwise the project. */
export function tagLabel(session: Pick<Session, 'project' | 'worktree'>): string {
  return session.worktree ?? session.project;
}
