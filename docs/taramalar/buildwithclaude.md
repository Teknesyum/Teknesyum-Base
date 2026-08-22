# davepoon/buildwithclaude — bu işi yanlış yapan örnek

`davepoon/claude-code-subagents-collection` deposu bu ada taşınmış; API sorgusu
`davepoon/buildwithclaude` döndürüyor.

Bu dosya taramadaki **karşı örnek**: neyi yapmayacağımızı gösteriyor.

## 1. Ne yapıyor, hangi problemi çözüyor

Claude Code için topluluk kataloğu: alt ajan, komut, skill, hook, MCP sunucusu ve eklenti
listesini hem depo hem web arayüzü (`web-ui/`) olarak yayınlıyor. Problem gerçek —
dağınık ekosistemi tek yerden aranabilir yapmak. Çözüm biçimi ise token açısından
felaket bir örnek üretmiş.

API verileri (2026-08-22): son push `2026-08-22T14:30:38Z`, 3.308 yıldız,
**12 açık issue**, **MIT**.

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Kök: `plugins/` (**141 eklenti**), `web-ui/`, `scripts/`, `stories/`, `tests/`,
`mcp-servers.json` (100.111 B), yedi adet ekran görüntüsü (toplam ~3,7 MB),
`package-lock.json` (418.819 B).

Ölçüm (gh api git/trees, bayt):

| Tür | Adet | Toplam | Ortalama | En büyük |
|---|---|---|---|---|
| `SKILL.md` | 366 | 2.517.288 | 6.878 | **160.358** |
| agent `.md` | 343 | 1.328.343 | 3.873 | 48.988 |
| command `.md` | 425 | 2.448.157 | 5.760 | 59.934 |

Ajan ortalaması 3.873 B — bizim 3.324 B ile aynı ligde, orası sorun değil. Sorun uç
değerlerde ve skill tarafında.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**Yok — ve eksikliği ölçülebilir.** Katalog büyümesini sınırlayan bir kural konmamış,
bu yüzden tek bir skill her sınırı aşmış:

`plugins/claude-ops/skills/setup/SKILL.md` — **160.358 B, 3.121 satır, 20.422 kelime.**
Resmi tavan 500 satır ve ~2.000 kelime; bu dosya satırda **6,2×**, kelimede **10×**
üstünde. Tetiklendiği anda tamamı bağlama giriyor: kaba hesapla **~40.000 token**
(4 karakter/token). Aynı eklentide `ops-marketing/SKILL.md` 86.271 B,
`vulnetix/fix/SKILL.md` 57.411 B.

İçerik incelendiğinde neden şiştiği görülüyor: SKILL.md gövdesine yapılandırma JSON'ları
gömülmüş — bunlar referans dosyası ya da script olmalıydı. Progressive disclosure'ın
üçüncü katmanı ("script çalıştır, okuma") hiç kullanılmamış.

Ajan tarafında aynı desen: `plugins/gsd/agents/gsd-planner.md` 48.988 B,
`gsd-debugger.md` 46.755 B, `gsd-doc-writer.md` 38.114 B. Alt ajan tanımı, alt ajanın
sistem istemine tamamen girer — 48.988 B ≈ 12.000 token, iş başlamadan harcanıyor.
Bizim en büyük ajanımız 4.220 B, yani **11× küçük**.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

Web arayüzünden ya da marketplace'ten seçip kurma. `Dockerfile` (1.387 B) ve
`CONTRIBUTING.md` (10.776 B) var. Katalog verisi `mcp-servers.json` (100.111 B) —
arayüz için, bağlama girmiyor.

Hata hâli: `hook-validation-report.json` 154 B — doğrulama var ama boyut denetimi yok.
Kurulan eklenti bozuksa geri bildirim yolu belgelenmemiş.

## 5. Alınmaya değer en fazla 3 fikir

