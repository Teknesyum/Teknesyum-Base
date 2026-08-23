# teknesyum-ui — hareket

`SKILL.md` §5.4 buradan devam eder. **Hareket işi yapmadan önce bu dosya okunur.**
`SKILL.md`'de kalan şey tablolar ve tokenlardır; her tablo satırı aşağıdaki bir başlığa
atıf verir. Gerekçeyi bilmeden tabloyu uygulayan kişi tabloyu yanlış uygular — bu dosya
kısaltılmış bir ek değil, kuralın kendisinin yarısıdır.

Bir satırın neden orada olduğunu anlamak istiyorsan `SKILL.md` §5.4'teki atıf numarasını
(`M1` … `M14`) burada ara.

---

## M1 · Duruş — tavan ve taban birlikte okunur

**Bu tema animasyonlu bir temadır.** Hedef modern ve hareketli bir arayüzdür; durgun teslim
varsayılan değil, eksiktir.

Bu temada animasyon **süs değil geri bildirimdir**: kullanıcıya bir şeyin değiştiğini,
nereden nereye gittiğini ve sistemin çalıştığını söyler. Söyleyeceği bir şey yoksa animasyon
konmaz.

**Ama o cümle bir tavandır, taban değil.** Tek başına okununca "emin değilsem koymayayım"
diye anlaşılıyor ve çıktı durgun arayüz oluyor — şikâyet buradan geldi. Tavan neyin **fazla**
olduğunu söyler; taban neyin **eksik** olduğunu söyler. İkisi birlikte okunur, biri
ötekinin yerine geçmez.

## M2 · Animasyon tabanı — neden zorunlu

`SKILL.md` §5.4'teki taban tablosundaki olayların söyleyeceği bir şey **vardır**. Biri
animasyonsuzsa arayüz eksiktir; "gerek görmedim" geçerli bir gerekçe değildir.

**Kural cümlesi:** *"Söyleyeceği bir şey yoksa animasyon yok" bir tavandır; taban
tablosundaki olayların söyleyeceği bir şey vardır ve animasyonsuz teslim edilemez.*

Tablodaki iki satırın gerekçesi ayrıca yazılır:

- **Odak halkası geçişsizdir** (0 ms) — tabanın tek istisnası. Panel 240 ms açılırken odak
  beklemez; klavye kullanıcısına 240 ms borç yazmak erişilebilirlik kaybıdır.
- **Yükleniyor göstergesi** döngü ≥ 1.4 s *(varsayılan, ölçülmedi)* — bu sayının bir kaynağı
  yok, "parıltı fark edilir ama dikkat çekmez" yargısına dayanıyor. Ölçüt sayı değil sonuç:
  iskelet parıltısı içeriği okumaya çalışan gözü rahatsız ediyorsa yavaşlatılır.

## M3 · Tabana girme ölçütü ve sıklık muafiyeti

**Bir olay tabana giriyor mu:** durum değişimi hareketsiz **algılanmıyorsa** girer.
Kullanıcı ekrana bakarken bir şeyin değiştiğini fark etmiyorsa eksik olan animasyondur,
metin değil. Süs sorusu değil, anlaşılırlık sorusudur.

**Tabandan muaf olan tek şey ölçülmüş sıklıktır.** Günde yüzlerce kez tekrarlanan eylem
(her tuş vuruşunda arama sonucu, kaydırma, imleç hareketi) animasyonsuz kalır — orada
hareket geri bildirim değil gecikmedir. Ölçüt sıklıktır, tahmin değil: "bence sık" muafiyet
gerekçesi değildir, sayarsın.

## M4 · Azaltılmış hareket — `prefers-reduced-motion`

**Zorunludur, sonradan eklenmez.** Ayar açıkken konum ve ölçek animasyonları kapanır,
**opaklık geçişleri kalır** — arayüz cansızlaşmaz ama baş döndürmez.

**Taban ayar açıkken de yürürlüktedir.** Konum ve ölçek düşer, opaklık kalır; yani taban
opaklık yarısıyla karşılanır. Ne taban erişilebilirliği ezer, ne erişilebilirlik durgun
arayüzün bahanesi olur.

