import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { useDialogFocus, useMotion, usePresence } from './hooks';

type ConfirmProps = {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  ack?: string;
  danger?: boolean;
  returnTo: HTMLElement | null;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({ open, title, body, confirmLabel, ack, danger, returnTo, onConfirm, onClose }: ConfirmProps) {
  const { t } = useI18n();
  const { mounted, phase } = usePresence(open);
  const ref = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [checked, setChecked] = useState(false);
  const titleId = useId();
  const ackId = useId();
  const onKey = useDialogFocus(ref, mounted && open, returnTo, cancelRef);
  const dialogAnimation = useMemo(() => [{ opacity: 0, transform: 'scale(0.98)' }, { opacity: 1, transform: 'none' }], []);
  useMotion(ref, phase, dialogAnimation);
  if (!mounted) return null;
  const close = () => {
    setChecked(false);
    onClose();
  };
  return createPortal(
    <div className="tk-modal-scrim modal-scrim" data-tk-modal="confirm" data-tk-kapaniyor={phase === 'exit' ? '1' : undefined}>
      <div
        ref={ref}
        className="tk-modal modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(e) => onKey(e, close)}
      >
        <h2 id={titleId} className="modal__title">
          {title}
        </h2>
        <div className="tk-modal-body">{body}</div>
        {ack ? (
          <label className="check" htmlFor={ackId}>
            <input id={ackId} type="checkbox" className="check__box" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>{ack}</span>
          </label>
        ) : null}
        <div className="tk-modal-actions">
          <button ref={cancelRef} type="button" className="btn btn--ghost" onClick={close}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={danger ? 'btn btn--danger' : 'btn btn--primary'}
            disabled={!!ack && !checked}
            title={ack && !checked ? t('common.ackFirst') : undefined}
            onClick={() => {
              setChecked(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
