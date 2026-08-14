---
name: teknesyum-ui
description: Neon arayüz standardı. Herhangi bir kullanıcı arayüzü, panel, pencere, sayfa, bileşen veya CSS/XAML yazarken ya da mevcut bir arayüzü değiştirirken kullan. Renk paleti, tipografi ölçeği, başlık hiyerarşisi, bileşen kalıpları ve imza/sponsor bloğunu içerir. Web, React, Electron ve WPF/WinForms projelerinin hepsini kapsar. Ayarları /teknesyumui komutuyla değiştirilir veya tamamen kapatılır.
---

# Neon UI standardı

## 0. ÖNCE KULLANICI AYARINI OKU

`~/.claude/teknesyum-ui.json` varsa oku. Yoksa aşağıdaki varsayılanlar geçerlidir.

- `"kapali": true` → **bu skill'i uygulama.** Kullanıcının kendi tercihiyle veya projenin
  mevcut tarzıyla devam et, hiçbir token dayatma. Burada dur.
- `"palet"`, `"tipografi"`, `"imza"` alanları varsa aşağıdaki varsayılanları **ezer**.
- `"ekNot"` alanı varsa kullanıcının kendi yazdığı kuraldır — varsayılanlarla çelişirse
  **kullanıcının notu kazanır**.

Projeye özel ezme: `<proje>/.claude/teknesyum-ui.json`. O varsa kullanıcı geneline üstündür.

## 1. Kurulum (yeni proje)

| Stack | Kopyala | Nereye |
|---|---|---|
| Tailwind v4 | `assets/theme.css` | `src/index.css` başına |
| Düz CSS / Vanilla | `assets/theme.css` | `src/theme.css`, `<link>` ile bağla |
| WPF / .NET | `assets/Theme.xaml` | `Themes/Theme.xaml`, `App.xaml` MergedDictionaries |
| WinForms / CLI | `assets/Palette.cs` | proje köküne |

## 2. Palet (varsayılan)

```
neon-blue    #00f3ff   birincil. eylem, aktif durum, sayısal vurgu, başlık
neon-pink    #ff00ea   ikincil. uyarı, ters/negatif eylem, kritik değer
neon-purple  #b026ff   üçüncül. mod anahtarları, scrollbar, ikincil buton
success      #34d399   yalnızca "tamamlandı"
surface      #08090a   panel zemini (95% opak)
text         #d1d5db gövde · #9ca3af başlık-alt · #6b7280 etiket · #4b5563 ipucu
```

Bir ekranda **mavi baskın, pembe vurgu, mor seyrek**. Üçünü eşit kullanma.

Glow şart: renkli metin `drop-shadow(0 0 5px <renk>)`, dolgulu buton
`box-shadow: 0 0 20px <renk>40`, çerçeveli kutu `inset 0 0 8px <renk>`. Glow'suz neon yok.

Opaklık merdiveni — sadece bunlar: dolgu `/10`, hover `/20`, aktif `/30`, çerçeve `/30`,
güçlü çerçeve `/50-60`.

## 3. Tipografi (varsayılan)

Sans: `'Segoe UI', system-ui, -apple-system, sans-serif` — metin, etiket, başlık.
Mono: `Consolas, 'Cascadia Mono', ui-monospace, monospace` — **her sayı, tuş, kod, ID,
süre**. Sayıyı sans ile yazma.

| Rol | Boyut | Ağırlık | Tracking | Renk |
|---|---|---|---|---|
| Panel başlığı (h2) | 18px | 700 | 0.1em | neon-blue + glow |
| Bölüm başlığı (h3) | 14px | 700 | 0.1em UPPERCASE | `#9ca3af` |
| Etiket | 10px | 700 | 0.15em UPPERCASE | `#6b7280` |
| Gövde | 13px | 400 | 0 | `#d1d5db` |
| Mono değer | 14px | 700 | 0 | neon-pink |
| Hero sayı | 24px | 900 | 0 | neon-blue + glow |
| İpucu | 10px | 400 | 0 | `#4b5563` |

Ölçek 10 → 13 → 14 → 18 → 24. Ara boyut ekleme.

## 4. İmza bloğu

Varsayılan **açık**. Her projede tam olarak bir tane, **ayarlar veya hakkında bölümünün
en altında**, sağa yaslı, küçük, sessiz. Ana ekranda değil.

Hazır bileşen: `assets/Signature.tsx` (React) · `assets/Signature.xaml` (WPF).
Linkler ve metinler `assets/links.json`'da:
- GitHub: `https://github.com/Teknesyum`
- Destek: `https://github.com/sponsors/Teknesyum` — **aktif**

