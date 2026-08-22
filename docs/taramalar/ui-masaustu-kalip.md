# ui-masaustu-kalip — modern masaüstü uygulaması kalıpları (Electron / Tauri)

Mercek: uygulama düzeyi kalıplar ve pencere kromu. Beş depo, hepsine erişildi.
Tarih: 2026-08-22, tüm rakamlar `gh api` ile o gün alındı.

## Kısa cevap (çağrı mesajının iki sorusu)

**Uygulama düzeyi kalıpların durumu.** Standart bunların bir kısmını zaten tanımlıyor,
ama `references/layout.md` §5.7'de — SKILL.md gövdesinde değil:

**Var:** boş durum ("ne olduğu, neden boş, ilk adım düğmesi"), yükleme iskeleti (§5.7 +
SKILL §5.4'te döngü ≥1.4 s), bildirim yığını (4-6 sn, geri al varsa 10 sn), kip pencere /
açılır pano / şerit — dördü de layout.md §5.7'de.
**Yok:** **komut paleti** (hiç geçmiyor) ve **klavye kısayolu katmanı** (yalnız "Base UI
klavye gezinmesi hazır gelir", SKILL:43 — o bileşen içi gezinme).

Yani eksik iki tane; üçüncü eksik pencere kromunda (aşağıda). Var olanların yeri de yanlış:
boş durum ve iskelet her masaüstü uygulamasının olmazsa olmazı ama referans dosyasına
gömülü — SKILL §5.4 iskeleti "sonsuz döngü yasağı"nın istisnası olarak anıyor, kendisini
tanımlamıyor.

**Pencere kromu: özel mi yerel mi.** Alan artık ikili sormuyor, **üç kademeli** cevaplıyor.
Standart en pahalı kademeyi ilk tercih ilan ediyor (`desktop.md` §8: "Kendi başlık çubuğunu
çiz — tercih edilen yol"), ortadaki kademeyi bilmiyor. Electron ve Tauri'nin ikisi de
2026'da orta kademeyi API olarak sunuyor:

| Kademe | Electron | Tauri | Ne kaybolur |
|---|---|---|---|
| 1 · yerel çubuk, koyu | `titleBarStyle: 'default'` + dark mode | `decorations: true` | tema bütünlüğü |
| 2 · **çubuk gizli, düğmeler sistemin** | `titleBarStyle: 'hidden'` + `titleBarOverlay: {color, symbolColor, height}` (Win/Linux); macOS `hiddenInset` | `titleBarStyle: "Overlay"` | hiçbir OS davranışı |
| 3 · tamamen özel | `frame: false` | `decorations: false` | sürükleme, Snap, çift tık, kenardan boyut, `Alt+F4` |

Kademe 2'de sistem düğmeleri kalır ama **rengi bizim** olur (`color`, `symbolColor`) ve
içerik `env(titlebar-area-x)` / `env(titlebar-area-width)` / `env(titlebar-area-height)`
CSS değişkenleriyle düğmelerin altına girmeden yerleşir (Electron custom-title-bar
eğitimi; örnekteki geri düşüş `30px`). Standardın §8'de saydığı "geri takılacak altı
davranış" listesi bu kademede **hiç kaybolmuyor** — o liste kademe 3'ün maliyeti, evrensel
bir maliyet değil. Tauri belgesi de macOS için alternatif olarak saydam başlık çubuğu +
özel zemin öneriyor, yani kademe 2.

**İmza bloğu çakışması: evet, bir yerde.** SKILL §4 imzayı "ayarlar/hakkında en altında,
sağa yaslı" koyuyor; `desktop.md` §10 alt bilgi şeridinde "sağda destek bağlantısı ile
imza yan yana" diyor. Bildirim yığını (layout.md §5.7) masaüstünde yerleşik olarak **sağ
alt**ta durur. Üçü aynı köşeye çıkıyor. Çözüm ucuz: yığının demirleme köşesi tokenlanır ve
imza şeridi yüksekliği kadar yukarı itilir. Komut paletiyle çakışma yok — palet üstte açılır.

## 1 · Alanın bugün yaptığı

**microsoft/vscode** (1.134.0). Komut paleti tek bileşen değil, dört platform modülünün
üstüne kurulu katman: `src/vs/platform/` altında `commands`, `keybinding`,
`globalKeybindings`, `contextkey`, `quickinput` klasörleri ayrı duruyor. Sıra: eylem önce
**komut kaydına** girer, kısayol komuta bağlanır, `when` ifadesi geçerlilik koşulunu
söyler, palet kaydı okuyup listeler. Palet ayrı bir menü değil, kaydın görünen yüzü.
`src/vs/base/browser/ui/keybindingLabel` ayrı bir widget — kısayolun **ekranda nasıl
yazıldığı** da standartlaşmış.

UX kılavuzu yüzeyleri adlandırıyor: Activity Bar, Primary/Secondary Sidebar, Panel, Status
Bar, Command Palette, Quick Pick, Notifications, Views (welcome/boş durum), Webviews.
Bildirim kuralları buyurgan: "Show one notification at a time", "Add a **Do not show
again** option for every notification", "Don't leave a notification running in progress",
"Only use modal dialogs if you need immediate user interaction".

**raycast/extensions**. Liste + eylem paneli kalıbının en dar tanımı. `List`'te
`isLoading`, `searchBarPlaceholder`, `filtering`, `throttle`; `List.EmptyView` ayrı alt
bileşen (`title`, `description`, `icon`, `actions`). Kritik davranış kuralı belgede yazılı:
*EmptyView, `isLoading` true ve arama çubuğu boşken **asla** gösterilmez* — boş durum ile
yükleniyor durumu karıştırılamaz. `List.Item.keywords` başlık dışında aranabilir metin
ekler. `Keyboard.Shortcut.Common` **adlandırılmış** kısayol kümesi veriyor (`Copy`,
`CopyPath`, `Save`, `Duplicate`, `Edit`, `MoveUp`, `New`, `Open`, `Pin`, `Refresh`,
`Remove`, `ToggleQuickLook`…), her biri macOS/Windows'ta ayrı tuşa düşüyor — eklenti
yazarı tuş seçmiyor, **niyet** seçiyor.

**electron/electron** (v43.4.1). `titleBarStyle`: `default` (varsayılan), `hidden`,
`hiddenInset` (macOS), `customButtonsOnHover` (macOS, deneysel). `titleBarOverlay`
varsayılan `false`, alanları `color` / `symbolColor` (Win+Linux) ve `height`; height
verilmezse sistem yüksekliği (sayı belgede yok). `vibrancy` (macOS) 15 değer alıyor
(`sidebar`, `under-window`, `hud`, `titlebar`…); `backgroundMaterial` (Windows): `auto`,
`none`, `mica`, `acrylic`, `tabbed`. `roundedCorners` varsayılan `true` (Build 22000
öncesi etkisiz); `transparent` varsayılan `false` ve Windows'ta `frame: false` ister.

**tauri-apps/tauri** (tauri-v2.11.5). `decorations` varsayılan `true`; `titleBarStyle`:
`"Visible"` / `"Transparent"` / `"Overlay"`; `shadow` `true`; `transparent` `false`.
`windowEffects`: `mica`, `acrylic`, `blur`, `tabbed`, `vibrancy` + `state`, `radius`,
`color`. Sürükleme alanı `data-tauri-drag-region` **öznitelik**iyle işaretleniyor, belge
uyarıyor: yalnız doğrudan uygulandığı öğede çalışır. Çift tıkla büyütme hazır gelmiyor,
`e.detail === 2` kontrolüyle elle yazılıyor.

**alex8088/electron-vite** (v6.0.0-beta.1). Kurulum kalıbı tek fikir: üç derleme hedefi
(`main`, `preload`, `renderer`) tek yapılandırmada birleşiyor; `src/` içinde `config.ts`,
`build.ts`, `electron.ts`, `server.ts`, `preview.ts` bu ayrımı taşıyor.

## 2 · Standardın kaçırdığı

**1 — Komut kaydı ve komut paleti.** Nerede: vscode `platform/{commands,keybinding,
contextkey,quickinput}`; Raycast `ActionPanel`. Standart bugün hiçbir şey demiyor; eylemler
düğmelere dağınık duruyor. **Alınmalı — evet**, sebep estetik değil yapısal: komut kaydı
olmayan uygulamaya sonradan kısayol da palet de eklenemez, her eylem iki kez yazılır.
Girer: **yeni §5.8 "Uygulama kabuğu ve komut katmanı"**. Palet görünümü mevcut tokenlarla
çizilir (panel + liste + çip), yeni renk gerekmiyor.

**2 — Klavye kısayolu katmanı ve kısayolun ekranda yazımı.** Nerede: Raycast
`Keyboard.Shortcut.Common` (niyet bazlı, platforma göre tuş); vscode `keybindingLabel`.
Standart klavyeyi Base UI'a devrediyor (SKILL:43) — o bileşen içi gezinmedir, uygulama
düzeyi kısayol değildir. **Alınmalı — evet**, ama dar: adlandırılmış kısayol kümesi +
`Esc` kapatır kuralı + kısayolun çipte çizimi. Girer: aynı **§5.8**, çip §5.3'e bir satır.

**3 — Pencere kromu kademelendirmesi ve başlık çubuğu güvenli alanı.** Nerede: Electron
`titleBarStyle:'hidden'` + `titleBarOverlay` + `env(titlebar-area-*)`; Tauri
`titleBarStyle:"Overlay"`. `desktop.md` §8/§10 doğrudan kademe 3'ü tercih ilan ediyor,
kademe 2'yi anmıyor; Electron satırında `titleBarOverlay` hiç geçmiyor. **Alınmalı —
evet**: Snap/çift tık/kenardan boyutlandırma bedava kalırken çubuk yine temalı oluyor.
Girer: **desktop.md §8 ve §10** tablosuna üçüncü sütun.

Alınmayacak: `vibrancy` / `backgroundMaterial` / `mica` — sistem rengini pencereye sızdırır,
"tek bir sistem grisi kutu her şeyin özenini siler" kuralıyla çelişir. Not olsun, varsayılan
olmasın.

## 3 · Standardın haklı olduğu yerler

**Tema uygulamanın tamamını kaplar — `vibrancy`/`mica` reddi doğru.** Electron ve Tauri
sistem malzemesini kolay yoldan sunuyor ve alanın büyük kısmı kullanıyor. Ama bu API'lerin
ürettiği şey **kullanıcının duvar kâğıdının rengi**dir; neon paletle her makinede farklı
görünür ve `#000000` zemin varsayımını bozar. Reddi moda karşıtlığı değil, determinizm
tercihi. Koru.

**Kip pencere son çare, "emin misin?" yerine geri al.** VS Code kılavuzu aynısını söylüyor
("Don't use modal dialogs for showing messages that don't require an action"). Standart
alanın ilerisinde değil ama eşit ve gerekçesi sağlam. Koru.

**Geçiş tercihi, keyframe reddi ve 360 ms tavanı.** Bu taramada aksini gösteren kanıt
çıkmadı; incelenen depoların hiçbiri masaüstü kabuğunda keyframe tabanlı panel açılışı
kullanmıyor, hiçbiri belgelenmiş bir süre ölçeği yayımlamıyor. Karşılaştıracak sayı yok,
tavanı gevşetmek için sebep de yok. Koru.

## 4 · Ölçü ve token

| Ölçü | Standart | Alan | Not |
|---|---|---|---|
| Başlık çubuğu yüksekliği | 32–40px (desktop.md §8, §10) | Electron: sistem yüksekliği, `height` ile ezilir; örnek geri düşüş `env(titlebar-area-height, 30px)` | uyumlu |
| Başlık düğmesi tıklama alanı | **42×30 DIP** (SKILL §5.3) **ve** **52×36px** (desktop.md §10) | — | **standart kendi içinde çelişiyor** |
| Pencere köşe yarıçapı | 12px | Electron `roundedCorners: true` varsayılan; Tauri `windowEffects.radius` | uyumlu; kademe 2'de sistem çizer |
| Panel aç-kapa | §5 **500ms**, §5.4 tavan **360ms** | — | **standart kendi içinde çelişiyor** |
| Bildirim süresi | 4-6 sn, geri al varsa 10 sn | VS Code sayı vermiyor, "one at a time" diyor | standart daha kesin |

Başlık düğmesi ikonu (10–12px), panel geçişi (240ms), iskelet döngüsü (≥1.4 s) ve kenar
çubuğu (240/48 DIP) için alanda karşılaştırılacak belgelenmiş sayı **bulamadım** — beş
deponun hiçbiri süre veya ölçü ölçeği yayımlamıyor.

Çelişki notu: kalın iki satır bu taramanın yan ürünü, alan farkı değil. Konseye ayrıca
girdi olmalı — iki değer aynı anda doğru olamaz.

## 5 · Lisans

| Depo | Lisans | Son push | Son etiket | Açık issue | Yıldız |
|---|---|---|---|---|---|
| microsoft/vscode | MIT | 2026-08-22 | 1.134.0 (2026-08-19) | 20125 | 189270 |
| electron/electron | MIT | 2026-08-22 | v43.4.1 (2026-08-19) | 812 | 122654 |
| tauri-apps/tauri | Apache-2.0 | 2026-08-21 | tauri-v2.11.5 (2026-07-01) | 1438 | 110462 |
| raycast/extensions | MIT | 2026-08-22 | **etiketli sürüm yok** (API 404) | 1558 | 7703 |
| alex8088/electron-vite | MIT | 2026-08-18 | v6.0.0-beta.1 (2026-04-12) | 88 | 5585 |

Hepsi OSI onaylı, kod alınacaksa engel yok. Üç uyarı:

- **`@raycast/api` paketinin lisansı bu depoda değil** — depo MIT, API paketi ayrı
  dağıtılıyor ve lisansını **doğrulayamadım**. Buradan alınan şey yalnız *kalıp*.
- **electron-vite kararlı sürümde değil**: son etiket 2026-04-12 beta, dört aydır kararlı
  çıkmamış. Bağımlılık olarak seçilirse bu bilinerek seçilir.
- VS Code'un 20125 açık issue'su terk edilmişlik değil ölçek göstergesi (aynı gün push
  var); Raycast'in 1558'i içerik deposu olmasından — her eklenti ayrı issue.

Bu taramada indirilen varlık, kopyalanan kod yok.
