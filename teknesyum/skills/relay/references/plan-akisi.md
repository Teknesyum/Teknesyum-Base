# Plan akışı — sıfırdan projede izlenen yol

`SKILL.md` ne zaman plan yapılacağını söyler; burası nasıl yapılacağını. Bu dosya
yalnız **sıfırdan proje** ve **tek karar düğümü** işlerinde okunur; mevcut bir projede
yapılan sıradan iş buraya hiç uğramaz.

## 1.3 Netleştirme — yalnızca sıfırdan projede

Ölçü **sıfırdan proje** çıktıysa, tek kod satırı yazılmadan önce **bir tur** netleştirme
yapılır. Sadece o ölçüde; küçük işte yapılmaz.

Sebebi token ekonomisi: yanlış anlaşılmış bir mimariyi üç aşama sonra sökmek, baştan dört
soru sormaktan kat kat pahalıdır.

Kural, kullanıcının "rutin onay sorma" tercihini çiğnememek için sıkı:

- **Tek tur.** Sorular bir kerede sorulur, cevap gelince bir daha sorulmaz.
- **En çok dört soru**, hepsi aynı blokta, her birinde **önerilen seçenek işaretli**.
- Kullanıcı "hepsi önerilen" derse tur biter.
- Yalnızca **farklı cevabın farklı iş çıkardığı** şeyler sorulur. Varsayılanı olan hiçbir
  şey sorulmaz.

Netleştirme turu bittiğinde kararlar `docs/PLAN.md` başına yazılır; bir daha sorulmaz.

## 1.4 Ön araştırma — sıfırdan projede zorunlu

Netleştirme turu bitince, **tek sözleşme yazılmadan önce** aynı problemi çözmüş projeler
taranır. Amaç kopyalamak değil: inşa edilmişin nerede doğru, nerede yanlış yaptığını
görüp onun üstüne çıkmak. Sıfırdan tasarlanan mimari, üçüncü aşamada sökülür.

**Kaç depo:** `SETTINGS.md` içindeki `research_repos` söyler — eco profilinde **1**,
normal profilde **10**, premium profilde **50**. Sayı profille değişir, kural değişmez.
eco'da tavan 1'dir çünkü her depo bir `scout` ajanı payıdır ve eco'nun kestiği ilk şey
ajan sayısıdır; tek depo bile "birileri bu problemi nasıl çözmüş" sorusuna cevap verir.

Bildirim — dağıtmadan önce tek satır:

```
Teknesyum ▸ araştırma başlatıldı · <konu> · <n> depo · scout/<model>
```

Bitince:

```
Teknesyum ▸ araştırma bitti · <n> depo · 6 fikir alındı · 3 şüpheli · docs/taramalar/RAPOR.md
```

**Nasıl:**

1. **Aday listesi — `research_repos` kadar.** Aynı problemi çözen, çözmeye yakın duran ya
   da tek bir parçasını iyi çözmüş depolar. Bir tanesi de "bu işi yanlış yapmış" olsun;
   neyi yapmayacağını bilmek de kazançtır.
2. **Dağıt.** Her `scout` ajanına 2-3 depo, paralel. Bütün listeyi tek ajana verme —
   sonuncuya geldiğinde ilkini unutur. Elli depoda bu, `parallel_width` tavanına kadar
   ajan ve birkaç aşama demektir; aşama aralarında biriken raporu okuyup kalan adayları
   ele — ilk yirmi depo neyin zaten çözülmüş olduğunu gösterir, sonraki otuzun bir kısmı
   gereksizleşir. Eleme gerekçesi `RAPOR.md` içinde tek satır olarak yazılır.
3. **Depo başına tek dosya:** `docs/taramalar/<kisa-ad>.md`, sabit altı başlıkla
   (biçim `agents/scout.md` içinde).
