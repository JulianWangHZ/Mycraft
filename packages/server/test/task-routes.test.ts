import type { ServerMessage } from '@mycraft/core';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AUTH_COOKIE, createApp } from '../src/app.js';
import { SessionHub } from '../src/session-hub.js';
import { JsonTaskRepository } from '../src/task-repository.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'routes-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

function setup() {
  const hub = new SessionHub();
  const tasks = new JsonTaskRepository(join(dir, 'tasks.json'));
  const { app } = createApp({ hub, tasks, linkToken: 'link', sessionSecret: 'secret' });
  const messages: ServerMessage[] = [];
  hub.subscribe((message) => messages.push(message));
  const send = (method: string, path: string, body?: unknown) =>
    app.request(path, {
      method,
      headers: { Cookie: `${AUTH_COOKIE}=secret`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });
  return { app, send, messages };
}

describe('task routes', () => {
  it('requires sign-in', async () => {
    expect((await setup().app.request('/api/tasks')).status).toBe(401);
  });

  it('creates, lists, updates and deletes a task', async () => {
    const { send } = setup();
    const created = await send('POST', '/api/tasks', { title: 'Fix login', project: 'web-app' });
    expect(created.status).toBe(201);
    const { task } = (await created.json()) as { task: { id: string } };

    const listed = (await (await send('GET', '/api/tasks')).json()) as { tasks: unknown[] };
    expect(listed.tasks).toHaveLength(1);

    const patched = await send('PATCH', `/api/tasks/${task.id}`, { column: 'doing' });
    expect(patched.status).toBe(200);
    expect(await patched.json()).toMatchObject({ task: { column: 'doing' } });

    expect((await send('DELETE', `/api/tasks/${task.id}`)).status).toBe(204);
    expect((await send('DELETE', `/api/tasks/${task.id}`)).status).toBe(404);
  });

  it('broadcasts the task list after each change', async () => {
    const { send, messages } = setup();
    await send('POST', '/api/tasks', { title: 'A' });
    expect(messages.at(-1)).toMatchObject({ type: 'tasks', tasks: [{ title: 'A' }] });
  });

  it('rejects invalid input with a clear message', async () => {
    const { send } = setup();
    const res = await send('POST', '/api/tasks', { title: '' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid task: title must not be empty.' });
  });

  it('rejects a body that is not JSON', async () => {
    const res = await setup().send('POST', '/api/tasks', '{nope');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Request body must be JSON.' });
  });

  it('rejects unknown patch fields', async () => {
    const { send } = setup();
    const created = (await (await send('POST', '/api/tasks', { title: 'A' })).json()) as { task: { id: string } };
    const res = await send('PATCH', `/api/tasks/${created.task.id}`, { createdAt: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 404 when patching a missing task', async () => {
    const res = await setup().send('PATCH', '/api/tasks/missing', { title: 'x' });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Task not found. It may have been deleted in another tab.' });
  });
});
