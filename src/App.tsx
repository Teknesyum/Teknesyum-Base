import { useEffect, useRef, useState } from 'react';
import { TitleBar } from '../teknesyum-ui/ustcubuk/TitleBar';
import { api, openExternal, windowControls } from './api/client';
import type { PrereqInfo, Repo } from './api/types';
import { I18nProvider, useI18n } from './i18n';
import { StoreProvider, useStore } from './store';
import { ConfirmDialog } from './ui/Dialog';
import { useTitlebarFit } from './ui/hooks';
import { ToastProvider } from './ui/Toasts';
import { UpdateBadge } from './ui/UpdateBadge';
import { UpdateProvider, useUpdate } from './ui/useUpdate';
import { defaultFilter, primaryOf, type LibFilter, type Opener } from './views/actions';
import { DetailSheet } from './views/DetailSheet';
import { InstalledView } from './views/InstalledView';
import { Library } from './views/Library';
import { SettingsView } from './views/SettingsView';
import { StatusBar } from './views/StatusBar';
import { UpdatePanel } from './views/UpdatePanel';

type Tab = 'library' | 'installed' | 'settings';
type Target = { fullName: string; opener: Opener };

const LINKS = { sponsor: 'https://github.com/sponsors/Teknesyum', brand: 'https://github.com/Teknesyum' };

