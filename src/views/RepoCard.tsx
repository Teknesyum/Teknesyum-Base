import type { Repo, TaskEvent } from '../api/types';
import { useI18n } from '../i18n';
import { ProgressBar } from '../ui/Progress';
import { IconExternal, IconStar } from '../ui/icons';
import { useState } from 'react';
import { appIcon, appShot, appShotFull, useRepoMedia } from '../data/visuals';
import { forkOf } from '../data/catalog';
import { openExternal } from '../api/client';
import { ImageDialog } from '../ui/Dialog';
import { useStore } from '../store';
import { isRunning, primaryOf, uiState, type Opener } from './actions';

export function AppIcon({ repo }: { repo: Repo }) {
  const name = repo.name;
  const remote = useRepoMedia(repo, 'icon');
  const [broken, setBroken] = useState<string>();
  const src = remote && remote !== broken ? remote : appIcon(name);
  if (src) return <img className="app-icon" src={src} alt="" aria-hidden="true" loading="lazy" onError={() => remote && setBroken(remote)} />;
  return (
    <span className="app-icon app-icon--letter" aria-hidden="true">
      {name.charAt(0).toLocaleUpperCase('tr')}
    </span>
  );
}

export function Points({ repo, className, max }: { repo: Repo; className: string; max?: number }) {
  const { t } = useI18n();
  const points = repo.points?.slice(0, max);
  if (!points?.length) return <p className={className}>{repo.summary || repo.description || t('library.noDescription')}</p>;
  return (
    <ul className={className + ' points'}>
      {points.map((p) => (
        <li key={p}>{p}</li>
      ))}
    </ul>
  );
}

export function Uses({ repo, className }: { repo: Repo; className: string }) {
  const { t } = useI18n();
  const uses = repo.uses ?? repo.points?.slice(0, 5);
  if (!uses?.length) return <p className={className}>{repo.summary || repo.description || t('library.noDescription')}</p>;
  return (
    <section className={className + ' uses'} aria-label={t('library.uses')}>
      {repo.lead ? <p className="uses__lead">{repo.lead}</p> : null}
      <h4 className="uses__title">{t('library.uses')}</h4>
      <ul className="points">
        {uses.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </section>
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

export function GithubButton({ repo, tabIndex }: { repo: Repo; tabIndex?: number }) {
  const { t } = useI18n();
  const label = t('actions.githubOf', { name: repo.name });
  return (
    <button type="button" className="btn btn--icon btn--quiet" tabIndex={tabIndex} aria-label={label} title={label} onClick={() => void openExternal(repo.htmlUrl)}>
      <IconExternal />
    </button>
  );
}

export function ForkNote({ repo, full }: { repo: Repo; full?: boolean }) {
  const { t } = useI18n();
  const fork = forkOf(repo.name);
  if (!fork) return null;
  return (
    <div className="fork-note">
      <p className="fork-note__text">{t(full ? 'fork.long' : 'fork.short', { by: fork.by, name: repo.name })}</p>
      <div className="fork-note__actions">
        <button type="button" className="btn btn--ghost" onClick={() => void openExternal(fork.play ?? fork.repo)}>
          <IconExternal />
          {t('fork.play', { by: fork.by })}
        </button>
        {full && fork.play ? (
          <button type="button" className="btn btn--quiet" onClick={() => void openExternal(fork.repo)}>
            <IconExternal />
            {t('fork.repo', { by: fork.by })}
          </button>
        ) : null}
      </div>
    </div>
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
  const remoteShot = useRepoMedia(repo, 'shot');
  const [brokenShot, setBrokenShot] = useState<string>();
  const liveShot = remoteShot && remoteShot !== brokenShot ? remoteShot : undefined;
  const shot = liveShot ?? appShot(repo.name);
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
        <AppIcon repo={repo} />
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
          <img className="card__shot-img" src={shot} alt="" loading="lazy" onError={() => liveShot && setBrokenShot(liveShot)} />
        </button>
      ) : null}
      {shot ? <ImageDialog open={!!viewer} src={liveShot ?? appShotFull(repo.name) ?? shot} alt={shotAlt} returnTo={viewer} onClose={() => setViewer(null)} /> : null}
      <Uses repo={repo} className="card__desc" />
      {tags.length ? (
        <p className="card__tags" aria-label={t('library.tags')}>
          {'#' + tags.join('   #')}
        </p>
      ) : null}
      {meta}
      <ForkNote repo={repo} />
      <div className="card__foot">
        <StateBadge repo={repo} />
        {running && task ? (
          <div className="card__progress">
            <TaskProgress task={task} />
          </div>
        ) : (
          <div className="card__buttons">
            <GithubButton repo={repo} tabIndex={item.tabIndex} />
            <PrimaryButton repo={repo} task={task} onPrimary={onPrimary} tabIndex={item.tabIndex} />
          </div>
        )}
      </div>
    </article>
  );
}
