import type { Repo, TaskEvent } from '../api/types';

export type UiState = 'current' | 'old' | 'unknown';

export function uiState(version: string | null | undefined, latest: string | null | undefined): UiState {
  if (!version || !latest) return 'unknown';
  const parts = (v: string) => v.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const a = parts(version);
  const b = parts(latest);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d < 0 ? 'old' : 'current';
  }
  return 'current';
}

export type Primary = 'install' | 'clone' | 'update' | 'source' | 'launch' | 'folder';

export function primaryOf(repo: Repo): Primary {
  switch (repo.installState) {
    case 'update-available':
      return 'update';
    case 'installed':
      return repo.plugin ? 'source' : 'launch';
    case 'cloned':
      return 'folder';
    default:
      return repo.hasWindowsAsset ? 'install' : repo.language && !repo.plugin && !repo.archived ? 'clone' : 'source';
  }
}

export function isRunning(task: TaskEvent | undefined): boolean {
  return !!task && task.status === 'running';
}

export type LibFilter = {
  q: string;
  lang: string;
  status: string;
  archive: 'hide' | 'all' | 'only';
  sort: 'stars' | 'date' | 'name';
  view: 'grid' | 'list';
  category: string;
  tag: string;
};

export const defaultFilter: LibFilter = { q: '', lang: '', status: '', archive: 'hide', sort: 'stars', view: 'list', category: '', tag: '' };

export type Opener = HTMLElement | null;
