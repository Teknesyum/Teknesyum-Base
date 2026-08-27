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
| **enjeksiyon** (`dil.js`) — Y7 öncesi | 1.005 | 60.300 | 1.322.003 | ~~$2,3631~~ | — | — |
| **enjeksiyon** (`dil.js`) — **Y7 sonrası** | **316** | 18.960 | 415.675 | **$0,7430** | — | — |
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

**Eklentinin 100M içindeki toplam yükü: $4,81.** (Y7 öncesi $6,43.)

Kıyas: 100M token, ağırlığı cache-read olan bir kullanımda yaklaşık $150-200 tutar.
Eklentinin payı **%2-3**.

---

## 3. Neyi çıkarabiliriz, neyi çıkarmalıyız

| ne | kazanç | pay | karar |
|---|---:|---:|---|
| **`premiumNotu` talep üzerine yüklendi** | **$1,62** | %25 | **BİTTİ (Y7)** — 838 → 149 token |
| Hiç çağrılmamış 6 tanımı çıkar | $0,32 | %5 | Yapılabilir, riski düşük |
| Skill açıklamalarını %50 kısalt | $0,41 | %6 | **Yapılmamalı** — relay tetiklenmesi riskte |
| Skill açıklamaları alt bağlama gitmesin | $1,65 | %26 | **Elimizde değil** — harness kararı |
| Tüm komut tanımlarını çıkar | $0,79 | %12 | Kıyas için; eklenti komutsuz kalır |
| Tüm ajan tanımlarını çıkar | $0,82 | %13 | Kıyas için; röle çalışmaz |

### Asıl kalem: `premiumNotu`

Enjeksiyonun **%83'ü** tek bir metindi: premium doktrini, 838 token. Premium
oturumda bağlama bir kez yazılıyor ve o oturumun **her turunda yeniden okunuyordu**
— 60 turluk bir oturumda 50.000 token.

Kullanıcının koyduğu mimari tam buna oturuyor: **bağlamda emir kalır, gerekçe
dosyaya iner.** Model doktrini uygulamak için her turda 838 token taşımaz; ne
yapacağını bilecek kadarını taşır, nedenini merak ederse okur — MCP'nin araç şeması
gibi.

**Y7 bu işi bitirdi.** Bağlam metni **838 → 149 token** (372 karakter), sekiz zorunlu
emrin sekizi de yerinde, gerekçe `skills/relay/references/premium.md` gövdesine indi
— eski metnin 25 karakterden uzun 24 cümlesinin **24'ü de** gövdede birebir korundu,
otomatik taramayla doğrulandı. Hiçbir cümle silinmedi, taşındı.

Bağlamda kalan metnin tamamı:

> Premium mode is on. Agents: opus only, no sonnet/haiku. Independent contracts run at
> once: 20 parallel, worktree past 3. Parallel is default; one agent needs a reason. Open
> agents without asking. Tokens are not a reason. Deterministic tool before model. New
> project: fable+opus plan council before PLAN.md. Second opinion: advisor (fable).
> Why: relay/references/premium.md

Son satır asıl mimariyi taşıyor: **büyük güç dosyada, yolu bağlamda.**

Enjeksiyon kalemi $2,3631 → **$0,7430** (−%68,6).

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
   Kalan `premiumNotu` bir kez yazılıp 59 tur okunuyordu; **Y7 bunu 149 token'a
   indirdi.**
3. **Ağırlığı talep üzerine yükle** → skill gövdeleri, `references/`, komut gövdeleri
   zaten böyleydi. **Y7 ile premium doktrini de bu sınıfa geçti.**

Üçü de yapıldı. Bağlamda kalan şey artık **ne olduğunu söyleyen ince tabaka**; büyük
güç dosyada bekliyor ve gerektiğinde okunuyor. Toplam yük $12,44 → **$4,81**.

