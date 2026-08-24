# Çıktı ayrıntıları — hata ayıklama, dönüş bloğu, fark satırları

`SKILL.md` §7 kullanıcıya ne söyleneceğinin kuralını taşır; burası üç özel durumun
biçimini. Üçü de koşulludur: hata ayıklarken, işçi oturum kapanırken, base bir
dosyaya dokunduğunda okunur.

## 2.1 Hata ayıklama — belirtiyi değil nedeni düzelt

**Açıklayamadığın bir belirtiyi yamama.** Neden çalışmadığını anlamadan yapılan düzeltme,
hatayı taşır: bir yerde susar, başka yerde çıkar.

Dört adım, sırayla:

1. **Üret.** Hatayı kendin gör. Üretemiyorsan önce üretmenin yolunu bul; kullanıcının
   ekran görüntüsü kanıt değil, ipucudur.
2. **Yerini bul.** Hangi satır, hangi koşul. Tahminle daraltma — log, breakpoint,
   `git log -S`, ikili arama.
3. **Nedeni düzelt.** Belirtiyi susturan `try/catch`, `if (x == null) return`, gecikme
   ekleme gibi çözümler yasak. Bunlar hatayı gizler.
4. **Doğrula ve kardeşini ara.** Aynı hata başka nerede var? Aynı kalıp başka dosyada
   tekrarlanıyorsa orayı da düzelt.

Üçüncü adımda nedeni bulamadıysan **dur ve söyle.** "Muhtemelen şuydu" diyerek yamamak,
kullanıcının bir daha aynı hatayı yaşaması demektir.

**Yazdığın dosya ayrıştırılamıyorsa hook seni aynı adımda uyarır.** `.js`/`.json`
yazımından sonra sözdizimi denetlenir; hata mesajı geri döner. O uyarıyı gördüğünde
başka işe geçme, önce onu kapat — denetçiye kadar bekleyen bozuk dosya beş on araç
çağrısı sonra kat kat pahalıya düzelir.

Bu akış token yer — okuma, üretme, doğrulama. Karşılığı şudur: yanlış yama, aynı hatayı
ikinci kez ayıklamak ve arada kırılan şeyi bulmak toplamda kat kat pahalıdır (§0).

## 7.1 Dönüş bloğu — işçi oturumun son sözü

**İşini bitiren oturum, mesajının en altına kopyalanabilir tek blok koyar.** Kural
yalnızca çok oturumlu devirde değil, işi başka bir yerden alan ya da sonucu başka bir
yere taşınacak her oturumda geçerlidir — kullanıcı senin bağlamını göremez, karşı
oturuma taşıyacağı şey bu bloktur.

En fazla 5 satır, üç alan:

```
T3 teslim edildi · 747 test yeşil, build temiz
Rapor: docs/tasks/T19-isolated-performance-e2e.md
Açık: main'e commit yetkisi bende mi?
```

Birinci satır ne bitti + durum. İkinci satır rapor dosyasının yolu — **gövde sohbete
değil dosyaya yazılır**, karşı taraf dosyayı kendi okur. Üçüncü satır varsa tek açık
soru; yoksa yazma.

Açık bir paket ya da sözleşme varken bitiş bildirip bu bloğu vermeden kapanırsan `Stop`
kancası seni geri çevirir. Şüphedeysen bloğu ver; beş satır ucuzdur, kullanıcının
oturumlar arasında elle özet yazması değildir.

Bunlar **durum bildirimidir, düzyazı özet değildir** — tablo, madde, tek satırlık olay.
Bitmiş işi tekrar anlatma. Sıklığı `briefing` düğmesi belirler; sapma bildirimi
hiçbir ayarda kapanmaz.

## 7.2 Fark satırları — base'in dokunduğu yer

Yönlendirme seviyesi `~/.claude/teknesyum.json` → `steering` alanındadır.
`0` hiç `Teknesyum ▸` satırı yazma · `1` temel yönlenmeler (varsayılan) · `2` her dokunuş.
Seviyeyi hook `UserPromptSubmit`'te sana bildirir; kendin dosya okumaya gitme.

**Seviye 2'de**, base olmasaydı farklı sonuçlanacak her karar kendi satırını alır. Satır
**baştan sona ters tırnak içinde** yazılır — terminalde arkası bloklu çıkar, düz metnin
içinde kaybolmaz. Kalın yazı, başlık işareti, madde imi ekleme:

```
`Teknesyum ▸ Fark ▸ İşi dört sözleşmeye bölüp iki ajana verdim — tek oturumda sırayla giderdi`
`Teknesyum ▸ Fark ▸ Bağları harita.js ile taradım — otuz dosya okumak yerine tek disk taraması oldu`
`Teknesyum ▸ Fark ▸ Denetçi T2'yi geri çevirdi — üçüncü kabul kriteri karşılanmamıştı`
`Teknesyum ▸ Fark ▸ Bağımsız üç sözleşmeyi aynı anda yürüttüm — tek sırada gitse iş üç kat uzardı`
```

Cümle günlük dilde kurulur: önce ne yaptığın, sonra kısa çizgiyle base olmasaydı ne
olacağı. Ok işareti, kısaltma ve terim yığını kullanma — satırı okuyan geliştirici değil
kullanıcıdır.

Satır açılacak anlar: iş ajanlara bölündüğünde, model yerine deterministik araç
seçildiğinde (`harita.js`, `rg`, `--check`), denetçi/ön araştırma/kanca devreye
girdiğinde, model yükseltilip düşürüldüğünde, `RULES.md`'den bir kural sonucu
değiştirdiğinde, bir sözleşme kapsamı dışında kalan iş bilinçli bırakıldığında.

**Satır açılmayacak yer:** sıradan araç çağrısı, dosya okuma, düşünme adımı. Fark satırı
övünme değil iz kaydıdır — "base olmasaydı bu iş şöyle giderdi" diyemiyorsan yazma.
Seviye 0 ve 1'de bu satırlar hiç yazılmaz; 1'de yalnızca ölçü satırı ve hook bildirimleri
kalır.

## 2.2 Proje haritası — harita.js ve graphify

`SKILL.md` §2 madde 2 buraya işaret eder.

~30+ kaynak dosya varsa ya da iş
   3+ modüle dokunacaksa **önce haritayı çıkar** — model çağırmayan, saniyeler süren
   deterministik bir tarama:

   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/harita.js" .
   ```

   `.claude/harita.md` üretir: merkezler (en çok içeri alınan dosyalar), döngüler,
   yetimler, dosya→dosya bağlar. Dosya açmadan önce oraya bak; "bunu değiştirirsem ne
   kırılır" sorusunun cevabı orada, sıfır token maliyetiyle durur. Harita türetilmiş
   dosyadır — bayatladığını düşünüyorsan yeniden üret, elle düzeltme.

   **`/graphify` bunun yerine geçmez, üstüne biner.** Harita bağı verir, anlamı vermez;
   graphify semantik topluluk çıkarır ama her dosya için model çağırır. Yabancı bir
   kod tabanını *anlamak* gerekiyorsa graphify; kendi projende *ne neye bağlı* diye
   soruyorsan harita. Küçük projede ikisi de gereksiz — `Explore`+`Grep` yeter.