4. **Birleştir.** `docs/taramalar/RAPOR.md` — üç bölüm: **alınanlar** (hangi fikir,
   hangi depodan, nereye girdi), **bilerek alınmayanlar** (gerekçesiyle), **şüpheliler**.
   Bu birleştirme senin işin, `scout`'un değil; karar gerektirir.
5. **Kullanıcıya sun.** Şüpheliler ve bağımlılık kararları sorulur — sessizce alınmaz,
   sessizce atılmaz.

**Kurallar:**

- **Kod kopyalanmaz.** Alınan şey desen, sınır ve hata; satır değil. Bütünüyle alınabilecek
  tek şey kütüphanedir (`motion` gibi) ve o bir bağımlılık kararıdır — kullanıcıya sorulur.
- **Kapatılmış depo dışlanmaz.** "Terk edilmiş" bağımlılık kurma uyarısıdır, okuma yasağı
  değil. Roo Code kapandı ama custom-mode tasarımı hâlâ öğretici.
- **Doğrulanamayan her rakam işaretlenir.** Kaynağı üçüncü taraf blog olan performans ve
  kullanım iddiaları `doğrulanamadı` etiketiyle yazılır.
- Araştırma bir kere yapılır, `docs/taramalar/` kalıcıdır. Altı ay sonra "bunu neden
  böyle yaptık" sorusunun cevabı oradadır.
- **Derinlik depo sayısıyla artmaz.** Elli depoda her dosya on depodakiyle aynı altı
  başlığı taşır; fark kapsamdadır, uzunlukta değil. Derinleşilecek yeri plan konseyi
  seçer.

Araştırma yapılmadan ilk sözleşme yazılmaya kalkılırsa hook geri çevirir. Kullanıcı
istemiyorsa gerekçesi `docs/taramalar/ATLANDI.md` dosyasına tek satır yazılır — kapı
o zaman açılır. Atlamak serbest, sessizce atlamak değil.

**Kapı her profilde engeller.** eco'nun eşiği tek depodur — bir depo okumanın bedeli
kapıyı tercihe çevirmeyi haklı çıkarmaz. İhlali maliyetsiz olan kural kural değildir;
bu yüzden eco'da da geçmenin tek yolu `ATLANDI.md` dosyasına yazılan gerekçedir.

## 1.5 Plan konseyi — planı iki model önerir

`SETTINGS.md` içindeki `plan_council` açıksa (premium profilde varsayılan), `PLAN.md`
tek modelin kalemiyle yazılmaz. Ön araştırma bitince T0 **aynı brifingle iki `planner`
ajanı** açar:

| Koltuk | Model | Ne yapar |
|---|---|---|
| Birinci koltuk | `opus` | bağımsız plan önerisi |
| İkinci koltuk | `fable` | bağımsız önerisini yazar, sonra birincinin metnini okur |

**İkisi de iş yapmaz.** Kod, dosya, sözleşme yazmazlar; `planner` ajanının elinde yazma
aracı yoktur. Tek çıktıları mesajla dönen öneridir — beş başlık: kavrayış, plan, riskler,
ayrım noktaları, reddettikleri.

**Üyeler adlarıyla anılır**, gizlenmez. `lite`, `hard`, `eski`, `yeni` diye bir konsey
ayrımı yoktur — uzatılmamış koşu da konseydir.

### Akış

1. **İki üye de bağımsız yazar.** Aynı soru, aynı anda, birbirini görmeden; paralel açılır.
2. **Birinci koltuğun metni ikinciye verilir.** Ters yön yoktur.
3. **Uzatma kararı ikinci üye ile T0'ındır.** Ayrı düşerlerse: biri uzat biri kapat ise
   **uzatma geçer**; uzatma nesne taşımıyorsa sayılmaz; ikisi de uzatıyorsa kapsamlar
   **birleşir** — kesişim almak sessiz bir kapatmadır.
4. **Oturumlar kapatılmaz.** Üye yeniden çağrılmaz, `SendMessage` ile sürdürülür —
   brifing tekrarlanmaz, bağlam durur.