Destek düğmesi **anahat**tır: zemin `transparent`, çerçeve `neon-purple/50`, yazı ve ikon
`neon-purple` + text-shadow glow. Dolgulu kutu, gri kutu veya emoji ikon (`☕`) kullanma —
ikon 12px `stroke="currentColor"` SVG/Path olarak çizilir. Hover'da çerçeve tam opaklığa
çıkar ve dış glow açılır; dolgu hover'da da gelmez.

Kullanıcı ayarında `"imza": { "kapali": true }` varsa **ekleme**.
`"imza": { "metin": "...", "github": "...", "sponsor": "..." }` varsa onları kullan.

## 5. Bileşen kalıpları

Kopyalanabilir sınıflar: `references/components.md`. Sadece bir bileşenin tam kodu
lazımsa oku.

Panel: `bg-[#08090a]/95 backdrop-blur-xl border border-neon-blue/20 rounded-2xl p-6
shadow-[0_0_40px_rgba(0,0,0,0.8)]`
Radius: kutu `16px`, buton/kart `12px`, hücre `8px`, çip `6px`. Başka değer yok.
Aralık: 4 / 8 / 12 / 16 / 24. Panel padding `24px`, bölüm arası `24px`, satır arası `12px`.
Geçiş: `200ms` mikro, `300ms` renk/glow, `500ms` panel aç-kapa. Hover `scale(1.02)` buton,
`1.1` ikon.

## 6. Sık yapılan hatalar

- Rastgele Tailwind rengi (`text-cyan-400`) → token kullan
- Sayıyı sans font ile yazmak → mono
- Glow'suz neon renk → ölü görünür
- Başlıkta tracking/uppercase unutmak
- İmza bloğunu ana ekrana koymak → ayarların altına

## 7. Taşma ve kırpılma — masaüstü (WinForms/WPF) için zorunlu

Neon tema koyu olduğu için kırpılan içerik **görünmez olur**, kullanıcı eksik olduğunu fark etmez.
Bu yüzden aşağıdakiler kural, tercih değil.

**Hiçbir metin ve hiçbir buton kırpılmaz.** Sığmayan metin `...` ile kısaltılır
(WinForms `AutoEllipsis = true`, WPF `TextTrimming="CharacterEllipsis"`), tam değeri tooltip'te
verilir. Kırpılan bir düğme etiketi ("Kur / Güncelle" yerine "Güncelle" görünmesi) hatadır.

**Buton şeridi eleman düşürmez.** Sığmıyorsa ya sarar ya pencerenin minimum genişliği yükseltilir.
Birincil eylemin kaybolduğu bir boyut olamaz.

**Sabit yükseklikli satıra sabit sayıda kontrol koyarken sayıyı doğrula.** Üç radyo düğmesi
72px'e sığmaz; 3 × 32 = 96px gerekir. `AutoSize` satır + `Dock=Fill` çocuk birlikte kullanılırsa
satır yüksekliği yanlış ölçülür ve alttaki içerik üste biner — bu kombinasyonu kullanma,
o satırı `Absolute` yap ve yüksekliği elle hesapla.

**İmza bloğu kendi satırında durur.** Buton şeridiyle aynı satırı paylaşmaz, hiçbir kontrolün
üstüne binmez.

**Pencere, içeriğini varsayılan boyutunda eksiksiz gösterecek kadar büyük açılır.** "Kullanıcı
büyütür" bir çözüm değil. `MinimumSize`, en kalabalık ekranın sığdığı boyuttan küçük olamaz.

**Native scrollbar'lar koyulaştırılır.** WinForms/Win32'de varsayılan scrollbar beyazdır ve
koyu temayı bozar: uygulama açılmadan `uxtheme.dll` ordinal 135 `SetPreferredAppMode(2)`,
sonra her kaydırılabilir kontrole `SetWindowTheme(handle, "DarkMode_Explorer", null)`.
Ordinal belgelenmemiştir — `try/catch` ile sar, başarısızlıkta uygulama açılmaya devam etsin.

**Doğrulama:** ekran görüntüsünü **varsayılan boyutta ve `MinimumSize`'da** al, dosyayı aç ve bak.
Bakmadan "düzeldi" deme.

## 8. Pencere çerçevesi ve başlık çubuğu — masaüstü

**Sistem başlık çubuğu bırakılmaz.** Kapat/küçült/büyüt şeridi işletim sisteminin açık gri
çizimiyle gelirse neon pencerenin tepesinde temaya ait olmayan bir bant kalır. İki kabul edilebilir
çözüm var, sırayla tercih edilir:

