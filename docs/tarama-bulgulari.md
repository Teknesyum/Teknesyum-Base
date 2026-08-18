# Tarama bulguları

Rota: `ROTA-kutuphane-taramasi.md`. Her kayıt üç alan taşır: lisans, alınacak kural,
alınmayacak kısım.

---

## D1 — Animasyon ve etkileşim

### motion (eski Framer Motion) — **alındı, varsayılan**

MIT. `npm install motion`, import `motion/react`. Tree-shakeable; tam paket ~85 KB,
mini kullanım ~5 KB seviyesine iniyor. Aylık 16M+ indirme, ekosistemin fiilî standardı.

Alınacak: React/Electron tarafında varsayılan animasyon katmanı. `useReducedMotion`
hazır geliyor, §5.4'ün zorunlu kıldığı davranışı elle yazmaya gerek kalmıyor.

Alınmayacak: `layout` animasyonlarının serbestçe kullanılması. Yerleşim animasyonu
§5.4'e göre yalnızca kullanıcı eylemiyle başlar; `layout` prop'u her veri değişiminde
kutuları oynatır.

### @formkit/auto-animate — **alındı, ikinci katman**

MIT. ~3.3 KB. Tek satır: `const [parent] = useAutoAnimate()`. Yalnızca üç olayı
canlandırır — çocuk eklendi, silindi, yer değiştirdi.

**`prefers-reduced-motion` açıkken kendini otomatik kapatıyor.** Bu, standardımızın
zorunlu kıldığı davranışın kütüphane tarafından garanti edilmesi demek.

Alınacak: liste, tablo satırı, bildirim yığını, akordeon gibi yerlerde varsayılan.
`motion` ile birlikte kullanılır; çakışmaz, çünkü farklı işi yapar.

Alınmayacak: sayfa geçişi ve karmaşık koreografide kullanılması — orası `motion`'ın işi.

### GSAP — **alınmadı**

v3.13'ten (Nisan 2025) beri eklentileri dahil tamamen ücretsiz ve ticari kullanıma açık.
Güçlü, ama ağırlık merkezi "hareketin ürünün kimliği olduğu" siteler: kaydırma tabanlı
editoryal sayfalar, ödül avcısı portfolyolar.

Bizim ürünlerimiz her gün açılan masaüstü araçları. §5.4'ün 360 ms tavanı ve
"söyleyeceği bir şey yoksa animasyon yok" düsturu GSAP'ın getirdiği gücü zaten
kullanılamaz kılıyor.

Alınacak: yok. Tanıtım sayfası istisnasında (§5.5) kullanılabilir, standarda girmiyor.

### Karar

React/Electron yığınında iki kütüphane varsayılan sayılır ve `teknesyum-ui` §1 kurulum
tablosuna girer: `motion` + `@formkit/auto-animate`. İkisi de MIT, ikisi de
`prefers-reduced-motion` farkında.

---

## D2 — Bileşen kaynakları ve lisanslar

### Base UI — **alındı, temel katman**

MIT. Aralık 2025'te v1.0 kararlı, 35 bileşen. MUI'nin tam zamanlı mühendisliğiyle
geliştiriliyor; Radix'i yazan mühendislerin bir kısmı burada.

**Temmuz 2026'dan beri shadcn/ui yeni projelerde varsayılan olarak Base UI kullanıyor.**
Radix bırakılmadı ama WorkOS satın almasından sonra güncellemeleri yavaşladı; Combobox
gibi karmaşık bileşenlerde geride.

Alınacak: erişilebilirlik ve klavye davranışı için temel katman. Görünüm bize ait,
davranış oradan gelir. Odak yönetimi, `aria-*`, kaçış tuşu, dış tıklama, portal —
bunları elle yazmak hata üretiyor.

Alınmayacak: varsayılan görünümü. Base UI stilsiz gelir, zaten sorun yok.

### shadcn/ui — **yöntem olarak alındı, bağımlılık olarak değil**

MIT. Asıl değeri bileşenlerinde değil **dağıtım yönteminde**: bileşen kaynağı projeye
kopyalanır, npm bağımlılığı olmaz. Kullanıcı kodu sahiplenir, sürüm yükseltmesi kimseyi
kırmaz.

Alınacak: kendi bileşen depomuz (§4 kararı) aynı yöntemle kurulur — kopyalanan kaynak,
gizli paket değil.

