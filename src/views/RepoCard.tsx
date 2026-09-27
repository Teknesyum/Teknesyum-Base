import type { Repo, TaskEvent } from '../api/types';
import { useI18n } from '../i18n';
import { ProgressBar } from '../ui/Progress';
import { IconStar } from '../ui/icons';
import { isRunning, primaryOf, type Opener } from './actions';

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
      <span className="meta">{rel(repo.pushedAt)}</span>
      {repo.archived ? <span className="chip chip--warn">{t('state.archived')}</span> : null}
    </div>
  );
  return (
    <article className={view === 'grid' ? 'card' : 'row'} data-flip={repo.fullName} style={{ animationDelay: `calc(var(--tk-stagger) * min(${index}, var(--tk-stagger-max)))` }}>
      <h3 className="card__title">
        <button type="button" className="card__open" data-name={repo.name} {...item} onClick={(e) => onOpen(e.currentTarget)}>
          {repo.name}
        </button>
      </h3>
      <p className="card__desc">{repo.description || t('library.noDescription')}</p>
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
