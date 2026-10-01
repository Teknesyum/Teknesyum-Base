import { useRef } from 'react';
import type { DriveItem, DriveProgress } from '../api/types';
import { useDrive } from '../drive';
import { useI18n } from '../i18n';
import { ProgressBar } from '../ui/Progress';
import { stagger, useBelow, useFlip } from '../ui/hooks';
import { useToast } from '../ui/Toasts';
import './library.css';
import './page.css';
import './drive.css';

function Row({ item, p, i }: { item: DriveItem; p: DriveProgress | undefined; i: number }) {
  const { t, bytes } = useI18n();
  const drive = useDrive();
  const toast = useToast();
  const running = p?.status === 'running';
  const total = p?.total ?? item.size;
  const percent = p ? (p.status === 'done' ? 100 : total ? (p.received / total) * 100 : 0) : 0;
  const step = !p
    ? ''
    : p.status === 'done'
      ? t('drive.done')
      : p.status === 'error'
        ? (p.message ?? t('drive.failed'))
        : total
          ? t('drive.progress', { done: bytes(p.received), total: bytes(total) })
          : t('drive.progressUnknown', { done: bytes(p.received) });
  const reveal = () => {
    if (!p?.path) return;
    void drive.reveal(p.path).catch((e: { message?: string }) => toast({ kind: 'danger', title: t('drive.revealFailed'), body: e.message }));
  };

  return (
    <li className="row drive-row" data-flip={item.id} style={stagger(i)}>
      <span className="drive-row__name" title={item.name}>
        {item.name}
      </span>
      <span className="meta drive-row__size">{item.size ? bytes(item.size) : t('drive.sizeUnknown')}</span>
      <div className="drive-row__actions">
        {p?.path && p.status !== 'error' ? (
          <button type="button" className="btn btn--ghost" onClick={reveal}>
            {t('drive.reveal')}
          </button>
        ) : null}
        <button type="button" className="btn btn--primary" disabled={running} title={running ? t('drive.busy') : undefined} aria-label={t('drive.downloadOf', { name: item.name })} onClick={() => void drive.download(item.id)}>
          {running ? t('drive.downloading') : p?.status === 'done' ? t('drive.again') : t('drive.download')}
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--danger-outline"
          disabled={running}
          title={running ? t('drive.busy') : undefined}
          aria-label={t('drive.removeOf', { name: item.name })}
          onClick={() => void drive.remove(item.id).then(() => toast({ kind: 'neutral', title: t('drive.removed', { name: item.name }) }))}
        >
          {t('drive.remove')}
        </button>
      </div>
      {p ? (
        <div className="drive-row__bar">
          <ProgressBar percent={percent} step={step} status={p.status === 'running' ? 'running' : p.status === 'done' ? 'done' : 'error'} label={t('drive.progressLabel', { name: item.name })} />
        </div>
      ) : null}
    </li>
  );
}

export function DriveView() {
  const { t } = useI18n();
  const drive = useDrive();
  const listRef = useRef<HTMLUListElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const dar = useBelow(pageRef, 'width-probe--kurulu');
  useFlip(listRef, drive.items.map((x) => x.id).join('|'));

  return (
    <div ref={pageRef} className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">{t('tabs.drive')}</h1>
          <p className="help">{t('drive.summary', { n: drive.items.length })}</p>
        </div>
      </div>
      <ul ref={listRef} className="rows" data-dar={dar || undefined} aria-label={t('tabs.drive')}>
        {drive.items.map((item, i) => (
          <Row key={item.id} item={item} p={drive.progress[item.id]} i={i} />
        ))}
      </ul>
    </div>
  );
}