Alınmayacak: shadcn'in kendi tema değişkenleri (`--background`, `--muted-foreground`).
Bizim tokenlarımız var, ikisi çakışır.

### Magic UI — **kısıtlı alım**

MIT, 150+ animasyonlu bileşen, ticari kullanım serbest. Kaynak olarak kullanılabilir;
§5.6 gereği alınan bileşen tokenlara çevrilir ve animasyonu tavanlara indirilir.

Alınmayacak: "animated beam", "glowing border", "dynamic background" ailesi. Bunlar
tanıtım sayfası malzemesi (§5.5), uygulama içine girmez.

### Animata — **kısıtlı alım**

Açık kaynak ve ücretsiz. El yapımı animasyon parçacıkları. Magic UI ile aynı muamele.

### React Bits — **dikkat: MIT + Commons Clause**

Uygulamada kullanmak serbest, ama **kütüphanenin kendisini ürün olarak satmak yasak.**
Bizim için pratik sonuç: bileşeni projeye almak sorunsuz; ancak Teknesyum Base'in kendi
bileşen deposuna birebir kopyalayıp dağıtmak riskli — çünkü o dağıtım "kütüphaneyi
yeniden dağıtmaya" yaklaşır.

Karar: React Bits'ten **ilham alınır, birebir kopyalanmaz** (§5.6 madde 2).

### Aceternity UI — **alınmadı**

Katmanlı model; Pro tarafı ayrı ticari lisans. Ücretsiz kısmın lisansı net değil.
§5.6 gereği belirsiz lisans = kopyalama yok.

### Uiverse — **kaynak olarak evet, kalite denetimiyle**

MIT, 5000+ topluluk bileşeni. Kalite denetimi yok: çoğu `box-shadow` ve `width`
animasyonluyor, `prefers-reduced-motion` neredeyse hiç yok.

Alınacak: mikro etkileşim fikirleri.
Alınmayacak: kodun kendisi — §5.4'e uydurmak yeniden yazmakla aynı maliyette.

### Karar

Katman sırası: **Base UI (davranış) → teknesyum tokenları (görünüm) → motion +
auto-animate (hareket)**. Bileşen kaynakları bu üçlünün üstüne fikir verir, kod vermez.

---

## D3 — Erişilebilirlik ve hareket standartları

### WCAG 2.2 — **alındı, ölçüler sertleşiyor**

W3C tavsiyesi (Ekim 2023), dokuz yeni ölçüt. Üçü doğrudan bizim standardı ilgilendiriyor.

**2.5.8 Hedef boyutu (AA): en az 24×24 CSS piksel.** §5.3'te onay kutusu hücresini
24×24 yapmıştık — sezgiyle konan bu ölçü meğer standardın kendisiymiş. Artık kural tüm
tıklanabilir hedefler için geçerli: ikon düğmesi, kapat çarpısı, sekme, satır içi
bağlantı.

**2.4.13 Odak görünümü (AAA): odak halkası, kontrolün çevresinde 2 CSS piksel kalınlığında
bir çerçeve alanı kadar olmalı ve 3:1 kontrast taşımalı.** Bizim 1 DIP konturumuz odak
için yetmiyor — odak halkası ayrı ve daha kalın olmalı.

**2.5.7 Sürükleme hareketleri (AA): sürükleyerek yapılan her işin tek dokunuşluk bir
alternatifi olmalı.** Dosya sürükle-bırak alanı olan her arayüzde "Dosya seç" düğmesi
zorunlu — bu bizde zaten alışkanlık, artık kural.

Alınmayacak: WCAG'in tamamına AAA uyum hedefi. AA taban, AAA yalnızca odak görünümünde.

### Material Design 3 — **kısmen alındı, çapraz doğrulama**

Süre belirteçleri: short1 50 ms, short2 100 ms, medium1 250 ms, medium2 300 ms,
long1 450 ms, long2 500 ms. Yumuşatma iki aile: `Emphasized` ve `Standard`.

Bizim ölçeğimiz (90/160/240/360) M3'ün kısa-orta bandına oturuyor; 450-500 ms bandını
bilinçli olarak almıyoruz — o band mobil sayfa geçişi içindir, masaüstü aracında uzun.

