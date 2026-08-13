/**
 * Teknesyum imza bloğu. Ayarlar / Hakkında bölümünün en altına koyulur.
 * Metin ve linkler ~/.claude/teknesyum-ui.json ile değiştirilebilir (/teknesyumui).
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
        className="text-[10px] tracking-[0.15em] uppercase text-gray-600 hover:text-gray-400 transition-colors no-underline"
      >
        {IMZA}
      </a>
      {SPONSOR_ACTIVE && (
        <a
          href={SPONSOR}
          target="_blank"
          rel="noopener noreferrer"
          title="Projeyi desteklemek için tıkla"
          className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase no-underline
                     px-2.5 py-1 rounded-md border transition-all duration-300
                     text-[var(--color-neon-purple)] border-[var(--color-neon-purple)]/30
                     bg-[var(--color-neon-purple)]/10
                     hover:bg-[var(--color-neon-purple)]/20
                     hover:border-[var(--color-neon-purple)]/60
                     hover:shadow-[0_0_10px_rgba(176,38,255,0.35)]"
        >
          <span aria-hidden>☕</span>
          {DESTEK}
        </a>
      )}
    </div>
  );
}
