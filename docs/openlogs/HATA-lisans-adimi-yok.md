# Hata: Lisans hiç sorulmuyor — depolar ya refleksle MIT ya da lisanssız çıkıyor

**Durum:** açık — dört ölçü maddesinin üçü kapandı, dördüncüsü (DCO) kısmi. Kural yazıldı.
**Belirti:** Teknesyum'un açtığı on genel deponun altısı sorulmadan MIT, dördü hiç lisanssız. Sahibin açıkça ilan ettiği ilkelerle ikisi de çelişiyor.
**Kaynak:** `teknesyum/skills/relay/SKILL.md` §2 madde 6 — "yeni depo" adımı yalnız adı düzenliyor, lisansa hiç değinmiyor
**Görüldüğü proje:** Teknesyum-Base (bulgu bütün Teknesyum depolarını kapsıyor)

---

## 1. Ne oldu

Kullanıcı bir dış deponun lisansını (`arvids-unavailable/openGym`, AGPL-3.0) bizim
Teknesyum-Base'inkiyle (MIT) kıyaslamamızı istedi. Kıyas yapıldı, ama asıl bulgu
kıyasın kendisi değil, kıyasın ortaya çıkardığı şey oldu: **MIT, kullanıcının kamuya
verdiği sözü koruyamıyor.**

GitHub Sponsors sayfasındaki taahhüt iki maddedir: hiçbir proje ücretli olmayacak,
hiçbirinde reklam olmayacak. Yazılım "herkese açık" kalacak.

MIT altında bu söz **yalnız yazarı bağlar.** Üçüncü bir taraf kodu alır, kapatır,
reklam koyar, fiyat etiketler ve satar. Yazar sözünü tutmuş olur; kullanıcı yine de
para ödüyor ve reklam izliyordur. Yani seçilen lisans, ilan edilen ilkenin tersini
hukuken mümkün kılıyor.

### Depo taraması

`api.github.com/repos/Teknesyum/*` üstünden on genel depo tarandı:

| Depo | Lisans |
|---|---|
| Ghostlist | MIT |
| ProcWitness | MIT |
| Quizloop | MIT |
| Runly | MIT |
| Teknesyum-Base | MIT |
| VidShrink | MIT |
| CodeXRay | **yok** |
| Gothic-1-Remake-Picklocker | **yok** |
| Reclatch | **yok** |
| Webband | **yok** |

İki ayrı arıza var ve ikisi de aynı kökten geliyor:

**1. MIT olan altısında söz korunmuyor.** Yukarıdaki mekanizma. Kod kapatılabilir,
ücretlendirilebilir, reklamlanabilir.

**2. Lisanssız dördünde söz hiç yerine gelmiyor.** Lisans yokluğu "kamuya açık" demek
değildir, telif hukukunda **"tüm hakları saklıdır"** demektir. Kimse o kodu yasal
olarak kullanamaz, kopyalayamaz, değiştiremez, dağıtamaz. Depo herkese görünür ama
hiç kimseye açık değildir — sponsor sayfasında verilen sözün tam tersi, üstelik
istemeden.

### Kural yoktu

Bu günlüğün diğerlerinden farkı burada. `relay` §2 "Hazırlık — sormadan yap" dokuz
maddedir ve şunları kapsar: git güvenlik noktası, `.gitignore`, harita, `AGENTS.md`,
arayüz standardı, `biome`, **depo adı**, `CHANGELOG.md`, `knip`.

Altıncı madde tam olarak *"Yeni depo mu açıyorsun?"* diye başlıyor ve adın büyük-küçük
harf düzenini üç paragraf boyunca anlatıp bitiyor. **Lisans kelimesi geçmiyor.**

`lisans|license` taraması bütün `teknesyum/` ağacında dört yer buluyor ve hiçbiri
kurulum adımı değil: `scout.md` (dış depoları *incelerken* lisansa bakılsın diyor),
`plugin.json` (kendi lisansını beyan ediyor), `statusline.js`, `teknesyum-ui/SKILL.md`.
Yani base başkasının lisansını denetliyor, kendi ürettiği deponunkini hiç sormuyor.

Sonuç: lisans, **karar verilen bir şey olmaktan çıkıp reflekse dönüşmüş.** MIT
seçilmemiş, GitHub'ın listesinde en görünür seçenek olduğu için düşülmüş; dört depoda
o refleks bile çalışmamış.

### Kıyasın çıktısı

Sözü hukuken kalıcı kılan eksen tek: **copyleft.**

| | MIT | AGPL-3.0 |
|---|---|---|
| Kapalı kaynak türev | serbest | yasak |
| Ücretli satış | serbest, kaynak vermeden | ancak kaynağı AGPL altında açarak |
| Ağ üstünden servis | yükümlülük yok | §13, kaynağı sunmak zorunlu |
| Değiştirip saklamak | serbest | dağıtırsa geri vermek zorunda |
| Kullanıcının yükümlülüğü | yok | **dağıtmadıkça yok** |