5. **Tavan 4**, durak değil arka-durdurucu. Bağlarsa `kapanis_nedeni = tavan` yazılır ve
   bu kendi başına bir sinyaldir. Efor **medium** — ajan tanımından gelir, çağrıdan değil.

### Zorunlu valfler

| Valf | Ne zaman | Sonuç |
|---|---|---|
| **Emin değilim** | Birinci üye taşıyıcı bir maddede "emin değilim" yazdıysa | İkinci üye o maddede kapatamaz |
| **Kategori** | Şema · veri silme · dış API sözleşmesi · dosya biçimi · migration | Tek turda kapanmaz |

Kapanışta koşu `docs/stats/konsey.md` defterine yazılır; satırı
`scripts/olcum/konsey-maliyet.js` üretir, elle doldurulmaz. **Yazma zamanı kapanışı ilan
eden aynı işlemdir.**

Tam metin: `docs/konsey/PROTOKOL.md` — geri çekme tiplemesi, cırcır emniyeti, devir kuralı
ve mekanik dondurma sınırı oradadır. **Mekanik dondurulmuştur:** kalibrasyon koşusu artı
gerçek işte iki koşu loglanmadan protokol değişmez.

Bildirim — açmadan önce ve bitince tek satır:

```
Teknesyum ▸ plan konseyi açıldı · <konu> · opus + fable
Teknesyum ▸ plan konseyi bitti · <n> tur · <m> ayrışma · docs/PLAN.md
```

**Sentez T0'ın işidir** ve şu sırayla yapılır:

1. **Ortak noktalar.** İki üye de aynı şeyi söylüyorsa o karar doğrulanmış sayılır,
   tartışılmaz, doğrudan plana girer.
2. **Ayrışmalar.** Farklı söyledikleri her nokta `PLAN.md` içinde **Konsey ayrışması**
   başlığı altına yazılır: iki seçenek, iki gerekçe, T0'ın seçtiği ve **neden seçtiği**.
   Ayrışmayı sessizce bir tarafa çözme — altı ay sonra öteki yolun neden elendiği
   sorulacak.
3. **Yalnız birinde geçen fikir.** Bir üyenin görüp ötekinin görmediği şey elenmeden
   önce ayrıca değerlendirilir; konseyin asıl kazancı çoğu zaman buradadır.
4. **İkisi de yanılabilir.** Konsey oy sandığı değil: iki üye aynı hatada birleşmişse
   T0 yine de reddeder. Ortaklık kanıt değil, işaret.

Sonra `PLAN.md`'yi **T0 yazar.** Konsey üyeleri dosyaya dokunmaz.

**Bu kural "planlamayı asla delege etme" ile çelişmez.** Delege edilen karar değil
seçenek üretimidir. Soğuk başlayan ajanın kötü plan yapmasının sebebi bağlamsızlıktı;
konsey üyesi aynı brifingi, aynı araştırma raporunu ve aynı kod tabanını görür. Kararı
hâlâ bağlamı taşıyan T0 verir.

`plan_council` kapalıyken (eco ve normal profil) plan doğrudan T0 tarafından yazılır,
konsey açılmaz. Tek üyeyle konsey kurulmaz — bir öneri, öneri değil plandır.

## 1.5.1 İkinci görüş — tek soruluk konsey

`SETTINGS.md` içindeki `second_opinion` açıksa (premium profilde varsayılan), T0 önemli
bir düğümde **`advisor` ajanını** açar.

