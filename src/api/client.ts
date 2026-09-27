import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { commands, taskEvent, updateEvent } from './types';
import type { AppError, AppInfo, Installed, Release, RepoList, Settings, TaskEvent, UpdateState } from './types';

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

type Args = Record<string, unknown>;

function toAppError(e: unknown): AppError {
  if (e && typeof e === 'object' && 'code' in e && 'message' in e) return e as AppError;
  if (typeof e === 'string') return { code: 'unknown', message: e };
  if (e instanceof Error) return { code: 'unknown', message: e.message };
  return { code: 'unknown', message: String(e) };
}

async function call<T>(cmd: string, args?: Args): Promise<T> {
  try {
    if (isTauri) return await invoke<T>(cmd, args);
    const mock = await import('./mock');
    return await mock.mockInvoke<T>(cmd, args);
  } catch (e) {
    throw toAppError(e);
  }
}

export const api = {
  appInfo: () => call<AppInfo>(commands.appInfo),
  listRepos: (force: boolean, account?: string, auto = false) => call<RepoList>(commands.listRepos, { account, force, auto }),
  readme: (owner: string, name: string) => call<string>(commands.readme, { owner, name }),
  releases: (owner: string, name: string) => call<Release[]>(commands.releases, { owner, name }),
  getSettings: () => call<Settings>(commands.getSettings),
  saveSettings: (settings: Settings) => call<Settings>(commands.saveSettings, { settings }),
  setToken: (token: string) => call<Settings>(commands.setToken, { token }),
  clearToken: () => call<Settings>(commands.clearToken),
  listInstalled: () => call<Installed[]>(commands.listInstalled),
  install: (owner: string, name: string) => call<string>(commands.install, { owner, name }),
  uninstall: (fullName: string) => call<string>(commands.uninstall, { fullName }),
  clone: (owner: string, name: string) => call<string>(commands.clone, { owner, name }),
  cancelTask: (taskId: string) => call<void>(commands.cancelTask, { taskId }),
  launch: (fullName: string) => call<void>(commands.launch, { fullName }),
  setLocalTags: (fullName: string, tags: string[]) => call<void>(commands.setLocalTags, { fullName, tags }),
  openPath: (path: string) => call<void>(commands.openPath, { path }),
  getUpdateState: () => call<UpdateState>(commands.updateState),
  checkUpdate: () => call<UpdateState>(commands.updateCheck),
  downloadUpdate: () => call<void>(commands.updateDownload),
  cancelUpdate: () => call<void>(commands.updateCancel),
  installUpdate: () => call<void>(commands.updateInstall),
};

export async function onTaskProgress(handler: (e: TaskEvent) => void): Promise<() => void> {
  if (isTauri) return listen<TaskEvent>(taskEvent, (ev) => handler(ev.payload));
  const mock = await import('./mock');
  return mock.subscribe(handler);
}

export async function onUpdateState(handler: (s: UpdateState) => void): Promise<() => void> {
  if (isTauri) return listen<UpdateState>(updateEvent, (ev) => handler(ev.payload));
  const mock = await import('./mock');
  return mock.subscribeUpdate(handler);
}

export async function openExternal(url: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) return;
  if (isTauri) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function win() {
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  return getCurrentWindow();
}

export const windowControls = {
  minimize: async () => {
    if (isTauri) await (await win()).minimize();
  },
  toggleMaximize: async () => {
    if (isTauri) await (await win()).toggleMaximize();
  },
  close: async () => {
    if (isTauri) await (await win()).close();
  },
  show: async () => {
    if (isTauri) await (await win()).show();
  },
  isMaximized: async () => (isTauri ? (await win()).isMaximized() : false),
  onResized: async (fn: () => void) => (isTauri ? (await win()).onResized(fn) : () => {}),
};
