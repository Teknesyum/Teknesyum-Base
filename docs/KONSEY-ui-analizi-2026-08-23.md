# Konsey · `teknesyum-ui` standardının tam analizi

**Tarih:** 23.08.2026 · **Üyeler:** iki bağımsız `fable` (tipografi · tipografi dışı) + T0 (opus)
**Neden açıldı:** Kullanıcı "font düzenini sevemedim, UI konusu sandığımızdan çok daha önemli,
bu alanı tamamen fable incelesin ve ikiniz madde madde konsey yapın" dedi.

İki üye birbirinden habersiz çalıştı; kapsamları bilerek ayrıldı ki aynı yere iki kez
bakılmasın. Aşağıdaki her satır **üç sütunludur**: şu an ne var · fable ne diyor · ben ne
diyorum. Ayrıştığımız yerler açıkça işaretli — konseyin değeri hemfikir olduğumuz yerde
değil, ayrıştığımız yerdedir.

**Hiçbir dosya değiştirilmedi.** Bu rapor karar için, uygulama için değil.

---

## 0. Konseyin tek cümlelik özeti

Standardın **omurgası sağlam** — ölçülmüş kontrast tabloları, çift katmanlı odak halkası,
hareket token ölçeği ve `prefers-reduced-motion` işleyişi ortalamanın çok üstünde. Zayıflık
üç yerde toplanıyor:

1. **Kapsama boşluğu** — bileşen kütüphanesinin yarısı yok (input, modal, toast, form hatası),
   anlamsal renkler yok, ekran okuyucu kuralları yok.
2. **Kural–asset kayması** — kural dosyada yazıyor, kopyalanan şablon uygulamıyor. En sinsi tür:
   şablonu kopyalayan proje kuralı bilmeden çiğniyor.
3. **Dosyalar arası çelişki** — aynı sayı iki dosyada farklı; model hangisine uyacağını
   okuma sırasına göre seçiyor.

Kullanıcının "font düzenini sevemedim" cümlesinin en olası adresi tek bir madde:
**başlık hiyerarşisi ayrışmıyor** (§1.6 aşağıda).

---

# BÖLÜM A · Tipografi

## A.1 Font ailesi

| | |
|---|---|
| **Şu an** | Sans: `'Segoe UI', system-ui, -apple-system, Roboto`. Mono: `Consolas, 'Cascadia Mono', ui-monospace`. Atkinson Hyperlegible Next yalnız "veri yoğun arayüzde tercih edilir" notu olarak duruyor. Variable font yok. |
| **fable** | Segoe UI bir *sistem* fontu — macOS ve Linux'ta tamamen başka bir yüz render olur, yani "standart" iki makinede iki ayrı sonuç veriyor. Ayrıca hümanist ve yumuşak; neon/teknik kimlikle nötr kalıyor. Atkinson'ın koşulu belirsiz ("veri yoğun"u kim ölçüyor?), pratikte hiç kullanılmıyor. Öneri: projeye **gömülü tek variable font** — (A) Inter Variable ya da (B) Atkinson Hyperlegible Next'i koşullu değil varsayılan yapmak. Mono'da Cascadia Mono başa alınsın; Consolas 2007 fontu. |
| **Ben** | Katılıyorum, ama **B'yi seçerdim, A'yı değil**. Inter "endüstri standardı" olduğu için güvenli, ama tam da bu yüzden karaktersiz — bu standardın kimliği neon ve okunurluk üzerine kurulu, Atkinson'ın varlık sebebi de okunurluk. Skill zaten Atkinson'ı biliyor ve koşula bağlamış; koşulu kaldırmak yeni bir karar değil, verilmiş kararın önündeki engeli kaldırmak. **Ayrıştığımız nokta yok, ama fable iki seçeneği eşit tarttı, ben B'yi öneriyorum.** |
| **Ölçülmedi** | Cascadia Mono'nun eski sürümlerinde `İ` noktası sorunu vardı; gömülecek sürüm gözle doğrulanmalı. |

## A.2 Ölçek

