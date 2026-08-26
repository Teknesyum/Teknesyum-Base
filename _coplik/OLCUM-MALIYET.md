# Ölçüm — Base'in kendi maliyeti

Salt ölçüm. Hiçbir dosya değiştirilmedi, hiçbir şey optimize edilmedi. Amaç, optimizasyon
planı yazacak olanın uydurma rakamla çalışmaması.

Ölçüm tarihi 22.08.2026 · Claude Code 2.1.237 · profil `premium` · dil `tr`.

Kaynaklar: `teknesyum/` altındaki dosyalar, `~/.claude/projects/**` altındaki gerçek
transkriptler (6 ana oturum, 31 alt ajan), ve `2.1.237` ikilisinden çıkarılan dizgiler.

---

## 0. Önce şu: karakter → token oranını ölçemedim

Bu raporun en zayıf yeri burası, başa yazıyorum.

Skill gövdesi bağlama girdiğinde bağlamın kaç token büyüdüğünü ölçebiliyorum (aşağıda
var, gerçek veri). Ama bu delta yalnız gövdeyi değil, o turun kendi yükünü de içeriyor.
Elimdeki noktalar birbiriyle tutarlı çıkmadı:

| Dosya | Bayt | Ölçülen bağlam artışı | Bayt/token |
|---|---:|---:|---:|
| `commands/uicheckup.md` | 1.020 | 475 | 2,1 |
| `commands/load.md` | 2.886 | 1.408 | 2,1 |
| `commands/premium.md` | 7.291 | 3.830 | 1,9 |
| `skills/teknesyum-ui/SKILL.md` | 25.305 | 8.595 | 2,9 |
| `skills/relay/SKILL.md` | 47.974 | 10.112 | 4,7 |

Sabit bir tur yükü varsayıp iki uçtan doğru geçirirsem ~5 bayt/token ve ~800 token sabit
yük çıkıyor, ama ortadaki noktalar bu doğruya oturmuyor. Yani ya tur yükü sabit değil, ya
büyük gövdeler tam yüklenmiyor. **Hangisi olduğunu ölçemedim.**

Bunun sonucu: **yalnızca karakter sayısını bildiğim kalemler için verdiğim token rakamı
tahmindir.** 3 bayt/token kullandım ve her böyle rakamın yanına `~` koydum. Gerçek değer
bunun yarısı da olabilir iki katı da. Ölçülmüş token deltası olan kalemlerde `~` yok.

---

## 1. Sabit yükleme maliyeti — oturum açılışı

### Yüklenmeyen şey, yüklenenden çok daha büyük

Ham boyutlar (bayt):

| | Toplam |
|---|---:|
| `skills/*/SKILL.md` gövdeleri | 73.279 |
| `commands/*.md` gövdeleri | 37.303 |
| `agents/*.md` gövdeleri | 18.547 |
| `skills/relay/references/` (3 dosya) | 32.192 |
| `skills/teknesyum-ui/references/` (3 dosya) | 27.093 |
| `skills/relay/SETTINGS.md` | 12.750 |
| `skills/*/assets/` (9 dosya) | 19.242 |
| **Toplam disk** | **220.406** |

**Bunların hiçbiri oturum açılışında bağlama girmiyor.** Ölçü doğrudan: bu ölçümü yapan
ajanın kendi bağlamında skill'ler yalnız `ad: açıklama` satırı olarak, ajanlar yalnız
`ad: açıklama (Tools: …)` satırı olarak duruyor. Gövde yok. Yani Claude Code'un aşamalı
açma davranışı base'in dosyaları için de geçerli.

### Açılışta gerçekten yüklenen

| Kalem | Bayt | Tahmini token |
|---|---:|---:|
| 2 skill'in `description`'ı + adı | 783 | ~260 |
| 16 komutun `description`'ı + adı | 1.323 | ~440 |
| 7 ajanın `description` + `tools` + adı | 2.130 | ~710 |
| **Toplam sabit yük** | **4.236** | **~1.400** |

Ajan başına listeleme maliyeti (bayt): advisor 312, auditor 258, builder 269, planner 283,
scout 265, scribe 229, ui-builder 233 — artı ad ve araç listesi.

