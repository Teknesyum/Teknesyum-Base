import { useEffect, useId, useRef, useState } from 'react';
import type { Settings } from '../api/types';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { useFlip, useRoving } from '../ui/hooks';
import { IconClose } from '../ui/icons';
import { SkeletonLines } from '../ui/States';
import { useToast } from '../ui/Toasts';
import type { Opener } from './actions';
import './page.css';
import './settings.css';
import { RepoKeys } from './RepoKeys';

type Props = { onClearToken: (o: Opener) => void };

function Toggle({ label, help, checked, onChange }: { label: string; help: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="toggle-row">
      <div className="toggle-row__text">
        <span id={id} className="toggle-row__label">
          {label}
        </span>
        <span id={id + '-h'} className="help">
          {help}
        </span>
      </div>
      <button type="button" role="switch" data-tk="toggle" aria-checked={checked} aria-labelledby={id + ' ' + id + '-h'} onClick={() => onChange(!checked)}>
        <span data-tk="toggle-thumb" aria-hidden="true" />
      </button>
    </div>
  );
}

export function SettingsView({ onClearToken }: Props) {
  const { t } = useI18n();
  const store = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState<Settings | null>(store.settings);
  const [extra, setExtra] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const id = useId();
  const langRoving = useRoving<HTMLButtonElement>(2, { orientation: 'horizontal' });

  const chipsRef = useRef<HTMLUListElement>(null);
  useFlip(chipsRef, draft?.extraAccounts.join('|') ?? '');
  useEffect(() => {
    setDraft(store.settings);
  }, [store.settings]);

  if (!draft || !store.settings) {
    return (
      <div className="page">
        <SkeletonLines lines={10} />
      </div>
    );
  }

  const set = (patch: Partial<Settings>) => setDraft({ ...draft, ...patch });
  const dirty = JSON.stringify(draft) !== JSON.stringify(store.settings);
  const accountEmpty = !draft.account.trim();

  const save = async () => {
    setBusy(true);
    const ok = await store.saveSettings({ ...draft, account: draft.account.trim() });
    setBusy(false);
    if (ok) toast({ kind: 'success', title: t('settings.saved') });
  };

  const addExtra = () => {
    const v = extra.trim();
    if (!v || v === draft.account || draft.extraAccounts.includes(v)) return;
    set({ extraAccounts: [...draft.extraAccounts, v] });
    setExtra('');
  };

  const saveToken = async () => {
    const ok = await store.setToken(token.trim());
    if (ok) {
      setToken('');
      toast({ kind: 'success', title: t('settings.tokenSaved') });
    }
  };

  return (
    <div className="page page--narrow">
      <div className="page__head">
        <h1 className="page__title">{t('tabs.settings')}</h1>
      </div>

      <section className="group divider-top" aria-labelledby={id + '-acc'}>
        <h2 id={id + '-acc'} className="group__title">
          {t('settings.accountSection')}
        </h2>
        <div className="field">
          <label className="tk-label" htmlFor={id + '-a'}>
            {t('settings.account')}
          </label>
          <input
            id={id + '-a'}
            className="tk-input"
            value={draft.account}
            aria-invalid={accountEmpty || undefined}
            aria-describedby={id + '-a-h'}
            onChange={(e) => set({ account: e.target.value })}
          />
          <span id={id + '-a-h'} className={accountEmpty ? 'help help--error' : 'help'}>
            {accountEmpty ? t('settings.accountEmpty') : t('settings.accountHelp')}
          </span>
        </div>

        <div className="field">
          <span className="tk-label">{t('settings.extraAccounts')}</span>
          {draft.extraAccounts.length ? (
            <ul ref={chipsRef} className="chips">
              {draft.extraAccounts.map((x) => (
                <li key={x} className="chip chip--removable" data-flip={x}>
                  {x}
                  <button
                    type="button"
                    className="chip__remove"
                    aria-label={t('settings.removeAccount', { name: x })}
                    title={t('settings.removeAccount', { name: x })}
                    onClick={() => set({ extraAccounts: draft.extraAccounts.filter((y) => y !== x) })}
                  >
                    <IconClose />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="help">{t('settings.noExtra')}</p>
          )}
        </div>
        <form
          className="tag-editor__form"
          onSubmit={(e) => {
            e.preventDefault();
            addExtra();
          }}
        >
          <div className="field field--grow">
            <label className="tk-label" htmlFor={id + '-x'}>
              {t('settings.newAccount')}
            </label>
            <div className="input-row">
              <input id={id + '-x'} className="tk-input" value={extra} onChange={(e) => setExtra(e.target.value)} />
              <button type="submit" className="btn btn--ghost" disabled={!extra.trim()} title={!extra.trim() ? t('settings.newAccountEmpty') : undefined}>
                {t('settings.addAccount')}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="group divider-top" aria-labelledby={id + '-tok'}>
        <h2 id={id + '-tok'} className="group__title">
          {t('settings.tokenSection')}
        </h2>
        <p className="help">
          <span className="badge" data-state={store.settings.hasToken ? 'installed' : 'not-installed'}>
            <span className="badge__dot" aria-hidden="true" />
            {t(store.settings.hasToken ? 'settings.tokenStored' : 'settings.tokenMissing')}
          </span>
        </p>
        <form
          className="tag-editor__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (token.trim()) void saveToken();
          }}
        >
          <div className="field field--grow">
            <label className="tk-label" htmlFor={id + '-t'}>
              {t('settings.token')}
            </label>
            <div className="input-row">
              <input id={id + '-t'} className="tk-input" type="password" autoComplete="off" spellCheck={false} value={token} aria-invalid="false" aria-describedby={id + '-t-h'} onChange={(e) => setToken(e.target.value)} />
              <button type="submit" className="btn btn--primary" disabled={!token.trim()} title={!token.trim() ? t('settings.tokenEmpty') : undefined}>
                {t('settings.tokenSave')}
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--danger-outline"
                disabled={!store.settings.hasToken}
                title={!store.settings.hasToken ? t('settings.tokenMissing') : undefined}
                onClick={(e) => onClearToken(e.currentTarget)}
              >
                {t('settings.tokenClear')}
              </button>
            </div>
            <span id={id + '-t-h'} className="help">
              {t('settings.tokenHelp')}
            </span>
          </div>
        </form>
      </section>

      {store.info?.edition === 'pro' ? <RepoKeys /> : null}

      <section className="group divider-top" aria-labelledby={id + '-dir'}>
        <h2 id={id + '-dir'} className="group__title">
          {t('settings.folderSection')}
        </h2>
        <div className="field">
          <label className="tk-label" htmlFor={id + '-i'}>
            {t('settings.installDir')}
          </label>
          <input id={id + '-i'} className="tk-input tk-mono" value={draft.installDir} spellCheck={false} onChange={(e) => set({ installDir: e.target.value })} />
        </div>
        <div className="field">
          <label className="tk-label" htmlFor={id + '-c'}>
            {t('settings.cloneDir')}
          </label>
          <input id={id + '-c'} className="tk-input tk-mono" value={draft.cloneDir} spellCheck={false} onChange={(e) => set({ cloneDir: e.target.value })} />
        </div>
      </section>

      <section className="group divider-top" aria-labelledby={id + '-gen'}>
        <h2 id={id + '-gen'} className="group__title">
          {t('settings.generalSection')}
        </h2>
        <div className="field">
          <span className="tk-label" id={id + '-l'}>
            {t('settings.language')}
          </span>
          <div className="segmented" role="radiogroup" aria-labelledby={id + '-l'} onKeyDown={langRoving.onKeyDown}>
            {(['tr', 'en'] as const).map((l, i) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={draft.language === l}
                className="segmented__item"
                {...langRoving.itemProps(i)}
                tabIndex={draft.language === l ? 0 : -1}
                onFocus={() => set({ language: l })}
                onClick={() => set({ language: l })}
              >
                {t('settings.lang.' + l)}
              </button>
            ))}
          </div>
        </div>
        <Toggle label={t('settings.showArchived')} help={t('settings.showArchivedHelp')} checked={draft.showArchived} onChange={(v) => set({ showArchived: v })} />
        <Toggle label={t('settings.showForks')} help={t('settings.showForksHelp')} checked={draft.showForks} onChange={(v) => set({ showForks: v })} />
        <Toggle label={t('settings.closeToTray')} help={t('settings.closeToTrayHelp')} checked={draft.closeToTray} onChange={(v) => set({ closeToTray: v })} />
        <Toggle label={t('settings.silentUpdate')} help={t('settings.silentUpdateHelp')} checked={draft.silentUpdate} onChange={(v) => set({ silentUpdate: v })} />
        <Toggle label={t('settings.desktopShortcut')} help={t('settings.desktopShortcutHelp')} checked={draft.desktopShortcut} onChange={(v) => set({ desktopShortcut: v })} />
      </section>

      <div className="page__actions">
        <button type="button" className="btn btn--primary" disabled={!dirty || accountEmpty || busy} title={!dirty ? t('settings.noChanges') : accountEmpty ? t('settings.accountEmpty') : undefined} onClick={() => void save()}>
          {t('common.save')}
        </button>
        <button type="button" className="btn btn--ghost" disabled={!dirty} title={!dirty ? t('settings.noChanges') : undefined} onClick={() => setDraft(store.settings)}>
          {t('common.revert')}
        </button>
      </div>

      <section className="group group--about divider-top" aria-labelledby={id + '-ab'}>
        <h2 id={id + '-ab'} className="group__title">
          {t('settings.about')}
        </h2>
        <dl className="stats">
          <div className="stat">
            <dt className="tk-label">{t('settings.version')}</dt>
            <dd className="stat__value">{store.info?.version ?? ''}</dd>
          </div>
          <div className="stat">
            <dt className="tk-label">{t('settings.edition')}</dt>
            <dd className="stat__value">{t('settings.editions.' + (store.info?.edition ?? 'normal'))}</dd>
          </div>
          <div className="stat">
            <dt className="tk-label">{t('settings.git')}</dt>
            <dd className="stat__value">{t(store.info?.gitAvailable ? 'settings.gitFound' : 'settings.gitMissing')}</dd>
          </div>
          <div className="stat">
            <dt className="tk-label">{t('settings.coreLatest')}</dt>
            <dd className="stat__value">{store.list?.coreLatest ?? t('stats.none')}</dd>
          </div>
          <div className="stat">
            <dt className="tk-label">{t('settings.uiLatest')}</dt>
            <dd className="stat__value">{store.list?.uiLatest ?? t('stats.none')}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
