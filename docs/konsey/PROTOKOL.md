# Konsey protokolü — dosya tabanlı masa

Bu belge iki üyenin **uzlaştığı** kararları taşır. T0 ilan etti, içerik üretmedi.
Kaynak: `masa.md` turu 1, iki üye ve karşılıklı revizyonlar.

## Dosya düzeni — çalışıyor, sebebi yapısal

| Dosya | Kim okur |
|---|---|
| `<üye>.md` | yalnız o üye — görev ve kişisel not |
| `masa.md` | iki üye — yalnız üye metni |
| `log.md` | iki üye + T0 — kim ne zaman ne yazdı |

Opus'un gerekçesi: *"Kirlenme kaynağında kesilmiş — masaya yalnız üye metni girdiği için
T0 notu girecek kanal bulamıyor. Kural değil yapı engelliyor."*

## Üye adı log'da görünür

**Opus turu 3'teki kendi pozisyonunu geri aldı:** *"Kullanıcının tercihi doğru, benimki
değildi. Turu 3'teki gerekçem pozisyon almaydı."*

Gerekçe: log koordinasyon dosyası, `kim yazdı` olmadan senkron kurulamaz. Anonimliğin
bedeli mekaniğin çalışmaması. Körleme isteniyorsa doğru yer masa başlıkları, log değil.

## T0 sekreterdir, hakem değil

İkisi de aynı uyarıyı verdi.

- opus: *"Fazla değil, az yetki. Karar vermiyor, kuralı uyguluyor."*
- fable: *"T0 uzlaşıyı ilan eder, içerik üretmez. Yorumlarsa üçüncü üyeye dönüşür."*

**Açık boşluk:** "uzlaşı var mı" hükmünün tanımı yazılı değil. İkisi de işaretledi.

## Yazma yarışı — çözüm iki katmanlı

Opus'un teşhisi, fable'ın kabulü:

> *"Masa tam-dosya yazıldığı için başlık disiplini yarışı çözmez — sonra basan,
> öncekinin bloğunu taşımayan sürümü diske yazar."*

Fable'ın kendi hükmünü geri alışı: *"Benim 'çözüm ucuz' hükmüm yanlıştı."*

Uzlaşılan çözüm:

1. **İlan** — masaya girmeden log'a `yazıyor`, bitince `yazıldı`. Görünür kılar,
   engellemez.
2. **Tek yazarlı dosya** — `tur1-opus.md`, `tur1-fable.md`. Yarışı yapısal bitirir.
   `masa.md` T0 için birleştirilmiş görünüm olur.

Tur başına dosya, opus'un "masa tarihçeye döner" uyarısını da kapatır.

## Tavan ve çıkış

Turu 3'te ortaklaşılmıştı, burada değişmedi:

- Tavan **5**, ama sabit tur sayısı değil **sönme koşulu**: iki üye arka arkaya
  "revizyona gerek yok" derse tur biter.
- **En az 2 tur** zorunlu. Gerekçe ikisinden de aynı: turu 1'de yüzeyde uyumlu
  görünüyorlardı, çelişki tek maddede saklıydı ve onu T0 değil üye gösterdi.
- Nihai yetki bildirimi **turu 4'e kadar verilmez**. T0 elinde tutar, gerekirse log'a yazar.

## Kapatılmamış — ikisi de işaretledi

1. **Zaman aşımı yok.** Üye hiç dönmezse tanımlı davranış yok.
2. **Log ile masa arasında tutarlılık denetimi yok.** Log'a "yazıldı" düşüp masaya
   yazmayan üyeyi yalnız T0 fark eder.
3. **Uzlaşı hükmünün tanımı yok.** T0'ın yorumuna kalmış.
4. **İkiden çok üyede ölçeklenmiyor** — başlık düzeni ve tur eşlemesi bozulur.
5. **25 satır sınırı tur başına mı toplam mı** belirsiz.
6. **Ortak soru listesi.** Fable: brifingler aynı soruyu farklı sözcüklerle sorarsa
   cevaplar hizasız gelir — soru listesi ortak, ton kişisel olmalı.

## Bu koşunun ölçüsü

Mekanik tek koşuda değerlendirildi. Bir koşu eğilim gösterir, kanıt değil.

Gözlenen: iki üye de karşılıklı revizyonda **kendi pozisyonunu geri aldı** (opus üye adı,
fable yazma yarışı). Tek yönlü yakınsama olmadı — opus'un "doğrulama tiyatrosu" uyarısı
bu koşuda gerçekleşmedi.
