export type Edition = 'normal' | 'pro';

export type InstallState = 'not-installed' | 'installed' | 'update-available' | 'cloned';

export type InstallMethod = 'zip' | 'msi' | 'exe' | 'portable' | 'clone';

export type Manifest = {
  name?: string;
  category?: string;
  asset?: string;
  method?: InstallMethod;
  run?: string;
  silentArgs?: string[];
};

export type ReleaseAsset = {
  name: string;
  size: number;
  url: string;
  downloads: number;
};

export type Release = {
  tag: string;
  name: string;
  publishedAt: string;
  notesHtml: string;
  prerelease: boolean;
  assets: ReleaseAsset[];
};

export type Repo = {
  owner: string;
  name: string;
  fullName: string;
  description: string;
  private: boolean;
  archived: boolean;
  fork: boolean;
  stars: number;
  forks: number;
  openIssues: number;
  language: string | null;
  topics: string[];
  license: string | null;
  homepage: string | null;
  htmlUrl: string;
  pushedAt: string;
  updatedAt: string;
  sizeKb: number;
  latestTag: string | null;
  latestPublishedAt: string | null;
  hasWindowsAsset: boolean;
  manifest: Manifest | null;
  category: string;
  installState: InstallState;
  installedTag: string | null;
  localTags: string[];
};

export type RepoList = {
  account: string;
  fetchedAt: string;
  fromCache: boolean;
  rateRemaining: number | null;
  rateResetAt: string | null;
  budgetSkipped: boolean;
  repos: Repo[];
};

export type Installed = {
  fullName: string;
  tag: string;
  method: InstallMethod;
  path: string;
  exe: string | null;
  installedAt: string;
};

export type Settings = {
  account: string;
  extraAccounts: string[];
  installDir: string;
  cloneDir: string;
  language: 'tr' | 'en';
  showArchived: boolean;
  showForks: boolean;
  closeToTray: boolean;
  hasToken: boolean;
};

export type AppInfo = {
  edition: Edition;
  version: string;
  gitAvailable: boolean;
};

export type TaskStep = 'resolve' | 'download' | 'verify' | 'install' | 'shortcut' | 'done';

export type TaskEvent = {
  taskId: string;
  fullName: string;
  kind: 'install' | 'update' | 'uninstall' | 'clone';
  step: TaskStep;
  percent: number;
  message: string;
  status: 'running' | 'done' | 'error' | 'cancelled';
  logLine?: string;
};

export type AppError = {
  code: 'network' | 'rate-limit' | 'auth' | 'not-found' | 'no-asset' | 'checksum' | 'io' | 'git-missing' | 'cancelled' | 'unknown';
  message: string;
  logPath?: string;
};

export const commands = {
  appInfo: 'app_info',
  listRepos: 'list_repos',
  readme: 'repo_readme',
  releases: 'repo_releases',
  getSettings: 'get_settings',
  saveSettings: 'save_settings',
  setToken: 'set_token',
  clearToken: 'clear_token',
  listInstalled: 'list_installed',
  install: 'install_repo',
  uninstall: 'uninstall_repo',
  clone: 'clone_repo',
  cancelTask: 'cancel_task',
  launch: 'launch_installed',
  setLocalTags: 'set_local_tags',
  openPath: 'open_path',
  updateState: 'update_state',
  updateCheck: 'update_check',
  updateDownload: 'update_download',
  updateCancel: 'update_cancel',
  updateInstall: 'update_install',
} as const;

export const taskEvent = 'task://progress';

export type UpdatePhase = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'installing' | 'error';

export type UpdateState = {
  phase: UpdatePhase;
  current: string;
  latest: string | null;
  notes: string | null;
  percent: number;
  message: string | null;
  checkedAt: string | null;
  dryRun: boolean;
};

export const updateEvent = 'update://state';
