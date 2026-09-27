import DOMPurify from 'dompurify';
import { useEffect, useId, useMemo, useRef, useState, type MouseEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { api, openExternal } from '../api/client';
import type { AppError, Release, Repo } from '../api/types';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { tokenValue, useDialogFocus, useFlip, useMotion, usePresence, useRoving } from '../ui/hooks';
import { IconClose, IconExternal, IconFolder } from '../ui/icons';
import { ErrorState, SkeletonLines } from '../ui/States';
import { useToast } from '../ui/Toasts';
import { isRunning, uiState, type Opener } from './actions';
import { AppIcon, PrimaryButton, StateBadge, TaskProgress } from './RepoCard';
import './sheet.css';

function clean(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input', 'button', 'iframe'], FORBID_ATTR: ['style'] });
}

function Html({ html, base }: { html: string; base: string }) {
  const safe = useMemo(() => clean(html), [html]);
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = (e.target as Element).closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') ?? '';
    if (href.startsWith('#')) return;
    e.preventDefault();
    try {
      void openExternal(new URL(href, base + '/blob/HEAD/').toString());
    } catch {
      return;
    }
  };
  return <div className="prose" onClick={onClick} dangerouslySetInnerHTML={{ __html: safe }} />;
}

type Load<T> = { data?: T; error?: AppError };

function useLoad<T>(fn: () => Promise<T>, key: string, nonce: number): Load<T> | null {
  const [state, setState] = useState<{ key: string; value: Load<T> } | null>(null);
  useEffect(() => {
    let alive = true;
    fn().then(
      (data) => alive && setState({ key, value: { data } }),
      (error: AppError) => alive && setState({ key, value: { error } }),
    );
    return () => {
      alive = false;
    };
  }, [key, nonce]);
  return state && state.key === key + '' ? state.value : null;
}

type Props = {
  repo: Repo | null;
  open: boolean;
  returnTo: HTMLElement | null;
  onClose: () => void;
  onPrimary: (repo: Repo, o: Opener) => void;
  onUninstall: (repo: Repo, o: Opener) => void;
};

export function DetailSheet({ repo, open, returnTo, onClose, onPrimary, onUninstall }: Props) {
  const { mounted, phase } = usePresence(open && !!repo, '--tk-t-base');
  const ref = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onKey = useDialogFocus(ref, mounted && open, returnTo, closeRef);
  const sheetAnimation = useMemo(() => [{ transform: `translateX(${tokenValue('--tk-sp-5', '24px')})` }, { transform: 'none' }], []);
  const scrimAnimation = useMemo(() => [{ opacity: 0 }, { opacity: 1 }], []);
  useMotion(ref, phase, sheetAnimation);
  useMotion(scrimRef, phase, scrimAnimation);
  const [shown, setShown] = useState<Repo | null>(repo);
  useEffect(() => {
    if (repo) setShown(repo);
  }, [repo]);
  if (!mounted || !shown) return null;
  return createPortal(
    <div ref={scrimRef} className="sheet-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onKeyDown={(e) => onKey(e, onClose)}>
        <SheetBody repo={shown} closeRef={closeRef} onClose={onClose} onPrimary={onPrimary} onUninstall={onUninstall} />
      </div>
    </div>,
    document.body,
  );
}

type BodyProps = Omit<Props, 'open' | 'returnTo' | 'repo'> & { repo: Repo; closeRef: RefObject<HTMLButtonElement | null> };

