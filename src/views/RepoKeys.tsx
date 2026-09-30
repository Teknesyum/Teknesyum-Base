import { useEffect, useId, useMemo, useState } from 'react';
import { api, openExternal } from '../api/client';
import type { KeyState } from '../api/types';
import { useI18n } from '../i18n';
import { useStore } from '../store';

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
  const id = useId();
  const repos = useMemo(() => (store.list?.repos ?? []).filter((r) => r.private && r.name !== 'Teknesyum-Private').map((r) => r.fullName).sort(), [store.list]);
  const [states, setStates] = useState<Record<string, KeyState>>({});
  const [picked, setPicked] = useState('');
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
          <button type="button" className="btn btn--ghost" onClick={() => void openExternal(tokenUrl(current, false))}>
            {t('repoKeys.create')}
          </button>
        </div>
        <span className="help">{t('repoKeys.help')}</span>
      </div>
    </section>
  );
}