`transition-property: opacity` satırı **zorunludur**. O olmadan blok konum ve ölçek
geçişlerini **kapatmaz, 90 ms'ye kısaltır** — 90 ms'lik bir `scale` ya da 8 DIP kayma hâlâ
harekettir ve düz yazının tam tersini yapar.

Utility sınıfları (`hover:scale-[1.02]` gibi) bileşen sınıfının dışındadır ve blok onları
yakalamazsa anlık sıçrama yaparlar; bu yüzden blokta `*` seçicisiyle `transform: none`
satırı da bulunur.

WPF'te karşılığı `SystemParameters.ClientAreaAnimation` okumaktır. **Kural dosyada yazılı
olduğu hâlde şablonun uygulamaması bu standardın en sinsi hata sınıfıdır** — şablonu
kopyalayan proje kuralı bilmeden erişilebilirlik ihlali üretir. Zemin gradienti
storyboard'u da bu kontrolü taşır.

## M5 · Süre ve yumuşatma neden token

**Rastgele `0.3s` yazılmaz.** 360 ms'yi geçen hiçbir arayüz hareketi yok: kullanıcı ikinci
kez gördüğünde beklemeye başlıyorsa animasyon uzundur.

**Kütüphane varsayılanı token değildir.** `motion` çok keyframe'li geçişte 800 ms, `anime`
genelde 1000 ms, `auto-animate` 250 ms kullanıyor; üçü de sahne için ayarlanmış. Tabanı
kurarken süreler tokenlardan okunur, kütüphanenin varsayılanı ezilir.

`--tk-bg-donus` bilerek `--tk-t-*` ölçeğinin **dışındadır**: o bir geçiş süresi değil döngü
periyodudur ve ölçeğin içine girerse hareket tavanını 48 sn'ye çıkarır (§2).

## M6 · Yalnızca `opacity` ve `transform`

`width`, `height`, `top`, `left`, `margin`, `box-shadow`, `filter` animasyonu yerleşimi
yeniden hesaplattırır; kare düşer, zayıf makinede takılma görünür. Boyut değişimi
gerekiyorsa **`scale` ile** yapılır — yasak değil, yolu farklı.

## M7 · Geçiş mi, keyframe mi

**Geçiş (`transition`) tercih edilir.** Sebep: geçiş yarıda iptal edilebilir. Kullanıcı
açılmakta olan paneli kapatırsa panel bulunduğu yerden geri döner; keyframe animasyonu ise
başa sarar ve sıçrar.

Keyframe yalnızca gerçekten döngüsel olan şey içindir (yükleniyor göstergesi, zemin
gradienti).

## M8 · Mikro etkileşim tavanları — gerekçe

Abartı buradan başlar; `SKILL.md` §5.4'teki tavan tablosunun sınırları kesindir.

- `scale(1.05)` ve üstü hover'da düğmeyi komşusunun üstüne taşır ve **hit-test alanını
  büyütür**: bitişik iki düğmede imleç sınırda titrer, kullanıcı yanlış düğmeye basar.
  `1.02` bu yüzden tavan. Yerine güçlü bir hover isteniyorsa renk ve glow opaklığı
  (`/20` → `/30`) kullanılır, büyüme değil.
- Basmada `spring` yankısı düğmeyi iki kez oynatır; kullanıcı ikinci hareketi ikinci bir
  olay sanır. `--tk-e-spring` yalnız basma geri bildiriminde ve tek seferliktir.
- Listede 40 ms kademe **en çok 6 eleman** içindir: yedinci eleman 280 ms sonra gelir ve
  kullanıcı listenin yüklenmediğini sanar. Daha uzun listede kademe kaldırılır, hepsi
  birlikte belirir.

## M9 · Giriş animasyonu bir kez oynar

Bileşen **ilk kez göründüğünde**. Her `render`'da, her sekme dönüşünde, her veri
tazelemesinde tekrar oynayan giriş animasyonu hatadır: kullanıcı aynı ekranı ikinci kez
görüyordur ve beklemek zorunda kalır.

