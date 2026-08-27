# 100M tokenlik kullanımda ne, ne kadar yiyor

27.08.2026. Bu rapor bench değil — sorulan soru "hangisi ne kadar tüketir, neyi
çıkarabiliriz" ve cevabı ölçülmüş kalem maliyetleri × bilinen çağrı sıklığından
çıkıyor. Tahmin edilebilen şeyi ölçmeye gerek yok.

**Betik:** `scripts/olcum/yuz-milyon.js` — sayılar buradan üretilir, elle yazılmaz.

---

## 1. Önce bir yanlış varsayım düzeltildi

Dünkü raporda "sabit yüzey her alt ajan bağlamında yeniden yükleniyor, 20 ajanda
27.920 token" yazıyordu. Konsey bunu **doğrulanmamış** diye işaretlemişti. Bugün
doğrulandı: **yanlışmış.**

İki ayrı alt ajana (biri kısıtlı araçlı `Explore`, biri tam araçlı `builder`) kendi
bağlamlarında ne gördükleri soruldu. İkisi de aynı cevabı verdi:

| kalem | ana bağlam | alt ajan bağlamı |
|---|---|---|
| skill açıklamaları | var | **var** (47 skill listeleniyor) |
| komut açıklamaları | var | **yok** |
| ajan tanımları | var | **yok** |
| premium enjeksiyonu | var | **yok** |

Yani alt ajan çarpanı yalnız **skill açıklamalarına** biniyor. Komut ve ajan
tanımları oturum başına bir kez yazılıyor, alt ajanlarda tekrarlanmıyor.

Bu düzeltme eklentinin tahmini yükünü **$12,44'ten $6,43'e** indirdi — kesim yaparak
değil, yanlış saymayı bırakarak.

---

## 2. Tablo — 100M token içinde

Oturum şekli: 60 tur · 6 alt ajan × 12 tur. 100M token ≈ 22 böyle oturum.
Fiyat: cache-write $18,75/M, cache-read $1,50/M.

| kalem | token | oturumda | 100M içinde | USD | çağrı | USD/çağrı |
|---|---:|---:|---:|---:|---:|---:|
| **enjeksiyon** (`dil.js`) | 1.005 | 60.300 | 1.322.003 | **$2,3631** | — | — |
| **sabit yüzey** (tümü) | 1.396 | 88.452 | 1.939.201 | **$4,0660** | — | — |
| skill `relay` | 196 | 27.244 | 597.291 | $1,4148 | 2 | $0,7074 |
| skill `teknesyum-ui` | 145 | 20.155 | 441.874 | $1,0467 | 6 | $0,1744 |
| ajan `builder` | 51 | 3.111 | 68.205 | $0,1216 | 220 | $0,0006 |
| ajan `planner` | 51 | 3.111 | 68.205 | $0,1216 | 53 | $0,0023 |
| ajan `auditor` | 50 | 3.050 | 66.867 | $0,1192 | 173 | $0,0007 |
| ajan `ui-builder` | 50 | 3.050 | 66.867 | $0,1192 | 57 | $0,0021 |
| ajan `advisor` | 49 | 2.989 | 65.530 | $0,1168 | 43 | $0,0027 |
| ajan `scout` | 46 | 2.806 | 61.518 | $0,1097 | 137 | $0,0008 |
| ajan `scribe` | 46 | 2.806 | 61.518 | $0,1097 | 21 | $0,0052 |
| komut `scan` | 28 | 1.708 | 37.446 | $0,0668 | 9 | $0,0074 |
| komut `rc` | 27 | — | — | $0,0645 | **0** | **hiç** |
| komut `setup` | 26 | — | — | $0,0622 | **0** | **hiç** |
| komut `uicheckup` | 26 | — | — | $0,0622 | **0** | **hiç** |
| komut `update` | 26 | — | — | $0,0622 | 1 | $0,0620 |
| komut `save` | 24 | — | — | $0,0574 | 13 | $0,0044 |
| komut `pusla` | 23 | — | — | $0,0550 | 4 | $0,0137 |
| komut `loadall` | 22 | — | — | $0,0526 | 1 | $0,0526 |
| komut `uisetup` | 22 | — | — | $0,0526 | **0** | **hiç** |
| komut `help` | 18 | — | — | $0,0430 | **0** | **hiç** |
| komut `premium` | 18 | — | — | $0,0430 | 9 | $0,0048 |
| komut `saveall` | 16 | — | — | $0,0383 | 2 | $0,0191 |
| komut `log` | 15 | — | — | $0,0359 | 3 | $0,0120 |
| komut `rule` | 15 | — | — | $0,0359 | 1 | $0,0359 |
| komut `ekran` | 14 | — | — | $0,0335 | **0** | **hiç** |
| komut `load` | 10 | — | — | $0,0239 | 10 | $0,0024 |

**Eklentinin 100M içindeki toplam yükü: $6,43.**

Kıyas: 100M token, ağırlığı cache-read olan bir kullanımda yaklaşık $150-200 tutar.
Eklentinin payı **%3-4**.

---

## 3. Neyi çıkarabiliriz, neyi çıkarmalıyız