1. **Kendi başlık çubuğunu çiz** (`FormBorderStyle.None` + özel caption). Tercih edilen yol.
2. Çizemiyorsan en azından koyulaştır (`DWMWA_USE_IMMERSIVE_DARK_MODE`). Geçici çözümdür.

Kendi çubuğunu çizerken **kaybetmemen gerekenler** — bunlar unutulursa pencere kullanılamaz hâle
gelir ve kullanıcı sebebini anlayamaz:

- Sürükleyerek taşıma, **çift tıkla büyüt/geri al**
- Aero Snap (kenara/köşeye sürükleme, `Win`+ok) — `WM_NCHITTEST` ile kenar bölgeleri bildirilmeli
- Kenar/köşeden yeniden boyutlandırma
- `Alt`+`F4`, sistem menüsü, görev çubuğu önizlemesi
- Büyütüldüğünde çalışma alanını taşmama (görev çubuğunun altına girmemek)
- Odak durumuna göre başlık rengi: odaklıyken neon-blue, odak dışıyken sönük

Başlık çubuğundaki düğmeler palet dışına çıkmaz; kapatma düğmesi hover'da neon-pink,
diğerleri neon-blue. Yükseklik 32-40px arası, ikonlar 10-12px.

**Uygulama kimliği başlık çubuğunda durur:** ikon + uygulama adı. Dosya yolu, config yolu gibi
teknik bilgiler başlık şeridine değil, ilgili panele veya alt bilgi satırına konur.

## 9. Dil yamaları — `locale/` klasörü

Metin koda gömülmez. Her projede kökte `locale/` klasörü olur ve **çeviri yapan kişi kod
görmeden çalışabilir**. Ölçüt şudur: dili bilen ama projeyi bilmeyen biri tek bir dosyayı
kopyalayıp çevirebiliyorsa doğru; koda girip string aramak gerekiyorsa yanlış.

```
locale/
  tr.json      # kaynak dil, tam ve eksiksiz
  en.json      # çeviri
  README.md    # çevirmene tek sayfa: dosyayı kopyala, değerleri çevir, anahtara dokunma
```

**Dosya biçimi** — düz JSON, tek seviye, anahtar `alan.nesne.durum` kalıbında:

```json
{
  "app.title": "Runly Ayarları",
  "btn.addExtension": "Uzantı ekle",
  "status.installed": "Runly kurulu",
  "status.notInstalled": "Runly kurulu değil"
}
```

Kurallar:

- **Anahtar asla çevrilmez, asla yeniden adlandırılmaz.** Anahtar değişirse tüm diller kırılır.
- **Diller aynı anahtar kümesine sahiptir.** Eksik anahtar sessizce boş metin üretmez —
  kaynak dile düşer ve bunu bir kez günlüğe yazar.
- **Yer tutucular adlıdır:** `{count}`, `{path}` — sıralı `{0}` değil. Çevirmen cümlede
  sırayı değiştirebilmeli.
- **Cümle parçalarını birleştirme.** `"Toplam " + n + " dosya"` yerine
  `"file.total": "Toplam {count} dosya"`. Parçalı birleştirme çevrilemez.
- **Anlam ve koşul dillerde aynıdır.** Özellikle güvenlik ve onay metinlerinde: bir dilde
  "değiştirilecek", diğerinde "değiştirilebilir" olamaz.
- Varsayılan dil `tr`. Seçim kullanıcı ayarına (`config.json` / `settings`) yazılır ve
  bir sonraki açılışta korunur.

**Yükleme yolu platforma göre değişir, klasör düzeni değişmez:**

| Platform | Yol |
|---|---|
| Web / React / Electron | `locale/*.json` doğrudan `import` edilir veya `fetch` ile okunur |
| .NET (normal) | JSON gömülü kaynak (`EmbeddedResource`) + `Strings.Get(key)` |
| .NET **NativeAOT** | JSON'dan derleme öncesi üretilen sözlük. **`.resx`/uydu derleme kullanma** — AOT'de uydu derlemeleri çözülmez. |
| WPF | `Strings.Get` üzerinden markup extension; `x:Uid`/resx zorunlu değil |

**Arayüz tarafı iki şey borçlu:**

1. `TR | EN` anahtarı görünür bir yerde durur (üst şerit veya alt bilgi satırı), seçim anında
   uygulanır — yeniden başlatma istemez.
2. **Yerleşim en uzun dile göre ölçülür.** İngilizce ve Almanca metinler Türkçeden uzun olur;
   sabit genişlikli düğme ve sütunlar bu yüzden kırpar. §7 doğrulaması **her dil için** yapılır:
   ekran görüntüsünü al, dosyayı aç, bak.

## 10. Varsayılanlar — tartışılmadan uygulanır

