# PatrickJS/awesome-cursorrules — kural koleksiyonu ve "alwaysApply: false" tuzağı

Rakip araf: Cursor'ın `.cursor/rules/*.mdc` sistemi. Cursor'ın kendi tasarımı
`docs/taramalar/cursor-rules.md` dosyasında incelenmişti; bu dosya **koleksiyonu**
inceliyor — yani insanların o sistemi fiilen nasıl doldurduğunu.

## 1. Ne yapıyor, hangi problemi çözüyor

257 hazır kural dosyası: framework, dil, platform başına "Cursor bu projede şöyle
davransın" metni. Çözdüğü problem bizimkiyle aynı — projeye özgü konvansiyonu her
oturumda yeniden anlatmamak. Karşılaştırma değeri, bunun **denetimsiz** hâlinin nasıl
göründüğünü göstermesi.

API verileri (2026-08-22): son push `2026-05-30T18:01:29Z` (**~3 ay hareketsiz**),
40.638 yıldız, **55 açık issue**, **CC0-1.0** (kamu malı ithafı — OSI onaylı bir yazılım
lisansı değil, ama kullanımı serbest).

## 2. Mimari — nasıl bölünmüş, hangi sınırlar konmuş

Kök: `rules/`, `scripts/`, `README.md` (**51.862 B**), dört logo/görsel
(840.580 + 230.898 + 165.909 + 165.476 B). Toplam 295 dosya, 2.642.662 B.

`rules/` ölçümü (gh api git/trees):

| Ölçüt | Değer |
|---|---|
| Dosya sayısı | 257 |
| Toplam | 1.019.182 B |
| Ortalama | **3.966 B** |
| En büyük | 39.701 B (`netlify-official-cursorrules-prompt-file.mdc`) |
| En küçük | 118 B |

Ortalama 3.966 B — tek başına bakınca makul. Sorun ortalamada değil, **yüklenme
kuralında**.

## 3. Kritik mekanizma — bu projeyi ayakta tutan tek şey

**`.mdc` frontmatter'ı: `description` + `globs` + `alwaysApply`.** Bu üçlü, Cursor'ın
progressive disclosure karşılığı. İncelediğim iki dosyada frontmatter aynen şu üç alanı
taşıyor: açıklama metni, `globs: **/*` ve `alwaysApply: false`.

Buradaki çelişki ölçülebilir: `alwaysApply: false` "her zaman yükleme" demek, ama
`globs: **/*` "her dosyada geçerli" demek. Dosya eşleşmesiyle çalışan bir sistemde
`**/*` deseni pratikte her dokunulan dosyada kuralı devreye sokar. Yani kapatma
düğmesi açık bırakılmış: 39.701 B'lik netlify kuralı, herhangi bir dosyaya
dokunulduğunda yüklenmeye aday — kabaca **~10.000 token**.

Doğru kullanım `globs: **/*.tsx` gibi daraltılmış desen olurdu; koleksiyondaki
örneklerde bu daraltma yapılmamış. Mekanizma var, disiplin yok.

## 4. Kullanıcı yüzü — kurulum, ilk çalıştırma, hata hâli

Kurulum manuel: istediğin `.mdc` dosyasını `.cursor/rules/` altına kopyala. Paket yok,
sürüm yok, güncelleme yolu yok — kopyaladıktan sonra kaynakla bağın kopuyor.

README 51.862 B ve kategori kategori bağlantı listesi; keşif buradan yapılıyor.
Depoda `scripts/check-repo-hygiene.mjs` (38.609 B) ve `scripts/check-repo-security.test.mjs`
(22.316 B) var — yani biçim ve güvenlik denetimi kurulmuş, ama **boyut denetimi yok**.

Hata hâli diye bir şey yok: yanlış kural sessizce uygulanır.

## 5. Alınmaya değer en fazla 3 fikir

**1. Kural dosyasının kapsamını dosya desenine bağla — ama deseni gerçekten daralt.**
Ne: `globs` alanı doğru mekanizma; `**/*` yazmak onu iptal ediyor. Ölçülebilir hedef:
hiçbir kural dosyası `**/*` ile eşleşmesin; en geniş desen `**/*.{ts,tsx}` düzeyinde
kalsın.
Neden değerli: bizde skill tetiklenmesi description eşleşmesine bağlı, dosya desenine
değil. `teknesyum-ui` yalnız arayüz dosyası açıkken anlamlı — bugün ise sohbette "renk"
kelimesi geçtiğinde 27.730 B'lik gövde yüklenebiliyor. Hook tarafında dosya yoluna
bakan bir kapı, bu yükü sıfırlar.
Maliyet: `PreToolUse` hook'unda yol kontrolü — küçük kod. Risk: kapı fazla dar olursa
skill hiç tetiklenmez.

