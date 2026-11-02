import { useTranslation } from 'react-i18next';
import { useSessionStore } from '../store.js';
import { StatusSummary } from './StatusSummary.js';

export function Header() {
  const { t } = useTranslation();
  const status = useSessionStore((state) => state.status);
  return (
    <header className="top">
      <span className="brand">Mycraft</span>
      {status === 'closed' ? (
        <span className="banner" role="status">
          {t('connection.reconnecting')}
        </span>
      ) : null}
      <StatusSummary />
    </header>
  );
}
