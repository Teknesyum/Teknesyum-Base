import { useEffect, useState } from 'react';
import type { Repo } from '../api/types';
import { repoMedia } from '../api/client';
import { mediaPath } from './catalog';

const icons = import.meta.glob('../assets/apps/*.icon.png', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const fulls = import.meta.glob('../assets/apps/*.full.jpg', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;
const shots = import.meta.glob('../assets/apps/*.shot.jpg', { eager: true, import: 'default', query: '?url' }) as Record<string, string>;

function byName(files: Record<string, string>, suffix: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const [path, url] of Object.entries(files)) {
    const name = path.slice(path.lastIndexOf('/') + 1, -suffix.length);
    map.set(name.toLocaleLowerCase('tr'), url);
  }
  return map;
}

const iconMap = byName(icons, '.icon.png');
const shotMap = byName(shots, '.shot.jpg');
const fullMap = byName(fulls, '.full.jpg');

export function appIcon(name: string): string | undefined {
  return iconMap.get(name.toLocaleLowerCase('tr'));
}

export function appShot(name: string): string | undefined {
  return shotMap.get(name.toLocaleLowerCase('tr'));
}

export function appShotFull(name: string): string | undefined {
  const key = name.toLocaleLowerCase('tr');
  return fullMap.get(key) ?? shotMap.get(key);
}

const live = new Map<string, Promise<string | null>>();

export function useRepoMedia(repo: Repo, kind: 'icon' | 'shot' | 'full', enabled = true): string | undefined {
  const path = enabled ? mediaPath(repo, kind) : undefined;
  const key = path ? repo.fullName + '|' + path + '|' + repo.pushedAt : '';
  const [url, setUrl] = useState<{ key: string; url: string | null }>();
  useEffect(() => {
    if (!key || !path) return;
    let on = true;
    let p = live.get(key);
    if (!p) {
      p = repoMedia(repo.owner, repo.name, repo.private, path).catch(() => null);
      live.set(key, p);
    }
    void p.then((u) => on && setUrl({ key, url: u }));
    return () => {
      on = false;
    };
  }, [key, path, repo.owner, repo.name, repo.private]);
  return url?.key === key ? url.url ?? undefined : undefined;
}
