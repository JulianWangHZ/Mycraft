import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createClaudeParser, createCodexParser, startCollector, type SourceConfig } from '@mycraft/collector';
import { createApp } from './app.js';
import { startDemo } from './demo.js';
import { SessionHub } from './session-hub.js';
import { JsonTaskRepository } from './task-repository.js';

const IDLE_MS = 30 * 60 * 1000;
const SWEEP_MS = 60 * 1000;

function readPort(raw: string): number {
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`--port must be an integer between 1 and 65535, got "${raw}"`);
  }
  return port;
}

function localSource(label: string, segments: string[], createParser: SourceConfig['createParser']): SourceConfig | null {
  const dir = join(homedir(), ...segments);
  if (existsSync(dir)) return { dir, createParser };
  console.log(`${label}: not installed (no ~/${segments.join('/')})`);
  return null;
}

function main(): void {
  const { values } = parseArgs({
    options: { port: { type: 'string', default: '4777' }, demo: { type: 'boolean', default: false } },
  });
  const port = readPort(values.port);
  const linkToken = process.env.MYCRAFT_TOKEN ?? randomBytes(24).toString('base64url');
  const sessionSecret = randomBytes(32).toString('base64url');

  const hub = new SessionHub();
  const dataDir = process.env.MYCRAFT_DATA_DIR ?? join(homedir(), '.mycraft');
  const tasks = new JsonTaskRepository(join(dataDir, 'tasks.json'), {
    onCorrupt: (backup) => console.warn(`tasks.json was unreadable. It was moved to ${backup} and a new list was started.`),
  });
  const { app, injectWebSocket } = createApp({ hub, tasks, linkToken, sessionSecret });
  const webDist = fileURLToPath(new URL('../../../apps/web/dist', import.meta.url));
  app.use('/*', serveStatic({ root: relative(process.cwd(), webDist) }));

  const server = serve({ fetch: app.fetch, port, hostname: '127.0.0.1' });
  injectWebSocket(server);

  if (values.demo) {
    startDemo(hub);
  } else {
    const sources = [
      localSource('Claude Code', ['.claude', 'projects'], createClaudeParser),
      localSource('Codex', ['.codex', 'sessions'], createCodexParser),
    ].filter((source): source is SourceConfig => source !== null);
    const parseErrors = new Map<string, number>();
    startCollector({
      sources,
      maxFileAgeMs: IDLE_MS,
      onEvent: (event) => hub.publish(event),
      onParseError: ({ filePath, reason }) => {
        const count = (parseErrors.get(filePath) ?? 0) + 1;
        parseErrors.set(filePath, count);
        if (count === 1) console.warn(`Skipped an unreadable line in ${filePath}: ${reason}`);
      },
    });
  }
  setInterval(() => hub.sweep(Date.now(), IDLE_MS), SWEEP_MS).unref();

  const origin = process.env.UI_URL ?? `http://127.0.0.1:${port}`;
  console.log(`Mycraft is running. Open this link once to sign in:\n${origin}/api/auth?token=${linkToken}`);
}

main();
