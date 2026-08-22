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

### GSAP — **alındı, tanıtım sayfası aracı olarak** *(karar düzeltildi)*

v3.13'ten (Nisan 2025) beri eklentileri dahil tamamen ücretsiz ve ticari kullanıma açık.
ScrollTrigger, SplitText, MorphSVG, Flip — hepsi serbest. Lisans engeli yok.

İlk taramada "alınmadı" yazılmıştı; bu yanlıştı. Doğru cevap "alınmadı" değil **"başka
yere alındı"**: `teknesyum-ui` §5.5 tanıtım sayfası istisnasının resmî aracı GSAP'tır.

Ayrım boyut değil **iş tanımı**. `motion` bir bileşenin durum değişimini animasyona
bağlar; hover, focus, açıl-kapan gibi şeyler yarıda kesilebilir olmak zorundadır.
`gsap` bir **sahneyi** zaman çizelgesiyle yönetir: şu 0.3'te girer, bu 0.5'te döner,
kaydırma %40'a gelince şu başlar.

Uygulama arayüzünde sahne yoktur, durum vardır — kullanıcı her an her yere tıklayabilir.
Tanıtım sayfasında ise sahne vardır: kullanıcı yukarıdan aşağı akar.

Alınacak: tanıtım sayfasında GSAP + ScrollTrigger serbest, `prefers-reduced-motion`
yine zorunlu.

Alınmayacak: uygulama içinde kullanılması. Orada `motion` var.

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

### Lingui — **alınmadı** *(gerekçe netleştirildi)*

10.4 kB ile i18next'ten (22.2 kB) hafif ve ICU'yu çekirdekte taşıyor. Teknik olarak iyi.

**"Mesajı koda gömüp çıkarmak" ne demek?** Lingui'nin çalışma biçimi şudur: metni doğrudan
bileşenin içine yazarsın —

```jsx
<button>{t`Dosya seç`}</button>
```

Sonra `lingui extract` komutunu çalıştırırsın; araç bütün dosyaları tarar, bu metinleri
toplayıp bir katalog dosyası üretir. Çevirmen o kataloğu çevirir, `lingui compile` ile
geri derlenir.

Yani metnin **aslı kodda durur**, katalog ondan türetilir. Bizim kurulumda tersi:
metnin aslı `locale/tr.json` içindedir, kod ondan `t('btn.selectFile')` diye okur.

Karşılığı yeterli mi? Hayır. Kazanç ~12 kB; bedeli her projeye iki komutluk bir derleme
adımı, yeni metin ekleyince katalog senkronu ve "tek dosyayı kopyala çevir" ölçütünün
kaybı. §0 kalıbıyla: **tekrar eden bedel, tek seferlik kazanç → alınmaz.**

Bu karar 12 kB uğruna değişmez; ama i18next'in bakımı düşerse yeniden bakılır.

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

---

# İkinci dalga (D11-D15)

İlk on durak bittikten sonra kullanıcının "bu 10 tanesinde kalmalı mıyız" sorusu üzerine
açıldı. Durma ölçütü rotaya yazıldı: art arda iki durak standarda tek satır eklemezse dal
kapanır.

## D11 — Bağlantılı not / bilgi tabanı

**Soru:** Obsidian benzeri bir hafıza katmanı kurmalı mıyız? (kullanıcı iki kez sordu)

**Cevap: hayır, çünkü zaten var.**

2026'nın en çok konuşulan deseni Karpathy'nin **LLM Wiki**'si: ajanın kendi tuttuğu,
birbirine bağlı kalıcı markdown wiki'si. Her seferinde yeniden arama (RAG) yerine, bilgi
bir kez yazılır ve büyütülür.

Bizde bu desenin üç parçası da çalışıyor:

| Parça | Bizdeki karşılığı |
|---|---|
| Kalıcı markdown notlar | `~/.claude/projects/<proje>/memory/*.md` |
| İndeks | `MEMORY.md`, oturum açılışında yükleniyor |
| Bağlar | `[[not-adı]]` sözdizimi |
| Ajan hafızası | dört ajanda `memory: project` |

**Alınacak:** "üçüncü kez açıklanan şey kalıcı hafızaya gider, notlar `[[ad]]` ile
bağlanır" kuralı `relay` §6'ya yazıldı.

**Alınmayacak:** Obsidian uygulaması, graph-RAG MCP'si, vektör veritabanı. Not sayısı
yüzlerle ölçülmüyor; arama sorunu yok. Kurulacak her MCP her oturumda araç tanımı olarak
token yer — §0 kalıbıyla tekrar eden bedel, tek seferlik kazanç.

