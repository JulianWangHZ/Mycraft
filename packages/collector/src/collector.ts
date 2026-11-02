import type { Stats } from 'node:fs';
import { stat } from 'node:fs/promises';
import { watch, type FSWatcher } from 'chokidar';
import type { AgentEvent } from '@mycraft/core';
import { createProjectResolver, type ProjectInfo } from './project.js';
import { FileTailer } from './tailer.js';
import type { LineParser, ParserFactory } from './types.js';

export interface SourceConfig {
  dir: string;
  createParser: ParserFactory;
}

export interface ParseIssue {
  filePath: string;
  reason: string;
}

export interface CollectorOptions {
  sources: SourceConfig[];
  /** Called for every parsed event, with the session file it came from. */
  onEvent(event: AgentEvent, source: { filePath: string }): void;
  onParseError?(issue: ParseIssue): void;
  maxFileAgeMs: number;
  usePolling?: boolean;
  now?: () => number;
  /** Maps a working directory to its project; defaults to folding git worktrees into their main repo. */
  resolveProject?: (cwd: string) => ProjectInfo;
}

export interface Collector {
  ready: Promise<void>;
  close(): Promise<void>;
}

const SESSION_FILE = /\.jsonl$/;

export function startCollector(options: CollectorOptions): Collector {
  const tailer = new FileTailer();
  const now = options.now ?? Date.now;
  const resolveProject = options.resolveProject ?? createProjectResolver();
  // One promise chain per file so overlapping change events never read the same bytes twice.
  const queues = new Map<string, Promise<void>>();
  const parsers = new Map<string, LineParser>();

  function parserFor(source: SourceConfig, filePath: string): LineParser {
    const existing = parsers.get(filePath);
    if (existing) return existing;
    const created = source.createParser(filePath);
    parsers.set(filePath, created);
    return created;
  }

  async function readFile(source: SourceConfig, filePath: string, stats?: Stats): Promise<void> {
    const mtimeMs = stats?.mtimeMs ?? (await stat(filePath)).mtimeMs;
    if (now() - mtimeMs > options.maxFileAgeMs) return;
    const lines = await tailer.readNewLines(filePath);
    const parse = parserFor(source, filePath);
    for (const line of lines) {
      const result = parse(line);
      if (result.kind === 'event') options.onEvent({ ...result.event, ...resolveProject(result.event.cwd) }, { filePath });
      else if (result.kind === 'error') options.onParseError?.({ filePath, reason: result.reason });
    }
  }

  function enqueue(source: SourceConfig, filePath: string, stats?: Stats): void {
    if (!SESSION_FILE.test(filePath)) return;
    const previous = queues.get(filePath) ?? Promise.resolve();
    const next = previous
      .then(() => readFile(source, filePath, stats))
      .catch((error: unknown) => options.onParseError?.({ filePath, reason: String(error) }));
    queues.set(filePath, next);
  }

  const watchers: FSWatcher[] = options.sources.map((source) =>
    watch(source.dir, { ignoreInitial: false, usePolling: options.usePolling ?? false, interval: 100 })
      .on('add', (filePath, stats) => enqueue(source, filePath, stats))
      .on('change', (filePath, stats) => enqueue(source, filePath, stats))
      .on('unlink', (filePath) => {
        tailer.forget(filePath);
        parsers.delete(filePath);
      }),
  );

  const ready = Promise.all(
    watchers.map((watcher) => new Promise<void>((resolve) => watcher.once('ready', () => resolve()))),
  ).then(() => undefined);

  return {
    ready,
    close: async () => {
      await Promise.all(watchers.map((watcher) => watcher.close()));
      await Promise.all(queues.values());
    },
  };
}