`SessionStart` kancası ayrıca bir durum satırı basıyor (`systemMessage`): gerçek
oturumlarda 83–140 bayt. Ölçülen beş oturumda toplam `systemMessage` hacmi 247–5.299 bayt
arasında (aşağıda §2.3).

**Sonuç: base'in oturum açılış sabit yükü ~1.400 token.** 220 KB'lik disk hacminin
%2'sinden azı. Sabit yük base'in pahalı yeri değil.

---

## 2. Tur başına maliyet

### 2.1 `UserPromptSubmit` enjeksiyonu

`hatirlat()` fonksiyonu, oturumun ilk isteklerinde `additionalContext` ile modele metin
yazıyor. Tavan: eco'da 1 istek, diğer profillerde 2 istek. Sonrası sessiz.

Parça boyutları (bayt, `dil.js` çalıştırılarak ölçüldü):

| Anahtar | Bayt |
|---|---:|
| `olcu` | 563 |
| `olcuKisa` | 210 |
| `dilTalimati` | 81 |
| `dilTalimatiKisa` | 35 |
| `premiumNotu` | **1.758** |
| `ecoNotu` | 532 |
| `seviye2` | 581 |
| `platformNotu` | 248 |
| `onArastirmaHatirlatma` | 517 |
| `kapsayiciEtkin` (örnek) | 314 |

Birleşmiş gövde ve oturum toplamı:

| Profil | Tek enjeksiyon | Tavan | Oturum toplamı | Tahmini token |
|---|---:|---:|---:|---:|
| eco | **779** | 1 | 779 | ~260 |
| normal (steering 1) | **645** | 2 | 1.290 | ~430 |
| normal (steering 2) | 1.227 | 2 | 2.454 | ~820 |
| premium (steering 1) | 2.404 | 2 | 4.808 | ~1.600 |
| premium (steering 2) | 2.986 | 2 | 5.972 | ~1.990 |

**Doğrulama:** `docs/GELISIM.md` ve eco commit'inde yazan "eco 778, normal 1286, steering
2'de 2450" rakamları tutuyor — hepsi oturum toplamı. Ama karşılaştırma yanıltıcı:
normal'in steering 1 hâli (1.290) ile eco (779) arasındaki fark 511 bayt, yani ~170 token.
Gerçek transkriptte teyit edildi: bir oturumda `UserPromptSubmit` enjeksiyonu 2 adet /
2.450 bayt (steering 2), başka üç oturumda 2 adet / 1.118 bayt.

**Bulunan aksaklık — eco'nun tek enjeksiyonu normalden büyük.** eco kısa metinleri
kullanıyor (`olcuKisa` 210 + `dilTalimatiKisa` 35 = 245 bayt, normal'in 644'üne karşı),
ama üstüne 532 baytlık `ecoNotu` ekliyor ve toplam 779'a çıkıyor. **Tasarruf talimatının
kendisi, sağladığı tasarruftan büyük.** eco yalnızca tavanı 1'e indirdiği için oturum
toplamında kazanıyor.

Bu kalemin büyüklüğü ~170–1.990 token. **Bench'teki 45.000 tokenlik eco/yalın farkını
açıklayamaz.** Farkın kaynağı enjeksiyon değil.

### 2.2 `Stop` tur özeti

`turOzetiYonerge` + `turOzeti` = **155 bayt**, `additionalContext` kanalıyla modele
gidiyor (kod sabiti `OZET_KANALI = 'model'`). Her tur sonunda bir kez.

Gerçek ölçüm, en uzun oturumda: **30 adet / 3.906 bayt** (~1.300 token). Geçmişte kalıcı —
30 kopya bağlamda birikiyor.

Not: bu satırın maliyeti iki kat. Kancanın yazdığı 155 bayta ek olarak modelin cevabın
altına bastığı satır da (~48 bayt) çıktı tokeni olarak ödeniyor ve o da geçmişte kalıyor.

### 2.3 `systemMessage` bildirimleri — **bağlama giriyor**

Bu ölçümün en kritik sonucu. Ekranda kalan bedava olurdu; olmuyor.