| | |
|---|---|
| **Şu an** | 14 → 16 → 20 → 28. Dört basamak, "ara boyut ekleme" kuralı var. |
| **fable** | Oran tutarsız: 14→16 = 1.143, 16→20 = 1.25, 20→28 = 1.4. Elle seçilmiş. Daha önemlisi **h1 yok** — en büyük metin başlığı 20px, yani sayfa başlığı ile panel başlığı aynı basamağı paylaşmak zorunda. Öneri: 1.25 major third'e otur — **14 / 16 / 20 / 24 / 30**. |
| **Ben** | Katılıyorum. Ek gerekçe: tutarlı bir orandan türeyen ölçek yeni basamak eklerken tartışma bitirir; elle seçilmiş ölçekte her yeni boyut yeniden pazarlıktır. 28→30 geçişi mevcut projelerde ölçülmüş yerleşimleri kaydırabilir; **28'i koruyup araya 24 eklemek** de geçerli bir orta yol (14/16/20/24/28, son adım 1.167 — kusurlu ama regresyonsuz). |

## A.3 Ağırlık — **kullanıcının şikâyetinin en olası adresi**

| | |
|---|---|
| **Şu an** | 400 gövde, 700 başlık/etiket/mono değer/buton, 900 hero. |
| **fable** | Karanlık zeminde açık renkli metin optik olarak kalınlaşır ve bunun telafisi yok. Asıl sorun: **700 ağırlık + mavi renk + 0.1em harf aralığı** üçlüsü her başlık seviyesinde birlikte kullanılıyor — "her şey bağırıyor" hissinin ana kaynağı bu. Öneri: başlık ve etiket **700 → 600** (Segoe UI'da Semibold mevcut). Hero 900 kalsın; glow taşıyabilmesi için kalın olması gerekiyor ve §2'nin gerekçesi doğru. |
| **Ben** | **Konseyin en değerli bulgusu bu ve katılıyorum.** Kendi başıma baksaydım font *ailesine* bakardım — kullanıcı "font" dediği için. fable ailenin değil **ağırlık+tracking+renk üçlüsünün** suçlu olduğunu gösterdi ve bu daha ucuz, daha kesin bir düzeltme. Ailenin değişmesi bir marka kararı; 700→600 bir hata düzeltmesi. Önce bunu yapıp bakmalı. |

## A.4 Satır yüksekliği ve satır uzunluğu

| | |
|---|---|
| **Şu an** | **Hiçbir yerde `line-height` tanımlı değil.** Ne SKILL tablosunda, ne `theme.css`'te, ne `Theme.xaml`'da. Satır uzunluğu (measure) kuralı da yok. |
| **fable** | Ölçeğin yarısı eksik: tarayıcı varsayılanı ve WPF varsayılanı farklı, yani aynı token iki platformda iki ayrı satır yüksekliği veriyor. Öneri: `--tk-lh-body: 1.5` (16px'te 24px, 4'lük ızgaraya oturur), `--tk-lh-heading: 1.2`, `--tk-lh-mono: 1.4`, `--tk-measure: 65ch`. WPF: `LineHeight="24"` + `LineStackingStrategy="BlockLineHeight"`. |
| **Ben** | Katılıyorum ve **bunu A.3'ten sonra ikinci sıraya koyardım**. Standart "ölçülmemişi kural yapmaz" diye övünüyor ama burada tam tersi olmuş: ölçü hiç konmamış, yani her uygulama kendi varsayılanını yaşıyor. Tanımsızlık, yanlış tanımdan kötüdür — yanlış tanım düzeltilebilir, tanımsızlık fark bile edilmez. |

## A.5 Harf aralığı

| | |
|---|---|
| **Şu an** | h2/h3 `0.1em`, etiket `0.15em`, gövde `0`. **`Theme.xaml`'da tracking hiç uygulanmamış.** |
| **fable** | Üç ayrı sorun: (a) 20px 700 başlıkta 0.1em çok geniş — geniş pozitif tracking *küçük etiket* tekniğidir, başlığa uygulanınca başlık etiket gibi görünür; (b) negatif tracking kuralı hiç yok, 24/30 basamağı gelirse gerekir; (c) WPF'te tracking yok, yani iki platform iki ayrı görünüm. Öneri: etiket 0.15em kalsın, h3 0.05em, h2 0.02em, h1/hero 0 veya −0.01em. |
| **Ben** | Katılıyorum. (c) maddesi tek başına bir hata kaydı değerinde: standardın **CSS'te uyguladığı ama XAML'da uygulamadığı** bir kural, "aynı standart" iddiasını çürütüyor. WPF'te tracking doğrudan yok; ya attached behavior yazılır ya SKILL'e "WPF'te uygulanamıyorsa boyut farkı bir kademe artırılır" telafisi yazılır. İkincisi ucuz ve dürüst. |

## A.6 Başlık hiyerarşisi — **fable'a göre en zayıf nokta**

| | |
|---|---|
| **Şu an** | h2 = 20/700/mavi/0.1em · h3 = 16/700/mavi/0.1em · etiket = 14/700/mavi/0.15em. |
| **fable** | Üç seviye de **aynı renk, aynı ağırlık, neredeyse aynı tracking**. h3 (16px) gövdeyle (16px) aynı boyutta. h3 ile etiketi ayıran tek şey 2px ve 0.05em — gözle ayırt edilmiyor. Hiyerarşi fiilen iki seviye: "mavi kalın bir şey" ve "beyaz gövde". Öneri: h2 → 24, h3 → 18/20, etiket 14 kalsın; ek ayrım için h3'e alt çizgi ya da etiket rengini `purple-text`'e almak. |
| **Ben** | **Konseyin ortak kararı: bu en zayıf nokta ve kullanıcının şikâyetinin kökü budur.** A.3 ile birlikte okunmalı — dördü aynı anda çalışıyor (boyut, ağırlık, renk, tracking) ve dördü de her seviyede neredeyse aynı, yani dört sinyalin dördü de hiyerarşi taşımıyor. Boyut ayrımı düzeltilince renk ayrımına gerek kalmayabilir; **önce boyutu ayır, sonra renge bak** derim. Etiket rengini mora almak paleti de rahatlatır ama o bir marka kararıdır, aşağıda "tartışmalı"ya koydum. |

## A.7 Kontrast

| | |
|---|---|
| **Şu an** | §2'de ölçülmüş: beyaz gövde 21/19.9 · neon-blue 15.26/14.49 · pink-text 7.72/7.33 · purple-text 7.83/7.43 · success 10.92/10.37. |
| **fable** | Tablo iç tutarlı, doğruladım; hepsi 7:1 iç eşiğini geçiyor. Üç eksik: (a) `#71717a` disabled ölçümü iki yerde farklı sayı veriyor (4.6 vs 4.35 — biri siyaha, öteki yüzeye karşı olabilir, yazılmamış); (b) **`--tk-text-dim: #ffffff`** beyazla birebir aynı, ölü token; (c) `tk-btn-primary:hover` dolgusu 0.8 opaklığa düşüyor, siyah yazıyla kontrastı **ölçülmemiş**. |
| **Ben** | Katılıyorum. `--tk-text-dim` **silinmeli**, role bağlanmamalı: standart "ara gri yok" diyor, o yüzden dim'e gerçek bir gri vermek standardı deler. İki adı olan tek değer, ileride birinin "dim'i biraz düşüreyim" demesine açık davetiyedir. Hover kontrastı hesapla ~10:1 geçiyor ama **dosyada yazmıyorsa ölçülmemiş sayılır** — bu standardın kendi kuralı. |

## A.8 Metin ve glow

| | |
|---|---|
| **Şu an** | §2 metne glow yasak, tek istisna hero. |
| **fable** | Kural tutarlı, sızıntı yok. Tek pürüz: hero glow'u iki platformda farklı (CSS `drop-shadow 8px` vs XAML `BlurRadius=10, Opacity=0.8`) ve `--tk-glow-*` tokenları hero'da kullanılmıyor, inline değer var. |
| **Ben** | Katılıyorum, küçük ve mekanik bir düzeltme. |

## A.9 Sayı ve kod

| | |
|---|---|
| **Şu an** | Mono zorunluluğu güçlü ("sayıyı sans ile yazma"), Consolas seçili. `font-variant-numeric: tabular-nums` hiçbir yerde yok. |
| **fable** | Mono kuralı sayı hizasını fiilen çözüyor, yani bugün görünür hata yok. Ama sans içinde geçen **cümle içi sayı** da mono'ya zorlanıyor — cümlenin ortasında font değişimi görsel gürültü. Öneri: gövdeye `tabular-nums`, SKILL'e ayrım: veri sayısı mono, cümle içi sayı sans+tabular. |
| **Ben** | Katılıyorum. Bu, fark edilmesi zor ama düzeltilmesi bedava bir kalite maddesi. |

## A.10 Platform tutarlılığı (tipografi)

| | |
|---|---|
| **Şu an** | Boyutlar ve ağırlıklar eşleşiyor (px = DIP 96dpi'de doğru). |
| **fable** | Dört sapma: XAML'da tracking yok · XAML'da `Hint` stili yok · XAML fallback zinciri tek font · CSS'te `Roboto` var, SKILL §3 metninde yok (tek kaynak ilkesine aykırı). |
| **Ben** | Katılıyorum. |

---

# BÖLÜM B · Tipografi dışı

## B.1 Renk paleti

| | |
|---|---|
| **Şu an** | 11 rol. Kontrast tabloları ölçülü — standardın en güçlü yanı. |
| **fable** | Dört sorun. **(1) Anlamsal renk yarım:** `success` var, ama **uyarı, hata, bilgi rolleri yok**. Pembe hem "tehlike butonu" hem "uyarı kutusu" hem "ters eylem". Yani hata ile uyarı aynı renk. **(2) Renk körlüğü ölçülmedi:** pembe `#ff00ea` / mor `#b026ff` çifti deuteranopia/protanopia altında hiç simüle edilmemiş; ikisi de kırmızı-mavi kanal ağırlıklı, protanopide yaklaşma riski yüksek. **(3) WCAG 1.4.1 kuralı yazılı değil:** mod anahtarının rengi ve alt bilgi durum noktası yalnız renkle anlam taşıyor. **(4)** `--tk-text-dim` ölü token. |
| **Ben** | (1) ve (3) kesin, hemen düzeltilmeli. (2)'de fable'dan **daha sert davranırdım**: bu ölçüm yapılana kadar "pembe ve mor aynı ekranda tek ayırt edici olamaz" kuralı **şimdiden** yazılmalı — ölçüm sonucu iyi çıkarsa kural kaldırılır, kötü çıkarsa zaten gerekliydi. Ölçülmemiş riski varsayılan olarak "yok" saymak, standardın kendi ilkesine aykırı. |

## B.2 Glow

| | |
|---|---|
| **Şu an** | Kutu glow zorunlu, metin glow yasak, 24px pay kuralı var. |
| **fable** | (a) **Performans hiç ölçülmemiş** — WPF `DropShadowEffect` yazılım-render fallback'inde pahalıdır, CSS'te `backdrop-filter: blur(16px)` + her panelde 40px gölge yığılması da öyle. Standardın en pahalı görsel efekti, tek satır performans uyarısı taşımıyor. (b) 24px pay kuralı kendi asset'lerinde çiğneniyor: scrollbar thumb 10px glow / 10px yol, grid hücresi bitişik + inset glow. |
| **Ben** | Katılıyorum. (b)'de fable'ın çözümü doğru: **kural pratiği yakalasın** — inset glow ve scrollbar açıkça muaf yazılsın. Kuralı çiğnenen hâlde bırakmak, kuralın tamamının ciddiyetini düşürür. (a) için somut bir eşik öneririm: "bir listede 10'dan fazla glow'lu öğe varsa liste öğelerinde glow kalkar, yalnız kapsayıcı panelde kalır." |

## B.3 Aralık, yarıçap, yerleşim

| | |
|---|---|
| **Şu an** | Aralık 4/8/12/16/24 · yarıçap 16/12/8/6. |
| **fable** | **Doğrudan çelişki:** `layout.md:36-38` "Genel `CornerRadius` **6 DIP**, kart/panel/düğme için farklı yarıçap üretme" diyor; `SKILL §5` "kutu 16, buton 12" diyor. İki dosya birbirini yalanlıyor. Ayrıca grid/kolon sistemi yok — kenar çubuğu ölçüsü dışında hiçbir yerleşim kuralı yok. |
| **Ben** | Çelişki kesin ve beş dakikalık bir düzeltme; `layout.md` muhtemelen "çip/rozet 6" demek istemiş. **Ama asıl mesele bu tekil çelişki değil:** standart kendi içinde bir **öncelik kuralı** tanımlamıyor. `SKILL.md` ile `references/*.md` çeliştiğinde hangisi kazanır? Bu yazılmadığı sürece her çelişki tek tek avlanmak zorunda. Tek satır: *"Çelişkide `SKILL.md` kazanır; `references` onu açar, ezmez."* |

## B.4 Bileşen kalıpları — **kapsama boşluğu**

| | |
|---|---|
| **Şu an** | Panel, odak halkası, başlıklar, ayraç, 4 buton, toggle, slider, değer hücresi, uyarı kutusu, ilerleme çubuğu, rozet/çip, imza, ikon boyutları. |
| **fable** | Önem sırasıyla eksikler: **1. metin girişi/input** (en temel form öğesi hiç yok) · **2. form doğrulama hatası** · **3. modal/diyalog** (`MessageBox` yasak deniyor ama ikamesi çizilmemiş — yasak var, alternatif yok) · **4. toast** (animasyonu tanımlı, görseli değil) · 5. tablo · 6. tooltip · 7. skeleton · 8. boş durum · 9. sekme (WPF'te var, web'de yok) · 10. select, arama, dosya bırakma, breadcrumb, sayfalama. |
| **Ben** | **Konseyin en büyük tek bulgusu bu.** Katılıyorum ve sıralamayı aynen kabul ediyorum. 3. maddeyi özellikle vurgularım: bir şeyi yasaklayıp yerine ne konacağını söylememek, kuralı uygulanamaz yapar — o yasak fiilen ölüdür. İlk dördü tek bir sözleşmede yazılabilir ve standardın kullanışlılığını en çok artıracak iş budur; tipografi düzeltmelerinden bile önce gelebilir. |

## B.5 Durumlar

| | |
|---|---|
| **Şu an** | Buton beş durumda tam. Disabled kontrastı bilinçli ve gerekçeli. |
| **fable** | Toggle'ın disabled'ı yok · slider'ın hover/focus/disabled'ı yok · değer hücresinin disabled'ı yok · ikon butonun basılı hâli yok. Öneri: `components.md`'ye her bileşen için beş-durum satırı zorunlu şablon; eksik durum "tanımsız" değil **"yasaklı boşluk"** sayılsın. |
| **Ben** | Katılıyorum, "yasaklı boşluk" ifadesi tam doğru. Beş durumdan biri yazılmamışsa bileşen bitmemiştir. |

## B.6 Hareket

| | |
|---|---|
| **Şu an** | Token ölçeği 90/160/240/360, iki platformda aynı. `prefers-reduced-motion` bloğu var ve `transition-property: opacity` inceliği düşünülmüş. |
| **fable** | **(1) `Theme.xaml`'daki `AppBgDonus` storyboard'unda `ClientAreaAnimation` kontrolü YOK** — SKILL kuralı yazıyor, asset uygulamıyor. Şablonu kopyalayan her WPF projesi kuralı bilmeden erişilebilirlik ihlali üretiyor. **(2)** `@property` ile custom-property animasyonu + tam ekran gradient yeniden boyama performansı ölçülmemiş. **(3)** `hover:scale-[1.02]` Tailwind utility'si reduced-motion bloğundan etkilenmiyor — `.tk-btn` korunuyor ama utility sınıfı anlık sıçrama yapıyor. **(4)** scale hit-test alanını büyütüyor, bitişik butonlarda titreşim riski. |
| **Ben** | **(1) bu raporun en ciddi tek bulgusu ve fable "en sinsi tür" derken haklı.** Kural dosyada, ihlal şablonda — kural yazılı olduğu için kimse aramıyor, şablon kopyalandığı için herkes ihlal ediyor. Bu bir hata kaydı açmayı hak ediyor. (3) küçük ama gerçek bir delik; reduced-motion bloğuna `*` seçicisiyle `transform: none` eklemek çözer. |

## B.7 Erişilebilirlik

| | |
|---|---|
| **Şu an** | Çift katman odak halkası (ölçülü), 24×24 hedef, dört maddelik klavye sözleşmesi, 2.4.11 örtülmeme, 2.5.7 sürükleme alternatifi. |
| **fable** | "Ortalamanın çok üstünde" — ama dört eksik: (a) `aria` kuralı yok, WPF'te `AutomationProperties.Name` hiç anılmıyor, **ikon-only buton ekran okuyucuya isimsiz**; (b) `sr-only` sınıfı yok; (c) yüksek kontrast modu (`forced-colors`) hiç ele alınmamış; (d) `aria-live` kuralı yok. Öneri: kısa bir "§5.8 ekran okuyucu" bölümü. |
| **Ben** | Katılıyorum. (a) bir A-seviyesi ihlalidir ve standardın AA hedefiyle çelişir; isimsiz interaktif öğe **yasak** diye yazılmalı, öneri olarak değil. |

## B.8 Platform paritesi

| | |
|---|---|
| **fable** | Ölçülebilir altı sapma: panel `backdrop-filter` CSS'te var WPF'te yok · panel gölgesi CSS'te var XAML'da yok · hover 0.80 vs 0.85 **ve** mekanizma farklı (arka plan rengi vs tüm öğe opaklığı — XAML'da yazı da soluyor) · hover `scale` CSS'te var XAML'da yok · odak halkası geometrisi 4px vs 3 DIP · hero glow 8px vs 10 blur. **Avalonia hiç yok** — ne asset ne referans satırı, oysa `standartlar.md` çok platformda Avalonia diyor. `Theme.xaml` Avalonia'da doğrudan çalışmaz. |
| **Ben** | Katılıyorum. Avalonia boşluğu bir çelişkidir: ürün standardımız "çok platformda Avalonia" derken arayüz standardımızın Avalonia karşılığı yok, yani kendi kuralımızı izleyen bir proje arayüz standardımızı uygulayamıyor. İki dürüst çıkış var: `Theme.axaml` yazmak, ya da "Avalonia desteklenmiyor" diye açıkça yazmak. **Sessiz boşluk en kötüsü** — fable'ın bu cümlesine katılıyorum. |

## B.9 İmza bloğu

| | |
|---|---|
| **fable** | Karar doğru, gerekçeleri sağlam. İki pürüz: (a) dar pencerede (~400px) daralma davranışı tanımsız; (b) `Signature.xaml`'da Border tıklanabilir görünüyor ama tıklamayı yalnız içteki `Hyperlink` alıyor — çipin padding'ine tıklamak boşa gidiyor, 24×24 hedef kuralı fiilen deliniyor. |
| **Ben** | Katılıyorum. (b) tam olarak B.6(1) ile aynı sınıf: kural var, şablon uygulamıyor. |

## B.10 Standardın kendisi — **ölçülmemiş ama kural gibi yazılmış maddeler**

| | |
|---|---|
| **Şu an** | `SKILL.md` 781 satır (~9-10k token) + üç referans dosyası. |
| **fable** | Ölçülmüş kurallar örnek nitelikte (kontrast tabloları, /50 kenarlık, çift katman halka). Ama yedi madde **ölçülmemiş olduğu hâlde ölçülmüş gibi** yazılmış: (1) "en az 11 durak" — 11'in ölçümü yok; (2) "döngü ≥ 40 s, açı ≤ 20°" — algı iddiası; (3) "skeleton ≥ 1.4 s" — kaynak yok; (4) "Türkçe %20-30 uzundur" — ölçüm gösterilmemiş, literatürde genelde Almanca için söylenir; (5) kenar çubuğu 240/48 DIP — gerekçesiz; (6) **pencere düğmeleri `SKILL:444` 42×30 vs `desktop:286` 52×36 — iki dosya farklı sayı, ikisi de ölçüsüz**; (7) yarıçap çelişkisi. |
| **Ben** | **Bu, benim tek başıma bulamayacağım türden bir bulgu ve konseyin varlık sebebi.** Standardın gücü ölçülmüşle ölçülmemişi ayırt etmesinden geliyordu; o ayrım yedi yerde silinmiş. Çözüm ölçüm yapmak değil — çoğu için gerekmez: **etiketlemek**. `(varsayılan, ölçülmedi)` ibaresi yeter. Ölçülmemiş bir sayıyı ölçülmüş gibi sunmak, gerçekten ölçülmüş sayıların da güvenilirliğini düşürüyor. |

## B.11 Karanlık / aydınlık

| | |
|---|---|
| **Şu an** | Yalnız karanlık. Aydınlık tema hiçbir dosyada anılmıyor. |
| **fable** | Neon kimlik karanlıkla var; `#00f3ff` beyaz zeminde ~1.4:1 veriyor, yani aydınlık versiyon 11 rengin tamamını, opaklık merdivenini ve glow mantığını sıfırdan ölçmeyi gerektirir. **Öneri: yapılmasın — ama karar açıkça yazılsın.** "Bu standart yalnız karanlıktır; aydınlık istenirse ayrı palet işidir." |
| **Ben** | Tamamen katılıyorum. `prefers-color-scheme: light` kullanıcısında da karanlık kalmak savunulabilir bir marka kararıdır; savunulamaz olan bunun hiçbir yerde yazmaması. |

---

# Karar tablosu

## Hemen yapılmalı — ucuz, risksiz, geri dönüşü kolay

| # | Ne | Nerede | Kim önerdi |
|---|---|---|---|
| 1 | Başlık/etiket ağırlığı **700 → 600** | `SKILL §3`, `theme.css`, `Theme.xaml` | fable · ikimiz de en yüksek öncelik |
| 2 | `--tk-lh-body: 1.5` · `--tk-lh-heading: 1.2` · `--tk-lh-mono: 1.4` · `--tk-measure: 65ch` | üç dosya | fable |
| 3 | h2 tracking `0.1em → 0.02em`, h3 `0.05em` | aynı | fable |
| 4 | Başlık boyutlarını ayır: h2 → 24, h3 → 18/20 | aynı | fable · ikimiz |
| 5 | `--tk-text-dim` ölü tokenını **sil** | üç dosya | fable · ikimiz |
| 6 | `font-variant-numeric: tabular-nums` gövdeye | `theme.css`, XAML | fable |
| 7 | Yarıçap çelişkisi (`layout.md:36` vs `SKILL §5`) | `layout.md` | fable |
| 8 | Pencere düğmesi çelişkisi (42×30 vs 52×36) | `SKILL:444` / `desktop:286` | fable |
| 9 | `Theme.xaml` `AppBgDonus`'a `ClientAreaAnimation` kontrolü | `Theme.xaml` | fable · **en ciddi bulgu** |
| 10 | "Renk tek başına anlam taşımaz" (WCAG 1.4.1) | `SKILL §2` | fable |
| 11 | Hero glow parametrelerini iki platformda eşitle | `theme.css`, `Theme.xaml` | fable |
| 12 | XAML'a `Hint` stili | `Theme.xaml` | fable |
| 13 | Ölçülmemiş yedi sayıya `(varsayılan, ölçülmedi)` etiketi | her yer | fable · ikimiz |
| 14 | Öncelik kuralı: "çelişkide `SKILL.md` kazanır" | `SKILL §0` | **ben** |
| 15 | "Bu standart yalnız karanlıktır" beyanı | `SKILL §0` | fable · ikimiz |
| 16 | Reduced-motion bloğuna `*` seçicisiyle `transform: none` | `theme.css` | fable |

## Kendi sözleşmesini hak eder — büyük ama net

| # | Ne | Neden |
|---|---|---|
| 17 | **Eksik bileşenler: input · form hatası · modal · toast** | Kapsama boşluğunun en büyük parçası; "MessageBox yasak" kuralı ikamesi olmadığı için fiilen ölü |
| 18 | Anlamsal renk katmanı (`danger` · `warning` · `info`) | Bugün hata ile uyarı aynı renk |
| 19 | `§5.8 ekran okuyucu` bölümü + isimsiz interaktif öğe yasağı | A-seviyesi ihlal |
| 20 | Beş-durum zorunlu şablonu ve eksiklerin doldurulması | toggle/slider/değer hücresi/ikon buton |
| 21 | Avalonia: `Theme.axaml` ya da açık "desteklenmiyor" beyanı | `standartlar.md` ile çelişki |
| 22 | Glow performans eşiği + ölçümü | Standardın en pahalı efekti, tek satır uyarısı yok |
| 23 | Pembe/mor renk körlüğü simülasyonu | Ölçülmedi; sonucu ne olursa olsun tabloya yazılmalı |

## Tartışmalı — senin zevkine bağlı, iki seçenekle

| # | Konu | (A) | (B) | Kimin eğilimi |
|---|---|---|---|---|
| T1 | **Font ailesi** | Inter Variable gömülü — nötr, güvenli, endüstri standardı | Atkinson Hyperlegible Next varsayılan — okunurluk felsefesinin doğal sonucu, daha karakterli | fable ikisini eşit tarttı · **ben B** |
| T2 | **Etiket rengi** | Mavi kalsın, hiyerarşi boyut/çizgiyle çözülsün | Etiket `purple-text`'e taşınsın, mavi yalnız başlık ve eylemde kalsın | **ben A** — önce boyutu ayır, renge sonra bak |
| T3 | **Hero 28 → 30** | 28 kalsın (regresyon riski yok, oran kusurlu) | 30 olsun (ölçek temiz) | **ben A**, ara yol: 14/16/20/24/28 |
| T4 | **Anlamsal renkler** | Mevcut hex'lere takma ad (`--tk-danger: var(--tk-pink)`) | Gerçek dördüncü renk (amber uyarı) | fable ikisini tarttı · **ben A** — kimliği sulandırmadan ayrımı kurar |
| T5 | **`SKILL.md` boyutu** | §5.4 gerekçelerini `references/motion.md`'ye taşı, ~500 satıra in | Olduğu gibi bırak, tek dosya bütünlüğü | fable ikisini tarttı · **ben A** |
| T6 | **Aydınlık tema** | "Asla, marka karanlıktır" yaz ve kapat | İleride ayrı iş olarak açık tut | fable ve ben: ikisi de olur, **sessiz kalmak olmaz** |

---

# Ayrıştığımız yerler

Konseyin çıktısı hemfikir olduğumuz yerde değil, ayrıştığımız yerdedir. Üç yer var:

1. **Font ailesi (T1).** fable iki seçeneği eşit tarttı ve karar için bana bıraktı; ben
   Atkinson'dan yanayım. Gerekçem: Inter'in tek avantajı tanıdık olması, bu standardın
   ise tanıdık olmak gibi bir amacı yok.
2. **Renk körlüğü (B.1-2).** fable "ölçülmeli" dedi; ben **ölçüm yapılana kadar kuralın
   şimdiden yazılmasını** istiyorum. Ölçülmemiş riski varsayılan olarak yok saymak,
   standardın kendi ilkesine aykırı.
3. **Öncelik kuralı (B.3).** fable tekil çelişkileri buldu; ben çelişkilerin **sınıfını**
   kapatacak tek satırı öneriyorum. İkisi birbirinin alternatifi değil, birlikte yapılmalı.

# Konseyin bana söylediği, tek başıma göremeyeceğim şey

Kullanıcı "font düzenini sevemedim" dediğinde benim ilk refleksim **font ailesine** bakmak
olurdu. fable ailenin değil, **ağırlık + tracking + renk üçlüsünün her başlık seviyesinde
aynı anda tekrarlanmasının** suçlu olduğunu gösterdi. Bu daha ucuz, daha kesin ve
geri alması daha kolay bir düzeltme: aile değişimi marka kararıdır, `700 → 600` bir hata
düzeltmesidir. Önce ikincisi yapılıp bakılmalı — belki şikâyet orada biter.

İkinci olarak: **kural–asset kayması** diye bir sınıf olduğunu bu inceleme öncesinde
adlandırmamıştım. Kuralın dosyada doğru yazılı olması, onu taşıyan şablonun doğru olduğu
anlamına gelmiyor ve kural doğru yazıldığı için kimse şablona bakmıyor. `Theme.xaml`'ın
reduced-motion kontrolü, imza çipinin tıklama alanı, XAML'daki eksik tracking — üçü de
aynı sınıf. Bu bir hata kaydı açmayı hak ediyor.
