import type { Repo, RepoList } from '../api/types';
import raw from './katalog.json';

type Entry = {
  category: string;
  tags: { tr: string[]; en: string[] };
  summary: { tr: string; en: string };
  points?: { tr: string[]; en: string[] };
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

function enrichRepo(repo: Repo, lang: 'tr' | 'en'): Repo {
  const e = entries[repo.name];
  if (!e) return { ...repo, category: CATEGORIES.includes(repo.category) ? repo.category : 'other', summary: repo.description, tags: repo.topics.slice(0, 5) };
  return { ...repo, category: e.category, summary: e.summary[lang] || repo.description, points: e.points?.[lang], tags: e.tags[lang] ?? [] };
}

export function mediaPath(repo: Repo, kind: 'icon' | 'shot'): string | undefined {
  const own = kind === 'icon' ? repo.manifest?.icon : repo.manifest?.screenshot;
  return own?.trim() || entries[repo.name]?.[kind];
}

export function forkOf(name: string): Fork | undefined {
  return entries[name]?.fork;
}
