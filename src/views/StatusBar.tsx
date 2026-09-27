import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { useFit } from '../ui/hooks';
import './statusbar.css';

const LEVELS = ['durum', 'hesap', 'token'];

export function StatusBar({ onSettings }: { onSettings: () => void }) {
  const { t, num, clock, lang } = useI18n();
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
  const rateText = out ? outText : null;
  const outTitle = list?.budgetSkipped ? t('status.previousScanHint', { n: num(list.rateRemaining ?? 0) }) : t(store.settings?.hasToken ? 'status.rateHintToken' : 'status.rateHint');
  const rateTitle = out ? outTitle : reset ? t('status.resetAt', { time: reset }) : undefined;
  const syncText = store.syncError && !store.syncing ? t('status.syncError', { reason: t('errors.' + store.syncError.code + '.title') }) : t('status.' + sync);
  const showToken = out && !store.settings?.hasToken;
  const versions = [list?.coreLatest ? ['Core', list.coreLatest] : null, list?.uiLatest ? ['UI', list.uiLatest] : null].filter((v): v is string[] => !!v);
  useFit(ref, LEVELS, '.statusbar__text', [lang, syncText, rateText, showToken, versions.join()].join('|'));

  return (
    <footer ref={ref} className="statusbar divider-top" role="status" data-sync={sync} data-rate={out ? 'out' : undefined}>
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
      {versions.length ? (
        <span className="statusbar__item statusbar__item--versions" title={t('status.versionsHint')}>
          <span className="statusbar__text">
            {versions.map(([name, version], i) => (
              <span key={name}>
                {i ? ' · ' : null}
                Teknesyum<span className="statusbar__accent">{name}</span> {version}
              </span>
            ))}
          </span>
        </span>
      ) : null}
    </footer>
  );
}
