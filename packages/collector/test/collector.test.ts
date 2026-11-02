import { appendFile, mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentEvent } from '@mycraft/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startCollector, type Collector, type ParseIssue, type ParserFactory } from '../src/index.js';

const HOUR = 60 * 60 * 1000;

// A tiny parser so these tests exercise the collector, not the Claude adapter.
const createParser: ParserFactory = (filePath) => (line) => {
  if (line === 'bad') return { kind: 'error', reason: 'bad line' };
  if (line === 'skip') return { kind: 'skip' };
  return {
    kind: 'event',
    event: { agent: 'claude', sessionId: line, cwd: filePath, project: 'p', state: 'thinking', ts: 1 },
  };
};

let dir: string;
let collector: Collector | undefined;
let events: AgentEvent[];
let issues: ParseIssue[];

async function start(): Promise<void> {
  collector = startCollector({
    sources: [{ dir, createParser }],
    onEvent: (event) => events.push(event),
    onParseError: (issue) => issues.push(issue),
    maxFileAgeMs: HOUR,
    usePolling: true,
  });
  await collector.ready;
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'collector-'));
  events = [];
  issues = [];
});

afterEach(async () => {
  await collector?.close();
  collector = undefined;
  await rm(dir, { recursive: true, force: true });
});

describe('startCollector', () => {
  it('emits events for existing and appended lines', async () => {
    const file = join(dir, 'a.jsonl');
    await writeFile(file, 'one\n');
    await start();
    await vi.waitFor(() => expect(events.map((e) => e.sessionId)).toEqual(['one']));
    await appendFile(file, 'two\n');
    await vi.waitFor(() => expect(events.map((e) => e.sessionId)).toEqual(['one', 'two']));
  });

  it('finds files in nested folders', async () => {
    await mkdir(join(dir, 'proj', 'sub'), { recursive: true });
    await writeFile(join(dir, 'proj', 'sub', 'b.jsonl'), 'nested\n');
    await start();
    await vi.waitFor(() => expect(events.map((e) => e.sessionId)).toEqual(['nested']));
  });

  it('ignores files that are not .jsonl', async () => {
    await writeFile(join(dir, 'notes.txt'), 'nope\n');
    await writeFile(join(dir, 'c.jsonl'), 'yes\n');
    await start();
    await vi.waitFor(() => expect(events.map((e) => e.sessionId)).toEqual(['yes']));
  });

  it('ignores files older than maxFileAgeMs', async () => {
    const old = join(dir, 'old.jsonl');
    await writeFile(old, 'stale\n');
    const past = new Date(Date.now() - 2 * HOUR);
    await utimes(old, past, past);
    await writeFile(join(dir, 'new.jsonl'), 'fresh\n');
    await start();
    await vi.waitFor(() => expect(events.map((e) => e.sessionId)).toEqual(['fresh']));
  });

  it('reports parse errors and keeps going', async () => {
    await writeFile(join(dir, 'd.jsonl'), 'bad\nskip\ngood\n');
    await start();
    await vi.waitFor(() => expect(events.map((e) => e.sessionId)).toEqual(['good']));
    expect(issues).toEqual([{ filePath: join(dir, 'd.jsonl'), reason: 'bad line' }]);
  });
});

describe('project resolution', () => {
  it('replaces the project with the resolved one and adds the worktree', async () => {
    await writeFile(join(dir, 'w.jsonl'), 'one\n');
    collector = startCollector({
      sources: [{ dir, createParser }],
      onEvent: (event) => events.push(event),
      maxFileAgeMs: HOUR,
      usePolling: true,
      resolveProject: () => ({ project: 'myapp', worktree: 'fix-login' }),
    });
    await collector.ready;
    await vi.waitFor(() => expect(events[0]).toMatchObject({ project: 'myapp', worktree: 'fix-login' }));
  });
});
