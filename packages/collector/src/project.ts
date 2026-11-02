import { readFileSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { projectName } from '@mycraft/core';

export interface ProjectInfo {
  project: string;
  /** Set when the session runs in a git worktree: the worktree's folder name. */
  worktree?: string;
}

const AGENT_WORKTREES = `${sep}.claude${sep}worktrees${sep}`;
const GITDIR = /^gitdir:\s*(.+)$/m;

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** A worktree's `.git` is a file pointing at `<main>/.git/worktrees/<name>`; the main repo is two levels above that. */
function fromGitFile(worktreeRoot: string): ProjectInfo | null {
  const match = GITDIR.exec(readFileSync(join(worktreeRoot, '.git'), 'utf8'));
  if (!match?.[1]) return null;
  const gitdir = match[1].trim();
  const absolute = isAbsolute(gitdir) ? gitdir : resolve(worktreeRoot, gitdir);
  const marker = `${sep}.git${sep}worktrees${sep}`;
  const at = absolute.lastIndexOf(marker);
  if (at === -1) return null;
  return { project: basename(absolute.slice(0, at)), worktree: basename(worktreeRoot) };
}

/** Agent worktrees live at `<repo>/.claude/worktrees/<name>`, so the path alone names both, even after removal. */
function fromAgentPath(cwd: string): ProjectInfo | null {
  const at = cwd.indexOf(AGENT_WORKTREES);
  if (at === -1) return null;
  const name = cwd.slice(at + AGENT_WORKTREES.length).split(sep)[0];
  return name ? { project: basename(cwd.slice(0, at)), worktree: name } : null;
}

function lookup(cwd: string): ProjectInfo {
  let dir = cwd;
  for (;;) {
    const dotGit = join(dir, '.git');
    if (isDirectory(dotGit)) return { project: basename(dir) };
    if (isFile(dotGit)) {
      const info = fromGitFile(dir);
      if (info) return info;
      break;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return fromAgentPath(cwd) ?? { project: projectName(cwd) };
}

/** Names the project a session belongs to, folding git worktrees back into their main repo. */
export function createProjectResolver(): (cwd: string) => ProjectInfo {
  const cache = new Map<string, ProjectInfo>();
  return (cwd) => {
    const cached = cache.get(cwd);
    if (cached) return cached;
    const info = lookup(cwd);
    cache.set(cwd, info);
    return info;
  };
}
