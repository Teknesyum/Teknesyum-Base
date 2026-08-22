/**
 * Teknesyum imza bloğu. Ayarlar / Hakkında bölümünün en altına koyulur.
 * Metin ve linkler ~/.claude/teknesyum-ui.json ile değiştirilebilir (/uisetup).
 */

const GITHUB = 'https://github.com/Teknesyum';
const SPONSOR = 'https://github.com/sponsors/Teknesyum';
const SPONSOR_ACTIVE = true;
const IMZA = 'by Teknesyum';
const DESTEK = 'Buy me a coffee';

export function Signature() {
  return (
    <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-end gap-3 select-none">
      <a
        href={GITHUB}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm tracking-[0.15em] text-white/70 hover:text-white transition-colors no-underline"
      >
        {IMZA}
      </a>
      {SPONSOR_ACTIVE && (
        <a
          href={SPONSOR}
          target="_blank"
          rel="noopener noreferrer"
          title="Projeyi desteklemek için tıkla"
          className="group flex items-center gap-1.5 text-sm font-bold tracking-[0.15em] no-underline
                     px-3 py-1.5 rounded-lg border bg-transparent
                     transition-[color,border-color] duration-[--tk-t-instant]
                     text-[var(--color-neon-purple)] border-[var(--color-neon-purple)]/50
                     shadow-[0_0_12px_rgba(176,38,255,0.35)] opacity-80 hover:opacity-100
                     hover:border-[var(--color-neon-purple)]"
        >
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="transition-transform duration-[--tk-t-instant] group-hover:scale-110"
          >
            <path d="M4 9h13v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9Z" />
            <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17" />
            <path d="M8 2.5v2M12 2.5v2" />
          </svg>
          {DESTEK}
        </a>
      )}
    </div>
  );
}
