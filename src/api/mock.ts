import type { AppError, AppInfo, DriveItem, DriveProgress, Installed, Release, Repo, RepoList, Settings, TaskEvent, TaskStep, UpdateState } from './types';

const durum = new URLSearchParams(window.location.search).get('durum');

type Seed = {
  name: string;
  description: string;
  language: string | null;
  stars: number;
  forks: number;
  issues: number;
  category: string;
  topics: string[];
  tag: string | null;
  daysAgo: number;
  state: Repo['installState'];
  installedTag?: string;
  archived?: boolean;
  fork?: boolean;
  license?: string | null;
  windows?: boolean;
  tags?: string[];
};

const seeds: Seed[] = [
  { name: 'Teknesyum-Base', description: 'Bir GitHub hesabının programlarını tek yerden kurar ve günceller.', language: 'TypeScript', stars: 42, forks: 3, issues: 4, category: 'Araçlar', topics: ['tauri', 'react', 'installer'], tag: 'v0.1.0', daysAgo: 0, state: 'installed', installedTag: 'v0.1.0' },
  { name: 'CodeXray', description: 'Bir kod tabanının haritasını çıkarır, bağımlılıkları ve sıcak noktaları gösterir.', language: 'Rust', stars: 318, forks: 21, issues: 12, category: 'Geliştirme/Analiz', topics: ['static-analysis', 'graph'], tag: 'v2.4.1', daysAgo: 2, state: 'update-available', installedTag: 'v2.3.0', tags: ['Günlük'] },
  { name: 'VidShrink', description: 'Videoları kaliteyi koruyarak küçültür; toplu iş ve ön ayar desteği.', language: 'C#', stars: 156, forks: 9, issues: 3, category: 'Medya', topics: ['ffmpeg', 'video', 'avalonia'], tag: 'v1.8.0', daysAgo: 5, state: 'installed', installedTag: 'v1.8.0', tags: ['Günlük'] },
  { name: 'AmeliyatListe', description: 'Ameliyathane listesini düzenler, yazdırır ve paylaşır.', language: 'TypeScript', stars: 12, forks: 0, issues: 1, category: 'Sağlık', topics: ['electron', 'hospital'], tag: 'v3.1.2', daysAgo: 9, state: 'not-installed' },
  { name: 'Runly', description: 'Sık kullanılan komutları tek tuşla çalıştıran başlatıcı.', language: 'C#', stars: 87, forks: 6, issues: 0, category: 'Sistem', topics: ['wpf', 'launcher'], tag: 'v1.2.0', daysAgo: 21, state: 'not-installed' },
  { name: 'Kalem', description: 'Dikkat dağıtmayan, dosya tabanlı not ve yazı aracı.', language: 'TypeScript', stars: 64, forks: 4, issues: 7, category: 'Üretkenlik', topics: ['markdown', 'editor'], tag: 'v0.9.3', daysAgo: 13, state: 'not-installed' },
  { name: 'PortGozcu', description: 'Açık portları ve onları tutan süreçleri canlı listeler.', language: 'Rust', stars: 203, forks: 15, issues: 2, category: 'Araçlar/Ağ', topics: ['network', 'cli'], tag: 'v1.0.4', daysAgo: 34, state: 'update-available', installedTag: 'v1.0.1' },
  { name: 'DnsKalkan', description: 'Yerel DNS önbelleği ve reklam engelleyici.', language: 'Go', stars: 141, forks: 11, issues: 5, category: 'Araçlar/Ağ', topics: ['dns', 'privacy'], tag: 'v0.6.0', daysAgo: 48, state: 'not-installed' },
  { name: 'EkranKayit', description: 'Hafif ekran kaydı; bölge, pencere ve ses seçimiyle.', language: 'C++', stars: 97, forks: 8, issues: 9, category: 'Medya', topics: ['capture', 'windows'], tag: 'v2.0.0', daysAgo: 60, state: 'not-installed' },
  { name: 'teknesyum-ui', description: 'Teknesyum arayüz standardı: token, şablon ve tarayıcı.', language: 'JavaScript', stars: 29, forks: 1, issues: 0, category: 'Geliştirme', topics: ['design-system', 'tokens'], tag: null, daysAgo: 1, state: 'cloned', windows: false },
  { name: 'dotfiles', description: 'Kabuk, düzenleyici ve terminal ayarları.', language: 'Shell', stars: 8, forks: 2, issues: 0, category: 'Geliştirme', topics: ['config'], tag: null, daysAgo: 75, state: 'not-installed', windows: false },
  { name: 'YedekCi', description: 'Klasörleri artımlı olarak harici diske yedekler.', language: 'Rust', stars: 55, forks: 3, issues: 4, category: 'Sistem', topics: ['backup'], tag: 'v1.3.0', daysAgo: 102, state: 'installed', installedTag: 'v1.3.0' },
  { name: 'SesKes', description: 'Ses dosyalarından sessiz bölümleri otomatik çıkarır.', language: 'Python', stars: 33, forks: 2, issues: 1, category: 'Medya/Ses', topics: ['audio'], tag: 'v0.4.2', daysAgo: 140, state: 'not-installed' },
  { name: 'EskiPanel', description: 'İlk yönetim paneli denemesi; artık bakımı yapılmıyor.', language: 'JavaScript', stars: 4, forks: 0, issues: 0, category: 'Arşiv', topics: [], tag: 'v0.2.0', daysAgo: 610, state: 'not-installed', archived: true, license: null },
  { name: 'ffmpeg-builds', description: 'Windows için hazır FFmpeg derlemeleri (çatal).', language: 'Shell', stars: 2, forks: 0, issues: 0, category: 'Medya', topics: ['ffmpeg'], tag: 'n7.1', daysAgo: 30, state: 'not-installed', fork: true },
  { name: 'Webband', description: 'Tarayıcıda çalışan Warband tarzı strateji oyunu.', language: 'JavaScript', stars: 48, forks: 7, issues: 2, category: 'Oyun', topics: ['game', 'browser'], tag: null, daysAgo: 40, state: 'not-installed', windows: false },
  { name: 'Hesapla', description: 'Birimli hesap makinesi; geçmiş ve değişkenlerle.', language: 'TypeScript', stars: 71, forks: 5, issues: 3, category: 'Üretkenlik', topics: ['calculator'], tag: 'v1.1.0', daysAgo: 17, state: 'not-installed' },
];

