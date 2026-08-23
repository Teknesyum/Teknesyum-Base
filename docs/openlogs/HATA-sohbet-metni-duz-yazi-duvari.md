# Hata: Sohbet çıktısında düz yazı duvarı — ölçülebilir kural yalnız arayüz metnini kapsıyor

**Durum:** açık.
**Belirti:** Ajanın kullanıcıya yazdığı açıklamalar uzun, paragraf başı seyrek; madde ve blok yerine düz yazı akıyor.
**Kaynak:** `teknesyum-ui/SKILL.md` §3.2 · `relay/SKILL.md` §7 · `~/.claude/RULES.md`
**Görüldüğü proje:** VidShrink

---

## 1. Ne oldu

Kullanıcı, oturum boyunca yazdığım açıklamaların uzun düz metin olduğunu ve maddelere
bölünmesi gerektiğini söyledi. Haklı: bu oturumdaki kurulum hatası açıklamalarında
beş-altı satırlık paragraflar arka arkaya gitti.

Sorulan soru şuydu: bu kural protokolde var mı?

### Cevap: kural var, ama ikiye bölünmüş

Üç yerde metin biçimine dair hüküm bulundu. Hiçbiri tek başına bu durumu kapatmıyor.

**1. `teknesyum-ui` §3.2 — ölçülebilir, ama kapsamı arayüz metni**

Kuralın kendisi tam olarak istenen şey:

> Paragraf **2-4 satır**. Beş satırı geçen paragraf ikiye bölünür veya listeye çevrilir.
> Üç maddeden fazla art arda bilgi varsa cümleye değil **listeye** yazılır.

Sorun kapsam cümlesinde:

> Arayüzde görünen her açıklama, yardım metni, tooltip gövdesi, onboarding ekranı, hata
> açıklaması ve `README` niteliğindeki panel metni bloklara ayrılır.

Sayılan altı şeyin altısı da **uygulama içi metin**. Ajanın sohbete yazdığı cevap bu
listede yok. §3.2 denetim listesinde de aynı sınır duruyor — madde arayüz taramasında
kontrol ediliyor, oturum çıktısında değil.

**2. `relay` §7 — sohbeti kapsıyor, ölçüsü yok**

> Bunlar **durum bildirimidir, düzyazı özet değildir** — tablo, madde, tek satırlık olay.

Doğru yeri işaret ediyor ama "ne kadar uzun paragraf fazla" sorusuna cevap vermiyor.
Ölçüsü olmayan kural, ihlal edildiğinde fark edilmiyor.

**3. `RULES.md` — sohbeti kapsıyor, ölçüsü yok**

> No long summaries, no walls of prose. What changed, where — that's it.

Aynı boşluk. "Wall of prose" tanımsız; beş satırlık paragraf duvar mı, değil mi
belirsiz.

### Neden uygulanmadı

İki sebep, ikisi de kuralın kendisinde:

- **Ölçülebilir olan kural beni kapsamıyor.** §3.2'nin "2-4 satır" eşiği yalnız arayüz
  metni için yazılmış; sohbet çıktısı kapsam listesinde geçmiyor.
- **Beni kapsayan kuralların eşiği yok.** `relay` §7 ve `RULES.md` doğru şeyi söylüyor
  ama sayı vermiyor, o yüzden ihlal ölçülemiyor.

Bu bir dikkatsizlik değil, kapsam boşluğu. Aynı metni arayüze yazsaydım §3.2 ihlali
sayılacaktı; sohbete yazınca hiçbir kapıya takılmadı.

## 2. Ölçü

Günlük şu ikisi sağlandığında kapanır:

1. §3.2'nin kapsam cümlesi ajanın kullanıcıya yazdığı metni de içerecek şekilde
   genişletilir, ya da `relay` §7'ye aynı ölçü (paragraf 2-4 satır, üçten fazla art
   arda bilgi listeye) sayı olarak eklenir.
2. Kural yazıldıktan sonra bir oturum çıktısı ona karşı okunur ve beş satırı geçen
   paragraf kalmadığı görülür.

---

## 3. Öneri

Kuralı `teknesyum-ui`'den taşımak yerine **ölçüyü `relay` §7'ye kopyalamak** daha doğru
görünüyor. Gerekçe: §3.2 arayüz standardının parçası ve `uicheckup` onu arayüz taramasında
kullanıyor; kapsamını sohbete genişletmek o taramanın anlamını bulandırır.

`relay` §7'ye eklenecek satır:

> Kullanıcıya yazılan her açıklama bloklara ayrılır. Paragraf 2-4 satır; beş satırı geçen
> paragraf ikiye bölünür veya listeye çevrilir. Üç maddeden fazla art arda bilgi cümleye
> değil listeye yazılır. Ölçü `teknesyum-ui` §3.2 ile aynıdır, kapsamı sohbet çıktısıdır.

Bu madde, aynı hafta açılan `HATA-turkce-karakter-ps1-kodlama.md` §3'teki "standart
üretim modülü" önerisiyle aynı boşluğu gösteriyor: kural biliniyor, kuralı hatırlatacak
ve ölçecek yer yok.
