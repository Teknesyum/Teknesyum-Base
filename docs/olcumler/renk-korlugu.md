# Renk körlüğü ölçümü — pembe/mor ve komşuları

Ölçüm tarihi: 24.08.2026 · Sözleşme: `U9` · Kod: `test/u9-renkkorlugu.js`

Bu belgedeki **her sayı** `test/u9-renkkorlugu.js` tarafından yeniden hesaplanır ve
karşılaştırılır. Elle düzeltilen bir hücre testi düşürür. `node test/u9-renkkorlugu.js`.

## Ne ölçüldü

`teknesyum-ui` §2 paletindeki vurgu renkleri **protanopi** ve **deuteranopi** altında
simüle edildi, sonra çiftler arasındaki renk farkı ölçüldü. Soru tekti: bir kullanıcı
pembeyi mordan ayırt edebiliyor mu.

## Yöntem ve kaynaklar

**Simülasyon: Viénot, Brettel & Mollon 1999**, *"Digital video colourmaps for checking
the legibility of displays by dichromats"*, Color Research & Application 24(4), 243–252.
Protanopi ve deuteranopi için tüm boru hattı lineer sRGB üzerinde tek bir 3×3 matrise
iner. Tritanopi bu modelle yapılamaz (Brettel 1997 gerekir) ve bu turda **ölçülmedi.**

Matris ezberden yazılmadı. İki bağımsız yoldan alındı ve ikisinin örtüştüğü doğrulandı:

