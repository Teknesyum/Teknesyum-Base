import type { Repo, RepoList } from '../api/types';
import raw from './katalog.json';

type Entry = {
  category: string;
  tags: { tr: string[]; en: string[] };
  summary: { tr: string; en: string };
};

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
  return { ...repo, category: e.category, summary: e.summary[lang] || repo.description, tags: e.tags[lang] ?? [] };
}
