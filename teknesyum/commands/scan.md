---
description: Projenin bir profil standardına uygunluğunu denetler — eco, normal veya premium sertifikası
argument-hint: eco | normal | premium [--tamamla] [--json]
allowed-tools: Bash, Read, Glob, Grep, Edit, Write, Agent
---

İstenen: $ARGUMENTS

Bu komut **projenin şu anki halini bir standarda karşı denetler**. Ne yaptığını değil,
neyin eksik kaldığını söyler: kaç depo taranmış, hangi dosya hiç incelenmemiş, hangi
sözleşme mühürsüz, hangi belge sürümle uyuşmuyor. Bir nevi sertifika.

```
node "${CLAUDE_PLUGIN_ROOT}/scripts/tarama.js" $ARGUMENTS
```

`${CLAUDE_PLUGIN_ROOT}` çözülmezse betik `~/.claude/plugins/**/teknesyum/scripts/tarama.js`
altındadır. Çıktıyı **olduğu gibi bas**, özetleme, kendin dosya tarama.

Çıkış kodu 1 "kaldı" demektir, çökme değil — rapor doludur. 2 kullanım hatasıdır.

## Ayar verilmeden çalışmaz

Profil argümanı yoksa betik kullanımı basıp çıkar. **Kendin profil seçme, varsayılana
düşme, kullanıcıya sormadan `premium` çalıştırma** — 50 depoluk bir tarama kullanıcının
istemediği yerde başlamamalı. Argüman boşsa betiğin bastığı kullanımı olduğu gibi ver.

## Üç profil

| Ölçüt | `eco` | `normal` | `premium` |
|---|---|---|---|
| Ön araştırma | 1 depo | 10 depo | 50 depo |
| İnceleme modeli | haiku+ | sonnet+ | opus, high+ |
| Kapsam | değişen dosyalar | değişen + komşuları | baştan sona, her kaynak dosya |
| Denetim | kritik sözleşmeler | her sözleşme | her sözleşme |
| Belge tutarlılığı | — | README | README + CHANGELOG + skill |

Üçü de aynı dört maddeye bakar, eşikleri farklıdır. Eşikler `skills/relay/SETTINGS.md`
düğmeleriyle aynı kaynaktan (`scripts/premium.js` içindeki `DUGME`) okunur; komut
dosyasına kopyalanmaz. Yukarıdaki tablo anlatım içindir, ölçüyü betik yapar.

"Kapsam" sorusuna `.claude/relay/kapsam.json` cevap verir: hangi dosyaya en son hangi
model, hangi eforla dokunulmuş. Kayıt ajan bitişinde ve ana oturumun her düzenlemesinde
kendiliğinden düşer — elle doldurulmaz.

## `--tamamla` yoksa hiçbir şey değişmez

Bayraksız çağrı **salt okurdur**: betik dosya yazmaz, sen de yazma. Rapor verilir, biter.
Kullanıcı eksikleri kapatmak istiyorsa `--tamamla` ile çağırır.

`--tamamla` verildiğinde betik yine hiçbir dosyaya dokunmaz; yalnız çıktının sonuna
"eksikleri kapatmak için ne yapılmalı" bölümünü ekler. **İşi sen yaparsın:**

1. **Eksik depo taraması** — kalan depoyu `scout` ajanlarına 2-3'er dağıt, her biri
   `docs/taramalar/<kisa-ad>.md` yazsın, sonra `docs/taramalar/RAPOR.md` ile birleştir.
2. **İncelenmemiş dosyalar** — profilin istediği modelde incele. Raporun listelediği
   dosyaları ajanlara böl; incelenen dosya kayda kendiliğinden geçer.
3. **Mühürsüz sözleşmeler** — `auditor` ajanına ver. Mührü sen değil T0 basar, denetçi
   GEÇTİ dedikten sonra.
4. **Eksik veya sürümle uyuşmayan belge** — düzelt.

**Kaç ajan açılacağı profile bağlı:** eco'da 1, normal'de 2, premium'da `parallel_width`
kadar — bugün 20. Tavanı aşma, tavanın altında kalmak için de iş bölme.

## Rapor

`--json` ayrıştırılabilir çıktı verir; insan raporu yerine bunu isteyen bir betik varsa
kullan. Kullanıcıya normal çıktıyı bas.

Sonuçta madde madde geçti/kaldı, her eksiğin ölçüsü ve ne yapılması gerektiği durur.
Kendi yorumunu ekleme — betiğin ölçtüğü sayının üstüne tahmin yazma.