Alınacak tek fikir: **giren ve çıkan hareket farklı eğri kullanır** (decelerate / accelerate).
Bu bizde zaten `--tk-e-out` ve `--tk-e-in` olarak var; M3 bunu doğruluyor.

Alınmayacak: `Emphasized` ailesinin abartılı ivmelenmesi ve M3'ün renk/şekil sistemi.

### Karar

§5.3'e hedef boyutu tabanı (24×24) ve odak halkası kuralı (2 px, 3:1) girer.
§5.4'e sürükleme alternatifi kuralı girer.

---

## D4 — Masaüstü: WPF ve Electron

### WPF UI (lepo), HandyControl, MahApps.Metro — **alınmadı, gerekçesi önemli**

Üçü de açık kaynak ve olgun. Sundukları şey **hazır bir görsel kimlik**: WPF UI Fluent
(Windows 11), MahApps Metro, HandyControl kendi dili.

Sorun tam da bu. Bizim kimliğimiz var; bu kütüphanelerden birini almak, tema tutarlılığını
onların kurallarına devretmek demek. §8'in "projenin bir kısmı neon bir kısmı native
olmasın" kuralıyla doğrudan çatışıyor: kütüphanenin kendi denetimleri neon olmaz,
bizimkiler Fluent olmaz, ortaya melez çıkar.

Alınacak tek şey **fikir**: üçü de native `ScrollBar`, `ComboBox` popup'ı ve `MessageBox`
gibi sızıntı noktalarını şablonla değiştiriyor. §8'in sızıntı tablosu zaten aynı listeyi
tutuyor; onların şablon yapısı bize hangi denetimlerin gerçekten yeniden şablon istediğini
gösteren bir kontrol listesi olarak yarıyor.

**Yeniden değerlendirme koşulu:** bir gün yüksek kontrast modu veya ekran okuyucu desteği
gerekirse WPF UI'ın erişilebilirlik altyapısı bakılmaya değer.

### WPF'te bize gereken şey kütüphane değil

Özel başlık çubuğu için `WindowChrome` .NET'in içinde. Animasyon için `Storyboard` yeterli.
Yeni bağımlılık gerekmiyor; §5.4'ün WPF karşılıkları bunu zaten söylüyor.

### Electron: electron-vite + electron-builder — **alındı**

`electron-vite` Vite tabanlı derleme; ana süreç, ön yükleyici ve arayüz üçünü tek
yapılandırmayla derliyor. `electron-builder` kurulum paketi, kod imzalama ve otomatik
güncelleme sağlıyor; Windows, macOS, Linux.

Electron Forge resmî iskele aracı ve şablon sunuyor. İkisi arasında seçim: **Forge şablon
verir, electron-vite hız verir.** Bizim projelerde arayüz React + Vite olduğu için
electron-vite doğal taraf.

Alınacak: yeni Electron projesinde varsayılan iskele `electron-vite`, paketleme
`electron-builder`. Bu §1 kurulum tablosuna girer.

Alınmayacak: Forge'un kendi şablonları — proje düzeni kuralımız (relay §1.2) ile
çakışıyor, kökü kalabalıklaştırıyor.

### Karar

Masaüstünde tema kütüphanesi alınmıyor, iskele araçları alınıyor. Sebep aynı cümlede:
**görünüm bizim, altyapı onların.**

---

## D5 — Ajan sistemi: SDK, hafıza, MCP

### Ajan hafızası (`memory:` alanı) — **alındı, en değerli bulgu**

Claude Code v2.1.33 (Şubat 2026) ile her adlandırılmış alt ajan **kalıcı, markdown tabanlı
bir bilgi deposu** alabiliyor. Frontmatter'a tek satır:

```yaml
memory: project
```

Kapsam üç değerden biri:

| Değer | Yer |
|---|---|
| `user` | `~/.claude/agent-memory/<ajan>/` |
| `project` | `.claude/agent-memory/<ajan>/` |
| `local` | `.claude/agent-memory-local/<ajan>/` |

Bu, alt ajanların en büyük zaafını kapatıyor: **alt ajan sıfırdan başlar, koordinatörle
veya birbiriyle hafıza paylaşmaz.** Her seferinde aynı tuzağa düşüyorlardı.

Uygulandı: dört ajanın (`auditor`, `builder`, `scribe`, `ui-builder`) hepsine
`memory: project` verildi ve her birine ne yazacağını söyleyen kısa bir bölüm eklendi.
Ortak kural: **üçüncü kez görülen şey hafızaya girer, tek seferlik ayrıntı girmez.**