**Görüş yetersizlik itirafı değildir.** Kullanıcı 27.08.2026'da bunu açıkça söyledi:
"sadece senin yetersiz olduğun alanlar gibi bir kısıt yok — ek görüş ile ufkunu açmanın
faydalı olacağı önemli kilit noktalarda." Yani tetik "bilmiyorum" değil, "burası kilit".
T0 kendinden eminken de açılır; ikinci okuma emin olunan yerdeki kör noktayı gösterir.
Ölçüldü, aynı gün: T0 mühür doğrulayıcısının "%33 yanlış tamam" çıktısını bugünkü
makinenin kusuru diye raporladı; `advisor` on beş vakanın tamamının yama öncesi dönemden
geldiğini, bugünkü oranın sıfır olduğunu gösterdi. T0 emindi ve yanılıyordu. Ayrı bir ajandır,
`planner`'ın bir kipi değil: brifingde ön ek yoktur, doğrudan `advisor` açılır ve soru
yazılır.

Konseyden iki yerde ayrılır: konsey **planın tamamı** içindir ve **iki** üyelidir, görüş
**tek bir karar** içindir ve **tek** üyelidir — `fable`. Konsey ön araştırmadan sonra bir
kez açılır; görüş iş sürerken, takıldığın yerde açılır.

**Neden ayrı ajan.** `Agent` aracının şemasında `model` alanı var ama `effort` alanı yok;
efor yalnızca ajan tanımının frontmatter'ından gelir. Konsey ve görüş aynı dosyada
durduğu sürece aynı eforu paylaşıyorlardı. `advisor` premiumda bile `low` eforla
çalışır — aşağıdaki liste dokuz tetikleyiciye çıktığı için danışma sık olacaktır ve
**sık olan şeyin ucuz olması gerekir.** Pahalı bir görüş mekanizması, kullanılmayan bir
görüş mekanizmasıdır.

**Varsayılan açmaktır, açmamak gerekçe ister.** Kullanıcı 23.08.2026'da bunu açıkça
istedi: `advisor` bir acil durum düğmesi değil, sürekli akıl hocasıdır. Liste aşağıda
duruyor ama artık bir *izin listesi* değil, **hatırlatma listesi**: maddelerden biri
uyuyorsa açmak zorunludur, hiçbiri uymasa da kararın doğruluğundan emin değilsen açarsın.

Açmamanın üç gerekçesi vardır, dördüncüsü yoktur: iş **mekanik** (kalıbı belli, tek doğru
cevabı var), soru **kullanıcıya sorulabilir** durumda (o zaman sor — görüş sormanın yerini
tutmaz), ya da aynı düğümde **bu turda zaten** bir görüş alındı.

Bunun bedeli tartıldı: `advisor` premiumda bile `low` eforla ve `fable` ile çalışır,
bir görüş 25 saniye ve ~10 bin token. Beş turdur çözülmeyen bir hatanın maliyeti altı
yapıcı ve beş denetçi koşusudur — ölçüldü, `docs/openlogs/kapali/HATA-ikinci-gorus-tetiklenmiyor.md`.
Yanlış tarafa yanılmak istiyorsak, fazla danışma tarafına yanılırız.

**Ne zaman bakılacağı da kuraldır, ne yapılacağı kadar.** Liste vardı, bakma anı yoktu ve
tetikleyici beş tur boyunca hiç ateşlenmedi. Bakma anları şunlardır: her denetim raporu
geldiğinde brifing yazmadan önce · bir sözleşme ikinci düzeltme turuna girerken · plan
kullanıcıya verilmeden önce · geri alınması pahalı bir adımdan önce.

On bir hatırlatma maddesi. Her madde ölçülebilir bir eksik, çelişki ya da kilit gösterir:

1. İki yol arasında kalındı ve seçim geri alınması pahalı — mimari sınır, veri modeli,
   bağımlılık kararı.
2. Bir hata üç turdur çözülmedi ve kök neden hâlâ belirsiz.
3. Bir kural bozulacak. §0 bunu serbest bırakıyor ama gerekçe istiyor; görüş o gerekçeyi
   sınar.
4. İstek iki farklı okunabiliyor ve sormak yerine varsayım yapılacak.
5. Kullanıcı "plan oluştur" ya da "plan yap" dedi. Plan kullanıcıya verilmeden önce
   `fable`'dan kısa bir teyit alınır.
