# Röle akışı — paket, rota, gözcü, rol × model

`SKILL.md` §5 röle kurulup kurulmayacağına karar verir; burası kurulduktan sonrasını
anlatır. Röle kurulmayan işte bu dosya hiç okunmaz.

Dizin düzeni ve sözleşme biçimi `protocol.md`, paket dosyasının kendisi
`multi-session.md` içindedir.

## 3.1 Görev paketi — işi oturum dışına çıkar

Alt ajan tavanı var: her biri bağlamından pay yer, oturum kapanınca hepsi düşer. Büyük iş
3-5 **görev paketine** bölünür; paketler bu oturumun dışında çalıştırılır.

Paketi kim çalıştırdığı seni ilgilendirmez — başka bir Claude Code oturumu, Codex,
GPT tabanlı bir ajan. Bu yüzden paket dosyası **araca bağımsız** yazılır: içinde `/komut`,
skill adı, bu konuşmaya gönderme olmaz.

İş bölümü şöyle: **paket dosyası uzun ve kesin, kullanıcıya verdiğin satır kısa.**
Dosya, çalıştıran tarafın token'ını harcar; belirsiz bıraktığın her şey yanlış yapılır.
Kullanıcıya verdiğin ise tek satırdır:

```
.claude/relay/G2.md oku ve içindeki görevi eksiksiz uygula.
```

**Paketin gövdesini sohbete basmak yasak.** Ne kod bloğunda, ne "kolaylık olsun diye"
özet hâlinde. Sebep: paketi çalıştıracak taraf bir dosya sistemi görüyor — dosyayı senden
daha ucuza, daha eksiksiz ve daha doğru okur. Kullanıcıyı 120 satırlık bir bloğu
kopyalayıp yapıştıran ara katman yapmak, dosyanın var oluş sebebini iptal eder.

Kullanıcıya giden metin **en fazla 3 satır**: dosya yolu, "oku ve uygula", gerekiyorsa
proje kökü. Gerekçe, mimari özeti, uyarı listesi — hepsi **dosyanın içinde**. Bu kuralı
bir `Stop` hook'u denetliyor; paketi sohbete basarsan cevabın engellenir.

Tek istisna: paketi çalıştıracak araç **dosya okuyamıyorsa** (tarayıcıdaki bir sohbet
penceresi). O zaman da gövdeyi kendiliğinden basma — kullanıcıya sor: "Bu paketi
çalıştıracak araç yerel dosya okuyabiliyor mu?"

Kullanıcı yeni bir oturum açıp bunu yapıştırır, başka bir şey anlatmaz. Bitip döndüğünde
**ayrı bir komut bekleme**: paketleri ve `git status`'u sen okur, alan ihlali arar,
`auditor`'ye doğrulatır, imzaları sonraki paketlere taşır, sonraki satırları basarsın.

**Dönüş yönü de aynı kurala tabidir.** Paketi çalıştıran taraf bitirince rapor gövdesini
sohbete basmaz; gövde paketin `## Rapor` bölümüne yazılır, kullanıcıya en fazla 5 satır
verilir: hangi paket, raporun yolu, açık soru. Kullanıcı taşıyıcıdır — ona okuyup
aktarması gereken bir metin verme. Bu yönü de aynı `Stop` hook'u denetliyor.

**Yasak desen: kopyalanmak için yazılmış dosya.** İçeriği "şu aralığı olduğu gibi kopyala,
karşı oturuma yapıştır" diye sunulan paket dosyası, dosya olmanın tek faydasını iptal
eder. Paket **okunmak** için yazılır.

Kural seti ve paket formatı: **`references/multi-session.md`**. Bu yola gireceksen onu oku.

## 3.2 Rota — uzun iş kaldığı yerden devam eder

Tek istekte bitmeyecek her iş **önce rotasını çizer, sonra başlar.** Uzun araştırma, çok
dalgalı taşıma, sürüm yükseltme, büyük yeniden düzenleme — hepsi buraya girer.

Rota `docs/ROTA-<is-adi>.md` dosyasıdır. İşe başlamadan yazılır, boş bırakılmaz.

