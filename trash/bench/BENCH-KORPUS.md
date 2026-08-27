# Bench korpusu ve kosucu

Dort mikro gorev x dort kosul = 16 kosu. Amac tek: eklentinin tabana gore ne
kattigini ve nerede zarar verdigini olcmek. Tekrar yok (n=1, duman kiyasi).

Iskandil bulgulari `docs/BENCH-ISKANDIL.md` icinde; buradaki duzenek onlarin
uzerine kuruldu.

## Gorevler

| Ad | Ne olculuyor | Yesil sarti |
|---|---|---|
| `ozellik` | Iki dosyalik kucuk ozellik ekleme | `m` birimi + `src/gecmis.js` + `index.js` yuzu, eski davranis bozulmadan |
| `hata` | Hazir kirmizi testi gecirme | `node test/aralik.test.js` yesil, test dosyasi degistirilmemis |
| `rapor` | Yabanci kodu okuyup anlatma | `cevap.md` icinde sekiz anahtarin hepsi |
| `teksatir` | Tek satirlik iste kapsam disina tasmama | Yalniz `surum.json` degismis, yeni dosya yok |

`teksatir` kasten "base'in zararli oldugu yer" olcumu: fazladan dosya, fazladan
not, fazladan degisiklik kirmiziya dusurur.

## Fixture duzeni

```
bench/fixtures/<ad>/
  agac/       kosuya kopyalanan temiz baslangic agaci
  cozum/      referans cozum — agac uzerine kaplanir
  dogrula.js  kabul olcusu
```

`dogrula.js` calisma dizinini tek argumanla alir, cikis kodu 0 yesil demektir.
Sozlesme sarti temiz agacta kirmizi, referans cozumde yesildir; su komut bunu
model harcamadan dogrular:

```
node scripts/bench/kos.js --fixture-testi
```

Gorev metinleri `bench/gorevler/<ad>.md` icinde ve `claude -p` istemine oldugu
gibi verilir.

## Kosucu

```
node scripts/bench/kos.js              16 kosu, hepsi paralel
node scripts/bench/kos.js --yeniden    var olan sonuclari da yeniden sur
node scripts/bench/kos.js --kuru       modeli cagirmadan kurulum + fixture ozeti
node scripts/bench/kos.js --gorev=hata --durum=eco   tek kosu
node scripts/bench/kos.js --fixture-testi            kirmizi/yesil denetimi
```

Kosu basina: bos bir `CLAUDE_CONFIG_DIR`, kimlik dosyasinin kopyasi, fixture
kopyasi, `native` disinda marketplace kaydi + eklenti kurulumu + profil yazimi,
sonra tek `claude -p` cagrisi. Bayraklar iskandilde sabitlendi:

```
claude -p "<gorev>" --model opus --permission-mode bypassPermissions \
       --max-turns 30 --output-format json
```

Sert tavan 4 dakika; asan kosu oldurulur ve `tavanAsildi` ile isaretlenir.
Sonuclar `bench/sonuc/<gorev>__<durum>.json` icine duser: transkript yolu,
model id, baslangic/bitis zamani, sure, cikis kodu, oturum id, asistan turu,
arac cagrisi sayisi, maliyet ve `dogrulama` sonucu.

Sonuc dosyasi duran kosu ikinci cagrida atlanir — kesilen bir tur `--yeniden`
olmadan kaldigi yerden surer.

## Izolasyon

Ana `~/.claude` yalnizca okunur, tek dosya icin: `.credentials.json`. Jeton
kalici bir kimlik kokunde (`<tmp>/tbench/kimlik`) tutulur ve kosulardan once
sirayla tazelenir; 16 kosu taze jetonun kopyasiyla baslar. Bu olmadan paralel
kosular ayni anda yenilemeye kalkip sessizce bos doner.

Kosu koku `<tmp>/tbench-kos/<damga>` altindadir. Klasor adinda `teknesyum`
gecmez: transkriptin her satirinda `cwd` yazili ve `native` kosunun "eklenti izi
sifir mi" olcumu kendi yolunu iz sayar.

`bench/sonuc/` uretilen ciktidir, kaynak degil; depoya girmemesi gerekir.

## Olculen tam kosu (26.08.2026)

16/16 kosu yesil, toplam duvar saati **85 saniye**. En uzun tek kosu 81 sn
(`rapor__premium`), en kisa 19 sn (`teksatir__native`); tavana yaklasan yok.
Kuru kosu iki kez surulup 16 dosyanin `fixtureOzeti` ve `kurulumImzasi` alanlari
ile kurulum gunlukleri birebir ayni cikti. Kosu oncesi ve sonrasi ana kokun
`settings.json`, `teknesyum.json` ozetleri ve `plugins/` icerik sayisi
degismedi.
