# UI taraması — mikro etkileşim ve his

Mercek: "şık" hissinin nereden geldiği. Künyeler `gh api` ile 2026-08-22'de alındı.

| Depo | Son push | Son etiket | Yıldız | Açık issue | Lisans |
|---|---|---|---|---|---|
| emilkowalski/sonner | 2026-08-10 | v2.0.8 (2026-08-09) | 12.884 | 73 | MIT |
| emilkowalski/vaul | 2025-10-03 | v1.1.2 (2024-12-14) | 8.565 | 160 | MIT |
| radix-ui/primitives | 2026-08-08 | GitHub release yok; npm `radix-ui` 1.6.7 (2026-07-24) | 19.196 | 344 | MIT |
| pmndrs/react-spring | 2026-08-19 | v10.1.2 (2026-06-24) | 29.135 | 74 | MIT |
| animations.dev | — | — | — | — | **ücretli kurs (199 $), açık lisans yok** |

## 1 · Alanın bugün yaptığı

**sonner** (`src/index.tsx`, `src/styles.css`) — animasyonun tamamı CSS'te, durum DOM'da:
`data-mounted`, `data-removed`, `data-expanded`, `data-front`, `data-visible`,
`data-swiping`, `data-swipe-out`. JS hiç `style.transform` yazmaz, yalnız CSS değişkeni
besler (`--swipe-amount-x/y`, `--offset`, `--lift`). Sabitler: `TOAST_LIFETIME` 4000,
`TIME_BEFORE_UNMOUNT` 200, `GAP` 14, `SWIPE_THRESHOLD` 45 px, `VISIBLE_TOASTS_AMOUNT` 3.
Ana geçiş `transform/opacity/height 400ms, box-shadow 200ms` — standardın yasakladığı
`height`'ı da animasyonluyor.

**vaul** (`src/constants.ts`) — `TRANSITIONS = { DURATION: 0.5, EASE: [0.32, 0.72, 0, 1] }`,
`VELOCITY_THRESHOLD` 0.4, `CLOSE_THRESHOLD` 0.25, `SCROLL_LOCK_TIMEOUT` 100. Eğri,
yazarın kendi yazısına göre iOS Sheet taklidi, kaynağı Ionic. Lastik direnç `helpers.ts`'te
logaritmik: `8 * (log(v + 1) - 2)` — sınır aşılınca hareket **engellenmiyor, sönümleniyor**.
Sürüklerken `transition` kaldırılıyor, bırakınca 500 ms geçiş geri konuyor.

**radix presence** (`packages/react/presence/src/presence.tsx`) — üç durumlu makine:
`mounted` → `unmountSuspended` → `unmounted`. Çıkış animasyonunun varlığı
`getComputedStyle(node).animationName` okunarak anlaşılıyor, bitişi `animationend` ile;
`animationName === 'none'` ise düğüm anında sökülüyor. Dialog `data-state="open|closed"`i
`Content` ve `Overlay`'e ek olarak **`Trigger`'a da** koyuyor (`dialog.tsx:132`). Toast
varsayılanı `duration = 5000`; sürükleme `data-swipe="start|move|cancel|end"` ve
`--radix-toast-swipe-move-x/y`, `--radix-toast-swipe-end-x/y` ile CSS'e veriliyor.

**react-spring** (`packages/core/src/constants.ts`) — süre yok, fizik var. Hazır ayarlar
(tension, friction; `mass` 1, `clamp` false): `default {170,26}`, `gentle {120,14}`,
`wobbly {180,12}`, `stiff {210,20}`, `slow {280,60}`, `molasses {280,120}`. `useReducedMotion`
eşleşince global `skipAnimation` atıyor — kütüphane genelinde tek anahtar.

**Emil Kowalski yazıları** (halka açık): "ease-out varsayılan, arayüzde asla ease-in";
"yalnız transform ve opacity"; "arayüz animasyonu genelde 300 ms altında"; günde yüzlerce
kez tekrarlanan klavye eylemi **hiç** animasyonlanmaz; ikinci tooltip hem gecikmeyi hem
animasyonu atlar. Basma ölçeği 0.97, giriş ölçeği 0 yerine 0.93. Kurs ödeme duvarında,
içeriği **doğrulanamadı**.

## 2 · Standardın kaçırdığı

