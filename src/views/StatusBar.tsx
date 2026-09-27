import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { useFit } from '../ui/hooks';
import { IconRefresh } from '../ui/icons';
import './statusbar.css';

const LEVELS = ['durum', 'hesap', 'tazele', 'token'];

export function StatusBar({ onSettings }: { onSettings: () => void }) {
  const { t, rel, num, clock, lang } = useI18n();
  const store = useStore();
  const ref = useRef<HTMLElement>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const h = window.setInterval(() => tick((n) => n + 1), 60000);
    return () => window.clearInterval(h);
  }, []);
  const list = store.list;
  const sync = store.syncing ? 'syncing' : store.syncError ? 'error' : list?.fromCache ? 'cache' : list ? 'live' : 'idle';
  const out = !!list && (list.rateRemaining === 0 || list.budgetSkipped);
  const previous = out && !!list?.fromCache;
  const reset = list?.rateResetAt ? clock(list.rateResetAt) : null;
  const outText = previous ? (reset ? t('status.previousScan', { time: reset }) : t('status.previousScanNoTime')) : reset ? t('status.rateOut', { time: reset }) : t('status.rateOutNoTime');
  const rateText = out ? outText : list && list.rateRemaining !== null ? t('status.rate', { n: num(list.rateRemaining) }) : null;
  const outTitle = list?.budgetSkipped ? t('status.previousScanHint', { n: num(list.rateRemaining ?? 0) }) : t(store.settings?.hasToken ? 'status.rateHintToken' : 'status.rateHint');
  const rateTitle = out ? outTitle : reset ? t('status.resetAt', { time: reset }) : undefined;
  const syncText = store.syncError && !store.syncing ? t('status.syncError', { reason: t('errors.' + store.syncError.code + '.title') }) : t('status.' + sync);
  const showToken = out && !store.settings?.hasToken;
  const fetchedText = list && !out ? t('status.fetched', { when: rel(list.fetchedAt) }) : null;
  useFit(ref, LEVELS, '.statusbar__text', [lang, syncText, store.account, rateText, fetchedText, showToken].join('|'));

  return (
    <footer ref={ref} className="statusbar divider-top" role="status" data-sync={sync} data-rate={out ? 'out' : undefined}>
      <span className="statusbar__item statusbar__item--sync" title={sync === 'cache' ? t('status.cacheHint') : syncText}>
        <span className="badge__dot" aria-hidden="true" />
        <span className="statusbar__text" aria-hidden="true">
          {syncText}
        </span>
        <span className="tk-sr-only">{syncText}</span>
      </span>
      {store.syncing ? <span className="sync-progress" aria-hidden="true" /> : null}
      {rateText ? (
        <span className="statusbar__item statusbar__item--rate" title={rateTitle}>
          <span className="statusbar__text">{rateText}</span>
        </span>
      ) : null}
      {showToken ? (
        <button type="button" className="btn btn--quiet btn--small statusbar__token" title={t('status.rateHint')} onClick={onSettings}>
          {t('status.addToken')}
        </button>
      ) : null}
      {store.account ? (
        <span className="statusbar__item statusbar__item--account">
          <span className="statusbar__text">{t('status.account', { name: store.account })}</span>
        </span>
      ) : null}
      {fetchedText ? (
        <span className="statusbar__item statusbar__item--fetched">
          <span className="statusbar__text">{fetchedText}</span>
        </span>
      ) : null}
      <span className="statusbar__spacer" />
      <button type="button" className="btn btn--quiet btn--small" aria-label={t('status.refresh')} disabled={store.syncing} title={store.syncing ? t('status.syncing') : t('status.refresh')} onClick={() => void store.refresh()}>
        <IconRefresh />
        <span className="statusbar__refresh-label">{t('status.refresh')}</span>
      </button>
    </footer>
  );
}
