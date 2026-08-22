---
description: Projenin bir profil standardına uygunluğunu denetler — eco, normal veya premium sertifikası; `ui` arayüz taraması
argument-hint: eco | normal | premium | ui [--tamamla] [--json] [--proje <yol>]
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

## Kapsayıcı klasörde çalışmaz

Standart tek projeye göre yazılmıştır: eşikler bir deponun ön araştırması, bir kaynak
ağacının kapsamı, bir README'nin sürümüdür. Projeleri barındıran üst klasörde
(`Desktop/Projeler` gibi) çalıştırıldığında bu sayılar on beş projenin toplamı olur
ve kapatılamaz bir eksik listesi çıkar. Betik bunu ölçmeden önce görür, `DURDU` basar
ve çıkış kodu 2 verir.

O çıktıyı aldığında **eksik kapatmaya girişme.** Raporu bas, alt proje listesini
kullanıcıya göster ve tek satırla sor: hangi projeyi denetleyelim. Cevabı aldıktan
sonra `--proje <yol>` ile o kökte yeniden çalıştır. Kullanıcı henüz olmayan bir proje
söylerse önce klasörü açıp açmayacağını sor, sonra kur.

`--kapsayici` bayrağı kapıyı aşar; yalnız kullanıcı üst klasörün kendisini denetlemek
istediğini söylediğinde kullan.

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

## `ui` — dördüncü kip, profilden bağımsız

`/teknesyum:scan ui` profil sertifikası vermez; **arayüzün kendisine** bakar ve hızlıdır:
yalnız `*.css`, `*.tsx`, `*.jsx`, `*.vue`, `*.svelte`, `*.xaml`, `*.axaml` dosyalarını
okur, orta boy bir projede saniyenin altında biter. Süre raporun sonunda yazılıdır.
Ajan açmaz, model çağırmaz — tamamı desen eşleşmesidir. Çıktıyı olduğu gibi bas.

İki kolu var ve ikincisi bu kipin asıl işidir:

| Kol | Ne arar |
|---|---|
| **İhlal** | `transition-all`, yasaklı özellik geçişi, 360 ms tavanı, palet dışı renk, 7:1 altı kontrast, metne glow, WPF'te `LayoutTransform`/`Effect` animasyonu |
| **Durgunluk** | olması gereken hareketin **hiç olmaması** — geçişsiz hover, geçişsiz panel/diyalog, animasyonsuz liste, `prefers-reduced-motion` yok, `MotionConfig` yok, `:focus-visible` yok, hareket kütüphanesi kurulu ama hiç `import` edilmemiş |

Durgunluk kolu olmasaydı hiç hareket etmeyen bir arayüz **temiz** raporlanırdı. Raporun
`başlık:` satırı en ağır durgunluk bulgusunu söyler; kütüphane kurulup kullanılmamışsa
başlık odur.

Ölçüler (palet, süre ölçeği, 360 ms tavanı) `skills/teknesyum-ui/assets/theme.css`
dosyasından okunur, komuta kopyalanmaz.

### `ui --tamamla` gerçekten yazar

Öteki üç kipte `--tamamla` dosyaya dokunmaz. `ui` kipinde **mekanik ve geri alınabilir**
olanı düzeltir:

| Düzeltilir | Düzeltilmez — rapor edilir |
|---|---|
| `transition-all` → `opacity, transform` | Palet dışı renk — hangi token olacağı karar |
| `duration-500`, sabit ms → `--tk-t-*` token'ı | Eksik animasyon — hangi hareket olacağı tasarım |
| Eksik `prefers-reduced-motion` bloğu | 7:1 altı kontrast — yeni ton türetmek gerekir |
|  | Eksik `MotionConfig` — kök nerede, bilinmiyor |

**Kirli çalışma ağacında çalışmaz.** `DURDU` basar ve çıkış kodu 2 verir; kullanıcı
yazılanı geri alabilsin diye. O çıktıyı aldığında kendin düzeltmeye girişme — kullanıcıya
commit ya da stash gerektiğini tek satırla söyle.

Düzeltilmeyen bulgular karar ister. Onları kendin kapatacaksan **`teknesyum-ui` standardını
oku**, token uydurma.

## Rapor

`--json` ayrıştırılabilir çıktı verir; insan raporu yerine bunu isteyen bir betik varsa
kullan. Kullanıcıya normal çıktıyı bas.

Sonuçta madde madde geçti/kaldı, her eksiğin ölçüsü ve ne yapılması gerektiği durur.
Kendi yorumunu ekleme — betiğin ölçtüğü sayının üstüne tahmin yazma.