6. Bir bulgunun gerçekten hata olduğu gösterilemedi: kodu okudun ama onu **yeniden
   üreten adımı, kalan bir testi ya da bir günlük satırını** yazamıyorsun. Düzeltmeden
   önce sorulur — olmayan hatayı düzeltmek çalışan kodu bozar.
7. İki ajanın raporu aynı dosya ya da aynı ölçü hakkında farklı şey söylüyor ve ikisini
   birden doğrulayan bir koşu yok.
8. Bir kabul kriteri sözleşmeye yazıldı ama onu **geçti/kaldı yapan komut yazılamadı.**
   Ölçüsü olmayan kriter sözleşmeye girmeden önce sorulur. Komut yazılabiliyorsa kriterin
   altına `CHECK:` satırı olarak konur (`references/protocol.md` §4); `audit` eşiği `high`
   ve üstündeyken `CHECK`siz kriter zaten sözleşmeye giremez.
9. Geri alınması pahalı bir yayın adımından önce: sürüm etiketi, `main`'e birleştirme,
   yayımlanmış bir arayüzün ya da şemanın değişmesi, bir sürümün geri çekilmesi.
10. Bir ölçümün sonucu **yoruma dönüşecek**: sayı elde, hüküm henüz yazılmadı. Sayıyı
    okumak ile ne anlama geldiğini söylemek ayrı işlerdir; ikincisi görüş ister. Bu madde
    T0 emin olduğunda da ateşlenir — nedeni yukarıdaki ölçülmüş vakadır.
11. Bir şey **kesilecek**: kod, komut, kural, belge, bağımlılık. Kaldırma kararı kalıcı
    yükü azaltır ama neyi taşıdığı ancak kaldırıldıktan sonra görülür. Kesimden önce
    sorulur, kesimden sonra sormak geç kalmış olur.

**Dördüncü maddede sormak önce gelir.** Görüş, kullanıcıya sormanın yerini tutmaz;
yalnızca `ask_threshold` sormaya izin vermediğinde devreye girer. Eşik soruyorsa sor.

**Altıncı ve yedinci madde düzeltmeden önce gelir.** İkisi de "bir şey yanlış görünüyor
ama yanlış olduğu ölçülmedi" durumudur; görüşün kazancı orada düzeltmeyi geciktirmesidir.

**Beşinci maddeyi plan konseyiyle karıştırma.** İkisi ayrı tetikleyicidir ve ayrı yerde
çalışır:

| | Plan konseyi (§1.5) | Plan teyidi (bu bölüm) |
|---|---|---|
| Ne zaman | sıfırdan projede, ön araştırma bittiğinde | kullanıcı her "plan oluştur" dediğinde |
| Ajan | `planner` ×2 | `advisor` ×1 |
| Üye | iki — `fable` + `opus` | tek — `fable` |
| Efor | `xhigh` | `low` |
| Çıktı | beş başlıklı iki bağımsız öneri | üç başlıklı kısa teyit, ≤20 satır |
| Sonuç | T0 sentezler, `PLAN.md` yazar | T0 planı düzeltir ya da gerekçesini yazar |

Sıfırdan projede `PLAN.md` yazılıyorsa konsey çalışır, teyit ayrıca alınmaz — iki üye
zaten baktı. Konsey kapalıyken veya iş sıfırdan proje değilken teyit tek üyeyle alınır.

**Açılmayacağı yerler:** mekanik iş, kalıbı belli iş, tek doğru cevabı olan şey. Cevabını
bildiğin soruyu sorma. Ama "biliyorum" ile "bildiğimi sanıyorum" arasındaki farkı ancak
sorunca öğrenirsin; ikisini ayırt edemiyorsan sor.

