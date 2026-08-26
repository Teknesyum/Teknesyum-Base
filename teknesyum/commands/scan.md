---
description: Audits the project against a profile standard — eco, normal or premium certificate; `ui` scans the interface
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
| Lisans | LICENSE + beyanların hizası | aynı | aynı |

Üçü de aynı beş maddeye bakar; ilk dördünün eşiği farklıdır. **Lisans maddesinin
eşiği yoktur:** `LICENSE` yoksa ya da `package.json` / eklenti manifestosu / README
rozeti gibi bir yüzey dosyadan başka bir lisans söylüyorsa üç profilde de kalır. Sessiz
yüzey ihlal değildir — lisanstan hiç söz etmeyen dosya sorulmaz. Eşikler `skills/relay/SETTINGS.md`
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

**Bu kip `teknesyum-ui` standardına göre ölçer ve standart kurulu değilken çalışmaz.**
Ne `<proje>/.claude/teknesyum-ui.json` ne `~/.claude/teknesyum-ui.json` varsa, ya da
yürürlükteki dosya `"kapali": true` diyorsa betik `DURDU` basar ve çıkış kodu 2 verir:
standart yokken ölçüm uygunluk denetimi değil şablona uzaklık ölçümüdür. O çıktıyı
aldığında taramayı kendin yapmaya girişme — tek satırla sebebini ve `/uisetup` yolunu
göster. Profil kipleri bu kapıdan etkilenmez; onlar sadece bilgi satırı basar:
`arayüz standardı: <kurulu mu> · <kaç arayüz dosyası> · <kaç ihlal>` — bu satır kapı
değildir, sertifika onsuz da verilir.

**Eski plan önce kapanır.** `--tamamla` verilmişse betik tarama koşmadan önce
`--tamamla` olmadan yazılmış eski bir `scan ui` planı arar (`ui-plan.json`,
`.claude/ui-plan.json`). Bulursa açıklarını yeni koşuya karşı sayar, tamamı kapandıysa
dosyayı kaldırır; planın yolu ve kaç açığın kapatıldığı raporun ilk satırındadır.
Plan yoksa akış aynen sürer, uyarı basılmaz.

### `ui --tamamla` iki fazlı bir dönüşümdür

Öteki üç kipte `--tamamla` dosyaya dokunmaz. `ui` kipinde gerçek bir Teknesyum UI
dönüşümü koşar ve **sıra bozulmaz**: önce Faz 1, o temiz bitmeden Faz 2 başlamaz.

**Faz 1 — teorik.** Kaynak üstünde: token dışı renk, süre, geçiş, yarıçap, tipografi,
eksik durum. Mekanik ve geri alınabilir olan yazılır, karar gerektiren rapor edilir:

| Düzeltilir | Düzeltilmez — rapor edilir |
|---|---|
| `transition-all` → `opacity, transform` | Palet dışı renk — hangi token olacağı karar |
| `duration-500`, sabit ms → `--tk-t-*` token'ı | Eksik animasyon — hangi hareket olacağı tasarım |
| Eksik `prefers-reduced-motion` bloğu | 7:1 altı kontrast — yeni ton türetmek gerekir |
|  | Eksik `MotionConfig` — kök nerede, bilinmiyor |

**Faz 2 — uçtan uca.** Program açılır, görülen arayüz standarda karşı denetlenir.
Faz 2 yalnız Faz 1 temiz bittiğinde (açık ihlal sıfır) koşar ve **önce başsız yolu
dener** (`standartlar.md` doğrulamayı başsız ister): package.json test betiği ya da
test csproj varsa betik onu kendisi koşar, pencere açılmaz. Başsız yol yoksa gerekçesi
rapora yazılır ve ekran yolu kalır — **program açmak ekran kapısının kapsamındadır.**
Kapı kapalıysa Faz 2 koşmaz, raporda `/ekran` gerektiği tek satırla söylenir ve Faz 1
sonucu yine geçerlidir; kapıyı kendin açma, kullanıcıdan iste. Kapı açıksa ekran
doğrulamasını sen yürütürsün: programı aç, ekran görüntüsü al, gördüğünü `teknesyum-ui`
standardına karşı denetle.

Rapor iki fazı ayrı sayar — Faz 1'de kaç bulgu / kaç düzeltme, Faz 2'de kaç ekran /
kaç görsel ihlal — ve Faz 2 hiç koşmadıysa bunu `KOŞMADI` satırıyla açıkça söyler.
Sessizce atlanan faz yok; raporda görünmeyen fazı koşmuş sayma.

**Kirli çalışma ağacında iki faz da çalışmaz.** `DURDU` basar ve çıkış kodu 2 verir;
kullanıcı yazılanı geri alabilsin diye. O çıktıyı aldığında kendin düzeltmeye girişme —
kullanıcıya commit ya da stash gerektiğini tek satırla söyle.

Düzeltilmeyen bulgular karar ister. Onları kendin kapatacaksan **`teknesyum-ui` standardını
oku**, token uydurma.

## Rapor

`--json` ayrıştırılabilir çıktı verir; insan raporu yerine bunu isteyen bir betik varsa
kullan. Kullanıcıya normal çıktıyı bas.

Sonuçta madde madde geçti/kaldı, her eksiğin ölçüsü ve ne yapılması gerektiği durur.
Kendi yorumunu ekleme — betiğin ölçtüğü sayının üstüne tahmin yazma.
