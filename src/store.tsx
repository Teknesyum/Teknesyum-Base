import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api, onListProgress, onTaskProgress } from './api/client';
import type { AppError, AppInfo, Installed, ListProgress, Repo, RepoList, Settings, TaskEvent } from './api/types';
import { enrich } from './data/catalog';
import { makeT } from './i18n';
import { settleMs } from './ui/hooks';
import { useToast } from './ui/Toasts';

export type TaskKind = 'install' | 'clone' | 'uninstall';

type Store = {
  info: AppInfo | null;
  settings: Settings | null;
  list: RepoList | null;
  account: string;
  loadError: AppError | null;
  syncing: boolean;
  listProgress: ListProgress | null;
  syncError: AppError | null;
  installed: Installed[];
  tasks: Record<string, TaskEvent>;
  shown: Record<string, TaskEvent>;
  logs: Record<string, string[]>;
  dialogFor: string | null;
  setDialogFor: (fullName: string | null) => void;
  refresh: () => Promise<void>;
  reload: () => void;
  switchAccount: (account: string) => void;
  start: (repo: Repo, kind: TaskKind, withClaude?: boolean, prereqs?: boolean) => Promise<string | null>;
  wait: (taskId: string) => Promise<TaskEvent>;
  cancel: (fullName: string) => void;
  saveSettings: (s: Settings) => Promise<boolean>;
  setToken: (token: string) => Promise<boolean>;
  clearToken: () => Promise<boolean>;
  setTags: (fullName: string, tags: string[]) => Promise<void>;
  launch: (fullName: string) => void;
  openFolder: (fullName: string) => void;
  desktopShortcut: (fullName: string, name: string) => Promise<void>;
};

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}