const day = 86400000;
const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();

const repos: Repo[] = seeds.map((s) => ({
  owner: 'Teknesyum',
  name: s.name,
  fullName: 'Teknesyum/' + s.name,
  description: s.description,
  private: location.search.includes('pro') && s.stars % 3 === 0,
  archived: !!s.archived,
  fork: !!s.fork,
  stars: s.stars,
  forks: s.forks,
  openIssues: s.issues,
  language: s.language,
  topics: s.topics,
  license: s.license === undefined ? 'MIT' : s.license,
  homepage: null,
  htmlUrl: 'https://github.com/Teknesyum/' + s.name,
  pushedAt: iso(s.daysAgo * day + 3600000),
  updatedAt: iso(s.daysAgo * day),
  sizeKb: 400 + s.stars * 37,
  latestTag: s.tag,
  latestPublishedAt: s.tag ? iso((s.daysAgo + 1) * day) : null,
  hasWindowsAsset: s.windows !== false && !!s.tag,
  manifest: null,
  category: s.category,
  installState: s.state,
  installedTag: s.installedTag ?? null,
  localTags: s.tags ?? [],
  uiVersion: s.tag ? (s.stars % 2 ? '0.23.0' : '0.20.0') : null,
  media: s.tag ? (s.stars % 3 ? { fresh: true, stale: [] } : { fresh: false, stale: ['shot-old', 'readme-old'] }) : null,
}));

