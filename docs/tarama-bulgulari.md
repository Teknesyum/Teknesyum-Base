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