**2. Koleksiyona boyut denetimi ekle — burada 38.609 B'lik hijyen script'i var ama
boyuta bakmıyor.**
Ne: 257 dosyanın en büyüğü 39.701 B ve bunu engelleyen hiçbir kontrol yok, oysa depoda
iki ayrı denetim script'i çalışıyor.
Neden değerli: bizde `test/` klasörü var; oraya "SKILL.md ≤ 500 satır, ajan ≤ 5 KB,
komut ≤ 4 KB" kontrolü eklemek aynı hatayı baştan keser. Bugünkü durum: `relay/SKILL.md`
53.147 B bu testi geçemez, `teknesyum-ui/SKILL.md` 27.730 B de geçemez.
Maliyet: ~30 satır test; asıl maliyet testi geçirmek.

**3. Description'ı kısa tut — burada 100–150 B, bizde 433/447 B.**
Ne: `.mdc` dosyalarının description satırı tek cümle (ölçtüğüm iki örnekte
"Cursor rules for X development with best practices." biçiminde, ~60–70 karakter).
Anthropic tarafında ortalama 570 B, superpowers'ta 169 B.
Neden değerli: koordinatörün ölçümüne göre harness'ın description listesi bütçesi
**8.000 karakter** ve Base bunun **%65'ini** (5.217 B) alıyor. Description başına
100 B'ye inmek, aynı sayıda skill/ajan/komutla bütçenin %10'unun altına düşürür.
Ama takas gerçek: kısa description tetikleme isabetini düşürür — Anthropic tam tersi
yönde, 1.024 karakter tavanına dayanmayı seçmiş.
Maliyet: metin işi; ardından tetiklenme isabetinin bench ile doğrulanması şart.

## 6. Şüpheli/riskli yanlar

- **Lisans CC0-1.0.** Kamu malı ithafı; kullanımı serbest, ama OSI onaylı bir yazılım
  lisansı değil ve garanti/patent maddesi yok. Marka koruması yok. İçerik topluluktan
  toplandığı için tek tek kaynak lisansları **doğrulanamadı**.
- **Bakım yavaşlamış.** Son push 2026-05-30 → ~3 ay. 55 açık issue. Etiketli sürüm
  sorgulanmadı (`doğrulanamadı`).
- **Kopyala-yapıştır dağıtımı.** Kurulan kural kaynakla bağını kaybediyor; güncelleme
  ve geri alma yolu yok. Bizim `/update` akışımızın karşılığı bulunmuyor.
- **Şişkinliğin ikinci örneği.** 39.701 B'lik tek kural + `globs: **/*` birleşimi,
  buildwithclaude'daki 160.358 B'lik SKILL.md ile aynı sınıf hata: yükleme koşulu
  gevşek, gövde büyük.
- **Depo ağırlığı:** 1,4 MB logo/görsel ve 51.862 B README. Bağlam maliyeti değil ama
  koleksiyonun kendi indeksinin de şiştiğini gösteriyor.
- **Doğrulanamayan iddia:** README'de sayısal performans iddiası yok; sponsor blokları
  var, onlar ölçüm değil.

## Kaynaklar

- `gh api repos/PatrickJS/awesome-cursorrules` — push, yıldız, issue, lisans (2026-08-22)
- `gh api repos/PatrickJS/awesome-cursorrules/git/trees/HEAD?recursive=1` — 257 kural,
  toplam/ortalama/en büyük/en küçük
- `raw.githubusercontent.com/PatrickJS/awesome-cursorrules/main/rules/netlify-official-cursorrules-prompt-file.mdc`
  — frontmatter: `globs: **/*`, `alwaysApply: false`
- `raw.githubusercontent.com/PatrickJS/awesome-cursorrules/main/rules/convex-cursorrules-prompt-file.mdc`
  — aynı frontmatter deseni
- `raw.githubusercontent.com/PatrickJS/awesome-cursorrules/main/README.md` — 51.862 B indeks
- Önceki tarama: `docs/taramalar/cursor-rules.md` (Cursor'ın kendi tasarımı)