function Frame() {
  const { t, lang, clock } = useI18n();
  const store = useStore();
  const appRef = useRef<HTMLDivElement>(null);
  useTitlebarFit(appRef, lang + (store.info?.edition ?? '') + (store.info?.version ?? ''));
  const [tab, setTab] = useState<Tab>('library');
  const [filter, setFilter] = useState<LibFilter>(defaultFilter);
  const [detail, setDetail] = useState<Target | null>(null);
  const [removal, setRemoval] = useState<Target | null>(null);
  const [claudeAsk, setClaudeAsk] = useState<Target | null>(null);
  const [prereqAsk, setPrereqAsk] = useState<(Target & { items: PrereqInfo[] }) | null>(null);
  const [clearing, setClearing] = useState<Opener | undefined>(undefined);
  const [updateFrom, setUpdateFrom] = useState<HTMLElement | null | undefined>(undefined);
  const [maximized, setMaximized] = useState(false);
  const pro = store.info?.edition === 'pro';
  const updatePhase = useUpdate().state?.phase;
  useEffect(() => {
    if (updatePhase === 'idle' || updatePhase === 'checking') setUpdateFrom(undefined);
  }, [updatePhase]);

  const find = (x: Target | null): Repo | null => (x ? (store.list?.repos.find((r) => r.fullName === x.fullName) ?? null) : null);

  useEffect(() => {
    document.title = t(pro ? 'app.namePro' : 'app.name');
  }, [t, pro]);

  useEffect(() => {
    const sync = () => void windowControls.isMaximized().then(setMaximized);
    sync();
    const off = windowControls.onResized(sync);
    return () => void off.then((f) => f());
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => void windowControls.show());
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const on = (e: Event) => (e.target as Element | null)?.setAttribute?.('data-tk-scrolling', '');
    const off = (e: Event) => (e.target as Element | null)?.removeAttribute?.('data-tk-scrolling');
    document.addEventListener('scroll', on, true);
    document.addEventListener('scrollend', off, true);
    return () => {
      document.removeEventListener('scroll', on, true);
      document.removeEventListener('scrollend', off, true);
    };
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      const a = (e.target as Element | null)?.closest?.('a[href]');
      const href = a?.getAttribute('href') ?? '';
      if (!/^https?:\/\//i.test(href)) return;
      e.preventDefault();
      void openExternal(href);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  const onPrimary = (repo: Repo, opener?: Opener) => {
    const p = primaryOf(repo);
    if (repo.plugin && (p === 'install' || p === 'update') && !store.list?.claudeCode) {
      setClaudeAsk({ fullName: repo.fullName, opener: opener ?? null });
      return;
    }
    if (p === 'launch') store.launch(repo.fullName);
    else if (p === 'folder') store.openFolder(repo.fullName);
    else if (p === 'source') void openExternal(repo.htmlUrl);
    else if (repo.installState === 'not-installed' && !repo.plugin) {
      void api
        .missingPrereqs(repo.owner, repo.name, false)
        .catch(() => [] as PrereqInfo[])
        .then((items) => {
          if (items.length) setPrereqAsk({ fullName: repo.fullName, opener: opener ?? null, items });
          else void store.start(repo, 'install');
        });
    } else void store.start(repo, 'install');
  };
  const setLang = (next: 'tr' | 'en') => {
    if (store.settings && store.settings.language !== next) void store.saveSettings({ ...store.settings, language: next });
  };
  const list = store.list;
  const syncState = store.syncing ? 'syncing' : store.syncError ? 'offline' : 'synced';
  const syncText = store.syncing ? t('sync.now') : store.syncError ? t('sync.offline') : list ? t('titlebar.syncedAt', { label: t('sync.synced'), time: clock(list.fetchedAt) }) : '';
  const onUninstall = (repo: Repo, opener: Opener) => setRemoval({ fullName: repo.fullName, opener });
  const onOpen = (repo: Repo, opener: Opener) => setDetail({ fullName: repo.fullName, opener });

  const kare = store.info?.kare;
  const kareRepos = store.list?.repos;
  useEffect(() => {
    if (!kare) return;
    const [view, name] = kare.split('@')[0].split(':');
    if (view === 'installed' || view === 'settings' || view === 'library') setTab(view);
    const hit = view === 'detail' ? kareRepos?.find((r) => r.name.toLowerCase() === (name ?? '').toLowerCase()) : undefined;
    if (hit) setDetail({ fullName: hit.fullName, opener: null });
  }, [kare, kareRepos]);

  const removeRepo = find(removal);
  const askRepo = find(claudeAsk);
  const prereqRepo = find(prereqAsk);

  return (
    <div ref={appRef} className="app" style={{ ['--app-version' as string]: store.info?.version ? `"${store.info.version}"` : 'none' }}>
      <TitleBar
        first={t('app.first')}
        second={t(pro ? 'app.secondPro' : 'app.second')}
        logo="/logo-32.png"
        links={LINKS}
        badge={<UpdateBadge onOpen={(el) => setUpdateFrom(el)} />}
        sync={{ state: syncState, text: syncText, title: store.syncError ? t('status.syncError', { reason: t('errors.' + store.syncError.code + '.title') }) : syncText ? t('titlebar.syncTitle', { state: syncText, action: t('sync.now') }) : t('sync.now'), onClick: () => void store.refresh() }}
        language={
          <div
            className="lang-switch"
            data-lang={lang}
            role="radiogroup"
            aria-label={t('titlebar.language')}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
              e.preventDefault();
              setLang(lang === 'tr' ? 'en' : 'tr');
            }}
          >
            <button type="button" role="radio" aria-checked={lang === 'tr'} tabIndex={lang === 'tr' ? 0 : -1} className="lang-switch__opt" lang="tr" onClick={() => setLang('tr')}>
              TR
            </button>
            <button type="button" role="radio" aria-checked={lang === 'en'} tabIndex={lang === 'en' ? 0 : -1} className="lang-switch__opt" lang="en" onClick={() => setLang('en')}>
              EN
            </button>
          </div>
        }
        maximized={maximized}
        labels={{
          sponsor: t('sig.support'),
          sponsorTitle: t('sig.supportTitle'),
          brand: t('sig.brand'),
          brandTitle: t('sig.brandTitle'),
          restore: t('titlebar.restore'),
          minimize: t('titlebar.minimize'),
          maximize: t('titlebar.maximize'),
          close: t('titlebar.close'),
          tabs: t('titlebar.tabs'),
        }}
        tabs={[
          { id: 'library', label: t('tabs.library') },
          { id: 'installed', label: t('tabs.installed') },
          { id: 'settings', label: t('tabs.settings') },
        ]}
        current={tab}
        onTab={(id) => {
          setDetail(null);
          setUpdateFrom(undefined);
          setTab(id as Tab);
        }}
        onMinimize={() => void windowControls.minimize()}
        onMaximize={() => void windowControls.toggleMaximize()}
        onClose={() => void windowControls.close()}
      />
      <main className="app__main" key={tab}>
        {tab === 'library' ? (
          <Library filter={filter} setFilter={setFilter} onOpen={onOpen} onPrimary={onPrimary} onSettings={() => setTab('settings')} />
        ) : tab === 'installed' ? (
          <InstalledView onOpen={onOpen} onUninstall={onUninstall} onLibrary={() => setTab('library')} />
        ) : (
          <SettingsView onClearToken={(o) => setClearing(o)} />
        )}
      </main>
      <StatusBar onSettings={() => setTab('settings')} />

      <DetailSheet
        repo={find(detail)}
        open={!!detail && !removal}
        returnTo={detail?.opener ?? null}
        onClose={() => setDetail(null)}
        onPrimary={onPrimary}
        onUninstall={onUninstall}
      />
      <UpdatePanel open={updateFrom !== undefined} returnTo={updateFrom ?? null} onClose={() => setUpdateFrom(undefined)} />
      <ConfirmDialog
        open={!!removal && !!removeRepo}
        title={t('uninstall.title', { name: removeRepo?.name ?? '' })}
        body={t(removeRepo?.plugin ? 'uninstall.pluginBody' : 'uninstall.body')}
        ack={t('uninstall.ack')}
        confirmLabel={t('actions.uninstall')}
        danger
        returnTo={removal?.opener ?? null}
        onConfirm={() => {
          if (removeRepo) void store.start(removeRepo, 'uninstall');
          setRemoval(null);
        }}
        onClose={() => setRemoval(null)}
      />
      <ConfirmDialog
        open={!!claudeAsk && !!askRepo}
        title={t('claude.title')}
        body={t('claude.body', { name: askRepo?.name ?? '' })}
        confirmLabel={t('claude.confirm')}
        returnTo={claudeAsk?.opener ?? null}
        onConfirm={() => {
          if (askRepo) void store.start(askRepo, 'install', true);
          setClaudeAsk(null);
        }}
        onClose={() => setClaudeAsk(null)}
      />
      <ConfirmDialog
        open={!!prereqAsk && !!prereqRepo}
        title={t('prereq.title', { name: prereqRepo?.name ?? '' })}
        body={
          <>
            <p>{t('prereq.body')}</p>
            <p><strong>{prereqAsk?.items.map((p) => p.label).join(', ')}</strong></p>
            <p>{t('prereq.note')}</p>
          </>
        }
        confirmLabel={t('prereq.confirm')}
        returnTo={prereqAsk?.opener ?? null}
        onConfirm={() => {
          if (prereqRepo) void store.start(prereqRepo, 'install', undefined, true);
          setPrereqAsk(null);
        }}
        onClose={() => setPrereqAsk(null)}
      />
      <ConfirmDialog
        open={clearing !== undefined}
        title={t('settings.tokenClearTitle')}
        body={t('settings.tokenClearBody')}
        confirmLabel={t('settings.tokenClear')}
        danger
        returnTo={clearing ?? null}
        onConfirm={() => {
          void store.clearToken();
          setClearing(undefined);
        }}
        onClose={() => setClearing(undefined)}
      />
    </div>
  );
}

function Shell() {
  const store = useStore();
  const kareLang = store.info?.kare?.split('@')[1];
  const lang = kareLang === 'en' || kareLang === 'tr' ? kareLang : (store.settings?.language ?? 'tr');
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <I18nProvider lang={lang}>
      <UpdateProvider>
        <Frame />
      </UpdateProvider>
    </I18nProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </ToastProvider>
  );
}