Çıktı üç başlıktır ve 20 satırı geçmez: görüş, gerekçe, kaçırdığın şey. Üçüncüsü bu işin
asıl kazancıdır — soruyu soranın görmediği şey oradadır.

**Her görüş kayda geçer.** `advisor` her açıldığında `relay-watch` `.claude/relay/GORUS.md`'ye tek satır düşer: tarih, soru ve o an dördüncü turda bekleyen sözleşmeler. Satırı model yazmaz, kanca yazar — "kaç kez ateşlendi" sorusu ancak böyle ölçülür. Dördüncü tura girmiş ve denetimi geçmemiş sözleşme varken `UserPromptSubmit` ayrıca hatırlatır; hatırlatma bloklamaz, açmamayı seçersen gerekçen sözleşmeye yazılır.

**Görüş bağlayıcı değildir.** T0 katılmazsa gerekçesini yazar. Görüş alındığı kullanıcıya
tek satırla bildirilir:

```
`Teknesyum ▸ Görüş ▸ <ne sordum> — <fable ne dedi, tek cümle>`
```

Satırın tamamı ters tırnak içindedir, etiket büyük harfle başlar, ayraç `▸` işaretidir,
kalan cümle sıradan tümce düzenindedir ve cümlenin içinde ok kullanılmaz — `Ölçüm ▸` ve
`Fark ▸` satırlarıyla aynı kalıp.

`second_opinion` kapalıyken (eco ve normal profil) görüş açılmaz; kararı T0 tek başına
verir.

## 1.6 Ürün standardı — üç platform ve kendini güncelleme

Ayrıntı `references/standartlar.md`. Burada geçerli olan iki karar:

**Yeni projede üç platform varsayılandır** (Windows, macOS, Linux). İş mantığı platform
API'si çağırmaz, kabuk dışında platforma bağlı kod bulunmaz, CI üç OS'te koşar. Aksi
söylenmediyse böyle kurulur.

**Mevcut projede kural kendiliğinden uygulanmaz — sorulur.** Tek soru: "Bu proje şu an
yalnız <platform>. Üç platforma taşıyalım mı?" `hayır` cevabı proje kökündeki
`.claude/teknesyum.json` dosyasına `platformlar` + `platformNeden` olarak yazılır ve bir
daha sorulmaz; `evet` cevabı geçişi **kendi sözleşmesine** açar, süren işin içine
karıştırmaz. Aynı akış arayüz için `uicheckup` ile işler: tarar, raporlar, onay almadan
hiçbir hedef dosyaya yazmaz.