Bunlar her yeni arayüzde başlangıç hâlidir. Aksini yapmak için gerekçe gerekir, uygulamak için değil.

**Pencere köşeleri yuvarlatılır.** Keskin dikdörtgen pencere neon temayla uyuşmuyor; yarıçap
**12px**. Çerçevesiz pencerede (§8) işletim sistemi yuvarlatma uygulamaz — şekli kendin kırp
(WinForms `Region`, WPF `Border.CornerRadius` + `WindowChrome`, web `border-radius`).
**Büyütülmüş pencere kare kalır:** ekran kenarında yuvarlatılmış köşe arkadaki masaüstünü
gösterir. Bu yüzden köşe bölgesi her yeniden boyutlandırmada yeniden hesaplanır.

**Tablo içeriği ortalanır.** Başlık satırı da, hücreler de yatayda ortalı
(`MiddleCenter` / `text-align: center`). Sola dayalı sütun karışımı ızgarayı dağınık gösteriyor;
tek hizada okunuyor. Sütun genişliği içeriği ortalanmış hâlde sığdıracak kadar geniş olmalı —
ortalanmış metin kırpılırsa iki yanından birden kaybeder ve okunmaz olur (§7).

**Kendi başlık çubuğunu çizen pencere, işletim sisteminin davranışlarını geri takar.** Çerçevesiz
pencere kenardan boyutlandırmayı, kenara yaslamayı (Aero Snap) ve başlığa çift tıkla ekranı
kaplamayı kaybeder; hit-test'i doğru yazmak yetmez, pencerenin `WS_THICKFRAME` ve `WS_MAXIMIZEBOX`
stillerini de taşıması gerekir. Stiller eklenince doğan görünür çerçeve `WM_NCCALCSIZE`'a sıfır
dönerek yok edilir. Üstelik kenarları `Dock=Fill` bir çocuk denetim kaplıyorsa pencerenin hit-test'i
oraya hiç ulaşmaz — **üç kenarda 7px tutamak payı bırakılır**. Bu üçü birlikte çalışır; biri
eksikse üç davranış birden sessizce ölür. Teslimden önce dördü de (yasla, çift tık, kenardan çek,
`Alt`+`F4`) fiilen denenir.

**Vurgu zeminleri opak verilir.** Bir satırı ya da rozeti neon renkle hafifçe boyamak için
`rgba(accent, .16)` düşünülür ama bunu doğrudan hücre/satır zeminine yazmak WinForms
`DataGridView`'da beyaz bir blok üretir: hücre dolgusu alfa kanalını yok sayar. Tint, yüzey
rengiyle **önceden karıştırılıp opak** verilir. Web/XAML'de alfa çalışır; ölçüt şu — zemin rengini
kendi çizmeyen bir denetime yarı saydam renk verme.

**Başlık çubuğu düğmeleri görünür boyutta ve beyaz çizilir.** Kapat/büyüt/küçült simgeleri harf
değil çizgidir; 12pt altında kenar yumuşatma onları griye çevirir ve kullanıcı "sönük" görür.
Tıklama alanı **52×36px**, simge yazı tipi **12pt**, duruk renk `#F3F4F6` (`TextStrong`).
Renk yalnız hover'da neona döner: büyüt/küçült neon-blue, kapat neon-pink.

**Paletteki `TextStrong` (`#F3F4F6`)** gövde metninden bir kademe parlak; başlık çubuğu simgeleri
ve öne çıkması gereken tekil işaretler için. Gövde metni yine `TextBody` (`#D1D5DB`).

**Alt bilgi şeridi tek satır ve mümkün olan en kısa.** Etiket yazı tipi + alt uzantısı kadar
yükseklik (ölçülen: 18px), üstündeki düğme sırasına yapışık. İçerik: solda durum noktası,
durum metni, sürüm ve dil anahtarı; **sağda destek bağlantısı ile imza yan yana, önce destek
sonra imza**. Destek bağlantısı imzadan koparılıp sola atılmaz — ikisi tek bir künye okunur.
**Bağlantı ve değer metinleri neon-blue**, yalnız durum noktası anlamına göre renklenir
(kurulu `#34D399`, değil `#4B5563`).

**Panel başlıkları neon-blue çizilir.** `GÜVENLİK` / `DAVRANIŞ` / `AYRINTILAR` gibi bölüm
başlıkları gri değil, `#00F3FF`. Gri bırakılırsa panel çerçevesi renkli, içindeki başlık sönük
kalıyor ve bölüm başlığı gibi okunmuyor. Bunun **altındaki** "Etiket" rolü (alan üstü küçük
harf aralıklı yazılar) sönük kalmaya devam eder — hiyerarşiyi ayıran şey o karşıtlık.
