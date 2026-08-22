# ccusage/ccusage — token maliyetini gerçekten ölçen tek araç

Bu tarama beş soruyla açıldı; beşincisi "ölçüm yapmışlar mı" idi. Diğer dokuz depoda
cevap büyük ölçüde hayır. Burada evet.

## 1. Ne yapıyor, hangi problemi çözüyor

Yerel diskteki oturum kayıtlarını (JSONL) okuyup token kullanımını ve maliyeti gün,
hafta, ay, oturum ve 5 saatlik faturalama penceresi kırılımında raporluyor. 16 ajan
CLI'ını destekliyor: Claude Code, Codex, OpenCode, Amp, Droid, Codebuff, Hermes, pi-agent,
Goose, OpenClaw, Kilo, Kimi, Qwen, GitHub Copilot CLI, Gemini CLI, Grok Build CLI.

Bizim doğrudan sorunumuzun aracı: "base açık oturum, base kapalı koşudan daha çok token
harcıyor" iddiası ancak oturum bazlı ölçümle kanıtlanır ya da çürütülür.

API verileri (2026-08-22): son push `2026-08-22T08:56:54Z`, son etiketli sürüm
**v20.0.20** (2026-08-15), 18.105 yıldız, **28 açık issue**, lisans alanı **NOASSERTION**
(kök `LICENSE` dosyası 22 B — muhtemelen yönlendirme; OSI onaylı olduğu
**doğrulanamadı**).

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Kök: `apps/` (ccusage + altı platform ikilisi: darwin-arm64/x64, linux-arm64/x64,
win32-arm64/x64), `packages/`, `rust/`, `docs/`, `nix/`, `scripts/`.
`AGENTS.md` 3.567 B, `CLAUDE.md` **9 B** (tek satır yönlendirme — bizim
"her klasörde AGENTS.md, yanında tek satırlık CLAUDE.md" kuralımızın aynısı),
kök `README.md` **24 B** (yine yönlendirme; gerçek README `apps/ccusage/README.md`).

Sınır net: okuma tarafı yerel dosya, hesaplama tarafı fiyat tablosu, sunum tarafı tablo/
JSON/statusline. Ağ isteğe bağlı (`--offline` ile önbellekli fiyatlar).

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Ölçüm modelin içinden değil, dışından yapılıyor.** Araç ajana hiçbir şey enjekte
etmiyor, hiçbir skill yüklemiyor; yalnız CLI'ın zaten diske yazdığı oturum kayıtlarını
okuyor. Yani ölçüm aracının kendisi ölçtüğü şeyi bozmuyor.

Bizim işimize yarayan üç kesme:
- `ccusage session` — oturum bazlı; iki koşuyu (base açık / kapalı) doğrudan karşılaştırır
- `ccusage claude daily --instances --project <ad> --json` — proje bazlı, makine okunur
- `ccusage blocks` — 5 saatlik faturalama penceresi; kota tüketimini gösterir

Ek olarak **cache token'ları ayrı** sayılıyor (cache creation / cache read). Bu, bizim
sorunumuzda kritik: base'in enjekte ettiği sabit metin önbelleğe giriyorsa maliyeti
farklı, girmiyorsa farklı. Toplam token'a bakıp "pahalı" demek yanıltıcı olabilir.

`ccusage statusline` (Beta) Claude Code durum satırına özet basıyor — bilgi kullanıcıya
gidiyor, bağlama değil.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

`npx ccusage@latest` — kurulum yok. Alternatifler: `bunx`, `pnpm dlx`, `nix run`.
Varsayılan komut tüm kaynakları günlük kırılımda basıyor.

Dar terminalde (<100 karakter) otomatik kompakt tabloya düşüyor; `--compact` ile zorlanır.
`--json` ile yapılandırılmış çıktı, `--no-cost` ile maliyet sütunları gizlenir.
Yapılandırma `ccusage.json` ile; `ccusage.example.json` 733 B.