### Frontmatter'da kullanmadığımız alanlar

Tarama sırasında çıkan tam liste: `tools`, `disallowedTools`, `model`, `permissionMode`,
`maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `effort`,
`isolation`, `color`, `initialPrompt`.

Bizde kullanılmayan ve değerli olabilecekler:

- **`hooks`** — ajana özel yaşam döngüsü kancası. `builder`'a "yazdığın her dosyadan sonra
  formatla" gibi bir kural ajanın kendi tanımına gömülebilir. İleride.
- **`isolation: worktree`** — SETTINGS'te var ama ajan tanımında sabitlenmiyor; paralel
  çalışan `builder` için tanımın kendisine yazmak daha güvenli olabilir.
- **`Agent(type)`** araç sözdizimi — bir ajanın başka ajan açmasına izin verir. Şu an
  bilinçli olarak kapalı: iş dağıtımı T0'ın işi.

### Mimari kural — dört katmanın hangisini ne zaman

Taramanın en net cümlesi şu: **kural zorlanacaksa hook veya izin; bağlamsal bilgiyse
skill; devir sınırıysa alt ajan; her zaman geçerli kısa yönlendirmeyse CLAUDE.md.**

Teknesyum Base dördünü de kullanıyor ve dağılımı doğru: `done/` mührü hook'ta (zorlanıyor),
tema bilgisi skill'de (bağlamsal), rol ayrımı ajanlarda (devir sınırı), yönlendirme
CLAUDE.md'de.

### MCP sunucuları — **eklenmiyor**

Sequential Thinking, ByteRover/Cipher, Basic Memory gibi "ajana hafıza ve muhakeme veren"
sunucular incelendi.

Sequential Thinking'in yaptığı iş — düşünceyi numaralı adımlara bölmek, geri dönüp
düzeltmek — Claude'un kendi genişletilmiş düşünmesiyle çakışıyor. İkinci bir katman
token harcar, yeni yetenek getirmez.

Hafıza sunucuları ise artık gereksiz: ajan hafızası bunu yerel dosya sistemiyle,
sunucu kurmadan yapıyor.

Karar: MCP ayak izi dar kalır. Belge sorgulama için hâlihazırda kurulu olan tek sunucu
yeterli.

---

## D6 — Claude Code eklenti ekosistemi

Ekosistem 2026 ortasında 9000+ üçüncü parti kayda ulaştı; Anthropic dizininde ~100
birinci parti ve ortak eklenti var. En çok kurulanlar: Frontend Design, Superpowers,
Context7.

### Superpowers (obra) — **en yakın akrabamız, iki fikri alınabilir**

Bizimkiyle aynı iddiada: beceri çerçevesi + yazılım geliştirme yöntemi. 750k+ kurulum.

Öne çıkan iki mekanizma:

**Beyin fırtınası kilidi.** Kod yazmayı, bağlam keşfi ve tasarım onayı tamamlanana kadar
**engelliyor.** Bizde buna karşılık gelen şey yok: relay ölçüyor ve dağıtıyor ama
"önce netleştir" aşamasını zorlamıyor.

**Dört fazlı hata ayıklama.** Düzeltmeden önce kök neden araştırmasını zorunlu kılıyor.
Bizde `builder` doğrudan düzeltmeye giriyor.

Alınacak: ikisi de fikir olarak alınmaya değer, ama **bizim ölçü satırımızın tersine
çalışmamak şartıyla.** Kullanıcının açık tercihi rutin onay sormamak; beyin fırtınası
kilidi her işe uygulanırsa o tercihi çiğner. Doğru uygulama: **yalnızca "sıfırdan proje"
ölçüsünde devreye giren bir netleştirme adımı.**

Alınmayacak: TDD zorunluluğu (kırmızı-yeşil döngüsü) — kullanıcının yığını ve iş tipi
buna uymuyor, her değişiklikte test yazdırmak yavaşlatır.

### Frontend Design (Anthropic) — **çakışma riski, kurulmamalı**

En çok kurulan eklenti. Arayüz tasarımı yönlendirmesi yapıyor — yani `teknesyum-ui` ile
**aynı işi** yapıyor, farklı bir estetikle.

İkisi birlikte kuruluysa hangisinin kazanacağı belirsiz; melez arayüz çıkar. §8'in
"tema bütünlüğü" kuralı bunu zaten yasaklıyor.

Karar: kurulmaz. `teknesyum-ui` bu alanı kaplıyor.

### Context7 — **zaten kurulu, yeterli**

Belge sorgulama. Kütüphane sürümüne uygun güncel doküman çekiyor, ezberden API uydurmayı
engelliyor. Bu oturumda da kullanıldı.

### LSP / kod zekâsı eklentileri — **bizde zaten var**

`.lsp.json` ile bağlı. Tanıma gitme, referans bulma, tip hatası görme.

### Ekosistemden çıkan yapısal ders

Kurulum sayıları şunu söylüyor: en çok kurulan eklentiler **tek bir şeyi iyi yapanlar**
değil, **yöntem dayatanlar** (Superpowers, Frontend Design). Teknesyum Base doğru
kategoride; eksiği yöntemin görünürlüğüydü, o da ölçü satırı ve etki raporuyla kapandı.

---

## D7 — Deterministik araçlar

Kullanıcının duruşu net: **model gerekmiyorsa model kullanma.** Bu durak, angarya işi
modelden alıp araca vermeyi arıyor.

### Biome — **alındı, yeni JS/TS projesinde varsayılan**

MIT. Rust tabanlı, tek ikili, tek yapılandırma dosyası. Hem linter hem biçimlendirici —
ESLint + Prettier ikilisinin yerini alıyor. 472 kural; JS, TS, JSX, CSS, JSON, GraphQL,
HTML kapsıyor. ESLint'e göre 50-100 kat hızlı.

Alınacak: sıfırdan kurulan her JS/TS/React/Electron projesinde varsayılan.
Tek dosya (`biome.json`), tek komut, kök kalabalığı yok — relay §1.2 ile uyumlu.

Alınmayacak: mevcut, ESLint eklentilerine gömülü projelerde zorla geçiş.

### Oxlint — **koşullu**

Biome'un ~2 katı hızlı, 787 kural, Vite 8'in varsayılan linteri. Ama yalnızca linter;
biçimlendirici değil.

Alınacak: yalnızca büyük ve ESLint'e bağımlı bir kod tabanında ön denetim katmanı olarak.
Küçük projede iki araç kurmanın anlamı yok.

### Bunlar niye önemli

Ajan bir dosyayı yazdıktan sonra biçim düzeltmesini modele yaptırmak token israfı.
`biome format --write` deterministik, anlık ve bedava. Aynı mantık `sed`, `rg` ve
IDE refactor için de geçerli — kullanıcının çalışma stili kuralı bunu zaten söylüyor.

### Karar

`teknesyum-ui` §1 kurulum tablosuna ve relay §2 hazırlık listesine girer:
yeni JS/TS projesinde `biome.json` kurulur, iş bitiminde `biome check --write` çalışır.

---

## D8 — i18n ve yerelleştirme

Ölçütümüz §3.1'de yazılı: **dili bilen ama projeyi bilmeyen biri tek dosyayı kopyalayıp
çevirebilmeli.** Kütüphaneler bu ölçüte göre elendi.

### i18next — **alındı, JS/TS yığınında varsayılan**

MIT. `i18next` 15.1 kB + `react-i18next` 7.1 kB. Düz JSON dosyası kullanıyor; bizim
`locale/tr.json` yapımızla birebir örtüşüyor.

Belirleyici üstünlük: **React dışında da çalışıyor.** Electron ana süreci, CLI çıktısı ve
arayüz aynı sözlüğü paylaşabiliyor. Lingui ve react-intl React'e bağlı.

Alınmayacak: `i18next-icu` eklentisi. Türkçe'de tekil/çoğul kuralı tek biçimli;
ICU'nun getirdiği karmaşıklığın karşılığı yok.

### Lingui — **alınmadı**

10.4 kB ile daha hafif ve ICU'yu çekirdekte taşıyor. Ama mesajları koda gömüp
çıkarıyor (`extract`) ve PO dosyalarıyla çalışıyor.

Bu, "hiçbir arayüz metni koda gömülmez" kuralımızın tam tersi. Çevirmenin PO araçları
kurması gerekmesi de tek dosya ölçütünü bozuyor.

### react-intl / FormatJS — **alınmadı**

ICU uyumu ve tarih/sayı biçimlendirmesi güçlü. Bize gereken tek şey sayı ve dosya
boyutu biçimlendirmesiydi; onu `Intl` API'si kütüphanesiz yapıyor.

### WPF tarafı

`.resx` kullanılmıyor. Sebep: ikili araç gerektiriyor, çevirmen açamıyor, tek dosya
ölçütünü bozuyor. Aynı `locale/*.json` dosyaları okunur, basit bir sözlük yükleyici yeter.

### Karar

JS/TS: `i18next` + `react-i18next`, düz JSON, ICU eklentisi yok.
WPF/WinForms: kendi JSON yükleyicimiz, `.resx` yok.
Sayı, tarih, dosya boyutu: `Intl` (JS) / `CultureInfo` (.NET) — elle biçimlendirme yok.

---

## D9 — Test ve görsel doğrulama

§8.2 "çalışan uygulamaya bakmadan tamam yok" diyor. Bu durak, o bakışı otomatikleştirecek
aracı arıyor.

### FlaUI — **alındı, WPF/WinForms tarafında**

MIT. Windows UI Automation'ı ince bir katmanla sarıyor; UIA2 ve UIA3 destekliyor
(WPF için UIA3). Şubat 2025'te v5.0.0. xUnit veya NUnit ile birlikte kullanılıyor.

Neden önemli: §8.2'nin en zor maddesini — "yakaladığın pencerenin süreç yolunun bu
depodaki çalıştırılabilir dosya olduğunu doğrula" — elle yapmak yerine testle yapmayı
mümkün kılıyor. Pencereyi süreç kimliğinden bulur, denetimleri ağaçtan okur.

Sınırı da net: **görsel gerileme testi ve erişilebilirlik denetimi yok.** Ekran
görüntüsü karşılaştırmasını kendimiz kurmalıyız.

### Playwright — **alındı, Electron/web tarafında**

Apache-2.0. Electron uygulamasını doğrudan sürebiliyor; ekran görüntüsü karşılaştırması
(`toHaveScreenshot`) çekirdeğinde. Erişilebilirlik denetimi de var.

Bu, `teknesyum-ui` için doğrudan karşılık: **tema ihlalleri görsel gerileme testiyle
yakalanabilir.** Beyaz zemin sızıntısı, kırpılan sekme, kaybolan odak halkası — hepsi
piksel farkı olarak görünür.

### Kurulmayan

Cypress, Selenium: Playwright'ın kapsadığı alanı daha dar yapıyorlar.
Ticari görsel gerileme servisleri (Chromatic vb.): yerel karşılaştırma yeterli,
buluta ekran görüntüsü göndermenin gereği yok.

### Karar

WPF: `FlaUI` + `xUnit`. Electron/web: `Playwright`, ekran görüntüsü karşılaştırması açık.
Her ikisi de `tests/` altında (relay §1.2).

---

## D10 — Paketleme ve dağıtım

### Velopack — **alındı, .NET masaüstünde varsayılan**

Squirrel'in halefi, Rust ile yazılmış. Windows, macOS ve Linux paketi tek çözümden
çıkıyor. **Delta paketler**: kullanıcı yalnızca değişeni indiriyor. Güncelleme ~2 saniyede
uygulanıp yeniden başlıyor, UAC istemi çıkmıyor.

Squirrel.Windows artık bakımsız; Velopack ondan göçü kolaylaştırmak için tasarlanmış.

Alınacak: dağıtılacak her .NET masaüstü aracında varsayılan. UAC istemi görmemek ve
delta indirme, her gün açılan bir araçta doğrudan kullanıcı deneyimi meselesi.

Alınmayacak: dağıtılmayacak, tek makinede kalan iç araçlarda kurulumu — gereksiz katman.

### Inno Setup — **koşullu**

Ücretsiz, olgun, betikle yönetilen kurulum sistemi. Ama **otomatik güncellemesi yok.**

Alınacak: yalnızca tek seferlik kurulan, güncelleme beklenmeyen araçlarda.

### electron-builder — D4'te alındı

Electron tarafında kurulum, kod imzalama ve otomatik güncelleme aynı araçta.

### Karar

.NET masaüstü: `Velopack`. Electron: `electron-builder`. Güncellenmeyecek tek seferlik
araç: `Inno Setup` veya tek dosya yayını.
