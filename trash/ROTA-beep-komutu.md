# Rota: `/beep` komutu — sesli bildirim

**Durum:** kapandı 23.08.2026 — 2.44.0. On kabul kriteri karşılandı; §9 göçünün ölçütü
genişletildi (rapordan sonra elle eklenen kancalar `Media.SoundPlayer` olmuştu, artık
"elle eklenmiş PowerShell ses kancası" deseni siliniyor ve `StopFailure` de kapsamda).
**Kaldığım yer:** tasarım kapandı, sesler dinlenip seçildi, kod yazılmadı
**Bağlı karar:** kapsam sözleşmesi `docs/ROTA-kapsam-this.md`
**Amaç:** Claude Code'un dikkat çekmesi gereken anlarda işletim sisteminin bildirim
sistemine hiç uğramadan kısa bir ses çalmak, ve bunu eklentinin sahiplendiği bir
`/beep` komutuyla yönetmek.

**Dokunulacak dosyalar:** `teknesyum/commands/beep.md`, `teknesyum/hooks/beep.js`,
`teknesyum/hooks/hooks.json`, `teknesyum/scripts/beep.js`, `teknesyum/commands/help.md`,
`CHANGELOG.md`, `.claude-plugin/plugin.json`

---

## 1. Problem

Kullanıcının Windows bildirimleri kapalı ve odaklanma modu sürekli açık. Bu iki ayar
birlikteyken Claude Code'un ürettiği masaüstü toast'ı sessizce yutuluyor: izin
istendiğinde, soru sorulduğunda ya da uzun bir iş bittiğinde kullanıcıya hiçbir sinyal
gitmiyor. Ekranda başka bir pencere varken oturumun beklediği fark edilmiyor.

`preferredNotifChannel` ayarı bu durumu çözmüyor. Seçenekleri terminal emülatörüne bağlı
(`iterm2`, `kitty`, `ghostty`) ya da yine işletim sisteminin bildirim yolundan geçiyor.
Odaklanma modunun altından geçen tek yol ses aygıtına doğrudan yazmaktır.

## 2. Çözüm

Ses, bildirim sistemine değil doğrudan ses aygıtına gider. Odaklanma modu ses çalmayı
engellemez; engellediği şey toast'tır.

Şu an bu, kullanıcının `~/.claude/settings.json` dosyasına elle eklenmiş iki kancayla
çalışıyor. Elle eklenen kanca üç yerden kırılır: kullanıcı ayar dosyasını sıfırlarsa
gider, başka bir makinede yoktur, ve ne olduğu ayar dosyasına bakmadan anlaşılmaz.
Bunu eklentinin içine almak gerekir.

**Karar: kanca eklentinin olur, kullanıcının `settings.json` dosyası kirletilmez.**
`hooks/beep.js` eklentiyle birlikte gelir, `hooks/hooks.json` üzerinden kaydolur, ayarını
kendi dosyasından okur. Eklenti kaldırılınca ses de kalkar. Güncelleme ayarı ezmez.

## 3. Ses yolu: üç aday, biri seçilecek

Windows'ta ses çıkarmanın üç ayrı yolu var ve **üçü aynı kanaldan geçmiyor.** Bu ayrım
teoride değil bu makinede ölçüldü: `[console]::beep` çalıştı, çıkış kodu `0` döndü,
kullanıcı hiçbir şey duymadı.

| Yol | Nasıl | Nereden geçer | Riski |
|---|---|---|---|
| A | `[console]::beep(hz,ms)` | sistem hoparlörü sürücüsü | sürücü yoksa sessiz, hata da vermez |
| B | `Media.SoundPlayer` + wav | varsayılan ses aygıtı | dosya yolu sürüme bağlı |
| C | `[System.Media.SystemSounds]` | Windows ses şeması | şema "yok" ise ya da odaklanma kısarsa sessiz |

**A elenmiştir.** Sistem hoparlörü sürücüsü modern masaüstlerinde çoğu zaman yok; olmayınca
`Beep()` çağrısı sessizce başarılı döner. Sessizce başarısız olan bildirim mekanizması,
bildirim mekanizmasının en kötü hâlidir.

**C ikinci sıradadır.** Windows ses şemasından geçer, yani kullanıcı şemayı "Ses yok"
yaptıysa ya da odaklanma modu bildirim seslerini kıstıysa o da susar. Odaklanma modunun
altından geçmek bu rotanın amacı olduğu için C'ye güvenilmez.

**B varsayılan olur.** Dosyayı adıyla çalar, ses şemasına ve odaklanma moduna bakmaz,
varsayılan çıkış aygıtına gider. Dosyanın yokluğu tek zayıf noktasıdır ve bu kontrol
edilebilir bir şeydir: dosya yoksa listedeki bir sonrakine düşülür.