`2.1.237` ikilisinde birebir şu dizgi var:

> `systemMessage output reaches Claude as bounded context`

Ayrıca `hook_system_message`, transkriptte `dynamic_skill`, `selected_lines_in_ide`,
`pdf_reference` gibi bağlama giren ek tipleriyle aynı listede duruyor.

**`duyur()` ile basılan her satır para yakıyor.** `SessionStart` durum satırı, "görev
veriliyor" bildirimi, ajan bitiş satırı — hepsi.

Gerçek hacim:

| Oturum | Kullanıcı mesajı | `systemMessage` adet / bayt |
|---|---:|---|
| 1fe541f9 | 459 | 47 / 5.299 |
| baefd0ee | 224 | 54 / 4.726 |
| a56c609b | 145 | 2 / 319 |
| 92313621 | 17 | 5 / 413 |
| 6e9f650e | 21 | 3 / 247 |

Ajan açılan oturumlarda 47–54 satır, ~5.000 bayt (~1.700 token). Ajan açılmayan
oturumlarda ihmal edilebilir.

**`bounded` sınırının kaç bayt olduğunu ölçemedim** — ikilide sayısal bir tavan
bulamadım. Base'in bastığı satırlar 80–140 bayt olduğu için pratikte sınıra takılmıyor.

### 2.4 Asıl kalem — skill gövdesinin çağrı üzerine yüklenmesi

Skill gövdesi transkripte yazılmıyor (`tool_result` yalnızca 32 baytlık
`Launching skill: teknesyum:relay`), ama bağlam büyümesi ölçülebiliyor: çağrıyı yapan
mesajın toplam girdisi ile bir sonraki mesajın toplam girdisi arasındaki fark.

Bütün projelerdeki transkriptler tarandı:

| Skill | n | Medyan token | En az | En çok |
|---|---:|---:|---:|---:|
| **`teknesyum:relay`** | **80** | **10.112** | 2.776 | 19.736 |
| **`teknesyum:teknesyum-ui`** | **18** | **8.595** | 2.855 | 14.634 |
| `teknesyum:premium` | 5 | 3.830 | 3.583 | 4.919 |
| `teknesyum:save` | 1 | 1.774 | — | — |
| `teknesyum:load` | 7 | 1.408 | 1.372 | 5.040 |
| `teknesyum:report` | 1 | 1.081 | — | — |
| `teknesyum:uicheckup` | 1 | 475 | — | — |

Karşılaştırma için base dışı: `claude-api` 22.503 · `update-config` 51.046 · `init` 1.215.

**`relay` bir çağrıda ~10.000 token yakıyor** ve `olcu` enjeksiyonu modele her iş
talebinde relay'e bakmasını söylüyor. Sadece ölçülen transkriptlerde 80 relay çağrısı var.
Bir oturumda 2–6 çağrı normal.

`teknesyum-ui`'nin 8.595 tokeni, gövdesinin 25.305 baytına göre yüksek — muhtemelen
`references/` de yükleniyor (27.093 bayt daha). **Doğrulayamadım**; `Skill` çağrısının
sonucunda references görünmüyor ve modelin ayrıca `Read` ile açıp açmadığını
transkriptten ayıramadım.

### Tur başına özet

| Kalem | Oturum başına |
|---|---|
| `UserPromptSubmit` enjeksiyonu | ~170–1.990 token (profile göre, sabit) |
| `Stop` tur özeti | ~40 token/tur · 30 turluk oturumda ~1.300 |
| `systemMessage` | ~1.700 token (ajanlı oturum) · ~100 (ajansız) |
| `relay` yüklemesi | 10.112 token/çağrı × 1–6 |

**Turun kendisi ucuz (~40 token). Pahalı olan, turun tetiklediği skill yüklemesi.**

---

## 3. Ajan başına maliyet

Bu oturumun 31 alt ajanı, `.meta.json` ve `.jsonl` dosyalarından ölçüldü.