```markdown
# Rota: <iş adı>

**Durum:** açık                        <- iş bitince `kapandı` yazılır
**Kaldığım yer:** D4 (sürüyor)          <- her turda güncellenen tek satır
**Amaç:** <bir cümle>

| # | Durak | Durum | Bulgu |
|---|---|---|---|
| D1 | ... | bitti | docs/... §1 |
| D2 | ... | bitti | docs/... §2 |
| D3 | ... | sürüyor | — |
| D4 | ... | bekliyor | — |
```

Durum yalnızca üç değer alır: `bekliyor`, `sürüyor`, `bitti`. Ara ifade yok.

Baştaki **Durum** alanı iki değer alır: `açık` ve `kapandı`. İş bittiğinde `kapandı`
yazılır; sıkışma sonrası bildirimi bu işareti taşıyan rotayı atlar, kapanmış rota bir daha
bağlama girmez.

**Her durak bitince rota güncellenir ve commit atılır.** Bulgu rotanın içine değil, ayrı
bir çıktı dosyasına yazılır; rota yalnızca nerede olduğunu söyler. Rota şişerse işini
yapmıyor demektir.

**Oturum açılışında rota da okunur.** `docs/ROTA-*.md` içinde `sürüyor` veya `bekliyor`
durak varsa kullanıcı bir şey demeden oradan devam edilir (§1.1 ile aynı düstur).
Kullanıcıya tek satır: hangi duraktasın, kaç durak kaldı.

**Rota ile sözleşme farklı şeylerdir.** Sözleşme işi *dağıtmak* içindir; rota tek bir
tarafın *uzun yürüyüşü* içindir. İkisi birlikte de kullanılır: rotanın bir durağı bir
sözleşme dalgası olabilir.

İş bittiğinde rota silinmez; son hâli `docs/` altında kalır — altı ay sonra neyin neden
incelendiğini o anlatır.

## 3.3 Uzun dış koşu — gözcü kalıbı

Dakikalar süren bir dış koşu (kodlama, derleme, CI, büyük test paketi) bekleyen ajan
**uyandırılarak yoklanmaz.** Yoklama tur harcar, koşuyu hızlandırmaz ve kullanıcı her
turu ekranda görür. Ölçüldü: bir oturumda aynı döngü üç kez tekrarlandı ve üçünde de
cevap "hâlâ sürüyor" oldu.

Kalıp üç adımdır:

1. **Koşu arka planda başlatılır.** Ön planda bekleyen komut oturumu kilitler.
2. **Ajan bırakılır.** Bekleyen bir ajan boşta bekleyen bir bağlamdır; kapat, koşu
   bitince yenisini aç ya da tek seferde sürdür.
3. **Bitişi bir gözcü haber verir** — koşulan komutun kendi bitişine bağlı bir bekleme,
   `sleep` ile yoklayan bir döngü değil. Ajan **bir kez** sürdürülür.

**Gözcü arkasında süreç bırakmaz.** "Bitti" dedikten sonra listede duran bir `sleep`,
iş yapmasa da "hâlâ bir şey çalışıyor" izlenimi verir ve kullanıcı onu sorar. Gözcü
kurduğun turda bittiğini gördüğün anda süreç listesini kontrol et; artakalan varsa
kapat. Bunu bir sonraki tura bırakma — o tur gelmeyebilir.

**Uzun sözleşmede kayıt noktası talimatı baştan verilir.** Ajanlar araç tavanına
takılır; bu istisna değil, uzun işte kuraldır. Brifingin standart parçası: *her kabul
kriterinden sonra `## Kayıt noktası`na tek satır düş ve ara ara commit at.* Talimatı
sonradan hatırlayan, kesilen ajanın nerede kaldığını okuyamaz — ölçüldü, aynı oturumda
sekiz kez elle sürdürme gerekti ve talimatı alan iki sözleşme okunabilir, almayan
dördü okunamaz kaldı.

Ölçüldü: `docs/openlogs/kapali/HATA-olcum-beklemesi-kullaniciyi-bekletiyor.md`.
## 4. Kim yapacak: rol × model

Rol işin türünü, model ağırlığını belirler. Ajanı çağırırken `model` parametresiyle yaz.

