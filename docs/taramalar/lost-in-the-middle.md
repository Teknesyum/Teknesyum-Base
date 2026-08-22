# nelson-liu/lost-in-the-middle

Bu bir kütüphane değil, bir **ölçüm deposu**. Alınacak şey kod değil, rakam ve deney
protokolü. Bu tarama içinde "bağlamı büyütmenin bedeli var" iddiasının **tek sayısal
kanıtı** burada.

## 1. Ne yapıyor, hangi problemi çözüyor

"Lost in the Middle: How Language Models Use Long Contexts" makalesinin (arXiv 2307.03172,
TACL) veri ve deney kodu. Sorduğu soru: **modelin bağlamı uzun olabilir, ama uzun bağlamı
gerçekten kullanabiliyor mu?**

Cevap, makalenin özetinden birebir: *"performance is often highest when relevant
information occurs at the beginning or end of the input context, and significantly
degrades when models must access relevant information in the middle of long contexts,
even for explicitly long-context models."*

Bizim problemimizle bağı doğrudan: sabit 120 KB'lık yükün **prompt'un neresine** konduğu
kaliteyi etkiliyor.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

İki deney, ayrı ayrı paketlenmiş:

- **Çok belgeli soru-cevap** — `qa_data/` altında oracle (1 belge), 10, 20 ve 30 belgeli
  ayarlar. Her satırda soru, cevaplar ve `ctxs` listesi; doğru cevabı içeren belgenin
  konumu değiştiriliyor.
- **Anahtar-değer erişimi** — sentetik görev: JSON benzeri bir sözlükten bir anahtarın
  değerini okumak. Dil bilgisinden arındırılmış saf erişim testi.

Sınırlar:

- **Veri ve kod ayrı** — `qa_data/` sıkıştırılmış veri, `src/` kod, `EXPERIMENTS.md`
  koşum yönergesi. Veri üretici betikler de var, yani yeni ayarlar üretilebiliyor.
- **Prompt şablonları ayrı test ediliyor** — README'de "Testing Prompting Templates"
  başlığı var. Sonucun şablona değil konuma bağlı olduğunu göstermek için.
- `conda` ortamı ve `pre-commit` ile sabitlenmiş.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Kontrollü konum değiştirme.** Bağlamın **içeriği ve uzunluğu sabit tutuluyor**, yalnızca
ilgili belgenin konumu değişiyor. Tek değişkenli deney. Sonuçtaki fark başka hiçbir şeye
atfedilemiyor.

Ölçülen rakamlar (makale, 20 belgelik ayar, Tablo 6 — ilk konum → orta konum → son konum):

| Model | 1. konum | Orta (9-14) | Son konum |
|---|---:|---:|---:|
| GPT-3.5-Turbo | %75,8 | %53,8-57,2 | %63,2 |
| Claude-1.3 | %59,9 | %55,9-56,8 | %60,1 |
| LongChat-13B (16K) | %68,6 | %55,3-57,4 | %55,0 |
| MPT-30B-Instruct | %53,7 | %51,8-52,2 | %56,3 |

30 belgelik ayarda (Tablo 7) GPT-3.5-Turbo (16K): %73,4 → %50,5-55,1 → %63,7.

**En sert bulgu:** kapalı kitap (hiç belge verilmeyen) temel çizgi modellere göre
%31,5-56,1 arasında; GPT-3.5-Turbo'da %56,1. Aynı model, 20 belge verildiğinde ve doğru
belge ortadaysa **%53,8** — yani **doğru cevabı içeren belgeyi vermek, hiç belge
vermemekten kötü.** 30 belgelik ayarda GPT-3.5-Turbo (16K) ortada %50,5'e düşüyor.

Bu, "bağlama daha çok şey koy" refleksinin sayısal reddi.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`conda create -n lost-in-the-middle python=3.9`, `pip install -e .`, isteğe bağlı
`pre-commit install`. Koşum yönergeleri `EXPERIMENTS.md` içinde, README'den ayrı.

Veri hazır geliyor — deneyi yeniden koşmak için model erişimi dışında bir şey gerekmiyor.
Yeni veri üretmek de mümkün.

Hata hâli: 2023-2024 dönemine ait model adlarıyla yazılmış (GPT-3.5-Turbo, Claude-1.3);
bu modellerin çoğu artık erişilemez. Depo bugün olduğu gibi koşmaz.

## 5. Alınmaya değer en fazla 3 fikir

