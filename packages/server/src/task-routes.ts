import { taskCreateSchema, taskPatchSchema, type ServerMessage } from '@mycraft/core';
import { Hono, type Context, type MiddlewareHandler } from 'hono';
import type { ZodError, ZodType, ZodTypeDef } from 'zod';
import type { TaskRepository } from './task-repository.js';

function describeIssue(error: ZodError): string {
  const issue = error.issues[0];
  const field = issue?.path.join('.') || 'body';
  if (issue?.code === 'too_small') return `${field} must not be empty.`;
  if (issue?.code === 'too_big') return `${field} is too long.`;
  if (issue?.code === 'unrecognized_keys') return `${issue.keys.join(', ')} cannot be changed.`;
  return `${field} is invalid.`;
}

async function readBody<T>(c: Context, schema: ZodType<T, ZodTypeDef, unknown>) {
  let raw: unknown;
  try {
    raw = await c.req.json();
  } catch {
    return { error: c.json({ error: 'Request body must be JSON.' }, 400) } as const;
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { error: c.json({ error: `Invalid task: ${describeIssue(parsed.error)}` }, 400) } as const;
  return { data: parsed.data } as const;
}

const NOT_FOUND = { error: 'Task not found. It may have been deleted in another tab.' };

export function taskRoutes(
  tasks: TaskRepository,
  requireSession: MiddlewareHandler,
  broadcast: (message: ServerMessage) => void,
) {
  const routes = new Hono();
  const announce = async () => broadcast({ type: 'tasks', tasks: await tasks.list() });

  routes.use('*', requireSession);

  routes.get('/', async (c) => c.json({ tasks: await tasks.list() }));

  routes.post('/', async (c) => {
    const body = await readBody(c, taskCreateSchema);
    if ('error' in body) return body.error;
    const task = await tasks.create(body.data);
    await announce();
    return c.json({ task }, 201);
  });

  routes.patch('/:id', async (c) => {
    const body = await readBody(c, taskPatchSchema);
    if ('error' in body) return body.error;
    const task = await tasks.update(c.req.param('id'), body.data);
    if (!task) return c.json(NOT_FOUND, 404);
    await announce();
    return c.json({ task });
  });

  routes.delete('/:id', async (c) => {
    if (!(await tasks.remove(c.req.param('id')))) return c.json(NOT_FOUND, 404);
    await announce();
    return c.body(null, 204);
  });

  return routes;
}
