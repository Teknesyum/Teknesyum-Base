# upstash/context7 — bağlamı depoda değil, sorgu anında getiren MCP/skill

Karşılaştırma tabanı: bizim skill'lerimiz bilgiyi **dosyada** tutuyor
(53.147 + 27.730 B gövde + 32,2 KB referans). Context7 bilgiyi dışarıda tutup
sorgulanan dilimi getiriyor.

## 1. Ne yapıyor, hangi problemi çözüyor

Kütüphane belgelerini güncel hâliyle, sorulan konuya daraltılmış olarak modele veriyor.
Çözdüğü sorun: modelin eğitim verisindeki eski API bilgisi ve uydurulmuş imzalar.
Bizi ilgilendiren yanı problemin çözümü değil, **çözüm biçimi**: 10 binlerce sayfalık
belge hiçbir zaman bağlama girmiyor, yalnız sorgunun cevabı giriyor.

API verileri (2026-08-22): son push `2026-08-21T08:01:35Z`, son etiketli sürüm
**@upstash/context7-mcp@4.0.3** (2026-08-21), 61.079 yıldız, **42 açık issue**, **MIT**.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Kök: `packages/`, `plugins/`, `skills/`, `rules/`, `docs/`, `i18n/` (15 dil README),
`server.json` (1.809 B), `context7.json` (97 B), `README.md` (9.620 B).

İki kurulum modu var ve bu ayrım tasarımın kalbi:
- **CLI + Skills** — MCP gerekmez; `ctx7` CLI'ı çağıran bir skill kurulur
- **MCP** — sunucu kaydedilir, model araçları doğrudan çağırır

Ajan yüzeyi dosya boyutları (bayt):

| Dosya | Boyut |
|---|---|
| `skills/find-docs/SKILL.md` | 7.429 |
| `skills/context7-cli/SKILL.md` | 2.939 |
| `skills/context7-cli/references/docs.md` | 5.541 |
| `skills/context7-cli/references/skills.md` | 3.785 |
| `skills/context7-cli/references/setup.md` | 2.066 |
| `skills/context7-mcp/SKILL.md` | 2.727 |
| `plugins/claude/context7/agents/docs-researcher.md` | 2.146 |
| `rules/context7-cli.md` | 2.306 |
| `rules/context7-mcp.md` | 1.679 |
| `plugins/claude/context7/commands/docs.md` | 1.224 |

Aynı 2.727 B'lik skill dört koşum ortamı için ayrı ayrı kopyalanmış
(`plugins/claude|cursor|codex|copilot/`), yani ortam farkı **çoğaltmayla** çözülmüş.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**İki adımlı daraltma ve bunu anlatan 2.939 B'lik skill.** Akış: önce
`ctx7 library <ad> "<sorgu>"` ile kütüphane kimliği çözülür, sonra
`ctx7 docs <libraryId> "<sorgu>"` ile **yalnız sorguya karşılık gelen belge dilimi**
alınır. Skill, kimliği bilmeden `docs` çağrılmasını açıkça yasaklıyor — yani yanlış
kullanımdan doğan geniş çekimi baştan kapatıyor.

Buradaki ölçülebilir gerçek: ajan tarafındaki toplam sabit metin **~13 KB'nin altında**
(find-docs 7.429 + cli 2.939 + mcp 2.727), buna karşılık erişilen belge hacmi sınırsız.
Bilgi/metin oranı, bilgiyi dosyaya yazan bir skill'de asla ulaşılamayacak bir seviyede.

İkinci mekanizma: `docs-researcher` alt ajanı (2.146 B). Getirilen belge **ana oturumun
bağlamına değil**, alt ajanın bağlamına giriyor; ana oturuma yalnız özet dönüyor.
2.146 B'lik bir tanım, on binlerce token'lık belgeyi ana bağlamdan uzak tutuyor.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

Tek komut: `npx ctx7 setup`. OAuth ile kimlik doğrular, API anahtarı üretir, uygun
skill'i kurar; `--cursor`, `--claude`, `--opencode` ile hedef seçilebilir. Geri alma
yolu belgelenmiş: `npx ctx7 remove`, global kurulum varsa ayrıca `npm uninstall -g ctx7`.

Manuel kurulum için MCP URL'i ve `Authorization: Bearer` başlığı. API anahtarı olmadan
da çalışıyor, sadece hız sınırı düşük.

