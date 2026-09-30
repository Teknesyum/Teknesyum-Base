import { useEffect, useId, useMemo, useState } from 'react';
import { api, openExternal } from '../api/client';
import type { KeyState } from '../api/types';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { useToast } from '../ui/Toasts';

const BADGE: Record<KeyState, string> = {
  missing: 'not-installed',
  ok: 'installed',
  invalid: 'update-available',
  'no-access': 'update-available',
  unknown: 'not-installed',
};

function tokenUrl(fullName: string, write: boolean): string {
  const q = new URLSearchParams({
    name: `Teknesyum Base Pro - ${fullName}`,
    description: `${fullName} için depo anahtarı`,
    expires_in: 'none',
    contents: write ? 'write' : 'read',
    metadata: 'read',
  });
  return `https://github.com/settings/personal-access-tokens/new?${q.toString()}`;
}

export function RepoKeys() {
  const { t } = useI18n();
  const store = useStore();
  const toast = useToast();
  const id = useId();
  const repos = useMemo(() => (store.list?.repos ?? []).filter((r) => r.private && r.name !== 'Teknesyum-Private').map((r) => r.fullName).sort(), [store.list]);
  const [states, setStates] = useState<Record<string, KeyState>>({});
  const [picked, setPicked] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const current = picked || repos[0] || '';

  useEffect(() => {
    if (!repos.length) return;
    let dead = false;
    void api
      .repoKeys(repos)
      .then((list) => {
        if (!dead) setStates(Object.fromEntries(list.map((k) => [k.fullName, k.state])));
      })
      .catch(() => undefined);
    return () => {
      dead = true;
    };
  }, [repos]);

  if (!repos.length) return null;
  const state = states[current] ?? 'unknown';

  const save = async () => {
    setBusy(true);
    try {
      const r = await api.setRepoKey(current, token.trim());
      setStates((s) => ({ ...s, [r.fullName]: r.state }));
      setToken('');
      toast({ kind: r.state === 'ok' ? 'success' : 'danger', title: t('repoKeys.states.' + r.state) });
    } catch (e) {
      toast({ kind: 'danger', title: t('repoKeys.saveFailed'), body: (e as { message?: string }).message });
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await api.clearRepoKey(current);
      setStates((s) => ({ ...s, [current]: 'missing' }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="group divider-top" aria-labelledby={id + '-rk'}>
      <h2 id={id + '-rk'} className="group__title">
        {t('repoKeys.title')}
      </h2>
      <p className="help">{t('repoKeys.intro')}</p>
      <div className="field">
        <label className="tk-label" htmlFor={id + '-rs'}>
          {t('repoKeys.repo')}
        </label>
        <div className="input-row">
          <select id={id + '-rs'} className="tk-input" value={current} onChange={(e) => setPicked(e.target.value)}>
            {repos.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <span className="badge" data-state={BADGE[state]}>
            <span className="badge__dot" aria-hidden="true" />
            {t('repoKeys.states.' + state)}
          </span>
        </div>
      </div>
      <form
        className="tag-editor__form"
        onSubmit={(e) => {
          e.preventDefault();
          if (token.trim() && !busy) void save();
        }}
      >
        <div className="field field--grow">
          <label className="tk-label" htmlFor={id + '-rt'}>
            {t('repoKeys.token')}
          </label>
          <div className="input-row">
            <input id={id + '-rt'} className="tk-input" type="password" autoComplete="off" spellCheck={false} value={token} aria-invalid="false" aria-describedby={id + '-rh'} onChange={(e) => setToken(e.target.value)} />
            <button type="submit" className="btn btn--primary" disabled={!token.trim() || busy} title={!token.trim() ? t('settings.tokenEmpty') : undefined}>
              {t('settings.tokenSave')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void openExternal(tokenUrl(current, false))}>
              {t('repoKeys.create')}
            </button>
            <button type="button" className="btn btn--ghost btn--danger-outline" disabled={state === 'missing' || busy} title={state === 'missing' ? t('repoKeys.states.missing') : undefined} onClick={() => void clear()}>
              {t('settings.tokenClear')}
            </button>
          </div>
          <span id={id + '-rh'} className="help">
            {t('repoKeys.help')}
          </span>
        </div>
      </form>
    </section>
  );
}
