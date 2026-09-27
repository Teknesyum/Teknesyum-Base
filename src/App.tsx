import { useEffect, useRef, useState } from 'react';
import { TitleBar } from '../teknesyum-ui/ustcubuk/TitleBar';
import { openExternal, windowControls } from './api/client';
import type { Repo } from './api/types';
import { I18nProvider, useI18n } from './i18n';
import { StoreProvider, useStore } from './store';
import { ConfirmDialog } from './ui/Dialog';
import { useTitlebarFit } from './ui/hooks';
import { ToastProvider } from './ui/Toasts';
import { UpdateBadge } from './ui/UpdateBadge';
import { UpdateProvider, useUpdate } from './ui/useUpdate';
import { defaultFilter, primaryOf, type LibFilter, type Opener } from './views/actions';
import { DetailSheet } from './views/DetailSheet';
import { InstallDialog } from './views/InstallDialog';
import { InstalledView } from './views/InstalledView';
import { Library } from './views/Library';
import { SettingsView } from './views/SettingsView';
import { StatusBar } from './views/StatusBar';
import { UpdatePanel } from './views/UpdatePanel';

type Tab = 'library' | 'installed' | 'settings';
type Target = { fullName: string; opener: Opener };

const LINKS = { sponsor: 'https://github.com/sponsors/Teknesyum', brand: 'https://github.com/Teknesyum' };

function Frame() {
  const { t, lang } = useI18n();
  const store = useStore();
  const appRef = useRef<HTMLDivElement>(null);
  useTitlebarFit(appRef, lang + (store.info?.edition ?? ''));
  const [tab, setTab] = useState<Tab>('library');
  const [filter, setFilter] = useState<LibFilter>(defaultFilter);
  const [detail, setDetail] = useState<Target | null>(null);
  const [install, setInstall] = useState<(Target & { kind: 'install' | 'clone' }) | null>(null);
  const [removal, setRemoval] = useState<Target | null>(null);
  const [clearing, setClearing] = useState<Opener | undefined>(undefined);
  const [updateFrom, setUpdateFrom] = useState<HTMLElement | null | undefined>(undefined);
  const updatePhase = useUpdate().state?.phase;
  useEffect(() => {
    if (updatePhase === 'idle' || updatePhase === 'checking') setUpdateFrom(undefined);
  }, [updatePhase]);

  const find = (x: Target | null): Repo | null => (x ? (store.list?.repos.find((r) => r.fullName === x.fullName) ?? null) : null);

  useEffect(() => {
    const id = requestAnimationFrame(() => void windowControls.show());
    return () => cancelAnimationFrame(id);
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

  const onPrimary = (repo: Repo, opener: Opener) => {
    const p = primaryOf(repo);
    if (p === 'launch') store.launch(repo.fullName);
    else if (p === 'folder') store.openFolder(repo.fullName);
    else setInstall({ fullName: repo.fullName, opener, kind: p === 'clone' ? 'clone' : 'install' });
  };
  const onUninstall = (repo: Repo, opener: Opener) => setRemoval({ fullName: repo.fullName, opener });
  const onOpen = (repo: Repo, opener: Opener) => setDetail({ fullName: repo.fullName, opener });

  const removeRepo = find(removal);
  const installRepo = find(install);

  return (
    <div ref={appRef} className="app">
      <TitleBar
        first={t('app.first')}
        second={t(store.info?.edition === 'pro' ? 'app.secondPro' : 'app.second')}
        logo="/logo-32.png"
        links={LINKS}
        badge={<UpdateBadge onOpen={(el) => setUpdateFrom(el)} />}
        labels={{
          sponsor: t('titlebar.sponsor'),
          brand: t('titlebar.brand'),
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
        onTab={(id) => setTab(id as Tab)}
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
        open={!!detail && !install && !removal}
        returnTo={detail?.opener ?? null}
        onClose={() => setDetail(null)}
        onPrimary={onPrimary}
        onClone={(repo, opener) => setInstall({ fullName: repo.fullName, opener, kind: 'clone' })}
        onUninstall={onUninstall}
      />
      <InstallDialog
        repo={installRepo}
        kind={install?.kind ?? 'install'}
        open={!!install}
        returnTo={install?.opener ?? null}
        onClose={() => setInstall(null)}
        onChangeLocation={() => {
          setInstall(null);
          setDetail(null);
          setTab('settings');
        }}
      />
      <UpdatePanel open={updateFrom !== undefined} returnTo={updateFrom ?? null} onClose={() => setUpdateFrom(undefined)} />
      <ConfirmDialog
        open={!!removal && !!removeRepo}
        title={t('uninstall.title', { name: removeRepo?.name ?? '' })}
        body={t('uninstall.body')}
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
  const lang = store.settings?.language ?? 'tr';
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