**1. Boyut denetimini teste bağla: SKILL.md ≤ 500 satır, ajan ≤ 5 KB.**
Ne: burada tek kural yok ve sonuç 160.358 B'lik skill, 48.988 B'lik ajan. Bizde
`test/` klasörü zaten var; bir boyut testi eklemek bu sınıfın tümünü kapatır.
Neden değerli: bugünkü `relay/SKILL.md` 53.147 B bu testi geçemez — yani test yazmak
sorunu tespit etmekle kalmaz, düzeltmeyi zorunlu kılar.
Maliyet: ~30 satır test kodu; asıl maliyet testi geçirmek için relay'i bölmek.

**2. Yapılandırma verisini SKILL.md'den çıkar, ayrı dosyaya ya da script'e taşı.**
Ne: 160 KB'lık dosyanın büyük kısmı gömülü JSON. Aynı içerik `assets/config.json`
olsaydı ve skill "bu dosyayı oku" deseydi, tetiklenme maliyeti ~2 KB olurdu — **%98
azalma**.
Neden değerli: bizde `relay/assets/contract.template.md` (1.761 B) doğru tarafta;
ama `SETTINGS.md` (12.750 B) ve `standartlar.md` (5.751 B) içindeki sabitler gövdede
mi yoksa ayrı mı, denetlenmemiş.
Maliyet: içerik taşıma; ajanın dosyayı okumayı unutma riski var, bu yüzden SKILL.md'de
tek satırlık açık yönerge şart.

**3. Alt ajan tanımını 5 KB tavanında tut.**
Ne: burada ajan ortalaması 3.873 B ama uç 48.988 B; ortalama sağlıklı görünüp uçlar
faturayı ödetiyor. Ölçülecek şey ortalama değil **en büyük**.
Neden değerli: bizim ajanlarımızın en büyüğü 4.220 B — tavanın altındayız, ama bu
tesadüf; yazılı olmadığı için bir sonraki ajan 15 KB olabilir.
Maliyet: bir kural satırı + aynı boyut testine bir kontrol daha.

## 6. Şüpheli/riskli yanlar

- **Lisans MIT** (`LICENSE` 1.065 B), temiz. Marka: depo adı değişmiş
  (`claude-code-subagents-collection` → `buildwithclaude`), eski bağlantılar yönleniyor.
- **12 açık issue, 3.308 yıldız, son push 2026-08-22** — depo canlı; sorun bakım değil
  **editoryal denetim yokluğu**.
- **Toplanmış içeriğin kaynağı belirsiz.** 141 eklenti farklı yazarlardan; her birinin
  lisansı ayrı doğrulanmalı, depo lisansı bunu kapsamaz (`doğrulanamadı`).
- **Kurulan her eklenti sabit maliyet ekliyor.** 366 SKILL.md'nin frontmatter'ı
  ölçülmedi (`doğrulanamadı`), ama Anthropic ortalaması olan 570 B ile çarpılırsa
  ~209 KB'lık metadata yüzeyi çıkar — hepsi kurulursa oturum başına ~52.000 token.
- **Depo ağırlığı:** 3,7 MB ekran görüntüsü ve 418 KB `package-lock.json`. Bağlam
  maliyeti değil, ama klonlama ve inceleme maliyeti.

## Kaynaklar

- `gh api repos/davepoon/claude-code-subagents-collection` → `davepoon/buildwithclaude`
  yönlendirmesi, push/yıldız/issue/lisans (2026-08-22)
- `gh api repos/davepoon/buildwithclaude/git/trees/HEAD?recursive=1` — boyut istatistikleri
- `gh api repos/davepoon/buildwithclaude/contents/plugins` — 141 eklenti
- `raw.githubusercontent.com/davepoon/buildwithclaude/main/plugins/claude-ops/skills/setup/SKILL.md`
  — 160.358 B / 3.121 satır / 20.422 kelime (yerel `wc` ölçümü)
- Sınır karşılaştırması: platform.claude.com agent-skills/best-practices (500 satır)
