import type { Session } from '@mycraft/core';
import { projectLabel } from '../lib/labels.js';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AGENT_NAMES } from '../lib/agents.js';
import { groupSessions } from '../lib/group.js';
import { useSessionStore } from '../store.js';
import { AgentAvatar } from './AgentAvatar.js';

function Section({ title, sessions }: { title: string; sessions: Session[] }) {
  const { t } = useTranslation();
  if (sessions.length === 0) return null;
  return (
    <section className="group">
      <h2>
        {title} <small>{sessions.length}</small>
      </h2>
      <ul>
        {sessions.map((session) => (
          <li key={session.sessionId} className="row" data-state={session.state}>
            <span className="agent">
              <AgentAvatar agent={session.agent} />
              {AGENT_NAMES[session.agent]}
              {session.parentSessionId ? ` · ${t('list.intern')}` : ''}
            </span>
            <span className="project">{projectLabel(session)}</span>
            <span className="state">{t(`state.${session.state}`)}</span>
            <code className="tool">{session.tool ?? ''}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SessionList() {
  const { t } = useTranslation();
  const sessions = useSessionStore((state) => state.sessions);
  const status = useSessionStore((state) => state.status);
  const groups = useMemo(() => groupSessions(Object.values(sessions)), [sessions]);
  const isEmpty = Object.keys(sessions).length === 0;

  return (
    <div className="list">
      {isEmpty && status === 'open' ? <p className="empty">{t('list.empty')}</p> : null}
      <Section title={t('list.needsYou')} sessions={groups.needsYou} />
      <Section title={t('list.working')} sessions={groups.working} />
      <Section title={t('list.resting')} sessions={groups.resting} />
    </div>
  );
}
