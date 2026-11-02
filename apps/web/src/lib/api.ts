import type { Task, TaskCreate, TaskPatch } from '@mycraft/core';

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

async function request<T>(fetcher: Fetcher, url: string, init?: RequestInit): Promise<T> {
  const response = await fetcher(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  return body as T;
}

export function createApi(fetcher: Fetcher = (url, init) => fetch(url, init)) {
  const taskUrl = (id: string) => `/api/tasks/${encodeURIComponent(id)}`;
  return {
    listTasks: async () => (await request<{ tasks: Task[] }>(fetcher, '/api/tasks')).tasks,
    createTask: async (input: TaskCreate) =>
      (await request<{ task: Task }>(fetcher, '/api/tasks', { method: 'POST', body: JSON.stringify(input) })).task,
    patchTask: async (id: string, patch: TaskPatch) =>
      (await request<{ task: Task }>(fetcher, taskUrl(id), { method: 'PATCH', body: JSON.stringify(patch) })).task,
    deleteTask: (id: string) => request<void>(fetcher, taskUrl(id), { method: 'DELETE' }),
  };
}

export const api = createApi();