| ne | kazanç | pay | karar |
|---|---:|---:|---|
| **`premiumNotu` talep üzerine yüklensin** | ~$1,90 | %30 | **Yapılıyor (Y7)** |
| Hiç çağrılmamış 6 tanımı çıkar | $0,32 | %5 | Yapılabilir, riski düşük |
| Skill açıklamalarını %50 kısalt | $0,41 | %6 | **Yapılmamalı** — relay tetiklenmesi riskte |
| Skill açıklamaları alt bağlama gitmesin | $1,65 | %26 | **Elimizde değil** — harness kararı |
| Tüm komut tanımlarını çıkar | $0,79 | %12 | Kıyas için; eklenti komutsuz kalır |
| Tüm ajan tanımlarını çıkar | $0,82 | %13 | Kıyas için; röle çalışmaz |

### Asıl kalem: `premiumNotu`

Enjeksiyonun **%83'ü** tek bir metin: premium doktrini, tek dilde ~836 token.
Premium oturumda bağlama bir kez yazılıyor ve o oturumun **her turunda yeniden
okunuyor** — 60 turluk bir oturumda 50.000 token.

Kullanıcının koyduğu mimari tam buna oturuyor: **bağlamda emir kalır, gerekçe
dosyaya iner.** Model doktrini uygulamak için her turda 836 token taşımaz; ne
yapacağını bilecek kadarını taşır, nedenini merak ederse okur — MCP'nin araç şeması
gibi.

`Y7` bu işi yapıyor: bağlam metni ≤150 token'a inecek, sekiz zorunlu emrin hepsi
kalacak, gerekçe `skills/relay/references/premium.md` dosyasına taşınacak. Kabul
kriteri her emrin hangi cümleyle karşılandığını tabloyla istiyor — bir maddenin
sessizce düşmesi eklentiyi kimseye fark ettirmeden sıradanlaştırır.

### Çağrı başına en pahalı üç kalem

`relay` $0,7074 · `teknesyum-ui` $0,1744 · `update` $0,0620.

`relay` pahalı görünüyor çünkü sayaç yalnız açık çağrıları sayıyor; skill'in asıl
işi her oturumda yönlendirme yapmak ve o çağrıya girmiyor. Bu satır "relay'i çıkar"
demiyor, "sayaç bu kalemi ölçemiyor" diyor.

### Hiç çağrılmayanlar

`rc`, `setup`, `uicheckup`, `uisetup`, `help`, `ekran` — 133 token, $0,32.

Bunların dördü **kurulum/bakım** komutu: bir kez çağrılır, sonra hiç. `help` ve
`ekran` ise çağrılmasa da yüzeyde durmalı: `ekran` bir izin kapısı ve `dil.js`
kullanıcıya ismen onu söylüyor (dün bir kez çıkarıldı, rıza yolu boşaldı, geri
kondu). `help` eklentinin kendini anlattığı tek yer.

Yani $0,32'lik kalemin gerçekten çıkarılabilir kısmı `rc`, `setup`, `uicheckup`,
`uisetup` — ~$0,20. Bu sayı gürültü seviyesinde; kesmenin bedeli kazancından büyük.

---

## 4. Mimari sonuç

Kullanıcının hedefi: *"bir projede bir sohbet açtık, maliyeti ödedik; bir daha
maliyet ödemeden premium işleyişi yakalayalım."*

Harness bunu tam olarak vermiyor: **her oturum yeni bağlamla başlar**, o yüzden
"proje başına bir kez" bir taban değil, bir yön. Ulaşılabilir olan şu:

1. **Oturum başına ödenen** kısmı asgariye indir → yüzey 1.396 token, dün %37 kesildi,
   konsey buradan sonrasını durdurdu (getiri gürültüde, yönlendirme kaybı riski var).
2. **Tur başına tekrarlananı sıfırla** → enjeksiyon tur 3'ten sonra zaten sıfır.
   Kalan `premiumNotu` bir kez yazılıp 59 tur okunuyor; Y7 bunu ≤150 token'a indiriyor.
3. **Ağırlığı talep üzerine yükle** → skill gövdeleri, `references/`, komut gövdeleri
   zaten böyle. Y7 ile premium doktrini de bu sınıfa geçiyor.

Üçü tamamlandığında bağlamda kalan şey yalnız **ne olduğunu söyleyen ince tabaka**
olur; büyük güç dosyada bekler ve gerektiğinde okunur.

---

## 5. Bu raporun ölçmediği

- **Oturum şekli varsayım.** 60 tur / 6 alt ajan × 12 tur bu projedeki kullanımdan
  alındı, ölçülmedi. Şekil değişirse tablo değişir; betik `--tur=`, `--ajan=`,
  `--ajantur=` bayraklarıyla yeniden koşulur.
- **Fiyat sabit varsayıldı.** Model fiyatı değişirse USD sütunu değişir; token
  sütunları değişmez.
- **Kalite tarafı yok.** Bu rapor yalnız maliyeti sayıyor. Eklentinin karşılığında ne
  verdiği ayrı bir ölçüm işi (konseyin S4 tasarımı, henüz koşulmadı).
- **Sonda tek turluk.** Alt bağlam bulgusu iki ajanda doğrulandı ama harness sürümüne
  bağlı; sürüm değişince tekrarlanmalı.
