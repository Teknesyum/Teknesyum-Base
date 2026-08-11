/**
 * Teknesyum imza bloğu. Ayarlar / Hakkında bölümünün en altına koyulur.
 * İçeriğini değiştirme; sadece SPONSOR_ACTIVE bayrağını güncelle.
 */

const GITHUB = 'https://github.com/Teknesyum';
const SPONSOR = 'https://github.com/sponsors/Teknesyum';
const SPONSOR_ACTIVE = false;

export function Signature() {
  const href = SPONSOR_ACTIVE ? SPONSOR : GITHUB;
  const label = SPONSOR_ACTIVE ? 'Buy me a coffee' : 'GitHub';

  return (
    <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-end gap-3 select-none">
      <span className="text-[10px] tracking-[0.15em] uppercase text-gray-600">
        by Teknesyum
      </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={SPONSOR_ACTIVE ? 'Projeyi desteklemek için tıkla' : 'GitHub profili'}
        className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] uppercase
                   px-2.5 py-1 rounded-md border transition-all duration-300
                   text-[var(--color-neon-purple)] border-[var(--color-neon-purple)]/30
                   bg-[var(--color-neon-purple)]/10
                   hover:bg-[var(--color-neon-purple)]/20
                   hover:border-[var(--color-neon-purple)]/60
                   hover:shadow-[0_0_10px_rgba(176,38,255,0.35)]"
      >
        <span aria-hidden>☕</span>
        {label}
      </a>
    </div>
  );
}