let settings: Settings = {
  account: 'Teknesyum',
  extraAccounts: [],
  installDir: 'C:\\Users\\Kullanici\\AppData\\Local\\Teknesyum\\apps',
  cloneDir: 'C:\\Users\\Kullanici\\Projeler',
  language: 'tr',
  showArchived: false,
  showForks: false,
  closeToTray: true,
  silentUpdate: true,
  desktopShortcut: false,
  hasToken: false,
};

let rate = 58;
let firstList = true;
const listeners = new Set<(e: TaskEvent) => void>();
const cancelled = new Set<string>();

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function installedList(): Installed[] {
  return repos
    .filter((r) => r.installState === 'installed' || r.installState === 'update-available' || r.installState === 'cloned')
    .map((r) => ({
      fullName: r.fullName,
      tag: r.installedTag ?? 'main',
      method: r.installState === 'cloned' ? 'clone' : r.name === 'VidShrink' ? 'external' : 'zip',
      path:
        r.name === 'VidShrink'
          ? 'C:\\Users\\Kullanici\\AppData\\Local\\Programs\\VidShrink'
          : (r.installState === 'cloned' ? settings.cloneDir : settings.installDir) + '\\' + r.name,
      exe: r.installState === 'cloned' ? null : r.name + '.exe',
      installedAt: iso(20 * day),
    }));
}

function find(fullName: string): Repo {
  const r = repos.find((x) => x.fullName === fullName);
  if (!r) throw { code: 'not-found', message: 'Depo bulunamadı: ' + fullName } satisfies AppError;
  return r;
}

function emit(e: TaskEvent) {
  listeners.forEach((l) => l(e));
}

type Phase = { step: TaskStep; to: number; lines: string[] };

async function runTask(taskId: string, repo: Repo, kind: TaskEvent['kind']) {
  const tag = repo.latestTag ?? 'main';
  const plans: Record<TaskEvent['kind'], Phase[]> = {
    install: [
      { step: 'resolve', to: 6, lines: ['GET /repos/' + repo.fullName + '/releases/latest', 'Sürüm ' + tag + ' seçildi', 'Varlık: ' + repo.name + '-' + tag + '-win-x64.zip'] },
      { step: 'download', to: 68, lines: ['İndiriliyor 1,2 MB / 8,4 MB', 'İndiriliyor 4,8 MB / 8,4 MB', 'İndiriliyor 8,4 MB / 8,4 MB'] },
      { step: 'verify', to: 78, lines: ['SHA256SUMS alındı', 'Özet karşılaştırılıyor'] },
      { step: 'install', to: 94, lines: ['Geçici klasöre açılıyor', 'Dosyalar taşınıyor: ' + settings.installDir + '\\' + repo.name] },
      { step: 'shortcut', to: 100, lines: ['Başlat menüsü kısayolu yazıldı'] },
    ],
    update: [],
    clone: [
      { step: 'resolve', to: 8, lines: ['git clone https://github.com/' + repo.fullName + '.git'] },
      { step: 'download', to: 80, lines: ['Nesneler sayılıyor: 1240', 'Nesneler alınıyor: %52', 'Nesneler alınıyor: %100'] },
      { step: 'install', to: 100, lines: ['Çalışma ağacı çıkarılıyor', 'Klonlandı: ' + settings.cloneDir + '\\' + repo.name] },
    ],
    uninstall: [
      { step: 'resolve', to: 20, lines: ['Kayıt okundu: installed.json'] },
      { step: 'install', to: 85, lines: ['Dosyalar siliniyor'] },
      { step: 'shortcut', to: 100, lines: ['Kısayol kaldırıldı'] },
    ],
  };
  plans.update = plans.install;
  const fail = kind !== 'uninstall' && repo.name === 'Kalem';
  let pct = 0;
  const base = { taskId, fullName: repo.fullName, kind };
  for (const phase of plans[kind]) {
    const from = pct;
    const ticks = Math.max(4, Math.round((phase.to - from) / 3));
    for (let i = 1; i <= ticks; i++) {
      await wait(110);
      if (cancelled.has(taskId)) {
        emit({ ...base, step: phase.step, percent: pct, message: 'İptal edildi', status: 'cancelled', logLine: 'İşlem iptal edildi, geçici dosyalar temizlendi' });
        return;
      }
      pct = from + ((phase.to - from) * i) / ticks;
      const li = Math.floor(((i - 1) / ticks) * phase.lines.length);
      const line = i === 1 || Math.floor((i - 2) / ticks * phase.lines.length) !== li ? phase.lines[li] : undefined;
      if (fail && phase.step === 'verify' && i === ticks) {
        emit({ ...base, step: 'verify', percent: pct, message: 'SHA256 özeti uyuşmadı', status: 'error', logLine: 'HATA: indirilen dosyanın özeti SHA256SUMS ile uyuşmuyor' });
        return;
      }
      emit({ ...base, step: phase.step, percent: pct, message: phase.lines[li], status: 'running', logLine: line });
    }
  }
  if (kind === 'uninstall') {
    repo.installState = 'not-installed';
    repo.installedTag = null;
  } else if (kind === 'clone') {
    if (repo.installState === 'not-installed') repo.installState = 'cloned';
  } else {
    repo.installState = 'installed';
    repo.installedTag = repo.latestTag;
  }
  emit({ ...base, step: 'done', percent: 100, message: 'Tamamlandı', status: 'done', logLine: 'Bitti' });
}

