# Kararlar · `teknesyum-ui` konseyi

**Tarih:** 23.08.2026 · **Kaynak:** `docs/KONSEY-ui-analizi-2026-08-23.md`
**Karar mercii:** kullanıcı. Bu dosya kararların kaydıdır, tartışmanın değil.

Konseyin 23 bulgusu ve altı tartışmalı başlığı kullanıcıya sunuldu. Aşağıdaki tablo
her maddede **ne karar verildiğini** ve **kimin görüşünün seçildiğini** tutar.
Uygulama durumu ayrı sütunda; bu dosya iş bitince değil, karar alınınca yazıldı.

**Yeni kısayol:** kullanıcı 23.08.2026'da şunu tanımladı — *"bundan sonra sadece `fable`
yazarsam, fable'ın dediği olacak demek."* Tek kelimelik onay budur.

---

## A · Tipografi

| # | Konu | Karar | Kimin |
|---|---|---|---|
| A1 | Font ailesi | **Atkinson Hyperlegible Next varsayılan** (koşullu değil), gömülü variable font. Mono'da `Cascadia Mono` başa alınır, `Consolas` geriye düşer. | fable seçenek B · T0 da B demişti |
| A2 | Ölçek | 1.25 major third: **14 / 16 / 20 / 24 / 30**. `--tk-fs-1` … `--tk-fs-5`. | fable |
| A3 | Ağırlık | Başlık ve etiket **700 → 600**. Hero 900 kalır. | fable |
| A4 | Satır | `--tk-lh-body: 1.5` · `--tk-lh-heading: 1.2` · `--tk-lh-mono: 1.4` · `--tk-measure: 65ch`. WPF: `LineHeight` + `LineStackingStrategy="BlockLineHeight"`. | fable |
| A5 | Harf aralığı | etiket `0.15em` · h3 `0.05em` · h2 `0.02em` · h1/hero `0` veya `−0.01em`. WPF'te tracking uygulanamıyorsa telafi yazılır. | fable |
| A6 | Başlık hiyerarşisi | h2 → 24 · h3 → 18/20 · etiket 14. Ek ayrım gerekirse çizgi. | fable |
| A7 | Kontrast | `--tk-text-dim` **silinir**. Disabled için tooltip zorunluluğu asset'e yazılır. Hover dolgu kontrastı ölçülüp tabloya geçer. | fable |
| A8 | Metin/glow | `--tk-glow-hero` tokenı eklenir, CSS ve XAML eşitlenir. | fable |
| A9 | Sayı | Gövdeye `font-variant-numeric: tabular-nums`. Ayrım yazılır: **veri sayısı mono, cümle içi sayı sans+tabular**. WPF `Typography.NumeralAlignment="Tabular"`. | fable |
| A10 | Platform | XAML'a `Hint` stili · tracking farkı yazılır · `Roboto` tek kaynağa çekilir. | fable |

## B · Tipografi dışı

