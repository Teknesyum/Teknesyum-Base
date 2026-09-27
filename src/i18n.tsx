import { createContext, useContext, useMemo, type ReactNode } from 'react';
import tr from './locale/tr.json';
import en from './locale/en.json';

export type Lang = 'tr' | 'en';
export type Vars = Record<string, string | number>;
export type T = (key: string, vars?: Vars) => string;

const dicts: Record<Lang, unknown> = { tr, en };

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (!node || typeof node !== 'object') return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function makeT(lang: Lang): T {
  return (key, vars) => {
    const raw = lookup(dicts[lang], key) ?? lookup(dicts.tr, key) ?? key;
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
  };
}

export function capitalize(s: string, lang: Lang): string {
  return s ? s.charAt(0).toLocaleUpperCase(lang) + s.slice(1) : s;
}

type Ctx = {
  lang: Lang;
  t: T;
  num: (n: number) => string;
  date: (iso: string) => string;
  rel: (iso: string) => string;
  clock: (iso: string) => string;
  pct: (ratio: number) => string;
  size: (kb: number) => string;
  bytes: (b: number) => string;
};

const I18n = createContext<Ctx | null>(null);

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo<Ctx>(() => {
    const t = makeT(lang);
    const nf = new Intl.NumberFormat(lang);
    const nf1 = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
    const df = new Intl.DateTimeFormat(lang, { dateStyle: 'medium' });
    const cf = new Intl.DateTimeFormat(lang, { timeStyle: 'short' });
    const pf = new Intl.NumberFormat(lang, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const rf = new Intl.RelativeTimeFormat(lang, { numeric: 'always' });
    const rel = (iso: string) => {
      const diff = (new Date(iso).getTime() - Date.now()) / 1000;
      for (const [unit, sec] of units) {
        if (Math.abs(diff) >= sec) return capitalize(rf.format(Math.round(diff / sec), unit), lang);
      }
      return t('time.justNow');
    };
    const size = (kb: number) => (kb >= 1024 ? t('units.mb', { n: nf1.format(kb / 1024) }) : t('units.kb', { n: nf.format(Math.round(kb)) }));
    return {
      lang,
      t,
      num: (n) => nf.format(n),
      date: (iso) => df.format(new Date(iso)),
      rel,
      clock: (iso) => cf.format(new Date(iso)),
      pct: (ratio) => pf.format(ratio),
      size,
      bytes: (b) => size(b / 1024),
    };
  }, [lang]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}

export function useI18n(): Ctx {
  const c = useContext(I18n);
  if (!c) throw new Error('I18nProvider missing');
  return c;
}
