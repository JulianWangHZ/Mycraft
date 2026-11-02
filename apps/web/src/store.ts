import type { ServerMessage, Session, Task, TaskPatch } from '@mycraft/core';
import { create } from 'zustand';
import type { ConnectionStatus } from './lib/socket.js';

export type SessionMap = Readonly<Record<string, Session>>;

export function reduceMessage(sessions: SessionMap, message: ServerMessage): SessionMap {
  switch (message.type) {
    case 'snapshot':
      return Object.fromEntries(message.sessions.map((session) => [session.sessionId, session]));
    case 'upsert':
      return { ...sessions, [message.session.sessionId]: message.session };
    case 'remove':
      return Object.fromEntries(Object.entries(sessions).filter(([id]) => id !== message.sessionId));
    case 'tasks':
      return sessions;
  }
}

export function applyTaskPatch(tasks: readonly Task[], id: string, patch: TaskPatch): Task[] {
  return tasks.map((task) => (task.id === id ? { ...task, ...patch } : task));
}

interface SessionStore {
  sessions: SessionMap;
  tasks: Task[];
  status: ConnectionStatus;
  apply(message: ServerMessage): void;
  setStatus(status: ConnectionStatus): void;
  setTasks(tasks: Task[]): void;
  patchTask(id: string, patch: TaskPatch): void;
}

export const useSessionStore = create<SessionStore>()((set) => ({
  sessions: {},
  tasks: [],
  status: 'connecting',
  apply: (message) =>
    set((state) => {
      if (message.type === 'tasks') return { tasks: message.tasks };
      return { sessions: reduceMessage(state.sessions, message) };
    }),
  setStatus: (status) => set({ status }),
  setTasks: (tasks) => set({ tasks }),
  patchTask: (id, patch) => set((state) => ({ tasks: applyTaskPatch(state.tasks, id, patch) })),
}));