function applyDone(repo: Repo, e: TaskEvent): Repo {
  if (e.kind === 'uninstall') return { ...repo, installState: 'not-installed', installedTag: null };
  if (e.kind === 'clone') return repo.installState === 'not-installed' ? { ...repo, installState: 'cloned' } : repo;
  return { ...repo, installState: 'installed', installedTag: repo.latestTag };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [list, setList] = useState<RepoList | null>(null);
  const [account, setAccount] = useState('');
  const [loadError, setLoadError] = useState<AppError | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [listProgress, setListProgress] = useState<ListProgress | null>(null);
  const [syncError, setSyncError] = useState<AppError | null>(null);
  const [installed, setInstalled] = useState<Installed[]>([]);
  const [tasks, setTasks] = useState<Record<string, TaskEvent>>({});
  const [settling, setSettling] = useState<Record<string, TaskEvent>>({});
  const shown = useMemo(() => {
    const out: Record<string, TaskEvent> = { ...settling };
    for (const [k, v] of Object.entries(tasks)) if (v.status === 'running') out[k] = v;
    return out;
  }, [tasks, settling]);
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [dialogFor, setDialogFor] = useState<string | null>(null);
  const waiters = useRef(new Map<string, (e: TaskEvent) => void>());
  const dialogRef = useRef<string | null>(null);
  const langRef = useRef<'tr' | 'en'>('tr');
  dialogRef.current = dialogFor;
  const kareLang = info?.kare?.split('@')[1];
  const shownLang = kareLang === 'en' || kareLang === 'tr' ? kareLang : (settings?.language ?? 'tr');
  langRef.current = shownLang;

  const refreshInstalled = useCallback(async () => {
    try {
      setInstalled(await api.listInstalled());
    } catch (e) {
      const err = e as AppError;
      const t = makeT(langRef.current);
      toast({ kind: 'danger', title: t('errors.' + err.code + '.title'), body: err.message });
    }
  }, [toast]);

  const fetchList = useCallback(async (acc: string | undefined, force: boolean, auto = false) => {
    if (force) {
      setListProgress(null);
      setSyncing(true);
    }
    try {
      const next = await api.listRepos(force, acc, auto);
      setList(next);
      setLoadError(null);
      setSyncError(null);
    } catch (e) {
      const err = e as AppError;
      setList((cur) => {
        if (!cur) setLoadError(err);
        else setSyncError(err);
        return cur;
      });
      if (force) setSyncError(err);
    } finally {
      if (force) {
        setSyncing(false);
        setListProgress(null);
      }
    }
  }, []);

  const boot = useCallback(async () => {
    setLoadError(null);
    try {
      const [i, s] = await Promise.all([api.appInfo(), api.getSettings(), fetchList(undefined, false)]);
      setInfo(i);
      setSettings(s);
      setAccount(s.account);
      void refreshInstalled();
      void fetchList(s.account, true, true);
    } catch (e) {
      setLoadError(e as AppError);
    }
  }, [fetchList, refreshInstalled]);

  useEffect(() => {
    void boot();
  }, [boot]);

  useEffect(() => {
    let off: (() => void) | undefined;
    let dead = false;
    void onListProgress((p) => setListProgress(p)).then((fn) => {
      if (dead) fn();
      else off = fn;
    });
    return () => {
      dead = true;
      off?.();
    };
  }, []);

  useEffect(() => {
    let off: (() => void) | undefined;
    let dead = false;
    void onTaskProgress((e) => {
      setTasks((cur) => ({ ...cur, [e.fullName]: e }));
      if (e.logLine) setLogs((cur) => ({ ...cur, [e.taskId]: [...(cur[e.taskId] ?? []), e.logLine!].slice(-40) }));
      if (e.status === 'running') return;
      waiters.current.get(e.taskId)?.(e);
      waiters.current.delete(e.taskId);
      const t = makeT(langRef.current);
      const name = e.fullName.split('/')[1] ?? e.fullName;
      if (e.status === 'done') {
        setSettling((cur) => ({ ...cur, [e.fullName]: { ...e, percent: 100, step: 'done' } }));
        window.setTimeout(() => {
          setSettling((cur) => {
            const next = { ...cur };
            delete next[e.fullName];
            return next;
          });
          setList((cur) => (cur ? { ...cur, repos: cur.repos.map((r) => (r.fullName === e.fullName ? applyDone(r, e) : r)) } : cur));
          void refreshInstalled();
        }, settleMs());
        if (dialogRef.current !== e.fullName) toast({ kind: 'success', title: t('task.done.' + e.kind, { name }) });
      } else if (e.status === 'error') {
        if (dialogRef.current !== e.fullName) toast({ kind: 'danger', title: t('task.failed.' + e.kind, { name }), body: e.message });
      } else if (dialogRef.current !== e.fullName) {
        toast({ kind: 'neutral', title: t('task.cancelled', { name }) });
      }
    }).then((fn) => {
      if (dead) fn();
      else off = fn;
    });
    return () => {
      dead = true;
      off?.();
    };
  }, [refreshInstalled, toast]);

  const fail = useCallback(
    (e: unknown) => {
      const err = e as AppError;
      const t = makeT(langRef.current);
      toast({ kind: 'danger', title: t('errors.' + err.code + '.title'), body: err.logPath ? t('errors.logAt', { path: err.logPath }) : err.message });
    },
    [toast],
  );

  const start = useCallback(
    async (repo: Repo, kind: TaskKind, withClaude?: boolean, prereqs?: boolean) => {
      try {
        const id = kind === 'install' ? await api.install(repo.owner, repo.name, withClaude, prereqs) : kind === 'clone' ? await api.clone(repo.owner, repo.name, prereqs) : await api.uninstall(repo.fullName);
        setTasks((cur) => ({
          ...cur,
          [repo.fullName]: { taskId: id, fullName: repo.fullName, kind: kind === 'install' && repo.installState === 'update-available' ? 'update' : kind, step: 'resolve', percent: 0, message: '', status: 'running' },
        }));
        return id;
      } catch (e) {
        fail(e);
        return null;
      }
    },
    [fail],
  );

  const shownList = useMemo(() => enrich(list, shownLang), [list, shownLang]);

  const value = useMemo<Store>(
    () => ({
      info,
      settings,
      list: shownList,
      account,
      loadError,
      syncing,
      listProgress,
      syncError,
      installed,
      tasks,
      shown,
      logs,
      dialogFor,
      setDialogFor,
      refresh: () => fetchList(account, true),
      reload: () => void boot(),
      switchAccount: (acc) => {
        setAccount(acc);
        setList(null);
        void fetchList(acc, false).then(() => fetchList(acc, true, true));
      },
      start,
      wait: (taskId) => new Promise<TaskEvent>((resolve) => waiters.current.set(taskId, resolve)),
      cancel: (fullName) => {
        const task = tasks[fullName];
        if (task) void api.cancelTask(task.taskId).catch(fail);
      },
      saveSettings: async (s) => {
        if (settings && s.language !== settings.language) setSettings({ ...settings, language: s.language });
        try {
          const saved = await api.saveSettings(s);
          const accountChanged = saved.account !== settings?.account;
          setSettings(saved);
          if (accountChanged) {
            setAccount(saved.account);
            setList(null);
            void fetchList(saved.account, false).then(() => fetchList(saved.account, true, true));
          }
          return true;
        } catch (e) {
          if (settings) setSettings(settings);
          fail(e);
          return false;
        }
      },
      setToken: async (token) => {
        try {
          setSettings(await api.setToken(token));
          void fetchList(account, true);
          return true;
        } catch (e) {
          fail(e);
          return false;
        }
      },
      clearToken: async () => {
        try {
          setSettings(await api.clearToken());
          return true;
        } catch (e) {
          fail(e);
          return false;
        }
      },
      setTags: async (fullName, tags) => {
        setList((cur) => (cur ? { ...cur, repos: cur.repos.map((r) => (r.fullName === fullName ? { ...r, localTags: tags } : r)) } : cur));
        try {
          await api.setLocalTags(fullName, tags);
        } catch (e) {
          fail(e);
        }
      },
      launch: (fullName) => void api.launch(fullName).catch(fail),
      openFolder: (fullName) => {
        const item = installed.find((i) => i.fullName === fullName);
        if (item) void api.openPath(item.path).catch(fail);
      },
      desktopShortcut: async (fullName, name) => {
        try {
          await api.desktopShortcut(fullName);
          toast({ kind: 'success', title: makeT(langRef.current)('actions.desktopDone', { name }) });
          await refreshInstalled();
        } catch (e) {
          fail(e);
        }
      },
    }),
    [info, settings, shownList, account, loadError, syncing, listProgress, syncError, installed, tasks, shown, logs, dialogFor, fetchList, boot, start, fail, toast, refreshInstalled],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