| # | Konu | Karar | Kimin |
|---|---|---|---|
| B1 | Renk paleti | (1) anlamsal renkler ve (3) WCAG 1.4.1 kuralı fable'ın dediği gibi. **(2) renk körlüğü: T0'ın sert çizgisi** — ölç, raporla, sonucu konuşuruz. (4) `--tk-text-dim` silinir. | fable + **T0 (2. madde)** |
| B2 | Glow | fable'ın dediği. T0'ın "10+ glow'lu öğede liste glow'u kalkar" önerisini **fable değerlendirir**; geçerse uygulanır. | fable · T0 önerisi onaya bağlı |
| B3 | Yarıçap ve yerleşim | **`layout.md` lehine**: yuvarlatılmış dikdörtgen daha küçük köşe alır. **Genel öncelik kuralı yazılmayacak** — T0'ın "çelişkide SKILL kazanır" önerisi reddedildi, kolaya kaçmak sayıldı. Çelişki bulundukça **tek tek kullanıcıya sorulur**. | **kullanıcı** — T0'ın önerisi reddedildi |
| B4 | Eksik bileşenler | fable'ın saydığı boşluklar kapatılır. **Ek kural:** alternatif sunmadan yasak konmaz. Bu kurallar tavsiye niteliğinde alınmıştı; kesin kural gibi bela olmayacaklar. | fable + **kullanıcı** |
| B5 | Durumlar | Beş-durum zorunlu şablonu; eksik durum "yasaklı boşluk". | fable |
| B6 | Hareket | fable'ın dediği: WPF reduced-motion kontrolü, `@property` performans ölçümü, utility `scale` deliği, hit-test. | fable |
| B7 | Erişilebilirlik | `§5.8 ekran okuyucu` bölümü; isimsiz interaktif öğe **yasak**. | fable |
| B8 | Avalonia | fable iyi tespit etmiş — **`Theme.axaml` yazılacak.** | fable + kullanıcı |
| B9 | İmza | fable'ın dediği: dar pencere daralması + WPF tıklama alanı. | fable |
| B10 | Ölçülmemiş sayılar | Yedi maddeye `(varsayılan, ölçülmedi)` etiketi; iki çelişki düzeltilir. | fable |
| B11 | Karanlık/aydınlık | fable'ın dediği. | fable |

## T · Tartışmalı başlıklar

| # | Karar |
|---|---|
| T1 | **(B) Atkinson.** Kullanıcı ve T0 aynı yerde. |
| T2 | **(A) Mavi kalır**, hiyerarşi boyut ve çizgiyle çözülür. |
| T3 | fable'ın dediği — ölçek 30'a çıkar. |
| T4 | **A + B birlikte.** Kullanıcı "ikisi birden olamaz mı?" diye sordu; fable'a soruldu, cevap: **çelişki yok, doğru kurgu zaten bu.** A mekanizma olur, B tek istisna. Ayrıntı aşağıda. |
| T5 | **(A)** — `§5.4` gerekçeleri `references/motion.md`'ye taşınır. Kullanıcının şartı: *"proje gözardı etmeyecek"* — taşınan kural okunmaya devam etmeli. |
| T6 | **Aydınlık tema ileriye.** Ayarların içinde opsiyon olarak eklenebilir, ama tam stabil sürüm çıkmadan öncelik değil. |

## Ayrıştığımız yerlerin sonucu

| Ayrışma | Sonuç |
|---|---|
| T1 font ailesi | İkimiz de Atkinson dedik, kullanıcı katıldı. |
| B1-2 renk körlüğü | **T0 haklı bulundu** — ölçüm yapılacak, sonuç raporlanacak, orada da danışılacak. |
| B3 öncelik kuralı | **T0 haksız bulundu.** "Çelişkide SKILL kazanır" kolaya kaçmaktır; çelişkiler tek tek tespit edilip kullanıcıya sorulacak. |

## T4 · Anlamsal renkler — fable'ın cevabı

Kullanıcının sorusu haklıydı. fable ikisini alternatif sunmuştu çünkü ikisi de aynı
soruyu ("uyarı hangi renk?") çözüyordu; birleştirilince **A mekanizma, B tek istisna**
olur:

```
--tk-danger : var(--tk-pink)      dolgu #ff00ea · metin #ff54eb
--tk-info   : var(--tk-blue)      #00f3ff
--tk-success: #34d399             mevcut
--tk-warning: #fbbf24             tek yeni hex
```

Palet 11 rolden 15 role çıkar ama **hex sayısı yalnız bir artar.** Kimlik sulanır mı:
`success #34d399` zaten neon üçlünün dışında dördüncü kromatik aile, yani "üçlü saflığı"
bugün de yok. Amber ikinci istisna olur, ilki değil; `success`le aynı kısıt yazılırsa
("yalnızca uyarı yüzeyi, dolgu/vurgu rolü yok") sulanma aynı düzeyde kalır.

