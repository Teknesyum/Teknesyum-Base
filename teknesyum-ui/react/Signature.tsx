
import links from './links.json';

export type Translate = (key: string) => string;

type Props = { t: Translate };

const BASE =
  'inline-flex items-center justify-center min-h-6 min-w-6 no-underline select-none ' +
  'text-[length:var(--tk-fs-1)] font-semibold tracking-[var(--tk-tr-label)] ' +
  'rounded-[var(--tk-r)] border bg-transparent ' +
  'px-2.5 py-1 ease-[--tk-e-out] duration-[--tk-t-instant] hover:scale-[1.02] ' +
  'transition-[transform]';

const SUPPORT = `${BASE} gap-1.5 text-[var(--tk-renk-2-text)] border-[var(--tk-renk-2-text)]`;

const BRAND = `${BASE} text-[var(--tk-renk-1)] border-[var(--tk-renk-1)]`;

function CoffeeIcon() {
  return (
    <svg
      width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="transition-transform duration-[--tk-t-instant] ease-[--tk-e-out] group-hover:scale-110"
    >
      <path d="M4 9h13v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9Z" />
      <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17" />
      <path d="M8 2.5v2M12 2.5v2" />
    </svg>
  );
}

function Support({ t }: Props) {
  if (!links.sponsorEnabled) return null;
  return (
    <a
      href={links.sponsor}
      target="_blank"
      rel="noopener noreferrer"
      title={t('sig.supportTitle')}
      className={`group tk-no-drag ${SUPPORT}`}
    >
      <CoffeeIcon />
      {t('sig.support')}
    </a>
  );
}

function Brand({ t }: Props) {
  return (
    <a
      href={links.github}
      target="_blank"
      rel="noopener noreferrer"
      title={t('sig.brandTitle')}
      className={`tk-no-drag ${BRAND}`}
    >
      {t('sig.brand')}
    </a>
  );
}

export function Signature({ t }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Support t={t} />
      <Brand t={t} />
    </div>
  );
}

export function SignatureFooter({ t }: Props) {
  return (
    <div className="mt-6 pt-3 border-t border-[var(--tk-border-decorative)] flex items-center justify-end gap-2">
      <Support t={t} />
      <Brand t={t} />
    </div>
  );
}
