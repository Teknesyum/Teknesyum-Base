# Yerel LLM ile angarya iş — teorik inceleme

Tarih: 2026-08-19 · Durum: **inceleme, uygulama yok** · İsteyen: kullanıcı

Soru: "qwen2.8 gibi bir modeli yerel llm ile çalıştırarak angarya işlerde token
tasarrufu mantıklı mı, mümkün mü?"

Önce bir düzeltme: **Qwen 2.8 diye bir sürüm yok.** Seri Qwen2.5 (Coder varyantı dahil)
ve Qwen3 olarak ilerledi. Aşağıda "yerel model" derken bu sınıfı kastediyorum.

---

## 1. Donanım — engel değil

| Ölçüm | Değer |
|---|---|
| GPU | NVIDIA GeForce RTX 5070 Ti |
| VRAM | 16 GB (WMI 4 GB gösteriyor; 32-bit `AdapterRAM` alanının bilinen tavanı, kartın gerçek değeri değil) |
| RAM | 64 GB |
| Mantıksal çekirdek | 16 |

16 GB VRAM'de 14B sınıfı bir model 4-bit nicemlemeyle tamamen GPU'ya sığar (~9 GB),
32B sınıfı kısmen CPU'ya taşar ama çalışır. Angarya iş için 7B-14B fazlasıyla yeter.
**Donanım tarafında engel yok.**

## 2. Claude Code'a yerel modeli nasıl bağlarsın — üç yol, ikisi kapalı

**Yol A — oturumu komple yerel modele çevirmek.** `ANTHROPIC_BASE_URL` +
`ANTHROPIC_AUTH_TOKEN` ikilisi ikili dosyada mevcut (78 ve 71 geçiş) — Claude Code'u
Anthropic API yerine başka bir uca yönlendirmek destekleniyor. Ayrıca
`ANTHROPIC_DEFAULT_HAIKU_MODEL` (63 geçiş) ve `ANTHROPIC_SMALL_FAST_MODEL` (39 geçiş)
ayrı ayrı ayarlanabiliyor; yani **küçük/hızlı model yuvası büyük modelden bağımsız
yönlendirilebilir.** Teoride ideal kurgu şu: yerel bir Anthropic-uyumlu vekil (LiteLLM
tarzı) küçük model çağrılarını Qwen'e, büyükleri gerçek API'ye geçirir.

**Bunu bitiren şey teknik değil, faturalandırma.** `ANTHROPIC_BASE_URL` +
`ANTHROPIC_AUTH_TOKEN` kullanmak oturumu OAuth aboneliğinden çıkarıp API anahtarı
faturasına sokar. Claude Pro aboneliğiyle çalışırken bu yol, tasarruf etmeye çalıştığın
şeyin ta kendisini kaybettirir. **Kapalı.**

**Yol B — ajan bazında model seçimi.** Ajan frontmatter'ındaki `model:` alanı
`opus | sonnet | haiku | inherit` kümesinden değer alıyor; rastgele bir uç nokta ya da
model adı kabul etmiyor. `scribe`'yi yerel modele vermek **mümkün değil.** Kapalı.

**Yol C — kancaların ve betiklerin doğrudan yerel modeli çağırması.** Claude Code'un
model altyapısına hiç dokunmaz: `relay-watch.js` ya da bir yardımcı betik, yerel bir
sunucuya (Ollama/llama.cpp, `127.0.0.1`) HTTP isteği atar, sonucu kendi çıktısına koyar.
Fatura etkisi yok, abonelik etkisi yok, izin modeli değişmez. **Açık olan tek yol bu.**

## 3. Yol C'de gerçekten ne kazanılır — dürüst hesap

Kanca tarafında modele ihtiyaç duyan işler dar bir küme. Kendi kuralımız zaten şunu
söylüyor: *angarya işte önce deterministik araç ara.* Yerel model, ancak deterministik
aracın yetmediği **ve** Claude'un pahalı olduğu aralıkta kazandırır. O aralık ince:

| Aday iş | Deterministik karşılığı | Yerel model kazandırır mı |
|---|---|---|
| Biçimlendirme, import sıralama | `biome`, `prettier` | **Hayır** — araç zaten var |
| İsim değiştirme, toplu düzeltme | `sed`, IDE refactor | **Hayır** |
| Bağımlılık haritası | `harita.js` | **Hayır** — 2.20'de eklendi |
| Commit mesajı taslağı | yok | Belki — ama zaten tek satır, Claude'a maliyeti ihmal edilebilir |
| Uzun rapor gövdesini özetleme | yok | **Evet** — devir protokolünde gövde dosyada kalıyor, özet üretimi tekrarlı |
| README/belge TR→EN çevirisi | yok | **Evet** — kalıplı, hacimli, hata toleransı yüksek |
| Transkript içinde arama/etiketleme | `rg` + `harita.json` | Kısmen |
| Hangi dosyalar bu işe girer, ön eleme | `Explore` (Claude) | **Evet** — ön eleme yanlışsa maliyeti düşük |

Yani gerçek kazanç üç yerde toplanıyor: **özetleme, çeviri, ön eleme.** Üçü de
"yanlış olursa ucuza düzelir" sınıfı. Kod yazan, karar veren, denetleyen hiçbir adımı
yerel modele vermek doğru değil — bizim mimarimizde denetim zaten pahalı tarafın işi.

## 4. Gizli maliyetler

- **İkinci bir çalışma zamanı.** Ollama/llama.cpp kurulumu, model indirmesi (7B Q4 ≈ 4-5 GB),
  sürüm takibi, sunucunun ayakta olup olmadığının kancada kontrolü. Kanca sessizce
  başarısız olmalı — yerel sunucu kapalıyken iş durmamalı.
- **Gecikme.** Kanca `Stop`/`PostToolUse` üzerinde senkron çalışıyor. 7B modelde birkaç
  yüz token üretmek saniyeler sürer; her araç çağrısına saniye eklemek, tasarruf edilen
  token'dan daha pahalıya gelebilir. Yerel çağrı ancak **oturum sonunda** (`SessionEnd`)
  ya da açıkça istendiğinde yapılmalı, araç döngüsünün içinde değil.
- **Kalite tavanı.** 7B-14B sınıfı Türkçe teknik özetlemede kabul edilebilir, ama
  "raporu kim okuyacak" sorusunun cevabı patron modelse, kötü özet yanlış karara yol açar.
  Özet üretimi ancak **kaynak dosya da elde kalıyorsa** güvenli.
- **Belirlenimsizlik.** Aynı girdi iki farklı özet üretir. Testlerimiz deterministik;
  yerel model çıktısına test yazılamaz, sadece "boş değil / şu alanları içeriyor"
  seviyesinde doğrulanır.

## 5. Sonuç

**Mantıklı mı:** dar bir aralıkta evet — özetleme, çeviri, ön eleme.
**Mümkün mü:** yalnızca Yol C ile; Yol A aboneliği bozar, Yol B desteklenmiyor.
**Şimdi yapılmalı mı:** hayır. Kazanç, kurulum ve bakım yükünü ancak bu üç iş
düzenli tekrarlanmaya başlarsa karşılar. Bugün karşılamıyor.

**Tetikleyici:** devir raporlarının özetlenmesi haftada birkaç kez elle yapılır hale
gelirse ya da belge çevirisi düzenli bir iş olursa, Yol C'yi tek bir yardımcı betikle
(`scripts/yerel.js`, sunucu kapalıysa sessizce çık) kurmak yarım günlük iştir.
O zamana kadar açık.