function startTask(repo: Repo, kind: TaskEvent['kind']): string {
  const id = kind + '-' + repo.name + '-' + Date.now().toString(36);
  void runTask(id, repo, kind);
  return id;
}

const readmeHtml = (r: Repo) => `
<h1>${r.name}</h1>
<p>${r.description}</p>
<p><img src="https://img.shields.io/badge/lisans-MIT-blue" alt="lisans"> <img src="x" onerror="alert(1)"></p>
<h2>Kurulum</h2>
<ol><li>Son sürümü indirin.</li><li>Arşivi açın ve <code>${r.name}.exe</code> dosyasını çalıştırın.</li></ol>
<h2>Kullanım</h2>
<pre><code>${r.name.toLocaleLowerCase('tr')} --help</code></pre>
<p>Ayrıntılar için <a href="https://github.com/${r.fullName}/wiki">wiki sayfasına</a> bakın.</p>
<script>window.hacked = true</script>
<table><thead><tr><th>Özellik</th><th>Durum</th></tr></thead><tbody><tr><td>Toplu iş</td><td>Var</td></tr><tr><td>Komut satırı</td><td>Var</td></tr></tbody></table>
`;

function releasesOf(r: Repo): Release[] {
  if (!r.latestTag) return [];
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(r.latestTag);
  const tags = m ? [r.latestTag, `v${m[1]}.${m[2]}.${Math.max(0, +m[3] - 1)}`, `v${m[1]}.${Math.max(0, +m[2] - 1)}.0`] : [r.latestTag];
  return [...new Set(tags)].map((tag, i) => ({
    tag,
    name: tag,
    publishedAt: iso((i * 18 + 1) * day),
    notesHtml: `<ul><li>Açılış süresi kısaldı.</li><li>Türkçe çeviri güncellendi.</li>${i === 0 ? '<li>Yeni: <strong>toplu iş</strong> desteği.</li>' : ''}</ul>`,
    prerelease: false,
    assets: [
      { name: `${r.name}-${tag}-win-x64.zip`, size: 8_400_000 + i * 120_000, url: '#', downloads: 900 - i * 300 },
      { name: 'SHA256SUMS', size: 180, url: '#', downloads: 400 - i * 100 },
    ],
  }));
}