## M10 · Sonsuz döngü yasağı ve iki istisna

Nefes alan paneller, sürekli dönen çizgiler, parlaklığı dalgalanan yüzeyler bu temada yok.
İki istisna var:

1. **Süreç göstergesi** — gerçekten bir iş yürürken çalışır, iş bitince durur. Yükleme
   iskeleti (`skeleton`) parıltısı da buna dahildir: döngü ≥ 1.4 s *(varsayılan, ölçülmedi)*,
   kontrastı düşük.
2. **Uygulama zemininin gradienti** (§2) — ekseni çok yavaş döner. Ölçü: döngü ≥ 40 s, açı
   oynaması ≤ 20° *(varsayılan, ölçülmedi)*, durak renkleri sabit. Uygulamada hareket eden
   **tek** sonsuz yüzey budur; ikinci bir tanesi eklenirse ikisi de yasağa girer.

İkisi de `prefers-reduced-motion: reduce` altında durur.

`MotionConfig` yalnız kütüphaneyi kapsar; CSS ile yazılmış sonsuz döngüler ondan
etkilenmez ve `@media` bloğu onları durdurmaz, **hızlandırır**. Meşru döngüler bu yüzden
`motion-safe:` altına alınır.

## M11 · Sürüklemenin tek dokunuşluk alternatifi

**Sürükleyerek yapılan her işin tek dokunuşluk alternatifi olur.** Dosya bırakma alanı varsa
"Dosya seç" düğmesi de olur; sıra değiştirme sürüklemeyle yapılıyorsa yukarı/aşağı düğmesi
de bulunur. WCAG 2.2 §2.5.7; el titremesi olan ve işaretçi hassasiyeti düşük kullanıcılar
sürükleyemez.

## M12 · Hareket, tıklanacak şeyi kaçırmaz

Kullanıcı bir düğmeye giderken düğme yer değiştiriyorsa animasyon zarar veriyordur.
Yerleşim animasyonu yalnızca kullanıcı eylemiyle başlar, kendi kendine değil; açılan panel
komşularını itmez, üstlerine biner.

## M13 · Kütüphane — `motion` ve `MotionConfig`

React/Electron tarafında varsayılan animasyon kütüphanesi **`motion`** (eski adıyla Framer
Motion): `useReducedMotion` hook'u ve iptal edilebilir geçişler hazır gelir. Süre ve eğri
değerleri yine tokenlardan okunur, bileşen içinde sayı yazılmaz.

**`<MotionConfig reducedMotion="user">` kök sarmalayıcıda zorunludur.** Motion'ın
varsayılanı `reducedMotion: "never"`'dır (`MotionConfigContext.tsx:72`) — hook gelir,
politika gelmez. Bu satır yazılmazsa kütüphane sistem ayarını yok sayar ve arayüz
`prefers-reduced-motion` kuralını hiç uygulamamış olur.

```jsx
<MotionConfig reducedMotion="user">
  <App />
</MotionConfig>
```

Ayar açıkken Motion yalnızca `positionalKeys` grubunu (`width, height, top, left, right,
bottom` + tüm transform'lar) anında yapar; opaklık ve renk kalır. Bu bizim kuralımızla
birebir aynı — bu yüzden `"user"` doğru değer, `"always"` değil.

## M14 · WPF karşılıkları

`Storyboard` yalnızca `RenderTransform` ve `Opacity` üzerinde çalışır, `Width`/`Height`
üzerinde değil. Yumuşatma `PowerEase`/`CubicEase` ile `EasingMode="EaseOut"`.
Storyboard'lar `Freeze()` edilir. Sürekli çalışan `DispatcherTimer` tabanlı animasyon yok;
pencere gizliyken animasyon durdurulur.

Azaltılmış hareket kontrolü WPF'te otomatik değildir: her sonsuz storyboard
`SystemParameters.ClientAreaAnimation` okur ve kapalıysa başlatılmaz (M4).