| Yol | Kaynak | Ne veriyor |
|---|---|---|
| A | [libDaltonLens](https://github.com/DaltonLens/libDaltonLens) `libDaltonLens.c`, kamu malı — `dl_vienot_protan_rgbCvd_from_rgb` / `dl_vienot_deutan_rgbCvd_from_rgb` | önceden hesaplanmış tek matris |
| B | Smith & Pokorny 1975 tabanlı `LMS_from_linearRGB` matrisi ([DaltonLens-Python `convert.py`](https://github.com/DaltonLens/DaltonLens-Python), *Understanding LMS-based Color Blindness Simulations*) + Viénot 1999 dikromat izdüşümü | boru hattından yeniden türetme |

İki yol **5 ondalık basamakta** örtüştü (`A1`). Kullanılan matris (yol A):

```
protanopi                          deuteranopi
 0.11238   0.88762   0.00000        0.29275   0.70725   0.00000
 0.11238   0.88762   0.00000        0.29275   0.70725   0.00000
 0.00401  -0.00401   1.00000       -0.02234   0.02234   1.00000
```

**Not — konseydeki iki kaynak tutmadı.** Konsey LMS adımı için Hunt-Pointer-Estévez
dedi ve doğrulama kaynağı olarak `colorspacious` önerdi. İkisi de kullanılmadı:
`colorspacious` Viénot değil **Machado 2009** uygular, yani Viénot için referans olamaz;
Viénot 1999'un kendi zinciri de HPE değil **Smith & Pokorny** koni temeline dayanır.
Yerine yukarıdaki iki yol kullanıldı.

**Ölçü: ΔE2000** (CIEDE2000, `kL=kC=kH=1`), CIELab D65. Kontrast oranı değil — kontrast
yalnız parlaklık farkını görür ve pembe/mor gibi **eş parlaklıklı** çiftlerde körleşir.

ΔE2000 uygulaması **Sharma, Wu & Dalal 2005**, *"The CIEDE2000 color-difference formula:
Implementation notes, supplementary test data, and mathematical observations"*, Color Res.
Appl. 30(1), 21–30 — **Tablo I'in 34 çiftinin tamamına** karşı doğrulandı (`A5`), dört
ondalık basamakta.

sRGB→XYZ matrisi de ezberden yazılmadı: sRGB'nin tanımı olan birincil kromatiklerden ve
D65 beyaz noktasından kodda türetiliyor. Bağımsız kontrol: bu zincirin ürettiği normal
görme kontrast değerleri (`7.72 / 7.33 / 7.83 / 7.43 / 15.26 / 14.49 / 10.92 / 10.37`)
`teknesyum-ui` §2'de zaten yazılı olan sayılarla **birebir** aynı çıktı.

### Eşikler

| ΔE2000 | Yorum |
|---|---|
| < 10 | ayırt edilemez |
| 10 – 20 | zayıf — tek ayırt edici olamaz |
| > 20 | yeterli |

**Bu eşikler pratiktir; WCAG karşılığı yoktur.** WCAG renk farkı için ΔE eşiği tanımlamaz.
Buradaki üç kademe "yan yana duran iki vurgu rengi birbirinden ayırt ediliyor mu"
sorusuna pratik bir cevap vermek için seçildi, ölçülmüş bir algı eşiği değil.

## Simüle edilmiş palet

| Renk | Kaynak | Protanopi | Deuteranopi |
|---|---|---|---|
| neon-blue | `#00f3ff` | `#e7e7ff` | `#d0d0ff` |
| neon-pink | `#ff00ea` | `#5e5eeb` | `#9393e7` |
| neon-purple | `#b026ff` | `#4949ff` | `#6969fe` |
| pink-text | `#ff54eb` | `#7979eb` | `#a1a1e8` |
| purple-text | `#c67eff` | `#8989ff` | `#9898fe` |
| success | `#34d399` | `#c9c998` | `#b7b79c` |
| amber | `#fbbf24` | `#c7c726` | `#d3d315` |

Tabloyu tek satırda okumak: **dikromat kullanıcıda pembe, mor ve mavi aynı mavi-mor
kümesine düşüyor; amber ile success aynı sarı-zeytin kümesine düşüyor.**

## Ölçüm — ΔE2000

| Çift | A | B | Normal | Protanopi | Deuteranopi | Yorum |
|---|---|---|---|---|---|---|
| pembe / mor | `#ff00ea` | `#b026ff` | 14.3 | **5.8** | 13.8 | ayırt edilemez |
| pembe-metin / mor-metin | `#ff54eb` | `#c67eff` | 11.7 | **5.6** | **5.2** | ayırt edilemez |
| amber / success | `#fbbf24` | `#34d399` | 39.6 | 15.2 | 22.2 | zayıf |
| amber / pembe | `#fbbf24` | `#ff00ea` | 72.0 | 78.4 | 65.6 | yeterli |
| mavi / success | `#00f3ff` | `#34d399` | 23.0 | 31.5 | 32.7 | yeterli |
| mavi / mor | `#00f3ff` | `#b026ff` | 54.2 | 45.4 | 30.2 | yeterli |

Yorum sütunu **en kötü görme tipine** göre verilir; bir çift en zayıf halkası kadar
güvenlidir.

### Sonuç kötü çıktı

1. **`pembe / mor` protanopide ΔE 5.8** — ayırt edilemez. Deuteranopide 13.8, yani
   orada da tek ayırt edici olamaz. Konseyin öngördüğü risk doğrulandı.
2. **`pink-text` / `purple-text` daha kötü.** Her iki dikromasi tipinde de 10'un altında
   (5.6 ve 5.2). Metin rolündeki iki renk birbirinden ayırt edilemiyor.
3. **`pembe / mor` normal görmede de zayıf: 14.3.** Bu ölçümün beklenmeyen bulgusu.
   Sorun yalnız renk körlüğünde değil; iki renk normal görmede de tek ayırt edici
   olacak kadar uzak değil.
4. **`amber / success` protanopide 15.2 ile zayıf.** Bu çift ölçülmemişti; "uyarı" ile
   "tamamlandı" protanopide birbirine yaklaşıyor.
5. **`amber / pembe` her üç tipte de rahat geçti** (65.6 – 78.4). Konseyin bu çifti
   ekleme gerekçesi ("deuteranopide ikisi de sarımsılaşıyor") ölçümde **doğrulanmadı**:
   deuteranopide amber sarıya, pembe mora gidiyor, aralarındaki fark açılıyor.
6. **Mavi içeren çiftler güvenli.** `mavi / success` ve `mavi / mor` en kötü durumda
   30.2. Mavi ayırt edici taşıyabilen tek vurgu rengi.

## Kontrast — metin rolündeki renkler

ΔE zeminden bağımsızdır; bu sütun ayrı bir soruyu cevaplar: simüle edilmiş renk
**hâlâ okunuyor mu.** Eşik 7:1 (`teknesyum-ui` §2, metin satırı).

| Renk | Tip | Simüle | `#000000` | `#08090a` |
|---|---|---|---|---|
| pink-text | normal | `#ff54eb` | 7.72 | 7.33 |
| pink-text | protanopi | `#7979eb` | **5.75** | **5.45** |
| pink-text | deuteranopi | `#a1a1e8` | 8.78 | 8.33 |
| purple-text | normal | `#c67eff` | 7.83 | 7.43 |
| purple-text | protanopi | `#8989ff` | 7.09 | **6.72** |
| purple-text | deuteranopi | `#9898fe` | 8.26 | 7.84 |
| neon-blue | normal | `#00f3ff` | 15.26 | 14.49 |
| neon-blue | protanopi | `#e7e7ff` | 17.27 | 16.39 |
| neon-blue | deuteranopi | `#d0d0ff` | 14.15 | 13.43 |
| success | normal | `#34d399` | 10.92 | 10.37 |
| success | protanopi | `#c9c998` | 12.29 | 11.66 |
| success | deuteranopi | `#b7b79c` | 10.27 | 9.74 |

İkinci bir bulgu: **`pink-text` protanopide 7:1'in altına düşüyor** (5.75 / 5.45), ve
`purple-text` `#08090a` üstünde sınırı geçemiyor (6.72). §2'deki 7:1 kaydı yalnız normal
görme için ölçülmüş. Bu, U9'un kapsamının dışında bir bulgu; kararı kullanıcı verecek.

## Kurallar

Sonuç kötü çıktığı için **iki kural birden** yürürlüktedir. İkincisi kalıcıdır.

### 1. Pembe ve mor aynı ekranda tek ayırt edici olamaz

Ölçüm: protanopide ΔE 5.8, metin rolünde 5.2–5.6. Normal görmede bile 14.3.

**Yerine ne konur** — biri yeterli:

- Çifti **böl**: birini `neon-blue` `#00f3ff` ile değiştir. Mavi–mor en kötü durumda
  30.2, mavi–success 31.5. Ölçüm mavinin ayırt edici taşıyabildiğini gösteriyor.
- **İkinci taşıyıcı ekle**: ikon, etiket metni ya da konum farkı. Renk süs olarak kalır.
- **Aynı anda gösterme**: pembe ve mor farklı durumları farklı zamanlarda anlatıyorsa
  (hover ve seçim gibi) yan yana görünmediği sürece sorun yok.

Yasak değil, **tek taşıyıcı olması** yasak.

### 2. Renk hiçbir durumda tek taşıyıcı olamaz

Durum her zaman **ikon, etiket ya da konumla da** kodlanır. WCAG 1.4.1, A seviyesi.
Bu kural `teknesyum-ui` §2'de zaten yazılıydı; ölçüm onu tavsiyeden zorunluya taşıyor.

Palet değişmeden kalıcı çözüm budur: dikromat kullanıcıda paletin yedi vurgu renginden
üçü (pembe, mor, mavi) tek bir mavi-mor kümesine, ikisi (amber, success) tek bir
sarı-zeytin kümesine düşüyor. Hiçbir hex seçimi bunu tamamen çözmez.

Ölçüt tek cümle, §2'deki hâliyle: **ekran görüntüsünü gri tonlamaya çevir, bilgi hâlâ
okunuyorsa geçer.**

## Ölçülmeyenler

Bu belgede olmayan şeyler; varsayım olarak kullanılmasın.

- **Tritanopi** — Viénot 1999 bu tipi kapsamaz, Brettel 1997 gerekir. Ölçülmedi.
- **Anomali (protanomali / deuteranomali)** — bu ölçüm tam dikromasi senaryosudur,
  yani en kötü durum. Kısmi şiddet için Machado 2009 gerekir. Ölçülmedi.
- **Gerçek kullanıcıyla doğrulama** — bütün sayılar modeldir, gözlem değil.
- **Glow, gradient ve opaklık basamaklarının** simülasyon altındaki davranışı. Yalnız
  düz hexler ölçüldü.
