# Hata: /ozel ekle klasör kabul ediyor, /ozel pusla sessizce atlıyor

- Kaynak: `teknesyum/scripts/ozel.js`
- Açan: CodeXray oturumu, 2026-08-24
- Belirti: `/ozel ekle` bir klasör yolunu kabul edip kayıtlı sayıyor, `/ozel pusla` ise
  "kaynak dosya bulunamadı" deyip atlıyor; kullanıcı klasörü yedeklenmiş sanıyor.

## 1. Ne oldu

CodeXray projesinde dört yol aynaya eklendi — üçü dosya, biri klasör:

```
node scripts/ozel.js ekle "docs/TITAN_MODE_YOL_HARITASI.md" "CodeXray-readme-neon.svg" ".agents/AGENTS.md" ".claude/relay"
```

Betik dördünü de kabul etti ve şunu yazdı:

```
Eklendi: ./docs/TITAN_MODE_YOL_HARITASI.md, ./CodeXray-readme-neon.svg, ./.agents/AGENTS.md, ./.claude/relay
Kayıtlı dosya sayısı: 4  ·  aynaya yazmak için /ozel pusla
```

Dört yol kayıtlı, hiçbir uyarı yok. Ardından gönderim:

```
Özel aynaya yazıldı — 3 dosya
  yeni    ./.agents/AGENTS.md
  yeni    ./CodeXray-readme-neon.svg
  yeni    ./docs/TITAN_MODE_YOL_HARITASI.md
  atlandı  ./.claude/relay  — kaynak dosya bulunamadı
Push tamam.
```

Klasör atlandı. `Push tamam.` satırı yine de basıldı ve **çıkış kodu 0**.

İki ayrı kusur var:

1. **`ekle` doğrulama yapmıyor.** Klasörü kabul edip "kayıtlı dosya sayısı 4" diyor.
   Doğru davranış: ya klasörü reddetmek ("klasör kabul edilmiyor, içindeki dosyaları tek
   tek ekle"), ya da klasörü açıp içindeki dosyaları kaydetmek.

2. **`pusla` atlamayı hata saymıyor.** "atlandı" satırı çıktının ortasında, altında
   `Push tamam.` yazıyor ve çıkış kodu başarı. Çıktıyı okumayan bir akış — ya da satırı
   gözden kaçıran bir insan — klasörü yedeklenmiş sanır.

Bu oturumda kayıp yaşanmadı çünkü çıktı satır satır okundu ve `.claude/relay` altındaki üç
dosya elle tek tek eklendi. Okunmasaydı `KONSEY-KARARI.md` dahil altı dosya sessizce
aynanın dışında kalacaktı.

Ek not: `cikar` ile klasör kaydını düşürmek çalışıyor, orada sorun yok.

## 2. Ölçü

Bu hatanın kapandığını gösteren tek şey:

**Klasör yolu `ekle`'ye verildiğinde ya reddedilir ya da genişletilir; hiçbir durumda
"kayıtlı" görünüp gönderimde atlanmaz.**

Kabul edilebilir iki davranıştan biri yeter:

- **Reddet:** `ekle` klasör görünce hata verir, çıkış kodu sıfırdan farklı olur, mesaj
  içindeki dosyaları tek tek eklemeyi söyler. Kayıt listesine hiç girmez.
- **Genişlet:** `ekle` klasörü tarayıp içindeki dosyaları tek tek kaydeder, kaç dosya
  eklendiğini söyler. (Bu yolda `.gitignore` benzeri bir dışlama gerekir — `.claude/oturumlar`
  1.2 MB ve aynaya girmemeli.)

Ayrıca bağımsız olarak: **`pusla` bir yolu atladığında çıkış kodu 0 olmamalı,** ya da en
azından `Push tamam.` yerine "1 yol atlandı" özeti basılmalı. Sessiz atlanan adım,
atlanmamış sanılır — `pusla.md` bu ilkeyi kendi 5. maddesinde zaten yazıyor ama betik
uygulamıyor.

Test: `mkdir bos-klasor` yapıp `/ozel ekle bos-klasor` çalıştır. Ya hata dönmeli ya da
klasör genişletilmeli. Ardından `/ozel pusla` çıktısında "atlandı" satırı hiç doğmamalı.

## 3. İlgili

Aynı oturumda açılan öteki günlük:
`HATA-base-acilista-ozel-ayna-durumunu-bildirmiyor`
