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
