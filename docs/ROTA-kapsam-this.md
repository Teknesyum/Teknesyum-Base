# Rota: kapsam sözleşmesi — çıplak komut geneldir, `this` bu sohbete özeldir

**Durum:** kapandı 23.08.2026 — 2.44.0. Dokuz kabul kriteri karşılandı; `/premium` ve
`/beep` aynı sözleşmeyle çalışıyor, `this sil` her ikisinde de var.
**Kapsam:** `/beep`, `/premium` (ve `normal` · `eco` kolları), bundan sonra eklenecek her
ayar komutu
**Dokunulacak dosyalar:** `teknesyum/scripts/premium.js`, `teknesyum/commands/premium.md`,
`teknesyum/scripts/beep.js`, `teknesyum/commands/beep.md`, `teknesyum/hooks/ortak.js`,
`teknesyum/commands/help.md`, `CHANGELOG.md`

---

## 1. Kural

Tek cümle: **çıplak komut makine varsayılanını değiştirir, sonuna `this` eklenirse
yalnız içinde bulunulan sohbeti değiştirir.**

```
/beep on              makine geneli — her sohbette açık
/beep on this         yalnız bu sohbette açık
/beep bitti off this  yalnız bu sohbette bitiş sesi kapalı

/premium              makine geneli — bundan sonraki her oturum premium
/premium this         yalnız bu sohbet premium
/eco this             yalnız bu sohbet eco, makine varsayılanı elleşmez
```

`this` her zaman en sondadır ve her zaman aynı anlama gelir. Komutun kendi sözlüğünü
öğrenen kullanıcı kapsam sözlüğünü ikinci kez öğrenmek zorunda kalmaz.

## 2. Bugün ne oluyor

`/premium` şu an **tam tersi** çalışıyor. `scripts/premium.js`, satır 247-249:

```js
function uygula(profil, genel) {
  const sid = genel ? '' : oturumKimligi();
  const kayit = sid ? oturumYaz(sid, profil) : path.join(konfigKok(), 'teknesyum.json');
```

Oturum kimliği varsa — ki normal kullanımda hep vardır, `CLAUDE_CODE_SESSION_ID`
ortamdan gelir — yazma `~/.claude/teknesyum/oturumlar/<oturum>.json` dosyasına gider.
Makine varsayılanına yazmak için `--genel` bayrağı gerekiyor.

Yani bugün **varsayılan kapsam oturumdur, genel olan istisnadır.** Kullanıcının istediği
bunun tersi.

## 3. Neden ters çevriliyor

Kullanıcı `/premium` yazdığında niyeti neredeyse her zaman "kurulumumu değiştir"dir,
"şu anki sohbeti değiştir" değil. Bugünkü davranışta profil seçilir, sohbet kapanır,
yeni sohbette profil geri düşer ve kullanıcı bunu ancak fark ederse anlar. Sessizce geri
alınan ayar, ayar sayılmaz.

Oturuma özel kapsamın kendisi değerlidir ve kaldırılmıyor — bir sohbette eco ile ucuz iş
yaparken ötekinde premium ile ağır iş sürdürmek gerçek bir ihtiyaçtır. Değişen tek şey
hangisinin ağızdan çıkanın karşılığı olduğu. Nadir olan açıkça istenir, sık olan
yazılmaz.

## 4. Okuma sırası değişmiyor

Yazma hedefi değişiyor, okuma sırası aynı kalıyor:

```
TEKNESYUM_PREMIUM (ortam)  →  oturum kaydı  →  teknesyum.json  →  normal
```

Oturum kaydı makine varsayılanının üstünde kalmaya devam eder. `this` ile yazılan değer
o sohbet boyunca genel ayarı gölgeler — zaten istenen budur.

`/beep` için aynı sıra:

```
<proje>/.claude/teknesyum-beep.json  →  oturum kaydı  →  ~/.claude/teknesyum-beep.json  →  varsayılan
```

Oturuma özel ses ayarı ayrı dosyaya değil, profilin zaten kullandığı
`~/.claude/teknesyum/oturumlar/<oturum>.json` kaydına `beep` anahtarı altına yazılır.
İkinci bir oturum dosyası düzeni açmanın karşılığı yok; bayat kayıt temizliği de tek
yerden yürür.

## 5. Asıl tehlike: sessiz gölgeleme