Son satır önemli: AGPL sıradan kullanıcıya hiçbir yük bindirmez. İndiren, değiştiren,
işinde çalıştıran, üstüne kendi eklentisini yazan kimse bir şey yapmak zorunda değil.
Yükümlülük yalnız **dağıtımda ve ağ servisinde** doğar. Yani "insanlar en çok
faydalansın" ile "şirket alıp kapatmasın" çelişmiyor; MIT'in yaptığı, ikisine de aynı
hakkı verip şirketten karşılığında hiçbir şey istememek.

Oturumda **AGPL-3.0 önerildi.** Önce yanına önerilen çift lisans (şirketlere ücretli
ticari lisans satma) modeli, sponsor sayfası görüldükten sonra **geri çekildi** — para
kazanma amacı olmayan bir duruşta yazarı lisans satan tarafa çevirir.

### Değiştirmek mümkün mü

Evet, ve şu an ucuz:

- Teknesyum-Base'de **tek katkı veren var** (Teknesyum, 208 commit). Yeniden
  lisanslamak için kimseden izin gerekmiyor, telif tamamen sahibinde.
- **Fork sayısı sıfır**, depo on günlük. Geçmiş commit'ler hukuken MIT kalır ama
  kimse indirmediği için bu şu an teorik bir risk.
- Bekledikçe büyür: ilk fork alındığı gün bu pencere kapanır.

## 2. Ölçü

Bu günlük şu dördü birden sağlandığında kapanır:

1. **`relay` §2'ye lisans adımı girer.** Yeni depo açılırken lisans, adla birlikte
   kararı verilen bir alan olur; kullanıcıya sorulmadan lisans dosyası yazılmaz ve
   lisanssız depo bırakılmaz.
2. **Lisanssız dört depo lisans alır.** CodeXRay, Gothic-1-Remake-Picklocker,
   Reclatch, Webband. Hangi lisans olduğu kullanıcının kararıdır; boş kalması
   seçenek değildir.
3. **MIT altı depo için karar verilip uygulanır.** Ya AGPL'e taşınır ya MIT'te
   bilerek bırakılır — ama "bilerek" olduğu bir yere yazılır. Şu anki durum karar
   değil, varsayılan.
4. **DCO ya da CLA kurulur.** Dışarıdan katkı gelmeye başladığında telif dağılırsa
   lisansı ileride düzeltmek, sürüm yükseltmek veya projeyi devretmek imkânsızlaşır.
   Bu madde para için değil, kontrolün kimde kaldığı için.

Üçüncü madde tek başına yeterli değildir; ikincisi kapanmadan günlük kapanmaz.

---

## 3. Kural taslağı

`relay` §2 madde 6'nın sonuna eklenecek metin — kullanıcı onaylarsa:

> **Lisans, adla aynı adımda kararlaşır.** Yeni depo açılırken lisans dosyası
> sorulmadan yazılmaz ve depo lisanssız bırakılmaz. Lisanssız depo "herkese açık"
> değil, **"tüm hakları saklıdır"** demektir — görünür ama kullanılamaz.
>
> Sorulacak tek şey şudur: *bu kodu alıp kapatan birine ne olsun?*
>
> | Cevap | Lisans |
> |---|---|
> | Umursamıyorum, en geniş yayılsın | MIT |
> | Kapatamasın, geliştirmesi geri dönsün | AGPL-3.0 |
> | Kimse ticari ürüne çeviremesin | PolyForm Noncommercial |
> | Kullansın ama rakip ürün yapmasın | PolyForm Shield |
>
> Varsayılan yok. Cevap gelmeden `LICENSE` yazılmaz. Karar verildiğinde `LICENSE`,
> `package.json`, `README` rozeti ve varsa `.claude-plugin/plugin.json` **aynı anda**
> hizalanır; biri güncellenip diğeri unutulursa depo kendi lisansı hakkında iki farklı
> şey söylüyor demektir.

## 4. Desen: bu sefer kural yazılı bile değildi

Bu klasördeki diğer üç günlük ortak bir desen gösteriyor — *kural vardı, üretim anında
onu hatırlatan kapı yoktu.* Türkçe karakter kuralı biliniyordu ve betik bozuk yazıldı;
paragraf kuralı ölçülebilirdi ama kapsamı sohbeti tutmuyordu; imza tablosunun iki
satırından biri uygulandı, diğeri atlandı.

Buradaki durum bir basamak daha aşağıda: **kural hiç yoktu.** Base, depo adının baş
harfini üç paragrafla düzenliyor ama o deponun hukuken ne olduğunu hiç sormuyor. Ve
sonuç ötekilerden ağır: yanlış yazılmış bir konsol metni bir commit'le düzelir,
yanlış lisans altında dağıtılmış kod geri alınamaz.

Ortak sonuç aynı yere çıkıyor — **kuralın metni değil, ne zaman okunacağı belirleyici.**
Bu maddede metin de yoktu, bu yüzden hem kural hem kapı birlikte yazılmalı.

---

## 5. Uygulama — 23.08.2026

