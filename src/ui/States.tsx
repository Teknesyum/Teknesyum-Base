import type { AppError } from '../api/types';
import { useI18n } from '../i18n';
import { IconAlert } from './icons';
import { stagger } from './hooks';

type Action = { label: string; run: () => void };

export function EmptyState({ title, body, action }: { title: string; body: string; action?: Action }) {
  return (
    <div className="state" role="status">
      <h2 className="state__title">{title}</h2>
      <p className="state__body">{body}</p>
      {action ? (
        <button type="button" className="btn btn--primary" onClick={action.run}>
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export function ErrorState({ error, action }: { error: AppError; action: Action }) {
  const { t } = useI18n();
  return (
    <div className="state state--error" role="status">
      <span className="state__icon">
        <IconAlert />
      </span>
      <h2 className="state__title">{t('errors.' + error.code + '.title')}</h2>
      <p className="state__body">{t('errors.' + error.code + '.next')}</p>
      {error.logPath ? <p className="state__log">{t('errors.logAt', { path: error.logPath })}</p> : null}
      <button type="button" className="btn btn--primary" onClick={action.run}>
        {action.label}
      </button>
    </div>
  );
}

export function SkeletonCards({ count, view }: { count: number; view: 'grid' | 'list' }) {
  const { t } = useI18n();
  return (
    <div className={view === 'grid' ? 'cards' : 'rows'} aria-busy="true" aria-label={t('library.loading')}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={view === 'grid' ? 'card skeleton-card' : 'row skeleton-card'} style={stagger(i)}>
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--line" />
          {view === 'grid' ? <span className="skeleton skeleton--line skeleton--short" /> : null}
          <span className="skeleton skeleton--chip" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonLines({ lines }: { lines: number }) {
  return (
    <div className="skeleton-block" aria-busy="true">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className={'skeleton skeleton--line' + (i % 3 === 2 ? ' skeleton--short' : '')} />
      ))}
    </div>
  );
}
