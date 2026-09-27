import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, onUpdateState } from '../api/client';
import type { AppError, UpdateState } from '../api/types';
import { useI18n } from '../i18n';
import { reducedMotion } from './hooks';
import { useToast } from './Toasts';

type UpdateCtx = {
  state: UpdateState | null;
  autoInstall: boolean;
  check: () => void;
  download: (andInstall: boolean) => void;
  cancel: () => void;
  install: () => void;
};

const Ctx = createContext<UpdateCtx | null>(null);

export function useUpdate(): UpdateCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('UpdateProvider missing');
  return c;
}

export function UpdateProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const toast = useToast();
  const [state, setState] = useState<UpdateState | null>(null);
  const [autoInstall, setAutoInstall] = useState(false);
  const autoRef = useRef(false);
  const tRef = useRef(t);
  tRef.current = t;

  const fail = useCallback(
    (e: unknown) => {
      const err = e as AppError;
      toast({ kind: 'danger', title: tRef.current('update.failedTitle'), body: err.message });
    },
    [toast],
  );

  const setAuto = useCallback((on: boolean) => {
    autoRef.current = on;
    setAutoInstall(on);
  }, []);

  useEffect(() => {
    let off: (() => void) | undefined;
    let dead = false;
    void onUpdateState((s) => setState(s)).then((fn) => {
      if (dead) fn();
      else off = fn;
    });
    void api
      .getUpdateState()
      .then((s) => {
        if (!dead) setState((cur) => cur ?? s);
      })
      .catch(() => undefined);
    return () => {
      dead = true;
      off?.();
    };
  }, []);

  const phase = state?.phase;
  useEffect(() => {
    if (!phase) return;
    if (phase === 'ready' && autoRef.current) {
      setAuto(false);
      void api.installUpdate().catch(fail);
    } else if (phase !== 'downloading' && phase !== 'ready') {
      setAuto(false);
    }
  }, [phase, fail, setAuto]);

  const value = useMemo<UpdateCtx>(
    () => ({
      state,
      autoInstall,
      check: () => void api.checkUpdate().catch(fail),
      download: (andInstall) => {
        setAuto(andInstall);
        void api.downloadUpdate().catch((e) => {
          setAuto(false);
          fail(e);
        });
      },
      cancel: () => {
        setAuto(false);
        void api.cancelUpdate().catch(fail);
      },
      install: () => void api.installUpdate().catch(fail),
    }),
    [state, autoInstall, fail, setAuto],
  );

  return createElement(Ctx.Provider, { value }, children);
}

export function useCeilingPercent(percent: number, ceiling: number, running: boolean): number {
  const [shown, setShown] = useState(percent);
  const shownRef = useRef(percent);
  const target = useRef({ percent, ceiling, running });
  target.current = { percent, ceiling, running };

  useEffect(() => {
    const reduce = reducedMotion();
    const id = window.setInterval(() => {
      const { percent: p, ceiling: c, running: r } = target.current;
      let next = shownRef.current;
      if (reduce) next = Math.max(next, p);
      else if (next < p) next = Math.min(p, next + Math.max(0.2, (p - next) * 0.08));
      else if (r && next < c - 0.5) next += (c - next) * 0.006;
      if (next !== shownRef.current) {
        shownRef.current = next;
        setShown(next);
      }
    }, 16);
    return () => window.clearInterval(id);
  }, []);

  return shown;
}

export function useStepCeiling(percent: number): number {
  const last = useRef({ percent, step: 0 });
  if (percent > last.current.percent) last.current = { percent, step: percent - last.current.percent };
  else if (percent < last.current.percent) last.current = { percent, step: 0 };
  return Math.min(100, percent + last.current.step);
}
