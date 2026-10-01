import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onDriveProgress } from './api/client';
import type { DriveItem, DriveProgress } from './api/types';

type Drive = {
  items: DriveItem[];
  progress: Record<string, DriveProgress>;
  reload: () => Promise<void>;
  add: (link: string) => Promise<DriveItem>;
  remove: (id: string) => Promise<void>;
  download: (id: string) => Promise<void>;
  reveal: (path: string) => Promise<void>;
};

const Ctx = createContext<Drive | null>(null);

export function isDriveLink(text: string): boolean {
  return /(drive\.google\.com|drive\.usercontent\.google\.com|docs\.google\.com\/uc)\//i.test(text.trim());
}

export function DriveProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<DriveItem[]>([]);
  const [progress, setProgress] = useState<Record<string, DriveProgress>>({});

  const reload = useCallback(async () => {
    setItems(await api.driveList().catch(() => []));
  }, []);

  useEffect(() => {
    void reload();
    const off = onDriveProgress((p) => setProgress((m) => ({ ...m, [p.id]: p })));
    return () => void off.then((f) => f());
  }, [reload]);

  const add = useCallback(
    async (link: string) => {
      const item = await api.driveAdd(link);
      await reload();
      return item;
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await api.driveRemove(id);
      setProgress((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
      await reload();
    },
    [reload],
  );

  const download = useCallback(async (id: string) => {
    setProgress((m) => ({ ...m, [id]: { id, received: 0, total: null, status: 'running', path: '', message: null } }));
    try {
      const path = await api.driveDownload(id);
      setProgress((m) => (m[id]?.path ? m : { ...m, [id]: { ...m[id], path } }));
    } catch (e) {
      const message = typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
      setProgress((m) => ({ ...m, [id]: { id, received: 0, total: null, status: 'error', path: '', message } }));
    }
  }, []);

  const reveal = useCallback((path: string) => api.driveReveal(path), []);

  const value = useMemo(() => ({ items, progress, reload, add, remove, download, reveal }), [items, progress, reload, add, remove, download, reveal]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDrive(): Drive {
  const v = useContext(Ctx);
  if (!v) throw new Error('DriveProvider missing');
  return v;
}
