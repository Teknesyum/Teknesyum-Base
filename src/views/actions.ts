import type { Repo, TaskEvent } from '../api/types';

export type Primary = 'install' | 'update' | 'clone' | 'launch' | 'folder';

export function primaryOf(repo: Repo): Primary {
  switch (repo.installState) {
    case 'update-available':
      return 'update';
    case 'installed':
      return 'launch';
    case 'cloned':
      return 'folder';
    default:
      return repo.hasWindowsAsset ? 'install' : 'clone';
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

export const defaultFilter: LibFilter = { q: '', lang: '', status: '', archive: 'hide', sort: 'stars', view: 'grid', category: '', tag: '' };

export type Opener = HTMLElement | null;