Komutun adı yine de `/beep` kalır. `/premium` de üç profil arasında geçiş yapan bir
anahtar olduğu hâlde adını korumuştur, çünkü ezberde odur. Aynı gerekçe.

## 4. Varsayılan sesler: kısa olacak

Sesin kısa olması tasarımın kendisidir, ayrıntı değil. Uzun ses iki gün içinde kapatılır;
kapatılan bildirim bildirim değildir. `C:\Windows\Media\` altındaki 70 dosyanın süresi wav
başlıklarından ölçüldü — `Ring01.wav` **5,65 saniye**, `Alarm05.wav` **8,26 saniye**.
Zil ve alarm dosyalarının hepsi elenir.

Kısa uçtaki ölçümler:

| Süre | Dosya |
|---|---|
| 0,06 s | `Windows Navigation Start.wav` |
| 0,13 s | `Windows Information Bar.wav` |
| 0,15 s | `Windows Menu Command.wav` |
| 0,40 s | `ding.wav` |
| 0,41 s | `Windows Default.wav` |
| 0,50 s | `Windows Ringout.wav` |
| 0,65 s | `chord.wav` |
| 0,90 s | `Windows Critical Stop.wav` |

Varsayılan üçlü — on aday makinede çalınıp dinlenerek seçildi
(`scripts/olcum/ses-sec.ps1`):

| Olay | Ne demek | Ses | Süre |
|---|---|---|---|
| `bekleme` | Senden bir şey bekliyorum — izin ya da soru | `Windows Startup.wav` | 0,22 s |
| `bitti` | Tur bitti | `ding.wav` | 0,40 s |
| `hata` | Tur hatayla kapandı | `Windows Default.wav` | 0,41 s |

Üçü de yarım saniyenin altında ve birbirinden ayırt edilebilir. Seçim kullanıcınındır ve
kâğıt üstündeki öneriden ayrılmıştır: ilk taslak `bekleme` sesini en uzun, `bitti` sesini
en kısa yapıyordu. Dinlenince tersi tercih edildi — `Windows Startup.wav` yumuşak çıkışıyla
zorlamadan dikkat çekiyor, `ding.wav` ise bitişi net kapatıyor. Kulakla verilen karar
tablodaki mantığı ezer; bu yüzden `dinle` alt komutu §5'te zorunlu tutuluyor.

`hz`/`ms` alanları A yolu için ayar dosyasında durur ama varsayılan değildir; sistem
hoparlörü olan bir makinede kullanıcı isterse açar.

## 5. Komut yüzeyi

```
/beep                       durum tablosu — hangi olay, hangi ses, açık mı, kaynağı ne
/beep on | off              hepsini aç veya kapat
/beep <olay> on | off       tek olayı aç veya kapat   (bekleme | bitti | hata)
/beep dinle                 üç sesi de çal, kullanıcı duyduğunu doğrulasın
/beep <olay> <dosya>        o olayın sesini değiştir
/beep <olay> bip <hz> <ms>  o olayı sistem hoparlörü bipine çevir
/beep … this                yukarıdakilerin hepsi — yalnız bu sohbet için
/beep this sil              bu sohbete özel ayarı sil, geneline dön
```

**Kapsam kuralı ayrı bir sözleşmedir ve burada tekrarlanmaz:** çıplak komut makine
varsayılanını yazar, sonuna `this` eklenirse yalnız içinde bulunulan sohbeti yazar.
Kuralın tamamı, okuma sırası, sessiz gölgeleme tehlikesi ve `/premium` tarafındaki ters
çevirme `docs/ROTA-kapsam-this.md` içindedir. `/beep` o sözleşmeyle **doğar**, sonradan
uydurulmaz.

Durum tablosu her satırın sonunda değerin kaynağını basar: `oturum`, `makine` ya da
`varsayılan`.

Argüman boşsa durum tablosunu bas ve dur. Kendiliğinden ayar değiştirme — `/uisetup` ve
`/premium` de böyle davranır.

`dinle` alt komutu zorunludur. Ses çalıp çalmadığı ancak duyulunca bilinir; bu makinede
`[console]::beep` sessizce başarılı dönüp hiçbir ses çıkarmadı ve bu ancak kullanıcı
söyleyince anlaşıldı. `dinle` o öğrenmeyi kurulum anına çeker. `test` de aynı işi yapan
takma addır.

## 6. Üç olay

| Olay adı | Kanca olayı | Ne demek | Varsayılan |
|---|---|---|---|
| `bekleme` | `Notification` | izin ya da soru bekleniyor | açık |
| `bitti` | `Stop` | tur tamamlandı | açık |
| `hata` | `StopFailure` | tur hatayla kapandı | açık |

`PostToolUseFailure` bilerek dışarıda bırakılıyor: tek bir araç çağrısının başarısızlığı
normal akışın parçasıdır, turda onlarca kez olur, sesi anlamsızlaştırır.

`bitti` sesinin varsayılan olarak açık gelmesi tartışmalıdır — ekran başında oturan biri
her turda ses duymak istemez. Açık gelir ama en kısa ses odur, ve `/beep bitti off` tek
hamlede susturur. Durum tablosu bu kullanımı örnek satır olarak göstermelidir.

## 7. Ayar dosyası

`~/.claude/teknesyum-beep.json` — makine tabanı.
`<proje>/.claude/teknesyum-beep.json` — varsa üstündür.

`teknesyum-ui.json` ile aynı kalıp. `teknesyum.json` içine gömülmez: o dosya profil ve
yönlendirme gibi röle düğmelerini tutar, ses ayrı bir konudur ve ayrı dosyada dururken
silinmesi de taşınması da kolaydır.

```json
{
  "surum": "1.0.0",
  "kapali": false,
  "olaylar": {
    "bekleme": { "kapali": false, "dosya": "Windows Startup.wav" },
    "bitti":   { "kapali": false, "dosya": "ding.wav" },
    "hata":    { "kapali": false, "dosya": "Windows Default.wav" }
  }
}
```

Sohbete özel ayar bu dosyaya değil, profilin zaten kullandığı
`~/.claude/teknesyum/oturumlar/<oturum>.json` kaydına `beep` anahtarı altına yazılır.
İkinci bir oturum dosyası düzeni açmanın karşılığı yok; bayat kayıt temizliği de tek
yerden yürür. Okuma sırası `ROTA-kapsam-this.md` §4'tedir.

`dosya` yerine `hz`/`ms` varsa A yolu kullanılır. `dosya` çıplak ad ise `C:\Windows\Media\`
altında aranır, mutlak yol ise doğrudan kullanılır. Dosya yoksa sessizce varsayılana
düşülür — hata basılmaz.

Dosya hiç yoksa varsayılanlar geçerlidir. **Ses için dosya oluşturmak gerekmemelidir**:
eklentiyi kuran herkes ilk turdan itibaren ses duyar, hiçbir şey ayarlamadan.

## 8. Kanca

`teknesyum/hooks/beep.js`, `hooks/hooks.json` içine üç girişle kaydolur:

```json
"Notification": [{ "hooks": [{ "type": "command",
  "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/beep.js\"",
  "async": true, "timeout": 10 }] }]