| Ölçü | Medyan | Ortalama |
|---|---:|---:|
| İlk isteğin bağlamı (`input` + `cache_creation`) | **18.793 token** | 24.756 |
| Brifing metni | 3.849 bayt | 3.856 |
| Dönen rapor | 1.295 bayt | 1.182 |
| Tur sayısı | 27 | 41 |
| `cache_read` toplamı | 1.628.117 | 4.306.359 |
| Çıktı tokeni toplamı | 1.833 | 6.090 |

### Base'in bu maliyetteki payı küçük

Aynı oturumda açılan **yerleşik** `claude-code-guide` ajanının ilk istem bağlamı
**18.302 token**. `teknesyum:builder`'ınki **18.771**. Fark ~470 token.

Yani bir alt ajanın 18.800 tokenlik açılış bağlamının neredeyse tamamı Claude Code'un
kendi sistem istemi ve araç tanımları. **Base'in eklediği:**

| Kalem | Bayt | Tahmini token |
|---|---:|---:|
| Ajan gövdesi (`builder.md` 2.797, en büyüğü `planner.md` 3.415) | ~2.800 | ~930 |
| Skill + komut + ajan listeleme (alt ajanda da var) | 4.236 | ~1.400 |
| Brifing (T0'ın yazdığı sözleşme özeti) | 3.849 | ~1.280 |
| Dönen rapor (ana oturuma girer) | 1.295 | ~430 |
| **Base payı** | | **~4.000** |

**Bir ajan açmanın gerçek fiyatı ~18.800 token açılış + iş boyunca cache okuması. Bunun
~4.000'i base'e ait, ~14.800'ü Claude Code'un kendisine.**

### Açıklayamadığım şey

İlk istem bağlamı iki kümede toplanıyor: **10.174–19.115** ve **41.225–43.578**. İki
kümede de aynı ajan tipleri var (`teknesyum:builder` her ikisinde). Zamana göre
ayrışıyorlar: 11:49–13:17 arasında açılanlar 42k bandında, 16:00–17:46 arasında açılanlar
18k bandında. **Sebebini ölçemedim** — muhtemel aday gün içinde bağlanan/kesilen MCP
sunucularının araç tanımları, ama bunu doğrulayacak veri transkriptte yok. Base ile
ilgisi olduğuna dair bir işaret de bulamadım.

---

## 4. En pahalı on kalem

Sınıflar: **Zorunlu** (kaldırılırsa özellik gider) · **Kısaltılabilir** (aynı iş daha az
metinle) · **Ertelenebilir** (her seferinde değil, gerektiğinde).

| # | Kalem | Oturum başına | Sınıf |
|---|---|---:|---|
| 1 | `relay/SKILL.md` yüklemesi | **10.112 token × 1–6 çağrı** | Ertelenebilir |
| 2 | Alt ajan açılış bağlamının base payı | ~4.000 token × ajan sayısı | Kısaltılabilir |
| 3 | `teknesyum-ui/SKILL.md` yüklemesi | 8.595 token × çağrı | Ertelenebilir |
| 4 | Ajan brifingi | ~1.280 token × ajan | Kısaltılabilir |
| 5 | `premiumNotu` enjeksiyonu | ~1.170 token (1.758 B × 2) | Kısaltılabilir |
| 6 | `systemMessage` bildirimleri | ~1.700 token (ajanlı oturum) | Kısaltılabilir |
| 7 | Skill + komut + ajan listeleme | ~1.400 token (sabit) | Zorunlu |
| 8 | `Stop` tur özeti | ~1.300 token (30 tur) | Kısaltılabilir |
| 9 | Ajan raporlarının dönüşü | ~430 token × ajan | Zorunlu |
| 10 | `olcu` + `dilTalimati` enjeksiyonu | ~430 token (644 B × 2) | Kısaltılabilir |
| 11 | `ecoNotu` — eco'nun kendi maliyeti | ~180 token | Kısaltılabilir |

### Sınıflandırmanın gerekçesi

**1 ve 3 — ertelenebilir, kısaltılabilir değil.** `relay/SKILL.md` 47.974 bayt ve tek
parça. Model işin büyüklüğünü ölçmek için çağırdığında %90'ını kullanmadan bağlama alıyor.
`references/` mekanizması zaten var (32.192 bayt oraya taşınmış), ama gövde hâlâ 48 KB.
Bölünürse ölçüm bölümü birkaç yüz token olur, protokolün geri kalanı gerektiğinde gelir.

**2 ve 4 — kısaltılabilir.** Ajan gövdesi (~2.800 bayt) ve brifing (~3.849 bayt) ajan
başına ödeniyor; altı paralel ajanda bu ~24.000 token. İkisi de düz metin.

**5 — kısaltılabilir.** `premiumNotu` 1.758 bayt ve tek paragraf hâlinde iki kez yazılıyor.
İçeriğinin çoğu davranış kuralı; `SETTINGS.md`'de zaten yazılı olanın kopyası.

**6 — kısaltılabilir.** Bildirimin kullanıcıya değeri gerçek, ama modele değeri sıfır ve
bedeli gerçek. Modele gitmeyen bir kanal bulunabilirse bu kalem sıfırlanır; ölçtüğüm
kadarıyla `systemMessage` böyle bir kanal değil.

**7 ve 9 — zorunlu.** Listeleme olmadan model skill'in ve ajanın varlığını bilemez; rapor
dönmeden ajan işe yaramaz. İkisi de zaten ucuz.

**8 — kısaltılabilir.** 155 baytlık yönerge her turda tekrar ediyor; yönerge bir kez
verilip sonraki turlarda yalnız satırın kendisi (48 bayt) gönderilebilir.

**11 — kısaltılabilir ve mantık hatası.** Tasarruf profilinin talimatı, tasarruf ettiği
metinden büyük. Tek enjeksiyonda eco 779, normal 645 bayt.

---

## 5. Bench farkı hakkında — ölçemediğim şey

Görevin çıkış noktası: eco (~157.709) yalın koşudan (~113.000) 45.000 token pahalıya
çalıştı.

Ölçtüklerim bu farkı **açıklamıyor**. Base'in eco profilinde oturum başına yazdığı sabit
metin toplamı, en cömert saymayla:

- sabit listeleme ~1.400
- enjeksiyon ~260
- tur özeti ~1.300
- `systemMessage` ~100 (eco ajan açmadı)

Toplam **~3.000 token**. Farkın onda biri bile değil.

Kalan ~42.000 tokenin nereden geldiğini **ölçemedim** — eco koşusunun transkripti elimde
yok. En güçlü aday `relay/SKILL.md`'nin defalarca yüklenmesi: 10.112 × 4 = 40.448, farka
çok yakın. Ama bu **hipotez, ölçüm değil.** Doğrulamanın yolu belli: eco koşusunun
transkriptinde `Skill` çağrılarını saymak.

---

## 6. Ölçemediklerimin listesi

1. **Karakter → token oranı.** Veri noktaları tutarsız (§0). Yalnız bayt bilinen her
   kalemin token rakamı 3 bayt/token tahminidir, geniş hata payıyla.
2. **`systemMessage`'ın `bounded` sınırı.** İkilide sayısal tavan bulamadım.
3. **`references/*.md` ne zaman okunuyor.** `teknesyum-ui`'nin ölçülen 8.595 tokeni gövde
   boyutuna göre yüksek ama references'ın otomatik mi geldiğini, modelin `Read` ile mi
   açtığını transkriptten ayıramadım.
4. **Alt ajan açılış bağlamındaki 18k/42k ayrışması.** Zamana göre ayrışıyor, sebebi
   belirsiz; base kaynaklı olduğuna dair kanıt yok.
5. **Bench'teki eco/yalın farkının kalemlere dağılımı.** Koşuların transkripti yok.
6. **`relay/SKILL.md`'nin tam mı kısmi mi yüklendiği.** §0'daki tutarsızlık iki yönde de
   okunabiliyor.

---

## 7. Bu ölçümün tekrar edilmesi

Betikler oturumun scratchpad dizininde: `maliyet-frontmatter.js` (ham boyut ve listeleme),
`maliyet-skilljump.js` (skill yükleme token deltası), `maliyet-ajan.js` (alt ajan
maliyeti), `maliyet-hook2.js` (hook trafiği), `olc.js` (enjeksiyon metinleri).
Hepsi tek argüman alıyor: depo kökü ya da `~/.claude/projects` yolu.