Buradan sonrası azalan getiri: kalan en büyük kalem `relay` ve `teknesyum-ui` skill
açıklamaları ($2,46 birlikte) ve bunlar eklentinin tetiklenme yüzeyi — kısaltmak
maliyeti değil, işlevi keser. Konseyin "kesim doygun, durun" hükmü bu tabloyla
sayısal olarak doğrulanıyor.

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

---

## 6. Fable'ın taraması — göremediğim yerler

Doğrulanmış bulgular fable'a verildi ve "gördüğüm optimizasyonları değil,
göremediklerimi söyle" dendi. Üç şey çıktı; ikisi haklı, biri ölçünce zayıfladı.

### 6.1 Asıl yük eklentide değil, harness'ta — **haklı, ölçülmedi**

MCP araç şemaları ve sunucu talimatları her oturumda bağlamda duruyor ve tek başına
1.396 token'lık yüzeyin katbekat üstünde. Bu raporun "%2-3" hükmü bu kalemi
saymadan veriliyor; yani **alt sınır, üst sınır değil.**

Kısmi hafifletici: araçların çoğu *deferred* — şeması değil yalnız adı bağlamda
duruyor, şema `ToolSearch` ile talep üzerine yükleniyor. Yani harness zaten bizim
Y7'de yaptığımız şeyi yapıyor. Ama şeması bağlamda duran araçlar da var ve
sayılmadılar.

**Borç:** MCP şema yükü ölçülmedi. Ölçmenin yolu: aynı görevi MCP sunucuları açık ve
kapalıyken koşup `cache_creation_input_tokens` farkına bakmak.

### 6.2 Cache TTL — **haklı, ölçülmedi**

5 dakikalık boşlukta önbellek düşüyor ve tüm sabit yüzey cache-read ($1,50/M) değil
**cache-write ($18,75/M)** fiyatından yeniden yazılıyor — 12,5 kat. Bu raporun
tablosu her turun sıcak önbellekte olduğunu varsayıyor.

Uzun aralıklarla çalışan bir kullanıcıda gerçek maliyet buradaki sayıdan belirgin
yüksektir. **Bu, kesim yapılmasını değil, kesimin değerinin daha yüksek olduğunu
söyler** — düşen önbellek her seferinde yüzeyin tamamını 12,5 kat fiyatla ödetiyor.

### 6.3 "47 skill'in çoğu bizim değil" — **ölçünce zayıfladı**

Fable "her alt ajan çağrısında 47 satır ödeniyor, kullanılmayan eklentiyi kapat"
dedi. `scripts/olcum/skill-yuzeyi.js` ile ölçüldü:

| kaynak | skill | karakter | token |
|---|---:|---:|---:|
| teknesyum | 2 | 860 | **345** |
| kullanıcı (`graphify`) | 1 | 349 | 140 |

Kalan ~44 skill harness'ın kendi yerleşik skill'leri (`design`, `dataviz`,
`code-review`, `artifact-*`, `anthropic-skills:*`…) — eklenti önbelleğinde değiller
ve kapatma düğmesi kullanıcıda değil. Yani **kaldıraç sanıldığı yerde değil.**
Bizim ödediğimiz 345 token ve o iki skill eklentinin tetiklenme yüzeyi; kısaltmak
maliyeti değil işlevi keser.

Bir ölçüm hatası da buradan çıktı: tarama ilk koşuda 144 skill saydı, çünkü eklenti
önbelleğinde her sürüm için ayrı klasör duruyor ve `teknesyum-ui` beş kez sayıldı.
Ada göre tekilleştirildi. **Ham dosya sayımı sürüm klasörlerini ayırt etmez.**

### 6.4 En kırılgan yer

Fable'ın kendi hükmü: **oturum şekli varsayımı** (60 tur · 6 alt ajan × 12 tur).
Alt ajan sayısı artarsa skill listesi maliyeti lineer büyür ve tablodaki sıralama
değişir. Betik `--tur=`, `--ajan=`, `--ajantur=` bayraklarıyla yeniden koşulur;
sayılar bu üç girdinin fonksiyonudur, sabit değil.
