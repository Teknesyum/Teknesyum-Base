import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Repo } from '../api/types';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { useBelow, useFlip, useRoving } from '../ui/hooks';
import { IconGrid, IconList, IconSearch } from '../ui/icons';
import { EmptyState, ErrorState, SkeletonCards } from '../ui/States';
import { defaultFilter, type LibFilter, type Opener } from './actions';
import { RepoCard } from './RepoCard';
import { Sidebar } from './Sidebar';
import './library.css';

type Props = {
  filter: LibFilter;
  setFilter: (f: LibFilter) => void;
  onOpen: (repo: Repo, o: Opener) => void;
  onPrimary: (repo: Repo, o: Opener) => void;
  onSettings: () => void;
};

const STATES = ['not-installed', 'installed', 'update-available', 'cloned'];

export function Library({ filter, setFilter, onOpen, onPrimary, onSettings }: Props) {
  const { t, lang } = useI18n();
  const store = useStore();
  const ids = { q: useId(), lang: useId(), status: useId(), archive: useId(), sort: useId(), side: useId() };
  const gridRef = useRef<HTMLDivElement>(null);
  const libRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dar = useBelow(libRef, 'width-probe--dar');
  const [drawer, setDrawer] = useState(false);
  const open = dar && drawer;
  useEffect(() => {
    if (!dar) setDrawer(false);
  }, [dar]);
  useEffect(() => {
    if (open) document.getElementById(ids.side)?.querySelector<HTMLElement>('[tabindex="0"], button, select')?.focus();
  }, [open, ids.side]);
  const closeDrawer = () => {
    if (!open) return;
    setDrawer(false);
    toggleRef.current?.focus();
  };
  const set = (patch: Partial<LibFilter>) => setFilter({ ...filter, ...patch });
  const showArchived = !!store.settings?.showArchived;
  const showForks = !!store.settings?.showForks;

  const base = useMemo(
    () => (store.list?.repos ?? []).filter((r) => (showForks || !r.fork) && (showArchived || !r.archived)),
    [store.list, showArchived, showForks],
  );

  const languages = useMemo(() => [...new Set(base.map((r) => r.language).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, lang)), [base, lang]);

  const visible = useMemo(() => {
    const q = filter.q.trim().toLocaleLowerCase(lang);
    const out = base.filter((r) => {
      if (filter.category && r.category !== filter.category && !r.category.startsWith(filter.category + '/')) return false;
      if (filter.tag && !r.localTags.includes(filter.tag)) return false;
      if (filter.lang && r.language !== filter.lang) return false;
      if (filter.status && r.installState !== filter.status) return false;
      if (showArchived && filter.archive === 'hide' && r.archived) return false;
      if (showArchived && filter.archive === 'only' && !r.archived) return false;
      if (!q) return true;
      return [r.name, r.description, ...r.topics, ...r.localTags].some((s) => s.toLocaleLowerCase(lang).includes(q));
    });
    const by: Record<LibFilter['sort'], (a: Repo, b: Repo) => number> = {
      stars: (a, b) => b.stars - a.stars,
      date: (a, b) => b.pushedAt.localeCompare(a.pushedAt),
      name: (a, b) => a.name.localeCompare(b.name, lang),
    };
    return out.sort(by[filter.sort]);
  }, [base, filter, lang, showArchived]);

  const roving = useRoving<HTMLButtonElement>(visible.length, {
    orientation: filter.view === 'grid' ? 'grid' : 'vertical',
    columns: () => (gridRef.current ? getComputedStyle(gridRef.current).gridTemplateColumns.split(' ').length : 1),
    typeahead: (el) => el.dataset.name ?? '',
  });
  const viewRoving = useRoving<HTMLButtonElement>(2, { orientation: 'horizontal' });

  useFlip(gridRef, visible.map((r) => r.fullName).join('|'));

  let content;
  if (!store.list && store.loadError) {
    content = <ErrorState error={store.loadError} action={{ label: t('common.retry'), run: store.reload }} />;
  } else if (!store.list) {
    content = <SkeletonCards count={9} view={filter.view} />;
  } else if (!base.length) {
    content = <EmptyState title={t('library.emptyTitle', { account: store.list.account })} body={t('library.emptyBody')} action={{ label: t('library.openSettings'), run: onSettings }} />;
  } else if (!visible.length) {
    content = (
      <EmptyState
        title={t('library.noMatchTitle')}
        body={t('library.noMatchBody')}
        action={{ label: t('library.clearFilters'), run: () => setFilter({ ...defaultFilter, view: filter.view, sort: filter.sort, archive: filter.archive }) }}
      />
    );
  } else {
    content = (
      <div ref={gridRef} className={filter.view === 'grid' ? 'cards' : 'rows'} role="list" aria-label={t('library.results', { n: visible.length })} onKeyDown={roving.onKeyDown}>
        {visible.map((r, i) => (
          <div role="listitem" key={r.fullName} className="cards__cell">
            <RepoCard
              repo={r}
              task={store.tasks[r.fullName]}
              view={filter.view}
              index={i}
              item={roving.itemProps(i)}
              onOpen={(o) => onOpen(r, o)}
              onPrimary={(o) => onPrimary(r, o)}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={libRef}
      className="library"
      data-dar={dar || undefined}
      data-drawer={open || undefined}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          closeDrawer();
        }
      }}
    >
      <Sidebar
        id={ids.side}
        repos={base}
        category={filter.category}
        tag={filter.tag}
        onCategory={(c) => {
          set({ category: c, tag: '' });
          closeDrawer();
        }}
        onTag={(x) => {
          set({ tag: x });
          closeDrawer();
        }}
      />
      <section className="library__main" aria-label={t('tabs.library')}>
        <div className="toolbar divider-bottom">
          {dar ? (
            <button
              ref={toggleRef}
              type="button"
              className="btn btn--ghost toolbar__toggle"
              aria-expanded={open}
              aria-controls={ids.side}
              title={t(open ? 'library.hideCategories' : 'library.showCategories')}
              onClick={() => setDrawer(!open)}
            >
              <IconList />
              {t('library.categories')}
            </button>
          ) : null}
          <div className="field field--grow">
            <label className="tk-sr-only" htmlFor={ids.q}>
              {t('library.search')}
            </label>
            <span className="search-box">
              <IconSearch />
              <input id={ids.q} className="tk-input" type="search" title={t('library.search')} value={filter.q} onChange={(e) => set({ q: e.target.value })} aria-describedby={ids.q + '-help'} />
            </span>
            <span id={ids.q + '-help'} className="tk-sr-only">
              {t('library.searchHelp')}
            </span>
          </div>
          <div className="field">
            <label className="tk-sr-only" htmlFor={ids.lang}>
              {t('library.language')}
            </label>
            <select id={ids.lang} className="tk-input" value={filter.lang} onChange={(e) => set({ lang: e.target.value })}>
              <option value="">{t('library.anyLanguage')}</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="tk-sr-only" htmlFor={ids.status}>
              {t('library.status')}
            </label>
            <select id={ids.status} className="tk-input" value={filter.status} onChange={(e) => set({ status: e.target.value })}>
              <option value="">{t('library.anyStatus')}</option>
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {t('state.' + s)}
                </option>
              ))}
            </select>
          </div>
          {showArchived ? (
            <div className="field">
              <label className="tk-sr-only" htmlFor={ids.archive}>
                {t('library.archive')}
              </label>
              <select id={ids.archive} className="tk-input" value={filter.archive} onChange={(e) => set({ archive: e.target.value as LibFilter['archive'] })}>
                <option value="hide">{t('library.labeled', { label: t('library.archive'), value: t('library.archiveHide') })}</option>
                <option value="all">{t('library.labeled', { label: t('library.archive'), value: t('library.archiveAll') })}</option>
                <option value="only">{t('library.labeled', { label: t('library.archive'), value: t('library.archiveOnly') })}</option>
              </select>
            </div>
          ) : null}
          <div className="field">
            <label className="tk-sr-only" htmlFor={ids.sort}>
              {t('library.sort')}
            </label>
            <select id={ids.sort} className="tk-input" value={filter.sort} onChange={(e) => set({ sort: e.target.value as LibFilter['sort'] })}>
              <option value="stars">{t('library.labeled', { label: t('library.sort'), value: t('library.sortStars') })}</option>
              <option value="date">{t('library.labeled', { label: t('library.sort'), value: t('library.sortDate') })}</option>
              <option value="name">{t('library.labeled', { label: t('library.sort'), value: t('library.sortName') })}</option>
            </select>
          </div>
          <div className="field">
            <span className="tk-sr-only" id="view-label">
              {t('library.view')}
            </span>
            <div className="segmented" role="radiogroup" aria-labelledby="view-label" onKeyDown={viewRoving.onKeyDown}>
              {(['grid', 'list'] as const).map((v, i) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={filter.view === v}
                  className="segmented__item"
                  title={t(v === 'grid' ? 'library.viewGrid' : 'library.viewList')}
                  {...viewRoving.itemProps(i)}
                  tabIndex={filter.view === v ? 0 : -1}
                  onFocus={() => set({ view: v })}
                  onClick={() => set({ view: v })}
                >
                  {v === 'grid' ? <IconGrid /> : <IconList />}
                  <span className="tk-sr-only">{t(v === 'grid' ? 'library.viewGrid' : 'library.viewList')}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="library__content" key={filter.view}>
          {content}
        </div>
      </section>
    </div>
  );
}
