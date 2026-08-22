# UI tarama brifingi — ortak bölüm

Bu dosyayı her UI tarayıcı okur. Kendi merceğin ve depo listen çağrı mesajında.

## Amaç

`teknesyum/skills/teknesyum-ui/SKILL.md` bu evin arayüz standardı. Soru şu:
**yeterince modern, hareketli ve şık mı?**

Cevabı genel tavsiyeyle veremezsin. Elli depoyu on mercekten okuyoruz; sen kendi
merceğinden **fark** bildireceksin — standardın yaptığı ile alanın bugün yaptığı
arasındaki fark.

## Önce standardı oku

`teknesyum/skills/teknesyum-ui/SKILL.md` (485 satır) ve `references/` altındaki üç dosya.
Özellikle:

- §2 Palet · §3 Tipografi — token adları `--tk-*`
- §5.3 Bileşen ölçüleri
- **§5.4 Hareket** — asıl karşılaştırma alanı
- §8 Varsayılanlar

Standardın bugün söylediklerinden bilmen gerekenler:

- Animasyon **süs değil geri bildirim**; söyleyeceği şey yoksa animasyon yok
- Süre ölçeği: `--tk-t-fast` mikro, `--tk-t-base` 240ms panel/diyalog/sekme
- **Yalnız `opacity` ve `transform`** animasyonlanır — yerleşim yeniden hesaplatan
  özellikler yasak
- **Geçiş tercih edilir, keyframe değil** — geçiş yarıda iptal edilebilir, keyframe sıçrar
- `prefers-reduced-motion` zorunlu; açıkken konum/ölçek kapanır, **opaklık kalır**
- Kapsam dört platform: Web, React, Electron, WPF/WinForms

## Ne yazacaksın

`docs/taramalar/ui-<mercek>.md`. Dosya adı çağrı mesajında.

### 1 · Alanın bugün yaptığı

Depolarda gördüğün **somut** şey. Sürüm, dosya, satır ver. "Modern kütüphaneler spring
animasyon kullanıyor" değil — hangi depo, hangi API, hangi varsayılan değer.

### 2 · Standardın kaçırdığı

Standartta **olmayan** ve alanda yerleşik olan şeyler. Her madde için:

- Ne · nerede gördün · standardın bugün ne dediği
- **Alınmalı mı** — evet/hayır ve tek cümle gerekçe
- Alınırsa hangi bölüme girer (§ numarası)

### 3 · Standardın haklı olduğu yerler

Bu bölüm **zorunlu** ve boş bırakılamaz. Standart bir şeyi alanın çoğunluğundan farklı
yapıyorsa ve bu farkın gerekçesi sağlamsa, onu yaz. "Herkes böyle yapıyor" bir gerekçe
değildir; standardı moda diye değiştirmek kayıptır.

Örnek: keyframe yerine geçiş tercihi. Alanın çoğu keyframe kütüphanesi kullanıyor;
standardın gerekçesi (iptal edilebilirlik) teknik ve doğru. Böyle yerleri koru ve **neden**
korunduğunu yaz.

### 4 · Ölçü ve token

Alanda yerleşik olan sayısal değerler: süre ölçekleri, easing eğrileri, spring sabitleri,
gölge ölçekleri, yarıçap ölçekleri. Standardın değerleriyle **yan yana tablo**.

Uydurma sayı yazma. Bulamadığın değeri "bulamadım" yaz.

### 5 · Lisans

Kod ya da varlık alınacaksa lisansı yaz. Standardın §5.6'sı önce lisans diyor.
MIT/Apache-2.0/BSD dışında bir şey görürsen ayrıca işaretle.

## Kurallar

- **Kod kopyalama.** Fikir çıkar, kod değil.
- **Ekran görüntüsü indirme, varlık indirme.** Salt okuma.
- Türkçe yaz.
- En fazla 150 satır. Uzun rapor okunmaz; kesip öz bırak.
- Depoya erişemediysen **erişemedim** yaz, uydurma.

## Bu tarama neye bağlanacak

Raporlar toplandığında `fable` + `opus` plan konseyi açılacak ve standardın hangi
maddelerinin değişeceğine karar verilecek. Senin raporun o konseyin girdisi — karar
sende değil, **kanıt** sende.

Bu yüzden "bence şöyle olmalı" cümleleri değersiz; "şu depo şunu şöyle yapıyor, standart
şunu diyor, fark şu" cümleleri değerli.
