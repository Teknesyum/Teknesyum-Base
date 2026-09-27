import { useRef, useState } from 'react';
import type { Installed, Repo } from '../api/types';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { stagger, useFlip, useRoving } from '../ui/hooks';
import { EmptyState, ErrorState, SkeletonCards } from '../ui/States';
import { useToast } from '../ui/Toasts';
import { isRunning, type Opener } from './actions';
import { AppIcon, StateBadge, TaskProgress } from './RepoCard';
import './library.css';
import './page.css';

function stub(item: Installed): Repo {
  const [owner = '', name = item.fullName] = item.fullName.split('/');
  return {
    owner,
    name,
    fullName: item.fullName,
    description: '',
    private: false,
    archived: false,
    fork: false,
    stars: 0,
    forks: 0,
    openIssues: 0,
    language: null,
    topics: [],
    license: null,
    homepage: null,
    htmlUrl: 'https://github.com/' + item.fullName,
    pushedAt: item.installedAt,
    updatedAt: item.installedAt,
    sizeKb: 0,
    latestTag: null,
    latestPublishedAt: null,
    hasWindowsAsset: false,
    manifest: null,
    category: 'other',
    installState: 'installed',
    installedTag: item.tag,
    localTags: [],
  };
}

type Props = {
  onOpen: (repo: Repo, o: Opener) => void;
  onUninstall: (repo: Repo, o: Opener) => void;
  onLibrary: () => void;
};

export function InstalledView({ onOpen, onUninstall, onLibrary }: Props) {
  const { t, rel } = useI18n();
  const store = useStore();
  const toast = useToast();
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null);
  const repos = store.list?.repos ?? [];
  const rows = store.installed.map((item) => ({ item, repo: repos.find((r) => r.fullName.toLocaleLowerCase('tr') === item.fullName.toLocaleLowerCase('tr')) ?? stub(item) }));
  const updatable = rows.filter((x) => x.repo.installState === 'update-available' && !isRunning(store.tasks[x.repo.fullName]));
  const listRef = useRef<HTMLUListElement>(null);
  useFlip(listRef, rows.map((x) => x.item.fullName).join('|'));
  const roving = useRoving<HTMLButtonElement>(rows.length, { typeahead: (el) => el.dataset.name ?? '' });

  const updateAll = async () => {
    const list = updatable.map((x) => x.repo);
    setBulk({ done: 0, total: list.length });
    let ok = 0;
    for (const repo of list) {
      const id = await store.start(repo, 'install');
      if (id) {
        const end = await store.wait(id);
        if (end.status === 'done') ok += 1;
      }
      setBulk((b) => (b ? { ...b, done: b.done + 1 } : b));
    }
    setBulk(null);
    toast({ kind: ok === list.length ? 'success' : 'warning', title: t('installed.bulkDone', { ok, total: list.length }) });
  };

  let body;
  if (!store.list && store.loadError) body = <ErrorState error={store.loadError} action={{ label: t('common.retry'), run: store.reload }} />;
  else if (!store.list && !store.installed.length) body = <SkeletonCards count={4} view="list" />;
  else if (!rows.length)
    body = <EmptyState title={t('installed.emptyTitle')} body={t('installed.emptyBody')} action={{ label: t('installed.goLibrary'), run: onLibrary }} />;
  else
    body = (
      <ul ref={listRef} className="rows" aria-label={t('tabs.installed')} onKeyDown={roving.onKeyDown}>
        {rows.map(({ item, repo }, i) => {
          const task = store.tasks[repo.fullName];
          const running = isRunning(task);
          const rp = roving.itemProps(i);
          return (
            <li key={item.fullName} className="row row--installed" data-flip={item.fullName} style={stagger(i)}>
              <span className="card__head">
                <AppIcon name={repo.name} />
                <button type="button" className="card__open" data-name={repo.name} {...rp} onClick={(e) => onOpen(repo, e.currentTarget)}>
                  {repo.name}
                </button>
              </span>
              <span className="meta">
                {repo.installState === 'update-available' ? t('installed.versions', { from: item.tag, to: repo.latestTag ?? '' }) : item.tag}
              </span>
              <span className="meta">{t('installed.method.' + item.method)}</span>
              <span className="meta">{rel(item.installedAt)}</span>
              <StateBadge repo={repo} />
              <div className="row__actions">
                {running && task ? (
                  <div className="card__progress">
                    <TaskProgress task={task} />
                  </div>
                ) : (
                  <>
                    {repo.installState === 'update-available' ? (
                      <button type="button" className="btn btn--primary" tabIndex={rp.tabIndex} onClick={() => void store.start(repo, 'install')}>
                        {t('actions.update')}
                      </button>
                    ) : null}
                    {item.exe ? (
                      <button type="button" className="btn btn--ghost" tabIndex={rp.tabIndex} onClick={() => store.launch(repo.fullName)}>
                        {t('actions.launch')}
                      </button>
                    ) : null}
                    <button type="button" className="btn btn--ghost" tabIndex={rp.tabIndex} onClick={() => store.openFolder(repo.fullName)}>
                      {t('actions.folder')}
                    </button>
                    <button type="button" className="btn btn--ghost btn--danger-outline" tabIndex={rp.tabIndex} onClick={(e) => onUninstall(repo, e.currentTarget)}>
                      {t('actions.uninstall')}
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">{t('tabs.installed')}</h1>
          <p className="help">{t('installed.summary', { n: rows.length, u: rows.filter((x) => x.repo.installState === 'update-available').length })}</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          disabled={!updatable.length || !!bulk}
          title={!updatable.length ? t('installed.nothingToUpdate') : bulk ? t('task.busy') : undefined}
          onClick={() => void updateAll()}
        >
          {bulk ? t('installed.bulkRunning', { done: bulk.done, total: bulk.total }) : t('installed.updateAll')}
        </button>
      </div>
      {body}
    </div>
  );
}