export function subscribe(handler: (e: TaskEvent) => void): () => void {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

const updateListeners = new Set<(s: UpdateState) => void>();
let update: UpdateState = { phase: 'idle', current: '0.1.0', latest: null, notes: null, percent: 0, message: null, checkedAt: null, dryRun: true };
let updateBooted = false;
let updateRun = 0;

function setUpdate(next: Partial<UpdateState>) {
  update = { ...update, ...next };
  const snap = { ...update };
  updateListeners.forEach((l) => l(snap));
}

const driveListeners = new Set<(p: DriveProgress) => void>();
let driveItems: DriveItem[] = [{ id: 'mock1AbCdEfGhIjK', name: 'Tanıtım videosu.mp4', size: 48_000_000, addedAt: '2026-10-01T10:00:00Z' }];

export function subscribeDrive(handler: (p: DriveProgress) => void): () => void {
  driveListeners.add(handler);
  return () => driveListeners.delete(handler);
}

async function mockDriveDownload(item: DriveItem) {
  const total = item.size ?? 10_000_000;
  const path = 'C:\\Users\\Ornek\\Downloads\\' + item.name;
  for (let i = 0; i <= 30; i += 1) {
    const p: DriveProgress = { id: item.id, received: Math.round((total * i) / 30), total, status: i === 30 ? 'done' : 'running', path, message: null };
    driveListeners.forEach((l) => l(p));
    await wait(120);
  }
}

export function subscribeUpdate(handler: (s: UpdateState) => void): () => void {
  updateListeners.add(handler);
  return () => updateListeners.delete(handler);
}

async function checkMockUpdate(): Promise<UpdateState> {
  if (update.phase === 'downloading' || update.phase === 'ready' || update.phase === 'installing') return { ...update };
  setUpdate({ phase: 'checking', message: null });
  await wait(600);
  setUpdate({
    phase: 'available',
    latest: '0.2.0',
    notes: 'Kendi kendini güncelleme eklendi.\nListe açılışı hızlandı.\nTürkçe çeviri gözden geçirildi.',
    percent: 0,
    checkedAt: new Date().toISOString(),
  });
  return { ...update };
}

async function downloadMockUpdate() {
  const run = ++updateRun;
  setUpdate({ phase: 'downloading', percent: 0, message: null });
  let pct = 0;
  while (pct < 100) {
    await wait(pct >= 42 && pct < 48 ? 900 : 140);
    if (run !== updateRun) return;
    pct = Math.min(100, pct + 3);
    setUpdate({ percent: pct });
  }
  setUpdate({ phase: 'ready', percent: 100 });
}

async function installMockUpdate() {
  setUpdate({ phase: 'installing' });
  await wait(1500);
  setUpdate({ phase: 'idle', current: update.latest ?? update.current, latest: null, notes: null, percent: 0 });
}

export async function mockInvoke<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  const out = (v: unknown) => v as T;
  switch (cmd) {
    case 'app_info':
      return out({ edition: location.search.includes('pro') ? 'pro' : 'normal', version: '0.1.0', gitAvailable: true, kare: new URLSearchParams(location.search).get('kare') } satisfies AppInfo);
    case 'list_repos': {
      if (durum === 'yukleniyor') await new Promise(() => {});
      if (durum === 'hata') {
        await wait(180);
        throw { code: 'network', message: 'api.github.com: bağlantı zaman aşımına uğradı' } satisfies AppError;
      }
      await wait(firstList ? 180 : 1400);
      const cached = firstList && !args.force;
      firstList = false;
      if (!cached) rate = Math.max(0, rate - 2);
      const list: RepoList = {
        account: (args.account as string) || settings.account,
        fetchedAt: cached ? iso(3 * 3600000) : new Date().toISOString(),
        fromCache: cached || durum === 'sinir',
        rateRemaining: durum === 'sinir' ? 0 : rate,
        rateResetAt: new Date(Date.now() + 42 * 60000).toISOString(),
        budgetSkipped: durum === 'sinir',
        uiLatest: '0.26.0',
        coreLatest: '0.51.0',
        repos: durum === 'bos' ? [] : repos.map((r) => ({ ...r, topics: [...r.topics], localTags: [...r.localTags] })),
      };
      return out(list);
    }
    case 'repo_readme': {
      await wait(500);
      const r = find(args.owner + '/' + args.name);
      if (r.name === 'dotfiles') throw { code: 'not-found', message: 'README yok' } satisfies AppError;
      return out(readmeHtml(r));
    }
    case 'repo_releases':
      await wait(400);
      return out(releasesOf(find(args.owner + '/' + args.name)));
    case 'get_settings':
      return out({ ...settings });
    case 'save_settings':
      await wait(120);
      settings = { ...(args.settings as Settings), hasToken: settings.hasToken };
      return out({ ...settings });
    case 'set_token':
      await wait(200);
      settings = { ...settings, hasToken: true };
      rate = 4980;
      return out({ ...settings });
    case 'clear_token':
      settings = { ...settings, hasToken: false };
      rate = 58;
      return out({ ...settings });
    case 'list_installed':
      return out(durum === 'bos' ? [] : installedList());
    case 'install_repo': {
      const r = find(args.owner + '/' + args.name);
      return out(startTask(r, r.installState === 'update-available' ? 'update' : 'install'));
    }
    case 'uninstall_repo':
      return out(startTask(find(args.fullName as string), 'uninstall'));
    case 'repo_keys':
      return out((args.fullNames as string[]).map((fullName) => ({ fullName, state: 'missing' })));
    case 'user_repo_keys':
      return out([]);
    case 'add_repo_key':
      return out([]);
    case 'remove_repo_key':
      return out(undefined);
    case 'drive_list':
      return out(driveItems);
    case 'drive_add': {
      const link = String(args.link ?? '');
      if (!/drive\.google\.com\/file\/d\//.test(link)) throw { code: 'not-found', message: 'Bu bir Drive dosya linki değil.' } satisfies AppError;
      const item: DriveItem = { id: 'mock' + Date.now(), name: 'Yeni dosya.zip', size: 12_500_000, addedAt: new Date().toISOString() };
      driveItems = [item, ...driveItems];
      return out(item);
    }
    case 'drive_remove':
      driveItems = driveItems.filter((x) => x.id !== args.id);
      return out(undefined);
    case 'drive_download': {
      const item = driveItems.find((x) => x.id === args.id);
      if (item) void mockDriveDownload(item);
      return out('C:\\Users\\Ornek\\Downloads\\' + (item?.name ?? ''));
    }
    case 'drive_reveal':
      return out(undefined);
    case 'missing_prereqs':
      return out([]);
    case 'clone_repo':
      return out(startTask(find(args.owner + '/' + args.name), 'clone'));
    case 'cancel_task':
      cancelled.add(args.taskId as string);
      return out(undefined);
    case 'set_local_tags':
      find(args.fullName as string).localTags = [...(args.tags as string[])];
      return out(undefined);
    case 'launch_installed':
    case 'open_path':
    case 'desktop_shortcut':
      return out(undefined);
    case 'update_state':
      if (!updateBooted) {
        updateBooted = true;
        setTimeout(() => void checkMockUpdate(), 1200);
      }
      return out({ ...update });
    case 'update_check':
      return out(await checkMockUpdate());
    case 'update_download':
      if (update.phase === 'available' || update.phase === 'error') void downloadMockUpdate();
      return out(undefined);
    case 'update_cancel':
      updateRun++;
      setUpdate({ phase: 'available', percent: 0 });
      return out(undefined);
    case 'update_install':
      if (update.phase !== 'ready') throw { code: 'unknown', message: 'Güncelleme henüz inmedi' } satisfies AppError;
      void installMockUpdate();
      return out(undefined);
    default:
      throw { code: 'unknown', message: 'Bilinmeyen komut: ' + cmd } satisfies AppError;
  }
}
