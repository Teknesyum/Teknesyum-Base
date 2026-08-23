---
description: Kişisel dosyaları tek private depoda tutar — depo parça parça çekilir, tamamı inmez
argument-hint: [kur <url> [ad] | ekle <yol>... | cikar <yol>... | pusla | cek [--zorla] | projeler | ac <ad>]
allowed-tools: Bash
---

İstenen: $ARGUMENTS

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/ozel.js" $ARGUMENTS
```

`${CLAUDE_PLUGIN_ROOT}` çözülmezse betik `~/.claude/plugins/**/teknesyum/scripts/ozel.js`
altındadır. **Argüman boşsa durum tablosunu bas ve dur** — kendiliğinden dosya ekleme,
çekme, gönderme. Betiğin çıktısını olduğu gibi göster.

## Ne işe yarar

Depoya giremeyen dosyalar vardır: makine ayarları, kural defteri, yerel yapılandırma,
anahtar içermeyen ama kişiye özel her şey. Bunlar `.gitignore`'a düşer ve makine
değişince kaybolur. `/ozel` bunları **tek bir private depoda** toplar, projeye göre
bölünmüş hâlde.

**Deponun tamamı hiçbir zaman çekilmez.** Klon `--filter=blob:none` ile açılır — ağaç
iner, dosya içerikleri inmez — ve çalışma ağacı `sparse-checkout` ile yalnız bağlı
projelerin klasörüne serilir. On projenin dosyası aynı depoda dursa da bu makinede
görünen tek klasör bu projenin klasörüdür; ötekilerin varlığı `/ozel projeler` ile
görülür, içerikleri inmeden.

## Kullanım

```
/ozel                     durum: kayıtlı dosyalar, hangisi değişmiş, hangi klasör inmiş
/ozel kur <url> [ad]      private depoyu kısmi klonla, bu projeyi bağla
/ozel ekle <yol>...       dosyayı aynaya kaydet
/ozel cikar <yol>...      kayıttan düşür (depodaki kopya durur)
/ozel pusla               değişenleri aynaya yaz, kaydet ve gönder
/ozel cek [--zorla]       aynadaki dosyaları diske geri yaz
/ozel projeler            depodaki bütün projeler — içerikleri indirmeden
/ozel ac <ad>             başka bir projenin klasörünü de bu makineye indir
```

Depo yoksa önce açılır: `gh repo create <ad> --private`. Betik depo açmaz — private
depo açmak kullanıcının kararıdır, komutun yan etkisi değil.

## Yol biçimi

Kayıtlı yollar mutlak değildir; makineden makineye taşınabilsin diye iki önekle saklanır:

| Önek | Nereye çözülür | Depoda nereye düşer |
|---|---|---|
| `~/…` | ev dizini | `<proje>/ev/…` |
| `./…` | proje kökü | `<proje>/proje/…` |

`/ozel ekle C:\Users\ben\.claude\teknesyum.json` yazılsa bile kayda `~/.claude/teknesyum.json`
olarak geçer. Mutlak yol saklamak bu makinede çalışır, ötekinde sessizce yanlış yeri
gösterir.

## `cek` yıkıcı değildir

`/ozel cek` yereldeki dosyanın üzerine yazmaz. Dosya varsa ve aynadakinden farklıysa
`korundu` diye raporlanır, dokunulmaz. Aynadakini dayatmak açık bir karardır:
`/ozel cek --zorla`. Yeni bir makinede kurulumdan sonra dosyalar zaten yok olduğu için
`cek` hepsini olduğu gibi yazar.

Kaynak dosyası silinmiş bir kayıt `pusla` sırasında **atlanır**, aynadaki kopya
düşürülmez. Yanlışlıkla taşınan bir dosya yedeği silemez.

## `puşla` ile ilişkisi

`/pusla` iki depoyu birden yürütür: önce testler ve genel depo, sonra `/ozel pusla`.
Özel ayna kurulu değilse o adım sessizce atlanır — ayna kurmamış biri için `/pusla`
sıradan bir push'tur. Ayrıntı: `/pusla`.

## Ayar dosyası

`~/.claude/teknesyum-ozel.json` yalnız üç şey tutar: depo adresi, klonun yeri ve
proje kökü → klasör adı eşlemesi. **Hangi dosyanın aynalandığı bu dosyada değil**,
deponun içinde `<proje>/ozel.json` manifestinde durur — böylece yeni bir makinede
`/ozel kur` + `/ozel cek` listeyi depodan okur, elle yeniden kurmak gerekmez.

Ayna kurulmamışsa hiçbir alt komut hata vermez; kurulum yönergesi basılır ve çıkış kodu
`0` olur. Eklentiyi kuran başkası `/ozel` yazdığında karşısına benim depom değil, kendi
deposunu kurma yönergesi çıkar.