## D12 — Statik analiz: ölü kod ve bağımlılık

### knip — **alındı** (MIT)

Kullanılmayan dosya, export, bağımlılık ve `package.json` girdisini **tek geçişte** bulur;
`--fix` ile temizler. ~150 eklentiyle çoğu projede sıfır yapılandırma. Vercel bununla
300 bin satır silmiş. `ts-prune` bakım modunda, halefi bu.

Bizim düsturla birebir örtüşüyor: **model gerekmeyen yerde model kullanma.** Ölü kodu
LLM'e aratmak hem pahalı hem güvenilmez; knip derleyici grafiğinden okur.

Alınacak: `relay` §2 madde 8 — ~30+ kaynak dosyalı JS/TS projesinde çalıştırılır.

Alınmayacak: küçük projeye kurulması, CI zorunluluğu hâline getirilmesi.

## D13 — Claude Code eklenti ekosistemi, ikinci dalga

Ekosistem 2026'da 400+ eklenti / 3000+ skill ölçeğine çıkmış. Tarama sonucu: **kurulacak
yeni bir eklenti yok**, ama bir ölçü alındı.

**Skill mimarisi ölçüsü.** Etkin uygulama şu: skill meta verisi tarama sırasında ~100
token, açıldığında **5k token altı**, ayrıntı yan dosyada. Kendi skill'lerimizi ölçtük:

| Dosya | Önce | Sonra |
|---|---|---|
| `teknesyum-ui/SKILL.md` | 41.6 kB | 28.9 kB |
| `relay/SKILL.md` | 19.0 kB | 21.4 kB |

`teknesyum-ui`'den masaüstü varsayılanları `references/desktop.md` §10'a, yerleşim ve
piksel disiplini yeni `references/layout.md`'ye taşındı. Web işinde artık masaüstü kuralları
bağlama girmiyor.

Alınacak: `relay` §6'ya **~30 kB skill tavanı** kuralı; ölçüt "önemli mi" değil "her işte
gerekli mi".

**ashlr-plugin** — Read/Grep/Edit/Bash araçlarını token açısından ucuz sürümleriyle
değiştirdiğini, bağımsız ölçümde %57 azalma sağladığını söylüyor. Bizde **RTK** zaten
kabuk çıktısını filtreliyor; ikisi çakışıyor olabilir. Kurulmadı, kullanıcıya soruldu.

## D14 — Sürüm ve değişiklik günlüğü

`semantic-release` commit mesajlarından otomatik changelog üretir; çıkan liste kullanıcıya
bir şey anlatmaz. `changesets` her değişiklik için ayrı dosya ister — çok paketli, çok
geliştiricili depolar için. `release-please` PR tabanlı, aynı şekilde ekip için.

Üçü de tek bakımcılı depoda kurulum maliyetini çıkarmıyor.

Alınacak: araç değil **alışkanlık** — kökte elle yazılan `CHANGELOG.md`, `Keep a Changelog`
biçiminde (`relay` §2 madde 7).

Alınmayacak: üç aracın da kurulumu, Conventional Commits zorunluluğu.

## D15 — Bağlam mühendisliği

Yeni bir araç çıkmadı; çıkan şey ölçü. D13'teki skill tavanı ve §0'daki takas kalıbı bu
durağın çıktısı sayılır. **Durma ölçütü devreye girdi: D14 ve D15 standarda birer satır
ekledi ama yeni bağımlılık getirmedi — tarama burada kapanıyor.**

---

# Ek inceleme: ashlr-plugin

Kullanıcı isteği üzerine depo indirilip kaynak düzeyinde incelendi (`ashlrai/ashlr-plugin`
22 MB / 667 TS dosyası, `ashlrai/ashlr-core-efficiency` 3.5 MB / 63 TS dosyası, ikisi de MIT).

## −%57 nereden geliyor?

Üç mekanizmadan:

**1. `snipCompact` — ortayı atma.** `context.ts:234`. 2000 karakteri geçen çıktının ilk
800 + son 800 karakteri tutulur, ortası `[... truncated ...]` ile silinir. Ölçülen `read`
tasarrufu −%82'nin gövdesi bu.

**2. AST iskeleti.** Büyük kaynak dosyalarda yalnızca imzalar döner, gövdeler atılır.

**3. LLM özetleme.** 16 kB üstü dosyalar **Haiku 4.5'e ayrı bir API çağrısıyla** özetletilir
(`_llm-providers/anthropic.ts`).

