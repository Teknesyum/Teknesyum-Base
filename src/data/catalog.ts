import type { Repo, RepoList } from '../api/types';
import raw from './katalog.json';

type Entry = {
  category: string;
  tags: { tr: string[]; en: string[] };
  summary: { tr: string; en: string };
  points?: { tr: string[]; en: string[] };
  uses?: { tr: string[]; en: string[] };
  lead?: { tr: string; en: string };
  icon?: string;
  shot?: string;
  fork?: Fork;
};

export type Fork = { by: string; repo: string; play?: string };

const entries = raw as Record<string, Entry>;

export const CATEGORIES = ['video', 'medical', 'productivity', 'ai', 'developer', 'system', 'games', 'other'];

export function enrich(list: RepoList | null, lang: 'tr' | 'en'): RepoList | null {
  if (!list) return list;
  return { ...list, repos: list.repos.filter((r) => !hidden(r)).map((r) => enrichRepo(r, lang)) };
}

function hidden(repo: Repo): boolean {
  const name = repo.name.toLocaleLowerCase('tr');
  return name === '.github' || name === repo.owner.toLocaleLowerCase('tr');
}

function entryOf(repo: Repo): Entry | undefined {
  const base = entries[repo.name];
  const own = repo.manifest?.catalog;
  if (!own) return base;
  const merged = { ...base, ...own } as Entry;
  return merged.summary && merged.category ? merged : base;
}

function enrichRepo(repo: Repo, lang: 'tr' | 'en'): Repo {
  const e = entryOf(repo);
  if (!e) return { ...repo, category: CATEGORIES.includes(repo.category) ? repo.category : 'other', summary: repo.description, tags: repo.topics.slice(0, 5) };
  return { ...repo, category: e.category, summary: e.summary[lang] || repo.description, points: e.points?.[lang], uses: e.uses?.[lang], lead: e.lead?.[lang], tags: e.tags?.[lang] ?? [] };
}

export function mediaPath(repo: Repo, kind: 'icon' | 'shot' | 'full'): string | undefined {
  const m = repo.manifest;
  const own = kind === 'icon' ? m?.icon : kind === 'shot' ? m?.screenshot : m?.full;
  return own?.trim() || (kind === 'full' ? undefined : entries[repo.name]?.[kind]);
}

export function forkOf(repo: Repo): Fork | undefined {
  return repo.manifest?.catalog?.fork ?? entries[repo.name]?.fork;
}
