import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';

export function tokenMs(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith('ms') ? n : n * 1000;
}

export function tokenInt(name: string, fallback: number): number {
  const n = parseInt(getComputedStyle(document.documentElement).getPropertyValue(name), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function stagger(i: number) {
  return { animationDelay: `calc(var(--tk-stagger) * min(${i}, var(--tk-stagger-max)))` };
}

export function tokenValue(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useFlip(container: RefObject<HTMLElement | null>, signature: string) {
  const prev = useRef(new Map<string, DOMRect>());
  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const reduce = reducedMotion();
    const next = new Map<string, DOMRect>();
    const duration = tokenMs('--tk-t-base', 150);
    const easing = tokenValue('--tk-e-emphasized', 'ease-out');
    const box = root.getBoundingClientRect();
    root.querySelectorAll<HTMLElement>('[data-flip]').forEach((node) => {
      const key = node.dataset.flip ?? '';
      const raw = node.getBoundingClientRect();
      const r = new DOMRect(raw.left - box.left + root.scrollLeft, raw.top - box.top + root.scrollTop, raw.width, raw.height);
      next.set(key, r);
      const p = prev.current.get(key);
      if (!p || reduce) return;
      const dx = p.left - r.left;
      const dy = p.top - r.top;
      if (!dx && !dy) return;
      node.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration, easing, composite: 'add' });
    });
    prev.current = next;
  });
  void signature;
}

export function useMotion(ref: RefObject<HTMLElement | null>, phase: Phase, frames: Keyframe[], opts: { enter?: boolean; exit?: boolean; exitToken?: string } = {}) {
  const { enter = true, exit = true, exitToken = '--tk-t-fast' } = opts;
  const last = useRef<{ el: HTMLElement | null; phase: Phase | null }>({ el: null, phase: null });
  useLayoutEffect(() => {
    const el = ref.current;
    if (last.current.el === el && last.current.phase === phase) return;
    last.current = { el, phase };
    if (!el || reducedMotion()) return;
    if (phase === 'enter' && enter) {
      el.animate(frames, { duration: tokenMs('--tk-t-base', 150), easing: tokenValue('--tk-e-emphasized', 'ease-out'), fill: 'backwards' });
    } else if (phase === 'exit' && exit) {
      el.animate([...frames].reverse(), { duration: tokenMs(exitToken, 80), easing: tokenValue('--tk-e-in', 'ease-in'), fill: 'forwards' });
    }
  });
}

export type Phase = 'enter' | 'open' | 'exit';

export function usePresence(open: boolean, exitToken = '--tk-t-fast') {
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<Phase>(open ? 'open' : 'enter');
  useEffect(() => {
    if (open) {
      setMounted(true);
      setPhase('enter');
      let f2 = 0;
      const f1 = requestAnimationFrame(() => {
        f2 = requestAnimationFrame(() => setPhase('open'));
      });
      return () => {
        cancelAnimationFrame(f1);
        cancelAnimationFrame(f2);
      };
    }
    setPhase('exit');
    const id = window.setTimeout(() => setMounted(false), tokenMs(exitToken, 80));
    return () => window.clearTimeout(id);
  }, [open, exitToken]);
  return { mounted, phase };
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(ref: RefObject<HTMLElement | null>, active: boolean, returnTo: HTMLElement | null, initial?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    const first = initial?.current ?? node?.querySelector<HTMLElement>(FOCUSABLE) ?? node;
    first?.focus();
    return () => {
      if (returnTo && document.contains(returnTo)) returnTo.focus();
    };
  }, [active, ref, returnTo, initial]);

  return useCallback(
    (e: KeyboardEvent<HTMLElement>, onEscape: () => void) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    },
    [ref],
  );
}

type RovingOptions = { orientation?: 'horizontal' | 'vertical' | 'grid'; columns?: () => number; typeahead?: (el: HTMLElement) => string };

export function useRoving<T extends HTMLElement>(count: number, opts: RovingOptions = {}) {
  const [active, setActive] = useState(0);
  const refs = useRef<(T | null)[]>([]);
  const typed = useRef({ text: '', at: 0 });
  const index = Math.min(active, Math.max(0, count - 1));

  const move = (next: number) => {
    const n = Math.max(0, Math.min(count - 1, next));
    setActive(n);
    refs.current[n]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (!count) return;
    const o = opts.orientation ?? 'vertical';
    const cols = o === 'grid' ? Math.max(1, opts.columns?.() ?? 1) : 1;
    const nextKey = o === 'horizontal' ? 'ArrowRight' : 'ArrowDown';
    const prevKey = o === 'horizontal' ? 'ArrowLeft' : 'ArrowUp';
    let next = -1;
    if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    else if (o === 'grid' && e.key === 'ArrowRight') next = index + 1;
    else if (o === 'grid' && e.key === 'ArrowLeft') next = index - 1;
    else if (e.key === nextKey) next = index + cols;
    else if (e.key === prevKey) next = index - cols;
    else if (opts.typeahead && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = performance.now();
      const reset = tokenMs('--tk-typeahead-reset', 500);
      typed.current.text = (now - typed.current.at > reset ? '' : typed.current.text) + e.key.toLocaleLowerCase();
      typed.current.at = now;
      const hit = refs.current.findIndex((el) => el && opts.typeahead!(el).toLocaleLowerCase().startsWith(typed.current.text));
      if (hit >= 0) next = hit;
    }
    if (next < 0) return;
    e.preventDefault();
    move(next);
  };

  const itemProps = (i: number) => ({
    ref: (el: T | null) => {
      refs.current[i] = el;
    },
    tabIndex: i === index ? 0 : -1,
    onFocus: () => setActive(i),
  });

  return { onKeyDown, itemProps, active: index };
}

function fitLevels(el: HTMLElement, levels: string[], watch: string): () => void {
  const fits = () => el.scrollWidth <= el.clientWidth && Array.from(el.querySelectorAll<HTMLElement>(watch)).every((c) => c.scrollWidth <= c.clientWidth);
  const fit = () => {
    for (const level of ['', ...levels]) {
      if (level) el.dataset.sikis = level;
      else delete el.dataset.sikis;
      if (fits()) return;
    }
  };
  fit();
  const ro = new ResizeObserver(fit);
  ro.observe(el);
  window.addEventListener('resize', fit);
  document.fonts.addEventListener('loadingdone', fit);
  void document.fonts.ready.then(fit);
  return () => {
    ro.disconnect();
    window.removeEventListener('resize', fit);
    document.fonts.removeEventListener('loadingdone', fit);
  };
}

export function useTitlebarFit(root: RefObject<HTMLElement | null>, signature: string) {
  useLayoutEffect(() => {
    const bar = root.current?.querySelector<HTMLElement>('.tk-titlebar');
    if (!bar) return;
    return fitLevels(bar, ['site', 'ad', 'simge', 'logo', 'senk'], '.tk-titlebar__tabs, .tk-titlebar__tab');
  }, [root, signature]);
}

export function useFit(ref: RefObject<HTMLElement | null>, levels: string[], watch: string, signature: string) {
  const key = levels.join(' ');
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    return fitLevels(el, key.split(' '), watch);
  }, [ref, key, watch, signature]);
}

export function useBelow(ref: RefObject<HTMLElement | null>, probeClass: string): boolean {
  const [below, setBelow] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.className = 'width-probe ' + probeClass;
    document.body.appendChild(probe);
    const check = () => setBelow(el.clientWidth < probe.offsetWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      ro.disconnect();
      probe.remove();
    };
  }, [ref, probeClass]);
  return below;
}