## Mantıklı mı? Kısmen — ama rakam kapsamı gizliyor

**Kritik bulgu: ölçüm yalnızca aracın *döndürdüğü* baytı sayıyor.** `docs/benchmarks.md`
kendisi söylüyor: "calling the handler functions directly — no MCP layer, no Claude Code
in the loop."

Yani özetleyicinin **girdi** tokenları — ki bu dosyanın tamamıdır — hesaba katılmıyor.
Gerçek tablo şu: ana bağlama %57 daha az token giriyor, ama dosyanın tamamı yine okunuyor,
sadece başka bir modele.

**İkinci bulgu — kimlik bilgisi.** `ANTHROPIC_API_KEY` yoksa
`~/.claude/.credentials.json` içindeki `claudeAiOauth.accessToken` okunuyor
(`anthropic.ts:33-39`). Yani API anahtarı olmayan bir Claude Pro kullanıcısında bu
çağrılar **abonelik kotasından** gidiyor. Kullanıcı %57 tasarruf ettiğini sanırken
kotasının bir kısmını yan kanaldan harcıyor. Kod açık, gizli bir şey yok — ama başlıktaki
rakam bunu kapsamıyor.

**Üçüncü bulgu — MCP maliyeti.** Sekiz araç (`ashlr__read/grep/edit/multi_edit/write/
websearch/task_list/notebook_edit`) her oturumda şema olarak bağlama giriyor. Küçük ve orta
projede kazanç bu sabit gideri karşılamıyor.

**Dördüncü — sessiz kayıp.** Kaynak dosyanın ortasını atmak kod işinde en kötü kırpma
biçimi: kod tam olarak ortadadır. `bypassSummary:true` çıkışı var ama modelin neyi
kaçırdığını bilmesi gerekiyor.

Deponun kendisi bu konuda dürüst: `docs/benchmarks.md` rakamın neyi **kapsamadığını**
tek tek yazıyor, kendi deposundaki −%74'ü "temsili değil" diye başlıktan çıkarmış.
Sorun ölçümde değil, başlıkta.

## Karar: kurulmadı — dört mekanizma alındı

**Alınmayanlar:** MCP araç değişimi, ortayı atan kırpma, kaynak dosyanın LLM'e
özetletilmesi, `~/.claude/.credentials.json` üzerinden yan çağrı.

**Alınanlar (kural olarak, bağımlılık olarak değil):**

| Alınan | Nereye | Ne der |
|---|---|---|
| Confidence badge | `relay` §6 | Kırpma dürüst yapılır: ne düştü, tamamına nasıl bakılır |
| `ASHLR_EDIT_MIN_CHARS` dersi | `relay` §6 | Optimizasyonun tabanı var; kazanç kurulumdan küçükse doğrudan yap |
| Ölçüm dürüstlüğü | `relay` §7 | Sayı verirken ölçüsünü ve kapsamadığını da ver |
| Ucuzdan pahalıya katman sırası | `relay` §2, §6 | Deterministik önce, model en son |

## Bizim kendi ölçümümüz

Aynı gözle kendi eklentimize bakıldı. İki gerçek israf bulundu:

**1. Her istekte tekrarlanan hatırlatma.** `relay-watch.js` `UserPromptSubmit` kancasında
~330 karakter enjekte ediyordu — **her mesajda**. 60 mesajlık oturumda 5000+ token, hepsi
aynı cümlenin kopyası. Kural bir kez okununca geçmişte duruyor; ikinci kopya bilgi
taşımıyor. Artık oturum başına **iki kez** yazılıyor ve metin kısaltıldı (~330 → ~200
karakter). Oturum başına kazanç: **~5000 token.**

**2. Skill şişmesi.** `teknesyum-ui/SKILL.md` her etkinleşmede tamamen bağlama giriyordu.

| Dosya | Oturum başı | Şimdi |
|---|---|---|
| `teknesyum-ui/SKILL.md` | 41.6 kB | **27.2 kB** (−%35) |
| `relay/SKILL.md` | 19.0 kB | 21.4 kB (yeni kural eklendi) |

Masaüstü varsayılanları ve ekran görüntüsü mekaniği `references/desktop.md` §10-11'e,
yerleşim ve piksel disiplini `references/layout.md`'ye taşındı; palet bölümünün düzyazısı
sıkıştırıldı. Web/React işinde masaüstü kuralları artık bağlam yakmıyor.
