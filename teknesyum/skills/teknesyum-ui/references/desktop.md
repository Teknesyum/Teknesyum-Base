# Masaüstü ve yerelleştirme — Teknesyum neon

WinForms/WPF projelerinde zorunlu kurallar ve `locale/` yamaları. Web/React işinde
bu dosyayı okuma; `SKILL.md` yeter.

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

## 7.1 WPF'te yarım çizilen anahat — kök nedenler

"Sekmenin sağı ve altı yok", "onay kutusunun altı kesik" şikâyeti üslup değil, aşağıdaki
üç yapısal nedenden biridir. Anahat düzeltirken önce nedeni bul; `Margin`/`Padding` ile
itmek belirtiyi bir DPI'da gizler, diğerinde geri getirir.

**1 — Anahat, şablon kökünün kardeşiyse.** `ControlTemplate` kökü `Grid` olup çerçeve o
grid'in içinde ayrı bir `Rectangle`/`Border` ise, çerçeve kendi ölçüsünü kökten alır ve
stroke'un yarısı kontrolün çizim sınırının dışına düşer; dışarıda kalan yarı kırpılır.
**Anahat şablonun kökünün kendisi olur:**

```xml
<ControlTemplate TargetType="TabItem">
  <Border x:Name="TabOutline" BorderThickness="1" CornerRadius="6"
          SnapsToDevicePixels="True" UseLayoutRounding="True">
    <ContentPresenter ContentSource="Header" Margin="{TemplateBinding Padding}"/>
  </Border>
</ControlTemplate>
```

**2 — Kapsayıcının kendi varsayılan şablonu kırpıyorsa.** `TabControl`'ün varsayılan
şablonundaki `TabPanel` başlıkları kendi sınırına sıkıştırır; `TabItem` üzerinde
`ClipToBounds="False"` vermek yetmez, kırpan üsttekidir. Kapsayıcının **şablonu da**
değiştirilir, başlıklar `IsItemsHost="True"` bir `StackPanel`'e alınır:

```xml
<ControlTemplate TargetType="TabControl">
  <Grid ClipToBounds="False">
    <Grid.RowDefinitions><RowDefinition Height="Auto"/><RowDefinition Height="*"/></Grid.RowDefinitions>
    <StackPanel Grid.Row="0" IsItemsHost="True" Orientation="Horizontal"
                ClipToBounds="False" Margin="0,0,0,2"/>
    <ContentPresenter Grid.Row="1" ContentSource="SelectedContent"/>
  </Grid>
</ControlTemplate>
```

Aynı sorun `ToolBar`, `Menu`, `ListBox` başlık şeritleri için de geçerlidir: neon anahat
verdiğin her `ItemsControl`'ün items host'unun ne olduğunu kontrol et.

**3 — Panele sabit `Height` verilmişse.** `Height="260"` bir sözleşme değil, kesme
emridir: yazı tipi, DPI ölçeği veya dil değiştiğinde içerik büyür, panel büyümez ve en
alttaki kontrolün (genelde onay kutusu satırı) alt kenarı kaybolur. **Panelde `Height`
değil `MinHeight` kullanılır** — hizalama korunur, içerik gerekince taşar.

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