function SheetBody({ repo, closeRef, onClose, onPrimary, onUninstall }: BodyProps) {
  const { t, num, rel, size, date, bytes } = useI18n();
  const store = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<'readme' | 'releases'>('readme');
  const [nonce, setNonce] = useState(0);
  const readme = useLoad(() => api.readme(repo.owner, repo.name), 'r:' + repo.fullName, nonce);
  const releases = useLoad<Release[]>(() => api.releases(repo.owner, repo.name), 'l:' + repo.fullName, nonce);
  const task = store.tasks[repo.fullName];
  const running = isRunning(task);
  const installed = repo.installState !== 'not-installed';
  const tabs = useRoving<HTMLButtonElement>(2, { orientation: 'horizontal' });
  const tagId = useId();
  const [draft, setDraft] = useState('');
  const chipsRef = useRef<HTMLUListElement>(null);
  useFlip(chipsRef, repo.localTags.join('|'));

  const addTag = () => {
    const v = draft.trim();
    if (!v || repo.localTags.includes(v)) return;
    void store.setTags(repo.fullName, [...repo.localTags, v]);
    setDraft('');
  };
  const removeTag = (tag: string) => {
    const before = repo.localTags;
    void store.setTags(
      repo.fullName,
      before.filter((x) => x !== tag),
    );
    toast({ kind: 'neutral', title: t('detail.tagRemoved', { tag }), action: { label: t('common.undo'), run: () => void store.setTags(repo.fullName, before) } });
  };

  const stats: [string, string][] = [
    [t('stats.stars'), num(repo.stars)],
    [t('stats.forks'), num(repo.forks)],
    [t('stats.issues'), num(repo.openIssues)],
    [t('stats.license'), repo.license ?? t('stats.noLicense')],
    [t('stats.size'), size(repo.sizeKb)],
    [t('stats.language'), repo.language ?? t('stats.none')],
    [t('stats.pushed'), rel(repo.pushedAt)],
    [t('stats.installedTag'), repo.installedTag ?? t('stats.none')],
    [t('stats.ui'), repo.uiVersion ? t('ui.stat', { version: repo.uiVersion, state: t('ui.short.' + uiState(repo.uiVersion, store.list?.uiLatest)) }) : t('stats.none')],
  ];

  return (
    <>
      <header className="sheet__head divider-bottom">
        <div className="sheet__titles">
          <h2 id="sheet-title" className="sheet__title">
            <AppIcon name={repo.name} />
            {repo.name}
            {repo.latestTag ? <span className="sheet__tag">{repo.latestTag}</span> : null}
          </h2>
          <p className="sheet__desc">{repo.summary || repo.description || t('library.noDescription')}</p>
          <ul className="chips sheet__class" aria-label={t('library.tags')}>
            <li className="chip chip--category">{t('category.' + repo.category)}</li>
            {(repo.tags ?? []).map((x) => (
              <li key={x} className="chip">
                {x}
              </li>
            ))}
          </ul>
        </div>
        <button ref={closeRef} type="button" className="btn btn--icon btn--quiet" aria-label={t('common.close')} title={t('common.close')} onClick={onClose}>
          <IconClose />
        </button>
      </header>
      <div className="sheet__body">
        <div className="sheet__actions">
          <StateBadge repo={repo} />
          {running && task ? (
            <div className="sheet__progress">
              <TaskProgress task={task} />
            </div>
          ) : (
            <>
              <PrimaryButton repo={repo} task={task} onPrimary={(o) => onPrimary(repo, o)} />
              {repo.installState === 'update-available' ? (
                <button type="button" className="btn btn--ghost" onClick={() => store.launch(repo.fullName)}>
                  {t('actions.launch')}
                </button>
              ) : null}
              {installed ? (
                <button type="button" className="btn btn--ghost" onClick={() => store.openFolder(repo.fullName)}>
                  <IconFolder />
                  {t('actions.folder')}
                </button>
              ) : null}
              {installed ? (
                <button type="button" className="btn btn--ghost btn--danger-outline" onClick={(e) => onUninstall(repo, e.currentTarget)}>
                  {t('actions.uninstall')}
                </button>
              ) : null}
            </>
          )}
          <button type="button" className="btn btn--quiet" onClick={() => void openExternal(repo.htmlUrl)}>
            <IconExternal />
            {t('actions.github')}
          </button>
        </div>

        <dl className="stats">
          {stats.map(([k, v]) => (
            <div key={k} className="stat">
              <dt className="tk-label">{k}</dt>
              <dd className="stat__value">{v}</dd>
            </div>
          ))}
        </dl>


        <section className="tag-editor" aria-labelledby={tagId + '-h'}>
          <h3 id={tagId + '-h'} className="tk-label">
            {t('detail.localTags')}
          </h3>
          {repo.localTags.length ? (
            <ul ref={chipsRef} className="chips">
              {repo.localTags.map((x) => (
                <li key={x} className="chip chip--removable" data-flip={x}>
                  {x}
                  <button type="button" className="chip__remove" aria-label={t('detail.removeTag', { tag: x })} title={t('detail.removeTag', { tag: x })} onClick={() => removeTag(x)}>
                    <IconClose />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="help">{t('detail.noTags')}</p>
          )}
          <form
            className="tag-editor__form"
            onSubmit={(e) => {
              e.preventDefault();
              addTag();
            }}
          >
            <div className="field field--grow">
              <label className="tk-label" htmlFor={tagId}>
                {t('detail.newTag')}
              </label>
              <div className="input-row">
                <input id={tagId} className="tk-input" value={draft} onChange={(e) => setDraft(e.target.value)} aria-describedby={tagId + '-help'} />
                <button type="submit" className="btn btn--ghost" disabled={!draft.trim()} title={!draft.trim() ? t('detail.newTagEmpty') : undefined}>
                  {t('detail.addTag')}
                </button>
              </div>
              <span id={tagId + '-help'} className="help">
                {t('detail.newTagHelp')}
              </span>
            </div>
          </form>
        </section>

        <div className="tabs divider-bottom" role="tablist" aria-label={t('detail.sections')} onKeyDown={tabs.onKeyDown}>
          {(['readme', 'releases'] as const).map((id, i) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={'tab-' + id}
              aria-controls={'panel-' + id}
              aria-selected={tab === id}
              className="tab"
              {...tabs.itemProps(i)}
              tabIndex={tab === id ? 0 : -1}
              onFocus={() => setTab(id)}
              onClick={() => setTab(id)}
            >
              {t('detail.' + id)}
            </button>
          ))}
        </div>

        <div className="tab-panel" role="tabpanel" id={'panel-' + tab} aria-labelledby={'tab-' + tab} key={tab}>
          {tab === 'readme' ? (
            !readme ? (
              <SkeletonLines lines={9} />
            ) : readme.error ? (
              readme.error.code === 'not-found' ? (
                <p className="help">{t('detail.noReadme')}</p>
              ) : (
                <ErrorState error={readme.error} action={{ label: t('common.retry'), run: () => setNonce((n) => n + 1) }} />
              )
            ) : (
              <Html html={readme.data ?? ''} base={repo.htmlUrl} />
            )
          ) : !releases ? (
            <SkeletonLines lines={6} />
          ) : releases.error ? (
            <ErrorState error={releases.error} action={{ label: t('common.retry'), run: () => setNonce((n) => n + 1) }} />
          ) : !releases.data?.length ? (
            <p className="help">{t('detail.noReleases')}</p>
          ) : (
            <ol className="releases">
              {releases.data.map((r) => (
                <li key={r.tag} className="release">
                  <div className="release__head">
                    <h3 className="release__title">{r.name || r.tag}</h3>
                    <span className="chip">{r.tag}</span>
                    {r.prerelease ? <span className="chip chip--warn">{t('detail.prerelease')}</span> : null}
                    <span className="meta">{date(r.publishedAt)}</span>
                  </div>
                  <Html html={r.notesHtml} base={repo.htmlUrl} />
                  {r.assets.length ? (
                    <ul className="assets" aria-label={t('detail.assets')}>
                      {r.assets.map((a) => (
                        <li key={a.name} className="asset">
                          <span className="asset__name">{a.name}</span>
                          <span className="meta">{bytes(a.size)}</span>
                          <span className="meta">{t('detail.downloads', { n: num(a.downloads) })}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </>
  );
}