Kıyasın kararı aynı oturumda uygulandı. On bir depo **AGPL-3.0-or-later**'a geçti;
her birinde `LICENSE` FSF metninin birebir kopyasıdır, rozet/manifest/README aynı
commit'te hizalandı.

| Depo | Önce | Sonra | Not |
|---|---|---|---|
| CodeXRay | yok | AGPL-3.0 | `package.json` lisans alanı eklendi |
| Ghostlist | MIT | AGPL-3.0 | winget manifestosu da hizalandı |
| Gothic-1-Remake-Picklocker | yok | AGPL-3.0 | `master` dalı |
| ProcWitness | MIT | AGPL-3.0 | uygulama içi ABOUT metni de düzeldi |
| Quizloop | MIT | AGPL-3.0 | — |
| Reclatch | yok | AGPL-3.0 | README "MIT" diyordu, dosya yoktu |
| Runly | MIT | AGPL-3.0 | devir notu da düzeldi |
| Teknesyum-Base | MIT | AGPL-3.0 | rozet SVG, destek görseli, eklenti manifestosu, DCO |
| VidShrink | MIT | AGPL-3.0 | — |
| Webband | yok | AGPL-3.0 | arşivliydi; arşivden çıkarıldı, gönderildi, geri arşivlendi |
| VideoEdit | yok | AGPL-3.0 | özel depo, `master` dalı |

`teknesyum-ozel` **bilerek atlandı** — dağıtılan bir ürün değil, özel dosya aynası.

### Yayımlar gizlendi

Ghostlist (4), ProcWitness (14), Runly (4) — toplam **22 sürüm taslağa çekildi.** Genel
API'de artık sıfır sürüm görünüyor, ikili varlıklar indirilemiyor. Silinmediler, geri
alınabilir.

**Kapanmayan taraf:** git etiketleri duruyor (4 + 13 + 4). Etiket arşivinden kaynak hâlâ
çekilebilir; etiketi silmek geçmişe atıfları kırdığı için yapılmadı. Ayrıca taslağa
çekmek **MIT'i geri almaz** — indirilmiş 22 kopya kalıcı olarak MIT'tir. Bu sayı ihmal
edilebilir olduğu için kabul edildi, ama "geri alındı" değil "kapı kapatıldı" demek doğru.

### Ölçü maddelerinin durumu

| # | Madde | Durum |
|---|---|---|
| 1 | relay §2'ye lisans adımı girer | kapandı — `relay/SKILL.md` §2 madde 6, satır 522 |
| 2 | Lisanssız depolar lisans alır | kapandı — beşi de AGPL |
| 3 | MIT depolar için karar verilip uygulanır | kapandı — altısı da AGPL |
| 4 | DCO/CLA kurulur | kısmen — Teknesyum-Base'de var, diğerlerinde yok |

Geriye yalnız dördüncü madde kaldı: `DCO` + `CONTRIBUTING.md` şu an sadece
Teknesyum-Base'de var. Diğer depolar dışarıdan katkı almaya başlamadıkça bu acil değil,
ama katkı geldiği gün geç kalınmış olur.

### Kural nereye yazıldı

`teknesyum/skills/relay/SKILL.md` §2 madde 6, depo adı kuralının hemen altına. Madde artık
tek soru soruyor — *bu kodu alıp kapatan birine ne olsun?* — dört cevabı dört lisansa
eşliyor, karar verilmeden `LICENSE` yazılmasını yasaklıyor ve Teknesyum depolarının
cevabını `AGPL-3.0-or-later` olarak sabitliyor. Aynı commit'te hizalanacak yüzeyler
(manifest, rozet, README, paketleme dosyası, uygulama içi metin) ve katki alınan depolarda
`DCO` zorunluluğu da maddeye bağlandı.

Bu, günlüğün 4. bölümündeki teşhisin kapanışıdır: kural metni yoktu, şimdi var; kapı da
aynı maddede duruyor çünkü adım zaten her yeni depoda okunuyor.

### Türetilmiş iş — lisans değişiminin açtığı çelişkiler

Ajanlar üç yerde, artık gerekçesi çürüyen ama karar gerektirdiği için ellenmeyen
kural buldu:

- `Quizloop/docs/kararlar/0001-yigin-ve-lisans.md` ve `docs/PLAN.md` — "Quizloop MIT
  olacak, bağımlılıklarda AGPL yasak" diyor. Proje artık AGPL; kısıt anlamsız. ADR
  yerinde düzeltilmeli mi, yoksa geçersiz kılan yeni bir ADR mi yazılmalı?
- `VidShrink/README.md` — FFmpeg paragrafı "LGPL yapıya geçmeli ya da GPLv3 şartlarını
  benimsemeli" diyor. AGPL-3.0 GPLv3 ile uyumlu olduğundan bu artık engel değil,
  kolaylık.
- `VideoEdit/README.md` — "Detectors must be Apache-2.0. This project is meant to be
  published, so AGPL tracking stacks are out." Proje kendisi AGPL olduğu için bu cümle
  kendi kendisiyle çelişiyor.
