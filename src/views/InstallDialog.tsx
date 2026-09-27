import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import '../../teknesyum-ui/kur/panel.css';
import { ProgressBar } from '../ui/Progress';
import type { Repo, TaskStep } from '../api/types';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { tokenValue, useDialogFocus, useMotion, usePresence, type Phase } from '../ui/hooks';
import { IconAlert, IconCheck } from '../ui/icons';
import './install.css';

const STEPS: TaskStep[] = ['resolve', 'download', 'verify', 'install', 'shortcut'];

type Props = {
  repo: Repo | null;
  kind: 'install' | 'clone';
  open: boolean;
  returnTo: HTMLElement | null;
  onClose: () => void;
  onChangeLocation: () => void;
};

export function InstallDialog(props: Props) {
  const { mounted, phase } = usePresence(props.open && !!props.repo);
  const [shown, setShown] = useState(props.repo);
  useEffect(() => {
    if (props.repo) setShown(props.repo);
  }, [props.repo]);
  if (!mounted || !shown) return null;
  return createPortal(<Panel {...props} repo={shown} phase={phase} />, document.body);
}

function Panel({ repo, kind, open, returnTo, onClose, onChangeLocation, phase }: Props & { repo: Repo; phase: Phase }) {
  const { t, clock } = useI18n();
  const store = useStore();
  const rateOut = store.list?.rateRemaining === 0;
  const rateReset = store.list?.rateResetAt ? clock(store.list.rateResetAt) : null;
  const ref = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const onKey = useDialogFocus(ref, open, returnTo, primaryRef);
  const panelAnimation = useMemo(() => [{ opacity: 0, transform: `translateY(${tokenValue('--tk-sp-2', '8px')})` }, { opacity: 1, transform: 'none' }], []);
  useMotion(ref, phase, panelAnimation, { enter: false });
  const { setDialogFor } = store;

  useEffect(() => {
    setDialogFor(repo.fullName);
    return () => setDialogFor(null);
  }, [repo.fullName, setDialogFor]);

  const raw = store.tasks[repo.fullName];
  const task = raw && raw.taskId === taskId ? raw : undefined;
  const status = task?.status ?? 'idle';
  const logs = taskId ? (store.logs[taskId] ?? []) : [];
  const update = repo.installState === 'update-available' || task?.kind === 'update';
  const verb = kind === 'clone' ? 'clone' : update ? 'update' : 'install';
  const stepIndex = task ? (task.step === 'done' ? STEPS.length : Math.max(0, STEPS.indexOf(task.step))) : -1;
  const location = kind === 'clone' ? store.settings?.cloneDir : store.settings?.installDir;

  const begin = async () => {
    const id = await store.start(repo, kind);
    if (id) setTaskId(id);
  };

  useEffect(() => {
    if (status !== 'running') primaryRef.current?.focus();
  }, [status]);

  const markOf = (i: number) => {
    if (!task) return 'todo';
    if (task.status === 'done' || i < stepIndex) return 'done';
    if (i === stepIndex) return task.status === 'error' ? 'error' : task.status === 'cancelled' ? 'todo' : 'active';
    return 'todo';
  };

  const progressStatus = status === 'done' ? 'done' : status === 'error' ? 'error' : 'running';
  const stepLabel = !task ? t('install.ready') : status === 'done' ? t('install.finished') : status === 'cancelled' ? t('install.cancelled') : t('steps.' + task.step);

  return (
    <div className="tk-modal-scrim modal-scrim" data-tk-modal="confirm" data-tk-kapaniyor={phase === 'exit' ? '1' : undefined}>
      <div
        ref={ref}
        className="tk-installer install-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        data-status={status === 'idle' ? undefined : status}
        onKeyDown={(e) => onKey(e, onClose)}
      >
        <div className="tk-installer__head">
          <img className="tk-installer__icon" src="/logo-32.png" alt="" />
          <div className="tk-installer__titles">
            <h2 id="install-title" className="tk-installer__title">
              {repo.name} <span className="tk-installer__accent">{repo.latestTag ?? t('install.source')}</span>
            </h2>
            <p id="install-sub" className="tk-installer__sub">
              {t('install.sub.' + verb, { repo: repo.fullName })}
            </p>
          </div>
        </div>

        <ol className="install-steps">
          {STEPS.map((s, i) => {
            const m = markOf(i);
            return (
              <li key={s} className="install-step" data-state={m}>
                <span className="install-step__mark" aria-hidden="true">
                  {m === 'done' ? <IconCheck /> : m === 'error' ? '!' : i + 1}
                </span>
                <span>{t('steps.' + s)}</span>
                <span className="tk-sr-only">{t('install.stepState.' + m)}</span>
              </li>
            );
          })}
        </ol>

        {rateOut && status === 'idle' ? (
          <p className="install-note">
            <IconAlert />
            <span>{rateReset ? t('install.rateOut', { time: rateReset }) : t('install.rateOutNoTime')}</span>
          </p>
        ) : null}

        <ProgressBar percent={task?.percent ?? 0} step={stepLabel} status={progressStatus} label={t('install.progress')} />
        <p className="tk-sr-only" aria-live="polite">
          {stepLabel}
        </p>

        <ul className="tk-installer__log install-log" role="log" aria-label={t('install.log')}>
          {logs.slice(-7).map((line, i, arr) => (
            <li key={arr.length - i + ':' + line}>{line}</li>
          ))}
        </ul>

        {status === 'error' && task ? (
          <p className="tk-error">
            <span className="tk-error-icon">
              <IconAlert />
            </span>
            <span>{t('install.errorBody', { reason: task.message })}</span>
          </p>
        ) : null}

        <div className="tk-installer__row install-location">
          <span className="install-location__label">{t(kind === 'clone' ? 'install.cloneTo' : 'install.installTo')}</span>
          <span className="install-location__path" title={location}>
            {location?.split('\\').map((part, i) => (
              <Fragment key={i}>
                {i > 0 ? '\\' : null}
                {i > 0 ? <wbr /> : null}
                {part}
              </Fragment>
            ))}
          </span>
          <button type="button" className="btn btn--quiet" disabled={status === 'running'} title={status === 'running' ? t('task.busy') : undefined} onClick={onChangeLocation}>
            {t('install.change')}
          </button>
        </div>

        <div className="tk-installer__actions">
          {status === 'idle' ? (
            <>
              <button ref={primaryRef} type="button" className="btn btn--primary" onClick={() => void begin()}>
                {t('actions.' + verb)}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                {t('common.cancel')}
              </button>
            </>
          ) : status === 'running' ? (
            <>
              <button type="button" className="btn btn--primary" disabled title={t('task.busy')}>
                {t('task.running.' + (task?.kind ?? verb))}
              </button>
              <button ref={primaryRef} type="button" className="btn btn--ghost" onClick={() => store.cancel(repo.fullName)}>
                {t('common.cancel')}
              </button>
            </>
          ) : status === 'done' ? (
            <>
              <button
                ref={primaryRef}
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  if (kind === 'clone') store.openFolder(repo.fullName);
                  else store.launch(repo.fullName);
                  onClose();
                }}
              >
                {t(kind === 'clone' ? 'actions.folder' : 'install.openProgram')}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                {t('common.close')}
              </button>
            </>
          ) : (
            <>
              <button ref={primaryRef} type="button" className="btn btn--primary" onClick={() => void begin()}>
                {t('common.retry')}
              </button>
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                {t('common.close')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
