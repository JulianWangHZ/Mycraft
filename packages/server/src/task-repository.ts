import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';
import { taskCreateSchema, taskSchema, type Task, type TaskCreate, type TaskPatch } from '@mycraft/core';

export interface TaskRepository {
  list(): Promise<Task[]>;
  create(input: TaskCreate): Promise<Task>;
  update(id: string, patch: TaskPatch): Promise<Task | null>;
  remove(id: string): Promise<boolean>;
}

const fileSchema = z.object({ version: z.literal(1), tasks: z.array(taskSchema) });

export interface JsonTaskRepositoryOptions {
  now?: () => number;
  newId?: () => string;
  onCorrupt?: (backupPath: string) => void;
}

/** Stores tasks in one JSON file. Writes go to a temp file first, then rename, so a crash never leaves half a file. */
export class JsonTaskRepository implements TaskRepository {
  readonly #file: string;
  readonly #now: () => number;
  readonly #newId: () => string;
  readonly #onCorrupt: (backupPath: string) => void;
  #cache: Promise<readonly Task[]> | null = null;
  #queue: Promise<unknown> = Promise.resolve();

  constructor(file: string, options: JsonTaskRepositoryOptions = {}) {
    this.#file = file;
    this.#now = options.now ?? Date.now;
    this.#newId = options.newId ?? randomUUID;
    this.#onCorrupt = options.onCorrupt ?? (() => undefined);
  }

  async list(): Promise<Task[]> {
    return [...(await this.#load())];
  }

  create(input: TaskCreate): Promise<Task> {
    return this.#mutate((tasks) => {
      const fields = taskCreateSchema.parse(input);
      const inColumn = tasks.filter((task) => task.column === fields.column);
      const order = inColumn.reduce((max, task) => Math.max(max, task.order), 0) + 1;
      const now = this.#now();
      const task: Task = { id: this.#newId(), ...fields, order, createdAt: now, updatedAt: now };
      return { tasks: [...tasks, task], result: task };
    });
  }

  update(id: string, patch: TaskPatch): Promise<Task | null> {
    return this.#mutate((tasks) => {
      const current = tasks.find((task) => task.id === id);
      if (!current) return { tasks, result: null };
      const next: Task = { ...current, ...patch, updatedAt: this.#now() };
      return { tasks: tasks.map((task) => (task.id === id ? next : task)), result: next };
    });
  }

  remove(id: string): Promise<boolean> {
    return this.#mutate((tasks) => {
      const remaining = tasks.filter((task) => task.id !== id);
      return { tasks: remaining, result: remaining.length !== tasks.length };
    });
  }

  #mutate<T>(change: (tasks: readonly Task[]) => { tasks: readonly Task[]; result: T }): Promise<T> {
    const run = this.#queue.then(async () => {
      const current = await this.#load();
      const { tasks, result } = change(current);
      if (tasks !== current) {
        await this.#write(tasks);
        this.#cache = Promise.resolve(tasks);
      }
      return result;
    });
    this.#queue = run.catch(() => undefined);
    return run;
  }

  #load(): Promise<readonly Task[]> {
    this.#cache ??= this.#read();
    return this.#cache;
  }

  async #read(): Promise<readonly Task[]> {
    let text: string;
    try {
      text = await readFile(this.#file, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    try {
      return fileSchema.parse(JSON.parse(text)).tasks;
    } catch {
      const backup = `${this.#file}.bak`;
      await rename(this.#file, backup);
      this.#onCorrupt(backup);
      return [];
    }
  }

  async #write(tasks: readonly Task[]): Promise<void> {
    await mkdir(dirname(this.#file), { recursive: true });
    const temp = `${this.#file}.${process.pid}.tmp`;
    await writeFile(temp, `${JSON.stringify({ version: 1, tasks }, null, 2)}\n`, { mode: 0o600 });
    await rename(temp, this.#file);
  }
}
