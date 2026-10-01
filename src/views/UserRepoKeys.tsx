import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { api } from '../api/client';
import type { KeyState, KeyStatus } from '../api/types';
import { isDriveLink, useDrive } from '../drive';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { useFlip } from '../ui/hooks';
import { useToast } from '../ui/Toasts';
import './settings.css';

const BADGE: Record<KeyState, string> = {
  missing: 'not-installed',
  ok: 'installed',
  invalid: 'update-available',
  'no-access': 'update-available',
  unknown: 'not-installed',
};

function reason(e: unknown): string {
  return typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
}

export function UserRepoKeys() {
  const { t } = useI18n();
  const store = useStore();
  const toast = useToast();
  const drive = useDrive();
  const id = useId();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [keys, setKeys] = useState<KeyStatus[]>([]);
  const listRef = useRef<HTMLUListElement>(null);
  useFlip(listRef, keys.map((k) => k.fullName).join('|'));

  const load = useCallback(() => {
    void api
      .userRepoKeys()
      .then(setKeys)
      .catch(() => undefined);
  }, []);

  useEffect(load, [load]);

  const add = async () => {
    setBusy(true);
    setError('');
    try {
      if (isDriveLink(key)) {
        const item = await drive.add(key.trim());
        setKey('');
        toast({ kind: 'success', title: t('userKeys.driveAdded'), body: item.name });
        return;
      }
      const found = await api.addRepoKey(key.trim());
      setKey('');
      toast({ kind: 'success', title: t('userKeys.added'), body: found.join(', ') });
      load();
      void store.refresh();
    } catch (e) {
      setError(reason(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (fullName: string) => {
    try {
      await api.removeRepoKey(fullName);
      toast({ kind: 'neutral', title: t('userKeys.removed', { name: fullName }) });
      load();
      void store.refresh();
    } catch (e) {
      toast({ kind: 'danger', title: reason(e) });
    }
  };

  return (
    <section className="group divider-top" aria-labelledby={id + '-uk'}>
      <h2 id={id + '-uk'} className="group__title">
        {t('userKeys.title')}
      </h2>
      <p className="help">{t('userKeys.intro')}</p>
      <form
        className="tag-editor__form"
        onSubmit={(e) => {
          e.preventDefault();
          if (key.trim() && !busy) void add();
        }}
      >
        <div className="field field--grow">
          <label className="tk-label" htmlFor={id + '-k'}>
            {t('userKeys.key')}
          </label>
          <div className="input-row">
            <input
              id={id + '-k'}
              className="tk-input"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={id + '-k-h'}
              onChange={(e) => {
                setKey(e.target.value);
                setError('');
              }}
            />
            <button type="submit" className="btn btn--primary" disabled={!key.trim() || busy} title={!key.trim() ? t('userKeys.empty') : undefined}>
              {busy ? t('userKeys.checking') : t('userKeys.add')}
            </button>
          </div>
          <span id={id + '-k-h'} className="help" role={error ? 'alert' : undefined}>
            {error || t('userKeys.help')}
          </span>
        </div>
      </form>
      {keys.length ? (
        <ul ref={listRef} className="key-list">
          {keys.map((k) => (
            <li key={k.fullName} className="input-row" data-flip={k.fullName}>
              <span className="key-list__name">{k.fullName}</span>
              <span className="badge" data-state={BADGE[k.state]}>
                <span className="badge__dot" aria-hidden="true" />
                {t('repoKeys.states.' + k.state)}
              </span>
              <button type="button" className="btn btn--ghost btn--danger-outline" onClick={() => void remove(k.fullName)}>
                {t('userKeys.remove')}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