Kullanım tarafında ilginç ayrıntı: kullanıcı `use context7` yazarak açıkça tetikleyebiliyor,
ya da kütüphane kimliğini elle vererek (`use library /supabase/supabase`) çözümleme
adımını atlatabiliyor — **bir tur tasarrufu**.

## 5. Alınmaya değer en fazla 3 fikir

**1. Ağır bilgiyi alt ajanın bağlamında tut, ana oturuma özeti dön — 2.146 B'lik tanımla.**
Ne: `docs-researcher.md` 2.146 B. Bizim ajanlarımız ortalama 3.324 B ve en büyüğü
4.220 B; boyut olarak aynı ligdeyiz, ama kullanım amacı farklı — bizde ajanlar iş
yapıyor, burada ajan **bağlam kalkanı** olarak kullanılıyor.
Neden değerli: tarama, denetim, kütüphane araştırması gibi çok metin okuyan işler ana
oturumu şişiriyor. Kalkan deseni bunu 2 KB'lık bir tanımla kapatıyor.
Maliyet: yeni ajan tanımı + çağrı noktası; ana oturumda "özet iste" disiplini gerekir.

**2. Referansı dosyaya yazmak yerine komutla getirt.**
Ne: 13 KB'lık skill yüzeyi, sınırsız belge hacmine erişiyor. Bizim `teknesyum-ui`
tarafında renk ve ölçü tokenları dosyada duruyor (`desktop.md` 18.397 B,
`layout.md` 5.079 B, `components.md` 3.617 B = 27.093 B).
Neden değerli: token tablosu bir komutla sorgulanabilir hâle gelirse (örn. `token get
color.surface`), 27 KB'lık referans yükü sorgu başına birkaç yüz bayta iner.
Maliyet: küçük bir CLI ya da script yazmak; skill'in "önce sorgula" disiplinini
kurması gerekir — Context7 bunu tek satırlık "MUST call library first" kuralıyla yapmış.

**3. Kullanıcıya tetikleme ve kısayol ver.**
Ne: `use context7` ile açık tetikleme, `use library /org/proje` ile çözümleme adımını
atlama. İkincisi ölçülebilir: **bir araç turu az**.
Neden değerli: bizde skill tetiklenmesi tamamen description eşleşmesine bağlı; yanlış
tetiklenen `relay/SKILL.md` tek seferde **10.112 token** yükler ve işi de bozar. Açık tetikleyici kelime, isabet
oranını kullanıcıya devrediyor.
Maliyet: description'a tetikleyici ifade eklemek — birkaç yüz bayt, tek seferlik.

## 6. Şüpheli/riskli yanlar

- **Lisans MIT** (`LICENSE` 1.079 B), temiz. `SECURITY.md` var (1.642 B).
- **Bakım canlı:** push ve sürüm aynı gün (2026-08-21), 42 açık issue.
- **Dış servis bağımlılığı.** Belgeler Upstash'in sunucusundan geliyor; API anahtarı,
  hız sınırı ve servis kesintisi bizim kontrolümüz dışında. "Bağlamı dışarı taşı" fikri
  alınabilir ama **bu servise bağlanmak** ayrı bir karar.
- **Ağ ve gizlilik yüzeyi:** sorgu metni dışarı gidiyor. Kapalı proje bağlamında
  sorgulanacak şey seçilmeli.
- **Çoğaltma borcu:** aynı 2.727 B'lik skill dört ortam klasöründe birebir kopya. Tek
  kaynaktan üretilmiyorsa sürüklenir (wshobson/agents bunu jeneratörle çözmüş).
- **Doğrulanamayan iddia yok** — README'de sayısal performans iddiası bulunmuyor;
  "up-to-date docs" iddiası ölçülemez ama pazarlama sınırında.

## Kaynaklar

- `gh api repos/upstash/context7` — push, yıldız, issue, lisans (2026-08-22)
- `gh api repos/upstash/context7/releases/latest` — @upstash/context7-mcp@4.0.3, 2026-08-21
- `gh api repos/upstash/context7/git/trees/HEAD?recursive=1` — skill/ajan/kural boyutları
- `raw.githubusercontent.com/upstash/context7/master/README.md` — iki mod, kurulum, kısayol
- `raw.githubusercontent.com/upstash/context7/master/skills/find-docs/SKILL.md` — iki adımlı akış
