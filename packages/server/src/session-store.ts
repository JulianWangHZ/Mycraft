import type { AgentEvent, Session } from '@mycraft/core';

export type Snapshot = Readonly<Record<string, Session>>;

export function applyEvent(snapshot: Snapshot, event: AgentEvent): Snapshot {
  const previous = snapshot[event.sessionId];
  if (previous && event.ts < previous.updatedAt) return snapshot;
  const { ts, ...fields } = event;
  const session: Session = { ...fields, startedAt: previous?.startedAt ?? ts, updatedAt: ts };
  return { ...snapshot, [event.sessionId]: session };
}

export function expireStale(
  snapshot: Snapshot,
  now: number,
  maxIdleMs: number,
): { snapshot: Snapshot; removed: string[] } {
  const kept: Record<string, Session> = {};
  const removed: string[] = [];
  for (const [id, session] of Object.entries(snapshot)) {
    if (now - session.updatedAt > maxIdleMs) removed.push(id);
    else kept[id] = session;
  }
  return { snapshot: removed.length > 0 ? kept : snapshot, removed };
}
