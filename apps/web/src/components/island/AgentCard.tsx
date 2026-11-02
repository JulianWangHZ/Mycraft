import type { Session } from '@mycraft/core';
import { stateGroup } from '@mycraft/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AGENT_ICONS } from '../../lib/agent-icons.js';
import { AGENT_NAMES } from '../../lib/agents.js';
import { resumeCommand, timeLabel } from '../../lib/session-card.js';

function useTicker(ms: number): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(timer);
  }, [ms]);
  return now;
}

function CopyResume({ session }: { session: Session }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(resumeCommand(session));
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button type="button" className="ac-copy" onClick={() => void copy()} title={resumeCommand(session)}>
      {copied ? t('card.copied') : t('card.copyResume')}
    </button>
  );
}

/**
 * Everything worth knowing about one session. Over a character, hovering shows it and clicking
 * pins it so the copy button can be used; on the board (`actions`) the copy button is always there.
 */
export function AgentCard({ session, pinned, actions = false }: { session: Session; pinned: boolean; actions?: boolean }) {
  const { t, i18n } = useTranslation();
  const now = useTicker(1000);
  const group = stateGroup(session.state);
  const working = group === 'working';
  const intern = session.parentSessionId ? ` · ${t('list.intern')}` : '';
  const showText = !session.parentSessionId || working;
  const title = session.title && session.title !== session.project ? session.title : null;

  return (
    <div className="agent-card" data-group={group} data-pinned={pinned || undefined} data-board={actions || undefined}>
      <header>
        <span className="ac-agent">
          <img src={AGENT_ICONS[session.agent]} alt="" width={16} height={16} />
          {AGENT_NAMES[session.agent]}
        </span>
        <span className="ac-project" title={session.cwd}>
          {session.worktree ? `${session.project} · ${session.worktree}` : session.project}
        </span>
        <time>{timeLabel(session, now, i18n.language)}</time>
      </header>
      {title ? (
        <p className="ac-title" title={title}>
          {title}
        </p>
      ) : null}
      <div className="ac-status">
        <span className="ac-ind" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <strong>{t(`state.${session.state}`)}</strong>
        {session.tool ? <code title={session.tool}>{session.tool}</code> : null}
      </div>
      {showText && session.prompt ? (
        <p className="ac-q" title={session.prompt}>
          {session.prompt}
        </p>
      ) : null}
      {showText && session.detail && !working ? (
        <p className="ac-r" title={session.detail}>
          {session.detail}
        </p>
      ) : null}
      <footer>
        <span className="ac-model">
          {session.model ?? ''}
          {intern}
        </span>
        {pinned || actions ? <CopyResume session={session} /> : <span className="ac-hint">{t('card.clickToPin')}</span>}
      </footer>
    </div>
  );
}
