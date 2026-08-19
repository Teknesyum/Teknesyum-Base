# Görev paketi — işi oturum dışına çıkarmak

Alt ajan tavanı var: her biri ana oturumun bağlamından pay yer, oturum kapanınca hepsi
birden düşer. Ayrıca ana oturumun bağlamı dolduğunda plan da gider. Bu yüzden büyük iş
**paketlere** bölünür ve paketler ana oturumun dışında çalıştırılır.

Paketi kim çalıştırdığı senin sorunun değil — başka bir Claude Code oturumu, Codex, GPT
tabanlı bir ajan, hatta elle çalışan biri olabilir. **Paket dosyası hiçbir araca ait
olmayacak şekilde yazılır.**

## 1. Rol ayrımı

**Sen (T0, opus) plan yaparsın, iş yapmazsın.** Yazma araçlarını yalnızca
`.claude/relay/**` altında kullanırsın: paket dosyaları, `PLAN.md`, `LOG.md`.
Üretim kodu, arayüz, doküman — hepsi paket veya ajan işidir.

Tek istisna: tek satırlık, gözle doğrulanabilir düzeltme. Onun için paket yazmak
düzeltmenin kendisinden pahalıdır.

## 2. Paket mi, ajan mı

| Durum | Yol |
|---|---|
| Tek yetenek, tek ajanın bir oturumda bitireceği iş | Ana oturumda **tek ajan** aç, sen denetle |
| ≥3 bağımsız yetenek alanı · sıfırdan proje · bağlam dolacak | **Paket** — 3-5 tane |

Paket sayısı beşi aşmasın; kullanıcı yönetemez.

## 3. Dizin

```
.claude/relay/
├── PLAN.md        paket grafiği + bağımlılıklar
├── G1.md          görev paketi (kök seviyede, yolu kısa olsun — kopyalanacak)
├── G2.md
└── LOG.md         ortak olay kaydı
```

Paket dosyası `.claude/relay/` kökünde durur. Derin klasör kullanma; yolu kullanıcı
kopyalayacak.

## 4. Paket formatı

Paket dosyası **ayrıntılı, emir kipinde ve sınırları kesin** yazılır. Uzunluğundan
çekinme — bu dosya token'ı ana oturumda değil, paketi çalıştıran tarafta harcar.
Belirsiz bırakılan her şey yanlış yapılır.

```markdown
---
paket: G2
baslik: Arayüz katmanı
model_onerisi: sonnet
depends: [G1]
yazilabilir: [src/components/, src/theme/]
status: waiting | open | submitted | accepted
---
# G2 — Arayüz katmanı

## Görev
Numaralı, emir kipinde adımlar. Her adım tek bir şey söyler.
"İyileştir", "gerekirse", "uygun görürsen" gibi ifade kullanma.

## Yalnızca şu dosyalara yaz
Tam yol listesi. Yeni dosya açılacaksa adı burada geçsin.

## Bu dosyalara dokunma
İsim isim. Diğer paketlerin alanı, bağımlılık dosyaları, üretim yapılandırması.

## Kabul kriteri
Ölçülebilir maddeler. Mümkünse doğrulama komutunu da yaz.

## Bağlam
Dar. 3-5 tespit + bağımlı olduğun paketin ürettiği imzalar. Kod yapıştırma.

## Yasaklar
- Bağımlılık ekleme, sürüm yükseltme
- Kapsam genişletme — listede olmayan iyileştirme yapma
- Plan tartışma, mimari değiştirme
- Soru sormak için durma: varsayımı Rapor'a yaz ve devam et

## Bitince
1. Bu dosyanın altına `## Rapor` bölümü ekle: ne yapıldı, değişen dosyaların tam listesi,
   yapılmayan madde ve sebebi, sonraki paketlerin kullanacağı imzalar, varsayımlar.
2. Frontmatter'da `status: submitted` yap. **`accepted` yazma** — paketi çalıştıran taraf
   kendi işini kabul edemez; o kararı ana oturum denetimden sonra verir.
3. Kullanıcıya §5.1'deki dönüş satırını ver. Rapor gövdesini sohbete basma.
```

`yazilabilir` kümeleri **kesişemez** — ebeveyn/çocuk ilişkisi de kesişmedir
(`src/` ile `src/components/` aynı anda verilemez). Ayrı oturumlar birbirini göremez;
çakışmayı kimse fark etmez. Dizin yerine dosya listesi vermeyi tercih et: dizin sahipliği
"o dizinde doğacak her yeni dosya" demektir ve yeni dosyanın hangi pakete ait olduğu
belirsizleşir. Kesişme kaçınılmazsa dosyayı tek pakete ver, diğeri imza üzerinden tüketsin.

## 5. Kullanıcıya verilen prompt

**Tek satır, mümkün olan en kısa hali.** Kopyalanacak, uzunsa yük olur:

```
.claude/relay/G2.md oku ve içindeki görevi eksiksiz uygula.
```

Bunun içine hiçbir açıklama, gerekçe, konuşma özeti koyma. Araca özel komut (`/skill`,
`/hat`) kullanma — paket başka bir araçta da çalışabilmeli. Paketi çalıştıracak araç proje
kökünden başlamıyorsa tam yolu ver.

**Paket gövdesi sohbete basılmaz — tavan 3 satır.** Bu kural bir kez ihlal edildi ve
kullanıcı 120 satırlık bir bloğu elle taşımak zorunda kaldı; artık `Stop` hook'u denetliyor.
Kod bloğu ≥25 satırsa ve içinde hem `# GÖREV` benzeri bir başlık hem `Depo:`/`Yığın:`
alanı varsa cevap engellenir, paketi dosyaya yazman istenir. Kaçış yolu arama — dosya
zaten daha iyi bir taşıyıcı:

