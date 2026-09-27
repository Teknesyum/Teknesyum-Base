import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { makeT, type Lang } from '../i18n';
import { tokenInt, tokenMs, useFlip } from './hooks';
import { IconAlert, IconCheck, IconClose } from './icons';
import './toast.css';

export type ToastKind = 'success' | 'warning' | 'danger' | 'neutral';
export type ToastInput = { kind: ToastKind; title: string; body?: string; action?: { label: string; run: () => void } };
type ToastItem = ToastInput & { id: number };

const Ctx = createContext<(t: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const push = useCallback((t: ToastInput) => {
    seq.current += 1;
    const id = seq.current;
    const toastMax = tokenInt('--tk-toast-max', 3);
    setItems((list) => [...list, { ...t, id }].slice(-toastMax));
  }, []);
  const remove = useCallback((id: number) => setItems((list) => list.filter((x) => x.id !== id)), []);
  const stackRef = useRef<HTMLDivElement>(null);
  useFlip(stackRef, items.map((x) => x.id).join('|'));
  return (
    <Ctx.Provider value={push}>
      {children}
      <div ref={stackRef} className="tk-toast-stack toast-stack" aria-live="polite">
        {items.map((item) => (
          <Toast key={item.id} item={item} onGone={() => remove(item.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function Toast({ item, onGone }: { item: ToastItem; onGone: () => void }) {
  const t = makeT((document.documentElement.lang === 'en' ? 'en' : 'tr') as Lang);
  const [entering, setEntering] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const left = useRef(0);
  const started = useRef(0);

  const close = useCallback(() => {
    setLeaving(true);
    window.setTimeout(onGone, tokenMs('--tk-t-instant', 40));
  }, [onGone]);

  useEffect(() => {
    const f = requestAnimationFrame(() => setEntering(false));
    left.current = tokenMs('--tk-toast-life', 6000);
    return () => cancelAnimationFrame(f);
  }, []);

  useEffect(() => {
    if (item.kind === 'danger' || paused || leaving) return;
    started.current = performance.now();
    const id = window.setTimeout(close, left.current);
    return () => {
      window.clearTimeout(id);
      left.current = Math.max(0, left.current - (performance.now() - started.current));
    };
  }, [item.kind, paused, leaving, close]);

  const danger = item.kind === 'danger';
  const cls = 'tk-toast toast' + (item.kind === 'neutral' ? '' : ' tk-toast-' + item.kind);
  const body = (
    <>
      <span className="tk-toast-icon">{item.kind === 'success' ? <IconCheck /> : item.kind === 'neutral' ? <IconCheck /> : <IconAlert />}</span>
      <div className="tk-toast-body">
        <div className="tk-toast-title">{item.title}</div>
        {item.body ? <div className="toast__text">{item.body}</div> : null}
        {item.action ? (
          <button
            type="button"
            className="btn btn--ghost toast__action"
            onClick={() => {
              item.action!.run();
              close();
            }}
          >
            {item.action.label}
          </button>
        ) : null}
      </div>
      <button type="button" className="tk-toast-close" aria-label={t('common.close')} title={t('common.close')} onClick={close}>
        <IconClose />
      </button>
    </>
  );
  const common = {
    className: cls,
    'data-flip': String(item.id),
    'data-tk-giriyor': entering ? '1' : undefined,
    'data-tk-kapaniyor': leaving ? '1' : undefined,
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocus: () => setPaused(true),
    onBlur: () => setPaused(false),
  };
  return danger ? (
    <div {...common} role="alert" data-kind="danger">
      {body}
    </div>
  ) : (
    <div {...common}>{body}</div>
  );
}
