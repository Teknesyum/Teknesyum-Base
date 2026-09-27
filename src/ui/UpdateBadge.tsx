// teknesyum-ui template durum/electron/badge.js
import type { MouseEvent } from 'react';
import '../../teknesyum-ui/durum/badge.css';
import { useI18n } from '../i18n';
import { useUpdate } from './useUpdate';

export function UpdateBadge({ onOpen }: { onOpen: (opener: HTMLElement) => void }) {
  const { t } = useI18n();
  const { state } = useUpdate();
  const phase = state?.phase;
  if (phase !== 'available' && phase !== 'downloading' && phase !== 'ready') return null;
  const n = Math.floor(Math.min(100, Math.max(0, state?.percent ?? 0)));
  const text = phase === 'ready' ? t('update.badge.ready') : phase === 'downloading' ? t('update.badge.percent', { n }) : t('update.badge.available');
  const name =
    phase === 'ready'
      ? t('update.badge.readyAria')
      : phase === 'downloading'
        ? t('update.badge.downloadingAria', { n })
        : t('update.badge.availableAria', { version: state?.latest ?? '' });
  return (
    <button
      type="button"
      className="tk-update"
      data-step={phase === 'ready' ? 'install' : 'download'}
      aria-label={name}
      aria-haspopup="dialog"
      title={name}
      onClick={(e: MouseEvent<HTMLButtonElement>) => onOpen(e.currentTarget)}
    >
      {text}
    </button>
  );
}