```

`Stop` ve `StopFailure` için aynısı. Üçünde de **`async: true` zorunludur.** Ses çalarken
tur beklerse bildirimin kendisi gecikmeye dönüşür; ayrıca `Stop` olayında `relay-watch.js`
zaten çalışıyor ve karar döndürebiliyor — ses onun önüne geçmemelidir.

`hooks.json` içindeki mevcut `Stop` girdisine ikinci bir kanca olarak eklemek yerine ayrı
girdi açılır. `relay-watch` bloklayan bir kancadır, `beep` bloklamayan bir kancadır; ikisi
tek dizide durursa biri ötekinin davranışını miras alır gibi okunur.

Betiğin yapacağı iş sırayla: ayarı oku → kapalıysa çık → olayı eşle → sesi çal → her
durumda `0` dön. **Betik hiçbir koşulda hata basmaz ve hiçbir koşulda sıfırdan farklı
dönmez.** Bildirim mekanizmasının kendisi turu düşüremez.

### Platform

| Platform | Komut |
|---|---|
| Windows | `powershell -NoProfile -Command "(New-Object Media.SoundPlayer '<yol>').PlaySync()"` |
| macOS | `afplay /System/Library/Sounds/Tink.aiff` |
| Linux | `paplay`, yoksa `aplay`, yoksa `printf '\a'` |

macOS ve Linux'ta `hz`/`ms` ayarı yoktur; orada yalnız `dosya` alanı çalışır. Durum
tablosu bunu tek satırla söylemelidir — çalışmayan bir düğmeyi çalışıyormuş gibi göstermek
en kötü seçenektir.

## 9. Göç

Kullanıcının `~/.claude/settings.json` dosyasında şu an elle eklenmiş iki kanca var:
`Notification` ve `Stop` altında `[console]::beep` çağrıları. İkisi de duyulmuyor.

`/beep` ilk çalıştığında bu iki kancayı bulup **silmelidir.** Silinmezse eklentinin
kancası ve elle eklenen kanca birlikte çalışır, her olayda çift ses tetiklenir. Silme
ölçütü: komutu `powershell` ve `[console]::beep` içeren, `Notification` ya da `Stop`
altındaki girdi. Ne sildiğini tek satırla bas.

## 10. Kabul kriterleri

1. `/beep` argümansız çağrılınca üç olayı, seslerini, sürelerini, açık/kapalı
   durumlarını ve her satırın kaynağını (`oturum` · `makine` · `varsayılan`) tablo olarak
   basar; hiçbir dosya yazmaz.
2. `/beep dinle` üç sesi sırayla çalar ve aralarında ayırt edilebilir bir duraklama
   bırakır.
3. Ayar dosyası hiç yokken eklenti kurulu bir oturumda tur bitişinde ses duyulur.
4. `/beep bitti off` sonrası tur bitişinde ses duyulmaz, bekleme sesi duyulmaya devam
   eder. `/beep bitti on` geri açar.
5. `/beep off` üçünü birden susturur, `/beep on` üçünü birden açar ve tek tek yapılmış
   ayarları korur.
6. `/beep bekleme chord.wav` sonrası bekleme sesi değişir, ayar dosyasına yazılır ve yeni
   oturumda korunur.
7. Ayar dosyası bozuk JSON içerdiğinde tur normal biter, ses varsayılanla çalar, ekrana
   hata düşmez.
8. `~/.claude/settings.json` içindeki elle eklenmiş `[console]::beep` kancaları
   temizlenmiştir ve tek olayda tek ses duyulur.
9. `hooks/beep.js` doğrudan çalıştırıldığında (`echo '{}' | node hooks/beep.js`) sıfır
   döner.
10. `/beep off this` yalnız o sohbeti susturur; başka bir sohbette sesler çalmaya devam
    eder. `/beep this sil` sohbete özel ayarı kaldırır.

## 11. Riskler

**Ses yine duyulmayabilir.** Bu makinede `SteelSeries Sonar` sanal ses aygıtı kurulu;
Sonar sesi Oyun, Sohbet, Medya ve Aux kanallarına böler ve sistem seslerinin gittiği kanal
kısık olabilir. `[console]::beep` bu makinede zaten sessiz çıktı. Karşılığı `/beep dinle`:
kurulumda bir kez doğrulanır, sonra güvenilir. Doğrulama başarısız olursa kullanıcı
Sonar'ın kanal karıştırıcısına bakmalıdır — bu, komutun çözebileceği bir şey değildir ama
durum tablosunun işaret edebileceği bir şeydir.

**Uzaktan sürerken ses işe yaramaz.** Kullanıcı `/rc` ile telefondan sürüyorsa makinede
çalan ses kimseye ulaşmaz. `/beep` durum tablosu, uzak denetim açıkken bunu bir satırla
söylemeli ve `PushNotification` yolunu hatırlatmalıdır. İki mekanizma birbirinin yerine
geçmez, birbirini tamamlar.

**Her turda ses yorucu olabilir.** Sesin kısa olması bunun için, kapatılabilir olması da.
Ekran başındayken `bitti` sesini kapatıp `bekleme` ve `hata` seslerini açık bırakmak doğru
dengedir; durum tablosu bunu örnek olarak göstermelidir.

## 12. Devam promptu

> Teknesyum Base'e `/beep` komutunu ekle. Tasarım `docs/ROTA-beep-komutu.md` içinde
> tamamlanmış durumda; kararlar verilmiş, senden istenen kod. Raporu baştan sona oku,
> ardından kapsam sözleşmesi için `docs/ROTA-kapsam-this.md` oku, ve §10'daki on kabul
> kriterini karşıla.
>
> Yazılacaklar: `teknesyum/commands/beep.md` (komut tanımı, `/uisetup` kalıbında),
> `teknesyum/hooks/beep.js` (bloklamayan ses kancası), `teknesyum/scripts/beep.js`
> (durum tablosu ve ayar yazma), `teknesyum/hooks/hooks.json` (üç yeni giriş, üçü de
> `async: true`), `teknesyum/commands/help.md` (komut listesine satır), `CHANGELOG.md`,
> `.claude-plugin/plugin.json` (sürüm).
>
> Beş şeyi atlama: varsayılan ses yolu `[console]::beep` değil `Media.SoundPlayer` +
> kısa wav olacak (§3, §4); kanca hiçbir koşulda sıfırdan farklı dönmeyecek (§8);
> kurulum, kullanıcının `~/.claude/settings.json` dosyasındaki elle eklenmiş
> `[console]::beep` kancalarını temizleyecek (§9); argüman sözlüğü `on`/`off` olacak,
> `ac`/`kapat` değil (§5); çıplak komut makineye, `this` ekli komut oturuma yazacak
> (`ROTA-kapsam-this.md`).
