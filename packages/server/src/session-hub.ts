import type { AgentEvent, ServerMessage, Session } from '@mycraft/core';
import { applyEvent, expireStale, type Snapshot } from './session-store.js';

type Listener = (message: ServerMessage) => void;

export class SessionHub {
  #snapshot: Snapshot = {};
  readonly #listeners = new Set<Listener>();

  publish(event: AgentEvent): void {
    const next = applyEvent(this.#snapshot, event);
    if (next === this.#snapshot) return;
    this.#snapshot = next;
    const session = next[event.sessionId];
    if (session) this.#emit({ type: 'upsert', session });
  }

  sweep(now: number, maxIdleMs: number): void {
    const { snapshot, removed } = expireStale(this.#snapshot, now, maxIdleMs);
    this.#snapshot = snapshot;
    for (const sessionId of removed) this.#emit({ type: 'remove', sessionId });
  }

  sessions(): Session[] {
    return Object.values(this.#snapshot).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  /** Sends a message that is not derived from session events, such as the task list. */
  broadcast(message: ServerMessage): void {
    this.#emit(message);
  }

  #emit(message: ServerMessage): void {
    for (const listener of this.#listeners) listener(message);
  }
}