Kontrast ölçüldü: `#fbbf24` siyahta **~12.6:1**, `#08090a` üstünde **~12:1** — 7:1'i bol
geçiyor, koyulaştırmaya gerek yok. Tek hex hem dolgu hem metin işini görür.

Ek kazanç: amber, B.1(2)'deki pembe/mor renk körlüğü riskini de rahatlatır — sarı kanal
deuteranopide ayrışıyor.

**fable'ın kaçırılan uyarısı:** amber girince `success` yeşiliyle yan yana duran durum
satırlarında yeşil–amber ayrımı deuteranopide zayıflar. B.1(3)'ün "renk tek başına anlam
taşımaz" kuralı amber için **baştan** yazılmalı, sonradan değil.

## B2 · Glow eşiği — T0'ın önerisi reddedildi

fable, T0'ın "10'dan fazla glow'lu öğede liste glow'u kalkar" önerisini **onaylamadı**:
*"10 uydurma — ölçüme dayanmıyor. Yazılırsa B.10'daki 'ölçülmemiş sayı ölçülmüş gibi'
listesine sekizinci madde eklenmiş olur."* Sayı yanlış proxy; maliyet öğe sayısından
değil, glow'un **kaydırılan/yenilenen yüzeyde** olmasından geliyor — 10 statik glow ucuz,
5 glow'lu sanallaştırılmış liste kaydırmada pahalı.

Yerine geçen kural, sayısız ve ölçülebilir:

1. **Yapısal:** glow kaydırılabilir/sanallaştırılmış tekrar eden öğelere (liste satırı,
   grid hücresi, tablo satırı) verilmez — kapsayıcı panele verilir. Üç satır da olsa
   üç yüz satır da olsa aynı.
2. **Ölçüm:** kaydırma sırasında kare süresi **≤ 16 ms** (60 fps). Web'de DevTools
   Performance, WPF'te `CompositionTarget.Rendering` süresi ya da PerfView.
3. **Platform ayrımı gerekli:** WPF `DropShadowEffect` alt ağacı ara yüzeye render eder
   ve kaydırmada her karede yeniden çizer — orada **mutlak yasak**. CSS statik
   `box-shadow` GPU'da ucuz; pahalı olan `backdrop-filter` yığılması ve gölge
   *animasyonu* (§5.4 zaten yasaklıyor, atıf yeter). WPF satırı sert, CSS satırı yumuşak.

## Kendi sözleşmesini ve kendi konseyini hak eden yedi madde

Kullanıcı: *"7 maddeyi kendi sözleşmesi ve kendi konseyiyle detaylıca inceleyip yap,
hepsini abine danış."* Yani her biri ayrı sözleşme, ayrı konsey, `fable` görüşü zorunlu.

| # | İş |
|---|---|
| 17 | Eksik bileşenler: input · form hatası · modal · toast |
| 18 | Anlamsal renk katmanı (`danger` · `warning` · `info`) |
| 19 | `§5.8` ekran okuyucu + isimsiz interaktif öğe yasağı |
| 20 | Beş-durum zorunlu şablonu ve eksiklerin doldurulması |
| 21 | Avalonia `Theme.axaml` |
| 22 | Glow performans eşiği + ölçümü |
| 23 | Pembe/mor renk körlüğü simülasyonu |

## Konseyden bağımsız üç karar

| Konu | Karar |
|---|---|
| Title Case muafiyeti | **Kaldırıldı.** Tam cümlelerde de Title Case uygulanır — tooltip, hata mesajı, boş durum, onay metni dahil. Muafiyet T0'ın tek taraflı eklediği bir maddeydi ve kullanıcı istememişti. |
| `autocompact` `KANCA_DUGME`'de | Kullanıcı açıklama istedi; cevap verildi, karar bekliyor. |
| Engellenen turda ölçü satırı | Kullanıcı "birikmeli gibi" dedi ama tam ne kastedildiğini sordu; cevap verildi, karar bekliyor. |