Doğası gereği tek platform olan iş (oyun overlay'i, kabuk ilişkilendirmesi, registry/ETW)
kapatılır — gerekçe satırıyla.

**Kendini güncelleme** üretilen programlarda varsayılan olarak açıktır: günde bir kez,
açılış yolunun dışında, sessiz başarısızlıkla. Varsayılan mod haber vermektir; sessiz kurulum
yalnız yayınlanan SHA-256 doğrulanıyorsa. Paket yöneticisiyle kurulmuş program kendini
güncellemez. Ön koşulu, her etikette üç platforma derleyip checksum yayınlayan CI'dır —
o yoksa güncelleyici yazılmaz.

Denetim modelsizdir: `node teknesyum/scripts/platform-denetim.js <kök>`.

## 1.7 Sertifika — proje profili karşılıyor mu

`/scan <eco|normal|premium>` projenin **şu anki halini** bir profile karşı denetler ve
eksikleri madde madde sayar. Salt okurdur: dosya yazmaz, ajan açmaz, model çağırmaz.

Beş madde ölçülür; dördünün eşiği profille değişir, lisansınki değişmez — lisanssız
ya da kendisiyle çelişen depo her profilde kalır.

| Ölçüt | eco | normal | premium |
|---|---|---|---|
| Ön araştırma | 1 depo | 10 depo | 50 depo |
| İnceleme modeli | haiku+ | sonnet+ | opus, high+ |
| Kapsam | değişen dosyalar | değişen + komşuları | baştan sona, her kaynak dosya |
| Denetim | kritik sözleşmeler | her sözleşme | her sözleşme |
| Belge tutarlılığı | — | README | README + CHANGELOG + skill |
| Lisans | LICENSE + beyanların hizası | aynı | aynı |

**Ayar verilmeden çalışmaz.** Profil argümanı yoksa betik kullanımı basıp çıkar; sen de
varsayılana düşme. Elli depoluk bir tarama kullanıcının istemediği yerde başlamamalı.

Eşikler `scripts/tarama.js` içine ikinci kez yazılmaz — `/premium`'un düğmeleri yazdığı
`DUGME` tablosundan okunur. Düğme ile sertifika aynı sayıyı görmek zorunda.

**Kapsam kaydı.** "Bu dosya incelendi mi" sorusuna `.claude/relay/kapsam.json` cevap
verir: dosya yolu başına en son hangi model, hangi efor, ne zaman, hangi ajan. Kanca iki
yerde yazar — ajan bittiğinde kendi izindeki `files` listesinden, ve ana oturumun her
`Write`/`Edit` işleminde. **Ana oturumun dokunuşu da incelemedir:** T0 bir dosyayı açıp
düzelttiyse o dosya görülmüştür. Kayıt `live/` gibi süpürülmez; sertifika haftalar
önceki işin de hesabını verir. Elle doldurulmaz.

**`--tamamla` ayrımı.** Bayraksız çağrı yalnız rapor verir ve hiçbir şey değişmez.
`--tamamla` betiğin davranışını da değiştirmez — o da hiçbir dosyaya yazmaz, yalnız
çıktının sonuna "eksikleri kapatmak için ne yapılmalı" bölümünü ekler. **İşi sen
yaparsın:** eksik depo için `scout` ajanları, incelenmemiş dosya için profilin
modelinde inceleme, mühürsüz sözleşme için `auditor`, eksik belge için düzeltme.
Kaç ajan açılacağı profile bağlıdır — eco'da 1, premiumda `parallel_width` kadar.


## 1.2 Proje düzeni — kök sade kalır


**Kökte gereksiz dosya durmaz.** Kullanıcı klasörü açtığında ne yapacağını görmeli, neyi
göz ardı edeceğini değil. Kural: **kökte klasörler, çalıştırılabilir dosya ve teknik
zorunluluklar** durur — başka bir şey değil.

```
<proje>/
  src/          kaynak kod
  docs/         insanın okuduğu her belge — plan, yol haritası, karar günlüğü,
                görev paketleri, ajanların birbirine bıraktığı notlar, rapor
  locale/       arayüz metinleri (tr.json kaynak, en.json çeviri)
  settings/     yapılandırma dosyaları, şema, varsayılan profiller
  tools/        yanına gömülen dış ikililer (ffmpeg gibi)
  tests/        testler
  .claude/      makine alanı — röle durumu, sözleşmeler (gizli, karışıklık sayılmaz)
  README.md     tek doküman istisnası, İngilizce
  <ad>.exe / <ad>.sln / package.json    yığının zorunlu kıldığı kök dosyalar
```

Kökte `NOTLAR.md`, `plan-v2.md`, `todo.txt`, `ayarlar.json`, dağınık betikler **olmaz**;
`docs/` veya `settings/` altına taşınır. Yeni bir dosyayı köke koymak üzereyken önce sor:
*bunun bir klasörü var mı, yoksa açmam mı gerekiyor?* Yığının dayattığı kök dosyaları
(`*.sln`, `package.json`, `*.csproj`, `.gitignore`) taşımaya çalışma — onlar zorunluluk.

**Ajanlar arası iletişim ve belgeler `docs/` altındadır.** Sözleşmenin canlı durumu
(`status`, izler, mühür) `.claude/relay/` içinde kalır çünkü orayı hook denetliyor ve
yol değişirse koruma çalışmaz; ama insanın okuyacağı her şey — paket, plan, karar
gerekçesi, aşama raporu — `docs/` altına yazılır ve orada kalır. Ölçüt: **kullanıcı
projeyi altı ay sonra açtığında `docs/`'u okuyarak ne olduğunu anlayabilmeli.**

Mevcut projede kök zaten dağınıksa kendiliğinden toplama — tek satırla bildir, kullanıcı
isterse `scribe`'a temizlik sözleşmesi yaz.


## 2.6 Yeni depo — ad ve lisans

`SKILL.md` §2 madde 6 buraya işaret eder. Depo açılırken okunur.

Ad **ilki büyük, gerisi küçük**: `Vidshrink`, `Runly`,
   `Lockpicker`. Alt çizgi, camelCase ve BÜYÜK HARF yok. Tek kelimede yalnızca ilk harf
   büyür. Birden çok kelime gerekiyorsa **her kelimenin ilk harfi büyür ve kelimeler
   bitişik yazılır**: `TeknesyumBase`, `VidShrink`. Kısaltma tek başına adsa olduğu gibi
   kalır (`API`).

   **GitHub deposunda istisna var:** orada kelimeler arasına ayırıcı konabilir —
   `Teknesyum-Base` geçerlidir. Yerel klasör ve çözüm/proje adı bitişik kalır
   (`TeknesyumBase`). Var olan deponun adını kendiliğinden değiştirme, tek satırla söyle.

   **Lisans adla aynı adımda kararlaşır.** `LICENSE` karar verilmeden yazılmaz ve depo
   lisanssız bırakılmaz. Lisanssız depo "herkese açık" değil, telif hukukunda **"tüm
   hakları saklıdır"** demektir — görünür durur ama kimse yasal olarak kullanamaz,
   kopyalayamaz, değiştiremez. Sorulacak tek şey şudur: *bu kodu alıp kapatan birine
   ne olsun?*

   | Cevap | Lisans |
   |---|---|
   | Umursamıyorum, en geniş yayılsın | `MIT` |
   | Kapatamasın, geliştirmesi geri dönsün | `AGPL-3.0-or-later` |
   | Kimse ticari ürüne çeviremesin | `PolyForm Noncommercial` |
   | Kullansın ama rakip ürün yapmasın | `PolyForm Shield` |

   **Teknesyum depolarında bu soru bir kez cevaplandı: `AGPL-3.0-or-later`.** Gerekçe
   `docs/openlogs/HATA-lisans-adimi-yok.md` içinde duruyor — sponsor sayfasındaki "asla
   ücretli olmayacak" sözü izin verici lisans altında yalnız yazarı bağlar, copyleft aynı
   sözü bütün dağıtım zincirine taşır. Bu yüzden yeni depo varsayılan olarak AGPL açılır;
   **başka bir lisans ancak kullanıcı isterse** seçilir, sessizce değiştirilmez.

   Karar verildiğinde **aynı commit'te** hizalanacaklar: `LICENSE` (lisans metni birebir
   kopyalanır, tek karakter değiştirilmez — AGPL metninin kendisi değiştirilemez),
   `package.json` / `*.csproj` / `pyproject.toml` lisans alanı, `README` bölümü ve rozeti,
   varsa paketleme manifestosu (`winget`, `.claude-plugin/plugin.json`) ve uygulama içi
   "hakkında" metni. Biri güncellenip öteki unutulursa depo kendi lisansı hakkında iki
   farklı şey söylüyor demektir.

   **Katkı alınacak bir depoysa `DCO` ve `CONTRIBUTING.md` aynı anda girer.** Telif birden
   çok kişiye dağıldıktan sonra lisansı düzeltmek, sürüm yükseltmek ya da projeyi devretmek
   imkânsızlaşır; tek bakımcı varken bu adım bedavadır.
