/**
 * Teknesyum imza bloğu. Yeri pencere başlık çubuğu, küçült düğmesinin solu (SKILL.md §4).
 * Başlık çubuğu olmayan yüzeyde `SignatureFooter` kullanılır.
 *
 * Metinler `locale/tr.json` ve `locale/en.json` içindedir (§3.1). Bileşen bir `t(key)`
 * işlevi bekler; onu nereden aldığın projenin kararıdır (i18next, kendi sözlüğün, ne
 * kullanıyorsan). Şablon i18n kütüphanesi dayatmaz.
 *
 * Linkler `links.json` içinde. Ayarlar /uisetup ile ezilir.
 */

import links from './links.json';

export type Translate = (key: string) => string;

type Props = { t: Translate };

// ÖLÇÜLDÜ (23.08.2026, U1 denetimi): duruk hâlde `opacity-80` bütün öğeye, metne dahil
// uygulanıyordu. `#ff54eb` %80 opaklıkla siyah üstünde **5.10:1**, başlık şeridinin
// gerçek zemini `#08090a` üstünde **4.95:1** — §2'nin 7:1 kuralının altında. Mor metin
// zaten 4.57 olduğu için pembeye geçilmişti; %80 opaklık o kazancı geri veriyordu.
// Kullanıcı zamanının neredeyse tamamında duruk hâli görür, hover'ı değil.
//
// Aynı ölçümde çerçeve de düştü: `pink-text/50` siyah üstünde **2.51:1**, %80 opaklıkla
// **~1.9:1** — 1.4.11'in 3:1 eşiğinin altında. `/50` merdiveni yalnız `neon-blue` için
// ölçülmüştü (4.07); pembe ve mor o merdiveni taşımıyor.
//
// Duruk hâl artık tam opak ve çerçeve tam token. Hover sinyali §5'in kendi buton değeri
// olan `scale(1.02)`; opaklık sinyali kontrastı bozmadan taşınamıyordu.
const BASE =
  'inline-flex items-center justify-center min-h-6 min-w-6 no-underline select-none ' +
  'text-sm font-bold tracking-[0.15em] rounded-md border bg-transparent ' +
  'px-2.5 py-1 ease-[--tk-e-out] duration-[--tk-t-instant] hover:scale-[1.02] ' +
  'transition-[color,border-color,transform]';

const SUPPORT = `${BASE} gap-1.5 text-[var(--tk-pink-text)] border-[var(--tk-pink-text)]`;

const BRAND = `${BASE} text-[var(--tk-blue)] border-[var(--tk-blue)]`;

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
  if (!links.sponsorAktif) return null;
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