Katkı tarafı ağır: Nix flake + direnv + `just` + Rust zinciri. Kullanım hafif, geliştirme
değil.

## 5. Alınmaya değer en fazla 3 fikir

**1. Bench'i oturum bazlı ölç, cache token'ını ayrı raporla.**
Ne: `ccusage session --json` ve cache creation / cache read ayrımı. Bugün
`docs/BENCH-SONUC.md` (9,3 KB) elde tutulan bir tablo; ccusage aynı veriyi CLI'dan
üretiyor.
Neden değerli: "tasarruf profili tasarrufsuz koşunun üstünde kaldı" bulgusu, cache
kırılımı olmadan yorumlanamaz. Sabit enjeksiyon önbelleğe giriyorsa ikinci turdan
itibaren ucuzlar; girmiyorsa her turda tam fiyat.
Maliyet: sıfır kurulum (`npx`), bench script'ine tek satır ekleme. Bağımlılık kurmak
gerekmiyorsa risk de yok.

**2. Ölçüm aracını ajanın bağlamının dışında tut.**
Ne: ccusage hiçbir skill, hook ya da enjeksiyon getirmiyor; ölçüm tamamen dışarıda.
Neden değerli: bizde ölçüm/rapor işleri `/report` gibi komutlarla bağlam içinde yapılıyor
(`commands/report.md` 3.475 B). Ölçümün kendisi maliyet üretiyor.
Maliyet: raporun bir kısmını script'e taşımak; `/report` gövdesi küçülür.

**3. Kök dosyaları yönlendirmeye indirge — `CLAUDE.md` 9 B, `README.md` 24 B.**
Ne: ccusage kökte içerik tutmuyor, işaret tutuyor. Gerçek içerik alt pakette.
Neden değerli: bizim kök `README.md` **55,5 KB** ve `CHANGELOG.md` 45,7 KB. README
bağlama otomatik girmiyor, ama ajan projeyi anlamak için sık açıyor; 55 KB'lık bir
dosyanın okunması tek başına ~14.000 token.
Maliyet: README'yi bölmek — dışa dönük yüz olduğu için dikkatli iş; kısa kök + `docs/`
altında ayrıntı.

## 6. Şüpheli/riskli yanlar

- **Lisans belirsiz.** GitHub API `NOASSERTION` diyor, kök `LICENSE` 22 B. OSI onaylı
  olup olmadığı **doğrulanamadı** — kullanmadan önce dosyanın işaret ettiği yere bakılmalı.
  Araç olarak `npx` ile çalıştırmak farklı, kod almak farklı.
- **Bakım canlı:** push 2026-08-22, sürüm v20.0.20 (2026-08-15), 28 açık issue.
- **README'de sponsor iddiası var:** "Lineman.io — 40% lower token usage". Bu bir reklam
  bloğu, ccusage'ın ölçümü değil; **doğrulanamadı**, kaynak: apps/ccusage/README.md
  sponsor bölümü.
- **Fiyat tablosu dış veriye bağlı.** Maliyet rakamları model fiyatlarına dayanıyor;
  `--offline` önbellekli fiyat kullanıyor, güncel olmayabilir. Token sayıları güvenilir,
  dolar rakamları tahmindir.
- **Gizli maliyet:** kullanım için yok (npx). Geliştirme için Nix + Rust + pnpm — depoya
  katkı vermek isteyen ağır bir kurulum devralır.
- **Statusline Beta** olarak işaretli; kararlı sayılmamalı.

## Kaynaklar

- `gh api repos/ryoppippi/ccusage` → `ccusage/ccusage`; push, yıldız, issue, lisans (2026-08-22)
- `gh api repos/ccusage/ccusage/releases/latest` — v20.0.20, 2026-08-15
- `gh api repos/ccusage/ccusage/git/trees/HEAD` — kök dosya boyutları (CLAUDE.md 9 B, README 24 B)
- `raw.githubusercontent.com/ccusage/ccusage/main/apps/ccusage/README.md` — komutlar, özellikler,
  cache token ayrımı, sponsor iddiası