Ters çevirmenin bedeli tek ve gerçek: kullanıcı bir sohbette `this` ile ayar yapar,
sonra aynı sohbette çıplak komutla geneli değiştirir, **hiçbir şey olmaz.** Oturum kaydı
üstte olduğu için genel değişiklik o sohbette görünmez. Kullanıcı komutun çalışmadığını
sanır.

Bu, komutun çıktısıyla kapatılmalıdır. Çıplak komut, o sohbette bir oturum kaydı varken
şunu basmak zorundadır:

```
Makine varsayılanı premium oldu.
Bu sohbette eco yürürlükte — oturuma özel ayar üstte kalır.
Bu sohbeti de geneline döndürmek için: /premium this sil
```

Üçüncü satırdaki `sil` alt komutu bu yüzden zorunludur: `this` ile yazılanı geri almanın
bir yolu olmalı, yoksa kullanıcı sohbeti kapatmadan geneline dönemez.

## 6. Durum çıktısı kapsamı söyler

`/beep` ve `/premium` argümansız çağrıldığında yürürlükteki değerin **yanında kaynağını**
basar. Kaynak üç kelimeden biridir: `oturum`, `makine`, `varsayılan`.

```
profil    premium   (oturum)
bekleme   Windows Startup.wav   0,22 s   açık   (makine)
bitti     ding.wav              0,40 s   açık   (varsayılan)
```

`/premium durum` bunu zaten yapıyor; `/beep` de aynı biçimi almalıdır. Kaynağı
göstermeyen durum çıktısı, §5'teki karışıklığı çözmek yerine gizler.

## 7. Geriye uyum

`--genel` ve `--global` bayrakları kaldırılmaz, çalışmaya devam eder ve artık çıplak
komutla aynı şeyi yapar. Belgede görünmez, yalnız eski çağrılar kırılmasın diye durur.

Ters çevirme, mevcut oturum kayıtlarını **etkilemez.** Halihazırda yazılmış kayıtlar
okunmaya devam eder ve yedi günlük bayatlama kuralı onları zaten temizler. Göç adımı
gerekmez.

## 8. Yeni komutlar için

Bundan sonra eklenen her ayar komutu bu sözleşmeye uyar. Kapsamı olmayan komutlar
(`/save`, `/load`, `/report`) `this` almaz ve alırsa yok sayar — hata basmaz, çünkü
kullanıcının alışkanlıkla yazdığı `this` bir komutu düşürmemelidir.

## 9. Kabul kriterleri

1. `/premium` çıplak çağrıldığında `~/.claude/teknesyum.json` içindeki `profil` alanı
   değişir; oturum kaydı yazılmaz.
2. `/premium this` çağrıldığında yalnız `~/.claude/teknesyum/oturumlar/<oturum>.json`
   yazılır; `teknesyum.json` elleşmez.
3. Oturum kaydı varken çıplak `/premium` çalıştırılırsa çıktı, o sohbette hangi değerin
   yürürlükte kaldığını ve nasıl temizleneceğini üç satırda söyler.
4. `/premium this sil` oturum kaydını siler; sonraki ölçümde makine varsayılanı geçerli
   olur.
5. `/beep on`, `/beep off`, `/beep <olay> on|off` makine dosyasına yazar; hepsinin `this`
   biçimi oturum kaydına yazar.
6. `/beep` ve `/premium` argümansız çağrıldığında her satırın sonunda kaynak etiketi
   (`oturum` · `makine` · `varsayılan`) görünür.
7. `--genel` bayrağı çalışmaya devam eder ve çıplak komutla aynı sonucu verir.
8. `this` almayan bir komuta `this` yazılırsa komut normal çalışır, hata basmaz.

## 10. Devam promptu

> Teknesyum Base'de ayar komutlarının kapsam sözleşmesini ters çevir: çıplak komut makine
> varsayılanını yazsın, sonuna `this` eklenince yalnız içinde bulunulan oturumu yazsın.
> Karar `docs/ROTA-kapsam-this.md` içinde verilmiş durumda; §9'daki sekiz kabul kriterini
> karşıla.
>
> `scripts/premium.js` satır 247-249'daki `uygula(profil, genel)` mantığı tersine döner;
> `--genel` bayrağı gizli takma ad olarak kalır. `/beep` komutu aynı sözleşmeyle doğar —
> ayrıntısı `docs/ROTA-beep-komutu.md`.
>
> İki şeyi atlama: §5'teki sessiz gölgeleme uyarısı — oturum kaydı varken çıplak komut üç
> satırlık uyarıyı basmak zorunda; ve `this sil` alt komutu — oturuma özel ayarı geri
> almanın başka yolu yok.
