# HATA — Denetçi ajan Stop kancasında dönüyor ve kendi denetimini geçersiz sayıyor

- **Kaynak:** VideoEdit / dal `D2-anlam` / oturum `f9be7ece`
- **Tarih:** 2026-08-26
- **Durum:** kapandı 27.08.2026

## Belirti

A4 tur 2 denetimi için açılan `teknesyum:auditor` alt ajanı işini yaptı (U1–U4
bulgularını üretti) ama teslim edemedi. Aynı kancaya sekiz kez takıldıktan sonra
kendi denetimini iptal ederek kapandı:

> Sekizinci kez aynı hook, aynı içerik. Cevabım da aynı kalıyor.
> A4 tur 2 denetimi geçersizdir. `GEÇTİ T2` kullanılmasın, `audit:`/`auditor_id:`
> boş kalsın, sözleşme mühürlenmesin. U1-U4 notlarım ön bulgudur.
> Hook'un talep ettiği üç eylemin hiçbiri bu koşunun yetkisinde değil — efor
> değiştiremem, tur açamam, ayara yazamam.

`.claude/relay/live/_sorun.log`, 19:19:22–19:20:56 arası sekiz satır:

```
auditor | efor | beyan: xhigh | gerçek: high | engellendi
```

## Bu bir gerileme

Aynı oturumda, güncellemeden **önce** dört denetim sorunsuz koştu ve rapor döndü
(A0, A1, A4 tur 0, A4 tur 1). Döngü yalnız güncelleme sonrası açılan denetçide
başladı. Kusur denetçi isteminde değil, kanca tarafında.

## Bulunan çelişki

`skills/relay/SETTINGS.md` premium profilinde efor tavanı `xhigh`.
`agents/auditor.md` frontmatter'ı `effort: high`.
Aynı SETTINGS.md, satır 202-205, bunun kapatılamaz olduğunu kendisi söylüyor:

> `effort` çağrı anında geçilemediği için **oturuma izole edilemez**; premium
> farkını `model` taşır, efor ikinci derece kaldıraçtır.

`hooks/relay-watch.js:406` ise profil beklentisiyle gerçekleşen eforu karşılaştırıp
sapma yazıyor. Efor çağrı anında geçilemediğine göre bu karşılaştırma premium'da
**her denetçi koşusunda** sapma üretir — sıfır bilgi taşıyan, kaçınılmaz bir alarm.

Sekiz kez engelleyen kapının `paketDenetle` üçlüsü (`devirIhlali` / `donusEksik` /
`sendenEksik`, `relay-watch.js:1046-1057`) olduğunu düşünüyorum: bu kapı ana oturumun
dönüş bloğu ve "Senden istediklerim" yükümlülüğünü sınıyor, ama alt ajanın böyle bir
yükümlülüğü yok — denetçi kullanıcıdan bir şey isteyemez, tur açamaz. Bunu **gözlem**
olarak yazıyorum: kanca çıktısını doğrudan görmedim, dayanağım denetçinin "talep
edilen üç eylem" tarifi ile kod okuması.

## Etki

Denetim hattı duruyor. Bu projede mühür kapısı geçerli bir denetim kaydı istiyor,
denetim kaydı da denetçinin raporundan yazılıyor. Denetçi kendini geçersiz sayınca
sözleşme mühürlenemiyor. D2'de A4 ve A7 bu yüzden bekliyor.

## Ölçü — bu günlük ne zaman kapanır

1. `teknesyum:auditor` alt ajanı bir sözleşmeyi baştan sona denetleyip raporunu
   tek koşuda döndürüyor; `_sorun.log`'a `engellendi` satırı düşmüyor.
2. Premium profilde denetçi eforu için ya beklenti `high`'a çekiliyor ya da efor
   çağrı anında geçilebilir hale geliyor — ikisinden biri, çünkü bugünkü hali
   tanım gereği hiç sağlanamıyor.
3. Ana oturuma ait dönüş bloğu / "Senden istediklerim" kapıları alt ajanda
   işlemiyor.

## Denenen

- Kanca sürümleri karşılaştırıldı: `2.62.2`, `2.63.0`, `2.64.0` ve canlı
  `34192e86304a` dizinlerinde `kimlikDenetle` aynı; fark aranırken engelleme
  yolunun efor değil `paketDenetle` olduğu görüldü.
- Denetçiyi yeniden açmak denenmedi — aynı kancaya gireceği için önce bu günlük
  yazıldı.


## Çözüm (27.08.2026)

Aynı kök sebep: efor bloğu. Kaldırıldı. Ayrıntı `HATA-efor-kimlik-denetimi-*.md`.