| Rol | Ne yapar | Varsayılan |
|---|---|---|
| `builder` | kod yazar — modül, algoritma, endpoint, refactor, test | sonnet |
| `ui-builder` | arayüz yazar; `teknesyum-ui` context'ine önyüklü | sonnet |
| `auditor` | kabul kriterlerini doğrular; **yazarsa denetimi düşer** (§3) | sonnet |
| `scribe` | mekanik toplu iş — AGENTS.md, isim, biçim | haiku |
| `scout` | ön araştırma — benzer depoları tarar, kod yazmaz | sonnet |
| `planner` | plan konseyi üyesi — öneri verir, **hiçbir şey yazmaz** | fable · opus |
| `advisor` | tek soruluk ikinci görüş — **hiçbir şey yazmaz**, düşük efor | fable |
| `Explore` | geniş arama (yerleşik, devam ettirilemez) | — |

**opus**: mimari kararı taşıyan, algoritmik, belirsiz, zor hata ayıklama.
**sonnet**: bilinen kalıpla iş — varsayılan.
**haiku**: kalıbı birebir belli, kararsız iş.

Şüphedeysen bir alt basamağı seç ve kabul kriterini sıkılaştır. `auditor`'yi güvenlik,
veri kaybı veya mimari sınır içeren işlerde opus'a çıkar.

**Premium mod açıkken bu tablo geçersizdir.** Her rol opus çalışır; ayrım modelde değil
eforda olur — mekanik işte düşük, kod ve denetimde `xhigh`. Model tırmanışı kapanır:
zaten tepedesin, çözülmeyen sözleşmede modeli değil sözleşmeyi düzelt. Paralel tavanı
**yirmidir** ve üçü geçtiğinde worktree izolasyonu açılır. `/premium durum` hangi profilin
yürürlükte olduğunu söyler.

**Kaç ajan açılacağına premiumda T0 karar verir ve ölçüsü hızdır, token değil.** Tavanı
hevesle kullan: işi bölebiliyorsan böl, yirmi ajana kadar aynı anda yürüt, bitince
sonraki basamağa geç. **Bölünebilen işi bölmemek gerekçe ister** — ayrıntısı §5'te.

Tavan yine de duruyor ve sebebi token değil. `worktree_isolation` açıkken her ajan bir
repo kopyası ve bir süreç demektir; makinenin de bir sınırı var. İkincisi, T0 hatalı bir
döngüye girerse tavan güvenlik ağıdır — sınırsız bir sayı, yanlış bir kararı yirmi kat
değil bin kat büyütür. Yirmi, "ne kadar lazımsa o kadar"ı fiilen karşılar: pratikte bir
dalgada yirmi bağımsız sözleşme çıkmaz, çıkıyorsa plan fazla parçalanmıştır.

eco profilinde tavan 1'dir, normalde 2. eco'da paralellik ilk kesilen şeydir: her ajan
bağımsız bir bağlam yükü taşır ve orada kısıt tam olarak odur.

`planner` bu tablonun dışındadır: modeli işin ağırlığına göre seçilmez, **konseyin iki
üyesi tanım gereği iki farklı modeldir** — biri `fable`, biri `opus`. İkisini de aynı
modele almak konseyi ortadan kaldırır. `advisor` da dışındadır: modeli `fable`, eforu
premiumda bile `low` — bkz. `plan-akisi.md` §1.5.1.

**Ajan adı `<Model>-<İş Adı>` biçiminde yazılır.** Model adının ilk harfi büyüktür —
`Opus`, `Fable`, `Sonnet`, `Haiku`. İş adında her kelime büyük harfle başlar; `ile`, `ve`,
`veya`, `ya` gibi kısa bağlaçlar küçük kalır.

```
Fable-Kanca Sızıntıları
Opus-Ortak Katman
Opus-Ajan Sağlığı ve Tur Özeti
```

Model adı adın içinde durur çünkü ajan listesinde ilk görülen şey addır: hangi işin hangi
ağırlıkta yürüdüğü kaydı açmadan okunur. Ad serbest metindir, `model` parametresi ise
gerçekten dağıtılan modeldir — ikisi ayrılırsa `görev veriliyor` satırı bunu gösterir.
Bu yüzden bildirimdeki model alanı adla birlikte kalır; tekrar değil, karşılaştırmadır.

Bu kural depodaki **"başlık ve dosya adı ilki büyük gerisi küçük"** kuralıyla çelişmez.
O kural belge başlıkları ve dosya adları içindir; bu kural ajan adı içindir. Ajan adı
başlık değil etikettir — `/report` ve `live/` kayıtları onu tek parça olarak taşır.
İkisini birbirine uydurma; ne ajan adını küçült, ne belge başlığını büyült.

