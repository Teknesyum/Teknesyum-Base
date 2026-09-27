// teknesyum-ui template durum/avalonia/GuncellemePaneli.axaml.cs
import { useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { UpdateState } from '../api/types';
import { useI18n } from '../i18n';
import { tokenValue, useDialogFocus, useMotion, usePresence, type Phase } from '../ui/hooks';
import { IconAlert } from '../ui/icons';
import { ProgressBar } from '../ui/Progress';
import { useCeilingPercent, useStepCeiling, useUpdate } from '../ui/useUpdate';
import './update.css';

type Props = {
  open: boolean;
  returnTo: HTMLElement | null;
  onClose: () => void;
};

const SHOWN = new Set(['available', 'downloading', 'ready', 'installing', 'error']);

export function UpdatePanel(props: Props) {
  const { state } = useUpdate();
  const visible = props.open && !!state && SHOWN.has(state.phase);
  const { mounted, phase } = usePresence(visible);
  if (!mounted || !state) return null;
  return createPortal(<Panel {...props} state={state} phase={phase} />, document.body);
}

function Progress({ state }: { state: UpdateState }) {
  const { t } = useI18n();
  const ready = state.phase === 'ready' || state.phase === 'installing';
  const percent = ready ? 100 : Math.min(100, Math.max(0, state.percent));
  const ceiling = useStepCeiling(percent);
  const shown = useCeilingPercent(percent, ceiling, state.phase === 'downloading');
  return <ProgressBar percent={ready ? 100 : shown} step="" status={ready ? 'done' : 'running'} label={t('update.progress')} smooth={false} />;
}

function Panel({ open, returnTo, onClose, state, phase }: Props & { state: UpdateState; phase: Phase }) {
  const { t } = useI18n();
  const update = useUpdate();
  const ref = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const onKey = useDialogFocus(ref, open, returnTo, primaryRef);
  const panelAnimation = useMemo(() => [{ opacity: 0, transform: `translateY(${tokenValue('--tk-sp-2', '8px')})` }, { opacity: 1, transform: 'none' }], []);
  useMotion(ref, phase, panelAnimation);

  const p = state.phase;
  useEffect(() => {
    primaryRef.current?.focus();
  }, [p]);

  const text =
    p === 'downloading'
      ? t('update.downloading')
      : p === 'ready'
        ? t('update.ready')
        : p === 'installing'
          ? t('update.installing')
          : p === 'error'
            ? t('update.failed', { reason: state.message ?? '' })
            : t('update.available');
  const version = state.latest ?? '';
  const withBar = p === 'downloading' || p === 'ready' || p === 'installing';

  return (
    <div className="tk-modal-scrim modal-scrim" data-tk-modal="confirm" data-tk-kapaniyor={phase === 'exit' ? '1' : undefined}>
      <div
        ref={ref}
        className="tk-modal modal update-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-phase={p}
        onKeyDown={(e) => onKey(e, () => (p === 'installing' ? undefined : onClose()))}
      >
        <div className="update-panel__head">
          <img className="update-panel__logo" src="/logo-32.png" alt="" />
          <h2 id={titleId} className="tk-h3 update-panel__title">
            {t('update.title')}
          </h2>
          {state.dryRun ? <span className="chip chip--warn update-panel__dry">{t('update.dryRun')}</span> : null}
        </div>

        <div className="update-panel__body">
          {p === 'error' ? (
            <p className="tk-error">
              <span className="tk-error-icon">
                <IconAlert />
              </span>
              <span>{text}</span>
            </p>
          ) : (
            <p className="update-panel__status" aria-live="polite">
              {text}
            </p>
          )}
          {version ? (
            <div className="update-panel__version">
              <span className="tk-label update-panel__label">{t('update.versionLabel')}</span>
              <span className="tk-mono update-panel__value">{version}</span>
            </div>
          ) : null}
          {p === 'available' && state.notes ? (
            <div className="update-panel__notes">
              <span className="tk-label update-panel__label">{t('update.notes')}</span>
              <p className="update-panel__notes-text">{state.notes}</p>
            </div>
          ) : null}
        </div>

        {withBar ? <Progress state={state} /> : null}

        <div className="update-panel__actions">
          {p === 'available' ? (
            <>
              <button ref={primaryRef} type="button" className="btn btn--primary" onClick={() => update.download(true)}>
                {t('update.downloadInstall')}
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => update.download(false)}>
                {t('update.download')}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                {t('update.cancel')}
              </button>
            </>
          ) : p === 'downloading' ? (
            <button ref={primaryRef} type="button" className="btn btn--ghost" onClick={update.cancel}>
              {t('update.cancel')}
            </button>
          ) : p === 'ready' ? (
            <>
              <button ref={primaryRef} type="button" className="btn btn--primary" onClick={update.install}>
                {t('update.install')}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                {t('common.close')}
              </button>
            </>
          ) : p === 'error' ? (
            <>
              <button ref={primaryRef} type="button" className="btn btn--primary" onClick={update.check}>
                {t('common.retry')}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                {t('common.close')}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
