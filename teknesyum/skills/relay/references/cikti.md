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

**Beş satır tavanı yalnız bloğun kendisi içindir.** Blok `Senden istediklerim`
başlığının yerine geçmez. Üçüncü satırdaki soru işi tarif eder, nasıl yapılacağını
değil; kullanıcıdan karar ya da aksiyon bekliyorsan bloğu bas, hemen ardından başlığı aç
ve numaralı maddelerde tam kopyalanabilir metni ver. Ölçüldü (25.08.2026): iki kural
birbirini kesti, model tavana uyup başlığı yazmadı ve kullanıcı ne yapacağını bulamadı.

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


## 2.3 Hazırlık maddelerinin ayrıntısı

2. **Proje kendi içinde nasıl bağlı, biliyor musun?** ~30+ kaynak dosya varsa ya da iş
   3+ modüle dokunacaksa önce `scripts/harita.js` ile deterministik haritayı çıkar —
   model çağırmaz, saniyeler sürer. Komut, `/graphify` ile farkı ve ne zaman ikisinin de
   gereksiz olduğu `references/cikti.md` içinde.

5. **Deterministik araç kuruldu mu?** Yeni JS/TS projesinde `biome.json` yaz; iş bitiminde
   biçimlendirmeyi modele değil `biome check --write`'a yaptır. Model gerekmeyen yerde
   model kullanmak token israfıdır — aynı düstur `sed`, `rg` ve IDE refactor için de geçerli.

7. **Sürüm çıkıyor mu?** Kökte `CHANGELOG.md` tutulur, `Keep a Changelog` biçiminde:
   sürüm başlığı + `Eklendi` / `Değişti` / `Düzeltildi` başlıkları. Commit mesajlarından
   otomatik üretilmez — o listeler kullanıcıya bir şey anlatmaz. `changesets` veya
   `semantic-release` kurulmaz; tek bakımcılı depoda kurulum maliyeti kazancından fazla.
8. **JS/TS projesi büyüdü mü?** (~30+ kaynak dosya) `knip` çalıştır: kullanılmayan dosya,
   export ve bağımlılığı tek geçişte bulur, `--fix` ile temizler. Ölü kodu modele
   aratmak token israfıdır. Küçük projede kurma.

## 6.1 Token disiplini ayrıntıları

- **Skill dosyası şişmez.** Bir `SKILL.md` her etkinleşmede tamamen bağlama girer; yan
  dosyalar yalnızca okunduğunda girer. Tavan **~30 kB**; aşan bölüm `references/` altına
  taşınır ve `SKILL.md`'de tek satırlık işaretçi bırakılır. Taşınacak olan seçilirken
  ölçüt "önemli mi" değil **"her işte gerekli mi"**: masaüstüne özel kural, web işinde
  bağlam yakar.
- **Kırpma dürüst yapılır.** Bir çıktıyı, dosyayı veya arama sonucunu kısaltarak
  aktarıyorsan **neyin düştüğünü ve tamamına nasıl bakılacağını** yaz: `[ilk 40 satır ·
  312 satır atlandı · tamamı: dosya:1-352]`. Sessiz kırpma en pahalı token tasarrufudur —
  eksik bilgiyle yazılan kod ikinci kez yazılır.
- **Optimizasyonun tabanı vardır.** Küçük işi optimize etmek, optimizasyonun kendisinden
  ucuza gelmez: 3 satırlık dosyayı grep'lemek, 20 karakterlik düzenlemeyi ajanla yapmak,
  tek dosyalık işe rota kurmak. Kazanç kurulum maliyetinden küçükse **doğrudan yap**.
- **Getirme maliyeti ölçütü.** Kalıcı bir dosyaya (`AGENTS.md`, hafıza, sözleşme bağlamı)
  bir bilgiyi yazmadan önce sor: bu, gerektiğinde **ucuza türetilebilir mi?** Dosya
  listesi, fonksiyon imzası, bağımlılık sürümü — `grep` bir saniyede bulur, yazılmaz.
  Yazılacak olan yalnızca türetilemeyen şeydir: karar ve gerekçesi, dışarıdan gelen
  kısıt, tekrar eden tercih.
- **Ölçüm tekrarı kapısı.** Getirme maliyeti ölçütünün kardeşi, ölçüm tarafında.
  Sözleşmeye bir ölçüm yazmadan önce sor: **bu sayı zaten ölçülmüş ve bir yere
  yazılmış mı?** `CHANGELOG`, röle `LOG.md`, `docs/olcumler/`, önceki sözleşmenin
  `## Çıktı`sı — yazılıysa sözleşme onu **kaynağıyla alıntılar**, yeniden ölçmez.
  "Öncesi/sonrası ölçüm" kalıbı düşünmeden uygulanınca "öncesi" boşa koşuluyor:
  bir sözleşmede dakikalar süren dört ffmpeg koşusu, `CHANGELOG`'da zaten yazılı bir
  sayıyı yeniden ölçmek için harcandı ve iptal edildi. Kalıp doğru; belgelenmiş
  tarafını yeniden ölçmek ölçüm değil tekrar.
- **Bilgi tekrar ediyorsa hafızaya yazılır, oturuma değil.** Üçüncü kez açıklanan şey
  kalıcı hafızaya gider; ilgili notlar birbirine `[[ad]]` ile bağlanır. Ayrı bir not
  uygulaması (Obsidian vb.) kurulmaz — hafıza zaten markdown, bağlar zaten çalışıyor.
