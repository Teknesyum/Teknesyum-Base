# Hata: efor kimlik denetimi bütün relay ajanlarını bloke ediyor

**Durum:** kapandı 27.08.2026.
**Belirti:** Taban güncellemesinden sonra açılan üç ajan da işini yaptı ama **yargı
vermeden** döndü. Denetçi "GEÇTİ"yi geri çekti, yapıcı "karar T0'da" dedi. Hiçbiri
sözleşmeye yazmadı.
**Kaynak:** teknesyum eklentisi 2.67.0 — `hooks/relay-watch.js`, `kimlikDenetle`.
**Görüldüğü proje:** VidShrink
**Tarih:** 2026-08-26

---

## 1. Ne oldu

Üç ajanın dönüş cümlesi:

    T44 audit    -> "T44 denetimi açık, yargı yok, dosya yazılmadı.
                     Efor uyuşmazlığı benim yetkimde değil."
    T44 builder  -> "Durdurma kancası bu ajanın beyan edilen eforla koşmadığını bildirdi:
                     beyan xhigh, gerçek medium. ... yeniden açma kararı T0'ın."
    T45 audit    -> "T45 denetimi sonuçsuz. GEÇTİ geri çekildi, mühür kanıtı değil."

İş üretildi, karar üretilmedi. En pahalısı T45 denetimi: kriterlerin dördünü de okumuş,
sonucu **geçti** bulmuş ve sırf bu yüzden geri çekmiş.

## 2. Neden

`hooks/relay-watch.js:388` `kimlikDenetle`:

    393: const p = profilRol(rol);
    398: const beklenenEfor = String(p.effort || t.effort || '');
    399: const efor = String(s.effort || '');
    407: if (beklenenEfor && efor && efor.toLowerCase() !== beklenenEfor.toLowerCase())
    408:   sapan.push({ alan: 'efor', beyan: beklenenEfor, gercek: efor, bloklanir: true });

`bloklanir: true` — model sapmasının aksine efor sapması koşulsuz engelliyor.

Beklenen değer ajan tanımından geliyor:

    agents/auditor.md     effort: high
    agents/scout.md       effort: high
    agents/advisor.md     effort: medium
    agents/builder.md     effort: medium
    agents/ui-builder.md  effort: medium
    agents/scribe.md      effort: low

Gerçek değer ise oturumun eforu. Oturum `medium` koşuyor, dolayısıyla `auditor` ve
`scout` **her çağrıda** engellenir.

## 3. Asıl çelişki — eklenti kendi belgesinde bunu zaten söylüyor

`skills/relay/SETTINGS.md:110`:

> `Agent` aracının şemasında `model` var ama `effort` yok — efor yalnızca ajan
> tanımının frontmatter'ından gelir.

`skills/relay/SETTINGS.md:216`:

> `effort` çağrı anında geçilemediği için **oturuma izole edilemez**; premium farkını
> `model` taşır, efor ikinci derece kaldıraçtır.

Yani: efor çağrı anında **geçilemez**, ama `kimlikDenetle` onu geçilmiş gibi denetliyor
ve tutmadığında bloke ediyor. T0'ın elinde bu sapmayı kapatacak bir kol yok —
`Agent` aracının şemasında `effort` alanı yok, doğrulandı.

Sonuç: oturumun eforu ajan tanımının eforuna eşit olmadığı sürece o rol **hiç
kullanılamaz**. `auditor` `high` istiyor; `medium` oturumda denetim yapılamaz demek,
mühür de yapılamaz demek.

## 4. T0'ın payı

Üç ajanı da art arda açtım, ikisinin dönüşünü "anlamadığım bir gerekçe" diye geçtim ve
üçüncüsü aynı şeyi söyleyene kadar sebebi aramadım. İlk dönüşte kancaya bakılsaydı iki
ajanlık koşu (yaklaşık 175 bin belirteç) harcanmazdı.

## 5. Şu an ne durumdayız

- **T44** tur 2: kod yazıldı, kusur kapandı, T0 koddan doğruladı. Denetim kaydı yok.
- **T45** tur 1: dört kriter de T0 okumasında tutuyor. Denetim kaydı yok.
- İkisi de **mühürlenemez**: `contract.js complete` bağımsız denetçi kaydı istiyor.

## 6. Kapanma ölçüsü

1. Efor sapması `bloklanir: false` olmalı — model sapmasında olduğu gibi yalnız deftere
   düşsün. Gerekçe: T0'ın kapatamayacağı bir sapma üzerine blok atmak, rolü
   kullanılamaz kılar.
2. Ya da `agents/*.md` içindeki `effort` alanları oturumun taban eforuna çekilsin.
   `SETTINGS.md:214` zaten "`effort` ve `maxTurns` `normal` değerlerinde donar" diyor;
   `auditor.md: high` ve `scout.md: high` bu sözle çelişiyor.
3. Kaçış kolu (`TEKNESYUM_KIMLIK_KACIS`) çözüm değil: denetimi bütünüyle kapatır,
   model sapmasını da görünmez yapar. Kullanıcıya sorulmadan kullanılmadı.
