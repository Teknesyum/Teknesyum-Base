import type { Repo, TaskEvent } from '../api/types';
import { useI18n } from '../i18n';
import { ProgressBar } from '../ui/Progress';
import { IconStar } from '../ui/icons';
import { useState } from 'react';
import { appIcon, appShot, appShotFull } from '../data/visuals';
import { ImageDialog } from '../ui/Dialog';
import { useStore } from '../store';
import { isRunning, primaryOf, uiState, type Opener } from './actions';

export function AppIcon({ name }: { name: string }) {
  const src = appIcon(name);
  if (src) return <img className="app-icon" src={src} alt="" aria-hidden="true" loading="lazy" />;
  return (
    <span className="app-icon app-icon--letter" aria-hidden="true">
      {name.charAt(0).toLocaleUpperCase('tr')}
    </span>
  );
}

export function UiChip({ repo }: { repo: Repo }) {
  const { t } = useI18n();
  const latest = useStore().list?.uiLatest ?? null;
  if (!repo.uiVersion) return null;
  const state = uiState(repo.uiVersion, latest);
  return (
    <span className={state === 'old' ? 'chip chip--warn' : 'chip'} title={t('ui.' + state, { latest: latest ?? '' })}>
      {t('ui.chip', { version: repo.uiVersion })}
    </span>
  );
}

export function StateBadge({ repo }: { repo: Repo }) {
  const { t } = useI18n();
  return (
    <span className="badge" data-state={repo.installState}>
      <span className="badge__dot" aria-hidden="true" />
      {t('state.' + repo.installState)}
    </span>
  );
}

export function PrimaryButton({ repo, task, onPrimary, tabIndex }: { repo: Repo; task?: TaskEvent; onPrimary: (o: Opener) => void; tabIndex?: number }) {
  const { t } = useI18n();
  const p = primaryOf(repo);
  const running = isRunning(task);
  return (
    <button
      type="button"
      className={p === 'launch' || p === 'folder' ? 'btn btn--ghost' : 'btn btn--primary'}
      tabIndex={tabIndex}
      disabled={running}
      title={running ? t('task.busy') : undefined}
      aria-label={t('actions.aria', { action: t('actions.' + p), name: repo.name })}
      onClick={(e) => onPrimary(e.currentTarget)}
    >
      {running ? t('task.running.' + (task?.kind ?? 'install')) : t('actions.' + p)}
    </button>
  );
}

export function TaskProgress({ task }: { task: TaskEvent }) {
  const { t } = useI18n();
  return <ProgressBar percent={task.percent} step={t('steps.' + task.step)} status="running" label={t('task.running.' + task.kind)} />;
}

type Props = {
  repo: Repo;
  task?: TaskEvent;
  view: 'grid' | 'list';
  index: number;
  item: { ref: (el: HTMLButtonElement | null) => void; tabIndex: number; onFocus: () => void };
  onOpen: (o: Opener) => void;
  onPrimary: (o: Opener) => void;
};

export function RepoCard({ repo, task, view, index, item, onOpen, onPrimary }: Props) {
  const { t, num, rel } = useI18n();
  const running = isRunning(task);
  const meta = (
    <div className="card__meta">
      <span className="meta" title={t('stats.stars')}>
        <IconStar />
        <span className="sr-num">{num(repo.stars)}</span>
        <span className="tk-sr-only">{t('stats.stars')}</span>
      </span>
      {repo.language ? <span className="meta">{repo.language}</span> : null}
      {repo.latestTag ? <span className="chip">{repo.latestTag}</span> : null}
      <UiChip repo={repo} />
      <span className="meta">{rel(repo.pushedAt)}</span>
      {repo.archived ? <span className="chip chip--warn">{t('state.archived')}</span> : null}
    </div>
  );
  const tags = repo.tags ?? [];
  const shot = appShot(repo.name);
  const [viewer, setViewer] = useState<HTMLElement | null>(null);
  const shotAlt = t('library.shot', { name: repo.name });
  return (
    <article
      className={view === 'grid' ? 'card' : 'row'}
      data-flip={repo.fullName}
      onClick={(e) => {
        if ((e.target as Element).closest('button, a')) return;
        onOpen(e.currentTarget.querySelector<HTMLButtonElement>('.card__open'));
      }}
      style={{ animationDelay: `calc(var(--tk-stagger) * min(${index}, var(--tk-stagger-max)))` }}>
      <div className="card__head">
        <AppIcon name={repo.name} />
        <div className="card__heading">
          <h3 className="card__title">
            <button type="button" className="card__open" data-name={repo.name} {...item} onClick={(e) => onOpen(e.currentTarget)}>
              {repo.name}
            </button>
          </h3>
          <span className="card__category">{t('category.' + repo.category)}</span>
        </div>
      </div>
      {shot ? (
        <button type="button" className="card__shot" aria-label={t('library.shotOpen', { name: repo.name })} title={t('library.shotOpen', { name: repo.name })} onClick={(e) => setViewer(e.currentTarget)}>
          <img className="card__shot-img" src={shot} alt="" loading="lazy" />
        </button>
      ) : null}
      {shot ? <ImageDialog open={!!viewer} src={appShotFull(repo.name) ?? shot} alt={shotAlt} returnTo={viewer} onClose={() => setViewer(null)} /> : null}
      <p className="card__desc">{repo.summary || repo.description || t('library.noDescription')}</p>
      {tags.length ? (
        <p className="card__tags" aria-label={t('library.tags')}>
          {'#' + tags.join('   #')}
        </p>
      ) : null}
      {meta}
      <div className="card__foot">
        <StateBadge repo={repo} />
        {running && task ? (
          <div className="card__progress">
            <TaskProgress task={task} />
          </div>
        ) : (
          <PrimaryButton repo={repo} task={task} onPrimary={onPrimary} tabIndex={item.tabIndex} />
        )}
      </div>
    </article>
  );
}