| | Sohbete basılan paket | Dosyaya yazılan paket |
|---|---|---|
| Kullanıcının işi | 120 satır kopyala-yapıştır | tek satır |
| Alıcının okuduğu | yapıştırılan kadarı | dosyanın tamamı |
| Güncelleme | eski blok elde kalır | dosya yerinde değişir |
| Kayıt | sohbette kaybolur | depoda, `git`'te |

Bağımlılığı açık olan paketin satırını **basma**; hangi paket bitince açılacağını yaz.

## 5.1 İşçinin dönüş satırı

Devir çift yönlüdür. Paketi çalıştıran taraf işi bitirdiğinde **rapor gövdesini sohbete
basmaz** — gövde paketin `## Rapor` bölümüne ya da `docs/` altında bir dosyaya gider.
Kullanıcıya verilen dönüş **en fazla 5 satır**, tek parça kopyalanabilir:

```
G2 teslim edildi. Rapor: .claude/relay/G2.md `## Rapor`
Değişen: src/theme/, src/components/Panel.tsx
Açık soru: yok
```

Üç alan yeter: hangi paket ve durumu, raporun yolu, açık soru. Değişen dosya listesi
uzunsa onu da yazma — rapor dosyasında zaten var.

Ana oturum bu satırı alınca dosyayı kendi okur. Kullanıcı taşıyıcıdır, özet katmanı
değil; ona okuyup aktarması gereken bir metin verme.

Bu yön de `Stop` hook'unda denetleniyor: ≥25 satırlık bir blokta `## Rapor` ya da
`Rapor:` başlığı görülürse cevap engellenir.

## 5.2 Kopyalanacak metnin tavanı

Kopyalanabilir blok **birkaç satırdır** — gidiş yönünde tek satır, dönüş yönünde beş.
Tavanın sebebi zarafet değil ölçü:

- Kullanıcı elle taşır. 120 satırlık blok yarım taşınır, sessizce eksilir.
- Gövde iki kez token yakar: bir kez patronun çıktısında, bir kez işçinin girdisinde.
  Dosya yolu bir kez yakar, karşı taraf dosyayı **kendi** okur.
- Yapıştırılan metin depoda yoktur. Dosya `git`'tedir, güncellenir, denetlenebilir.

**Yasak desen: "kopyalanmak için yazılmış dosya".** İçeriği `---` ya da kod bloğuyla
çevrilip "şu aralığı olduğu gibi kopyala, karşı oturuma yapıştır" denen dosya, dosya
olmanın tek faydasını iptal eder. Paket dosyası **okunmak** için yazılır; sohbete çıkan
şey ona giden yoldur. Bu desen de hook'ta engellenir: kopyalama emrinin hemen ardından
gelen ≥25 satırlık blok reddedilir.

## 6. Toplama

Kullanıcı "bitti" diye döndüğünde ayrı bir komut bekleme, sen topla:

1. `.claude/relay/G*.md` içindeki `status` ve `## Rapor` bölümlerini oku. `submitted`
   paketler denetlenmeden `kabul` olmaz; `bitti` yazan eski paket varsa onu da denetle.
2. `git status --porcelain` — her değişen dosyayı paketlerin `yazilabilir` kümesiyle eşle.
   Dışarı taşan varsa `LOG.md`'ye `unowned` satırı, kullanıcıya bildir, düzeltmeyi hangi
   pakete vereceğine karar ver. **Sessizce geçme.**
3. `audit` ayarına göre `auditor` ajanını **ana oturumda** çalıştır. Paket kendi işini
   onaylamış sayılmaz. Kaldıysa `protocol.md` §4 — düzeltme paketin `## Görev` bölümüne
   yazılır ve satır yeniden verilir.
4. Rapordaki imzaları bağımlı paketlerin `## Bağlam` bölümüne taşı. Atlanırsa sonraki
   paket imzayı uydurur.
5. Dalga raporu ver (`protocol.md` §8.4) ve açılabilir paketlerin satırlarını bas.

## 7. Kesinti

Paket düşerse yalnız o paket kaybolur. Kullanıcı aynı satırı yeni bir oturumda yapıştırır;
paket `## Rapor` bölümü ve `status` alanı üzerinden kaldığı yerden devam eder.

Ana oturum düşerse yeni oturumda `/report`: paket durumları + `LOG.md` + raporlar okunur.