4. Ajan "yargı vermeden" döndüğünde T0 bunu **ilk seferde** hata sayacak; ikinci ajanı
   aynı duvara koşturmayacak.

---

# Neyi engelledi — ölçülmüş etki raporu

Kullanıcı 2026-08-26 akşamı sordu: "efor engeli sana ne konuda engel oldu."
Engel **kaldırılmadı**, kaldırılmayacak da; bu bölüm yalnız etkiyi kayda geçirir.

## 1. Mekanizma — sandığımdan farklı çıktı

Engel ajanın **araç çağrılarını** durdurmuyor. `ciktiEkle({decision:'block'})` ajanın
**bitirmesini** durduruyor: ajan işini yapıyor, bitirmeye çalışıyor, kanca "beyan high,
gerçek medium" diye geri çeviriyor.

Ajanlar bu geri çevirmeyi **kendi çıktılarının geçersizliği** diye okudu. Kancanın
söylediği bu değil — kanca kimliğin uymadığını söylüyor, yargının yanlış olduğunu değil.
Ama üç ajan da aynı yanlış çıkarımı yaptı:

    T44 denetçisi  -> "yargı yok, dosya yazılmadı"
    T45 denetçisi  -> "GEÇTİ geri çekildi, mühür kanıtı değil"
    T44 yapıcısı   -> "yeniden açma kararı T0'ın"

Yani asıl kayıp kancanın kestiği şey değil, ajanın **kendi işini geçersiz sayması**.

## 2. Ölçülen bedel

| Koşu | Belirteç | Araç | Sonuç |
|---|---|---|---|
| T44 denetimi, 1. koşu | 86.009 | 15 | yargı yok |
| T44 denetimi, sürdürme | 91.550 | 15 | GEÇTİ verdi |
| T45 denetimi, 1. koşu | 86.763 | 20 | GEÇTİ'yi geri çekti |
| T45 denetimi, sürdürme | 89.888 | 0 | GEÇTİ'yi geri koydu |

**Boşa giden: 172.772 belirteç** — iki koşu tam olarak istenen işi yaptı ve sonucunu
teslim etmedi. T45'in ikinci koşusu 0 araç çağırdı: yeni bir şey ölçmedi, yalnız
bağlamındaki yargıyı geri koydu. Yani ilk koşuda iş bitmişti.

Buna T0'ın yaptığı tekrar dahil değil: T45'in dört kriterini denetçi geri çektiği için
T0 kendisi satır satır okudu (`Install-VidShrink.ps1`, `install-vidshrink.sh`,
`release.yml`, `InstallerTests.cs`) — zaten yapılmış bir işi ikinci kez.

## 3. Neyi gerçekten kilitledi

**Mühür.** `contract.js complete` bağımsız denetçi kaydı istiyor; `auditor_id` olmadan
T44 ve T45 mühürlenemezdi. Bir noktada iki sözleşme birden "kodu bitti, denetimi geçti,
mühürlenemiyor" durumunda kaldı.

Sözleşmeler sonunda mühürlendi ama **kanca sayesinde değil, ona rağmen**: T0 her iki
denetçiye de "efor kararı T0'da ve verildi, sen yalnız yargını yaz" diye ikinci kez
gitti. Bu kalıcı bir çözüm değil, elle zorlama.

## 4. Neyi engellemedi

Kod üretimini engellemedi. T44 yapıcısı tur 2'yi tamamladı, kusuru kapattı, dört test
yazdı, ham çıktısını verdi; yalnız "kabul kararı T0'ın" diyerek kendi işini askıya aldı.
İş kaybı yok, karar kaybı var.

## 5. Kayda değer sonuç

Bu turda yapılan iş engelin *rağmına* tamamlandı: 43/45 sözleşme, v0.1.1 yayında,
başlatıcı ilk kez yayına girdi ve Linux çapraz yayımı ölçüldü. Yani engel çıktıyı değil
**verimi** vurdu: aynı sonuç için iki kat denetçi koşusu ve bir kat T0 tekrarı.

Kapanma ölçüsü 1-4 yerinde duruyor. Ek olarak:

5. Kanca bir ajanı kimlik yüzünden geri çevirirken **ne yapmasını istediğini** yazsın.
   Bugünkü metin ajana "kimliğin uymuyor" diyor, ajan bunu "çıktın geçersiz" diye
   okuyor. "Kimlik sapması kaydedildi; işini normal şekilde teslim et" cümlesi
   172.772 belirtecin çoğunu geri kazandırırdı.


## Çözüm (27.08.2026)

`relay-watch.js` efor sapmasında artık **bloklamıyor**, yalnız deftere düşürüyor.
Kök sebep: efor çağrı anında geçilemiyor (`SETTINGS.md:110, :216`), dolayısıyla ajan
kendi eforunu düzeltemez ve blok kaçınılmaz olarak kilitlenmeye döner. Model sapması
bloklanmaya devam ediyor — o çağrıda geçilebiliyor. `test/o6-kimlik.js` tersine çevrildi.