**a) Çıkış animasyonu için kural yok.** §5.4 tablosunda "Giriş | 8 DIP kayma + opaklık,
240 ms" var, "Çıkış" satırı yok; `--tk-e-in` tanımlı ama nerede ve ne kadar kullanılacağı
yazılmamış. **Alınmalı** — çıkış tanımsızsa uygulayıcı `display:none` yapar. Girer: §5.4.

**b) Çıkış girişten kısadır — asimetri.** sonner çıkışta opaklığı 200 ms'ye indiriyor
(`transform 500ms, opacity 200ms`) ve düğümü 200 ms sonra söküyor: görülen çıkış girişin
yarısı. Standart tek süre ölçeği veriyor, yön ayrımı yok. **Alınmalı** — kullanıcı gidene
bakmaz, gelene bakar. §5.4 süre tablosu.

**c) Sürükleme fiziği: eşik **veya** hız, ve sönümleme.** vaul %25 veya hız 0.4; sonner
45 px veya hız 0.11; ikisi de sınırı sert kesmiyor. Standart sürükleme hakkında yalnız
erişilebilirlik diyor. **Alınmalı, bir paragraf yeter.** §5.4.

**d) `data-state` / durum niteliği kalıbı.** Radix'te `data-state`, sonner'de yedi ayrı
`data-*`. **Alınmalı** — §8.1'in devamı: renk tek kaynaktansa durum da tek kaynaktan
gelmeli. Girer: §8.1.

**e) Gerçek spring fiziği.** react-spring altı hazır tension/friction ayarı veriyor,
standartta tek cubic-bezier var. **Alınmamalı** — dört platformda çözücü taşımak ağır.

## 3 · Standardın haklı olduğu yerler

**Geçiş > keyframe tercihi doğru, alanın en iyisi bunu doğruluyor.** Emil Kowalski sonner
yazısında keyframe'i bıraktığını, sebebini "animasyon çalışırken bitiş konumunu yumuşakça
değiştiremezsin; geçiş kesilebilir ve yeniden hedeflenebilir" diye yazıyor — §5.4'teki
gerekçeyle birebir aynı. **Karşı örnek radix**: `Presence` yalnız `animationName` ve
`animationend` okuyor, `transitionend` dosyada hiç geçmiyor; yani Radix ile çıkış yapmak
için keyframe zorunlu. Standardın tercihi korunmalı, yanına "Radix istisnası" notu.

**"Söyleyecek şeyi yoksa animasyon yok" doğru.** Aynı yazar günde yüzlerce kez tekrarlanan
eylemin hiç animasyonlanmaması gerektiğini yazıyor; alanın çoğunluğu bunu söylemiyor.

**`prefers-reduced-motion`'da opaklığı korumak sonner'den iyi.** sonner'in bloğu
`transition: none !important; animation: none !important` — her şey sert kesiliyor.
Standardın "konum/ölçek kapanır, opaklık kalır" kuralı daha ölçülü. Değiştirme.

**360 ms tavanı savunulabilir.** Emil "genelde 300 ms altı" diyor, vaul 500 ms kullanıyor
ama o tam ekran kat eden bir yüzey; 360 ms ikisinin arasında ve gerekçeli.

## 4 · Ölçü ve token — yan yana

| Konu | Standart | sonner | vaul | radix | react-spring |
|---|---|---|---|---|---|
| Giriş süresi | 240 ms (`--tk-t-base`) | 400 ms | 500 ms | tanımsız (tüketicide) | süre yok |
| Çıkış süresi | **yok** | transform 500 / opacity 200 ms | 500 ms | tanımsız | fizik |
| Söküm gecikmesi | **yok** | 200 ms sabit | 500 ms sabit | `animationend`'e bağlı | spring durunca |
| Giriş eğrisi | `cubic-bezier(0.2,0,0,1)` | `ease` | `cubic-bezier(0.32,0.72,0,1)` | yok | 170 / 26 |
| Çıkış eğrisi | `cubic-bezier(0.4,0,1,1)` | `ease-out` | aynı eğri | yok | aynı fizik |
| Basma / yığın ölçeği | 0.98 / — | 0.97 / `-0.05 * index` | — | — | — |
| Sürükleme eşiği | yok | 45 px veya hız 0.11 | %25 veya hız 0.4 | tüketicide | — |
| Otomatik kapanma | yok | 4000 ms | — | 5000 ms | — |
| Görünür yığın | liste kademesi 6 | 3 toast | — | — | — |