**1 — Sabit yükü prompt'un başına, değişkeni sonuna koymak.**
Ne: ilgili bilgi başta ya da sonda olduğunda doğruluk yüksek, ortada düşük. Bizim
120 KB'lık sabit yükümüz (53+12+32+23 KB) prompt'un **başında** durmalı, her istekte
enjekte edilen 800-2500 karakterlik yönerge **sonda**.
Neden değerli: GPT-3.5-Turbo'da ilk konum %75,8, orta %53,8 — **22 puanlık fark**.
Aynı zamanda bu düzen prompt caching'in gerektirdiği sırayla (`tools` → `system` →
`messages`) birebir örtüşüyor. Tek düzenleme iki kazanç veriyor: kalite ve cache.
Maliyet: sıfır kod, sıra kararı. Ama Claude Code'un skill'i prompt'un neresine
yerleştirdiğini **doğrulamadık** — ön koşul bu.

**2 — Sabit yükün ortasına kritik kural koymamak.**
Ne: relay/SKILL.md 881 satır. Ortadaki satırlar (yaklaşık 300-600 arası) makalenin
"orta" bölgesine denk geliyor.
Neden değerli: kritik davranış kuralları (durma ölçütü, hata bildirimi, sözleşme
zorunlulukları) dosyanın başına ya da sonuna alınmalı. Ölçülen kayıp 20 belgelik ayarda
en az 3, en fazla 22 puan.
Maliyet: dosya içi yeniden sıralama. Düşük. **Uyarı:** makalenin ölçümü belge listeleri
üzerinde, tek bir markdown dosyasının satırları üzerinde değil — aktarım
`doğrulanmamış varsayım`.

**3 — Konum değiştirme deneyinin kendisini bench'e almak.**
Ne: içeriği sabit tutup yalnızca konumu değiştiren tek değişkenli deney tasarımı.
Neden değerli: bizim bench'imiz (`docs/BENCH-SONUC.md`) base'li/base'siz karşılaştırdı ve
doğruluk farkı bulamadı — çünkü aynı anda çok şey değişiyordu. Tek değişkenli bir koşu
(aynı görev, aynı skill, yalnızca yükleme sırası farklı) 44.000 token'ın nereden geldiğini
ayrıştırabilir.
Maliyet: bench altyapısı zaten var; yeni bir koşu ve karşılaştırma. Orta.

## 6. Şüpheli/riskli yanlar

**Lisans.** MIT. Marka koruması yok, gerek de yok — akademik depo.

**Bakım.** Son push **2024-01-04** — iki buçuk yıldan fazla. **Etiketli sürüm hiç yok**
(`releases/latest` → 404). 391 yıldız, **1 açık issue**. Arşivlenmemiş ama kapanmış bir
iş: makale yayımlandı, depo dondu. Bu, terk edilme değil tamamlanma — ama bağımlılık
olarak alınamaz.

**Rakamların geçerlilik sınırı.** Ölçümler **2023 modelleriyle** yapıldı: GPT-3.5-Turbo,
GPT-3.5-Turbo (16K), Claude-1.3, Claude-1.3 (100K), LongChat-13B, MPT-30B-Instruct.
Bugünkü modellerin (Opus 5, Sonnet 5) aynı eğriyi gösterip göstermediği **bu depodan
doğrulanamaz**. Sonraki nesillerde eğrinin yumuşadığına dair yaygın kanaat var ama
bu tarama kapsamında birincil kaynakla doğrulanmadı. `doğrulanamadı`

**Ölçüm görevi bizimkine benzemiyor.** Deney, 20-30 belgelik bir listeden bir olguyu
bulmak üzerine. Bizim yükümüz **yönerge** — modelin bulacağı bir olgu değil, izleyeceği
bir kural. "Uzun yönerge listesinin ortasındaki kural unutulur mu" sorusu bu depoda
ölçülmedi. Sezgisel olarak benziyor, ama **ölçülen şey bu değil.**

**Ters yönde kullanım riski.** Bu bulgu "bağlamı kısalt" için değil "bağlamı sırala" için
kanıt. Kısaltmanın kaliteyi artırdığına dair bu depoda kanıt yok — makale kısaltmayı
değil konumu inceliyor. LLMLingua ekibinin "LongLLMLingua bu sorunu çözüyor" iddiası
(bkz. `llmlingua.md`) ayrı ve doğrulanmamış bir iddia.

## Kaynaklar

- `gh api repos/nelson-liu/lost-in-the-middle` — 2026-08-22: pushed_at 2024-01-04,
  391 yıldız, 1 açık issue, MIT, arşivlenmemiş, oluşturma 2023-07-06.
- `gh api repos/nelson-liu/lost-in-the-middle/releases/latest` — 404, etiketli sürüm yok.
- Depo README (Contents API ile okundu).
- Makale özeti ve sonuç tabloları: https://arxiv.org/abs/2307.03172 ve
  https://arxiv.org/html/2307.03172v3 (Tablo 1, 6, 7 — 2026-08-22 okundu).
- Yerel: `docs/BENCH-SONUC.md`; `wc -l teknesyum/skills/relay/SKILL.md` → 881 satır.