## 5 · Süre mesafeye göre ölçekleniyor mu

**Hiçbir depo süreyi mesafeden hesaplamıyor.** Hesap yok, korelasyon var ve bilinçli:
vaul tam ekran yüksekliği kat ettiği için 500 ms, sonner 356 px'lik kart için 400 ms,
tooltip 125 ms — ölçek elle, bileşen başına seçilmiş. Tek otomatik ayrım sonner'de:
kapalı yığındaki arka toast çıkarken `transform 500ms`, öndeki 400 ms'te kalıyor. Bağı
gerçekten kuran tek model react-spring: oturma süresi mesafe ve hızın fonksiyonu, hiçbir
yerde `duration` yazılmaz; bedeli çalışma zamanı çözücü.

**SKILL.md satır 272 yeterli değil.** "Kullanıcı ikinci kez gördüğünde beklemeye
başlıyorsa animasyon uzundur" bir **tavan** koyuyor, **ölçek** vermiyor. 8 DIP kayan çip
ile ekran boyu açılan panel aynı 240 ms'yi alıyor; ilki geç, ikincisi acele görünür.
Eksik olan: süre kat edilen yolla tokenlar arasında yukarı çıkar — mikro yer değiştirme
`fast`, panel `base`, ekran boyu `slow`.

## 6 · Çıkış animasyonu — asıl cevap

**Standartta çıkış için kural yok.** `--tk-e-in` tanımlı, kullanımı tarif edilmemiş;
tabloda "Giriş" var, "Çıkış" yok — "girişi animasyonlar, çıkışı keser" sorunu standarda
bu boşluktan sızmış. Dört yaklaşım:

1. **sonner — sabit gecikmeli söküm.** `data-removed="true"` konur, CSS toast'ı geldiği
   yönde %100 dışarı iter ve opaklığı sıfırlar; 200 ms sonra düğüm silinir. Geçiş 400-500 ms
   olduğundan çıkış **kasten yarıda kesiliyor**. Basit, öngörülebilir.
2. **radix — animasyonu ölçüp bekleme.** Süre kütüphanede yok, CSS'ten geliyor; bedeli
   yalnızca keyframe desteklenmesi.
3. **vaul — giriş ve çıkış aynı eğri, aynı süre.** Simetri kasıtlı: sürükleyerek ve
   düğmeyle kapatma aynı hissetmeli.
4. **react-spring — ayrı çıkış yok.** Hedef değişir, fizik oraya götürür.

Bize uyanı 1 + 2 melezi: durum niteliği DOM'da, süre tokende, söküm tokendan okunan süreye
bağlı. Radix'in computed-style okuması gerekmez, süreyi zaten biz veriyoruz.

## 7 · `data-state` kalıbı uyumlu mu

**Uyumlu, hatta standardın kendi mantığının devamı.** §5.4 "yalnız opacity ve transform",
§8.1 "önce token, sonra kontrol". `data-state` bu ikisini birleştirir: JS bir nitelik
çevirir, hangi transform ve hangi süre olduğu CSS'te tokendan okunur — §5.4'ün "bileşen
içinde sayı yazılmaz" kuralı zaten bunu istiyor. İki uyarı: Radix `Presence` keyframe
zorunlu kılıyor (§5.4'e istisna notu gerekir); WPF karşılığı `VisualStateManager` ve
standardın WPF bölümü yalnız `Storyboard`'dan söz ediyor, durum makinesinden değil.

## 8 · Lisans

sonner, vaul, radix-ui/primitives, react-spring: dördü de **MIT**, §5.6 sırasına uygun.
animations.dev ücretli kurs, açık lisansı yok — ders içeriğinden kod veya metin alınamaz;
yalnız yazarın halka açık blog yazılarındaki fikirler kaynak gösterilerek kullanılabilir.
"N bin geliştirici kullanıyor" tipi iddia birincil kaynakta görülmedi, yazılmadı.
Bulamadığım değer: `--tk-t-instant/fast` karşılığı hiçbir depoda token değil, bileşene gömülü.
