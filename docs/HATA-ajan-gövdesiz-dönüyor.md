# Hata: advisor ve planner ajanları gövdesiz dönüyor

**Durum:** çözüldü (24.08.2026).
**Kaynak:** `teknesyum/hooks/relay-watch.js` — `duyur()`
**Ölçü:** gerçek bir advisor çağrısında üç başlıklı gövde ana oturuma ulaşıyor.

---

## 1. Belirti

`teknesyum:advisor` ve `teknesyum:planner` gerçek iş yapıyor — bir planner 149.436 token
ve 27 adım harcadı — ama ana oturuma dönen mesaj 147 karakterlik bir kapanış cümlesi
oluyor: *"Rapor teslim edildi, açık iş kalmadı."* Dört vakanın üçü böyle, biri sağlam
döndü. Yani aralıklı.

| Ajan | Rol | Token | Adım | Dönen |
|---|---|---|---|---|
| `a68db444cbb3eb51b` | planner | 149.436 | 27 | 147 karakter |
| `a4004b1806f813eb3` | advisor | 19.066 | 2 | 153 karakter |
| `adcc0a4daa547ca64` | advisor | 13.148 | 0 | 158 karakter |
| `ad0391ebcc6cf609f` | advisor | 25.910 | 2 | gövde geldi |

## 2. Kök sebep

`SubagentStop` kancası duyurusunu `hookSpecificOutput.additionalContext` ile veriyordu.

`duyur()` içindeki dal yalnız iki olayı kapanış sayıyordu:

```js
if (_olay === 'Stop' || _olay === 'StopFailure') {
  ciktiEkle({ systemMessage: ... });
  return;
}
ciktiEkle({ hookSpecificOutput: { hookEventName: _olay, additionalContext: ... } });
```

Fonksiyonun üstündeki yorum sınıflandırmayı açıkça yazıyordu: *"bu olayların hepsi tur
içinde ateşleniyor — `PreToolUse`, `PostToolUse`, `SubagentStart/Stop`, `SessionStart`."*
Bu cümle `SubagentStop` için yanlış. O olay, tıpkı `Stop` gibi, ajan cevabını
**yazdıktan sonra** çalışır.

Zincir:

1. Ajan gövdeyi yazar ve turu kapatmak ister.
2. `SubagentStop` ateşlenir; kanca `additionalContext` döndürür.
3. Bağlama metin girdiği için ajanın turu **yeniden açılır**.
4. Ajan yeni bir asistan mesajı yazar. Elinde söyleyecek yeni bir şey yoktur; ya gövdeyi
   tekrarlar ya da "görüş zaten yukarıda" der.
5. Ana oturuma alt ajandan yalnız **son** asistan mesajı gider. Gövde düşer.
6. Yeni mesaj yine `SubagentStop` doğurur — döngü, tur limitine kadar sürer.

Enjekte edilen metin `yonlendirmeYonerge` yönergesiydi; kapanış mesajlarının başındaki
`Teknesyum ▸ Görev ▸ advisor bitti` satırları onun ürünüdür.

## 3. Kanıt

`adcc0a4daa547ca64` transkripti, mesajlar sırayla (araya hiçbir `user` satırı girmiyor):

```
0  user      brifing
2  assistant 1180 kr  ## Görüş ... ## Gerekçe ... ## Kaçırdığın şey     ← gövde
3  assistant  118 kr  `Teknesyum ▸ Debug ▸ ...` Görüş yukarıda teslim edildi
5  assistant  158 kr  `Teknesyum ▸ Görev ▸ advisor bitti` ... ek bir şey yok
6..11               aynı 158 karakterlik mesaj, 7 kez
```

`2` ile `3` arasında kullanıcı ya da araç mesajı yok — turu yeniden açan tek şey kancanın
bağlam enjeksiyonudur. `5`–`11` arasındaki birebir tekrar döngüyü gösterir.

`a4004b1806f813eb3` aynı deseni iki kez yaşadı: gövde (7) → beş stub → koordinatörün
`DEVAM` mesajı (18) → gövde yeniden (19) → sekiz stub.

**Çalışan vakayı ayıran şey:** `ad0391ebcc6cf609f`'te de döngü aynen oldu (17 satır, 8
tekrar). Fark, ajanın kapanış mesajında gövdeyi **yeniden yazmayı seçmesi**. Yani düzelen
bir şey yoktu; model kaybettiği turda gövdeyi tekrarladı. Aralıklılığın sebebi bu — kanca
her seferinde aynı şeyi yapıyor, sonucu modelin o anki tercihi belirliyor.

Bu vakada ayrıca `Teknesyum ▸ Görev ▸ builder bitti — 12 dk` satırı advisor'ın kendi
çıktısında görünüyor: başka bir ajanın kapanış duyurusu bu ajanın bağlamına sızmış.

**T0'ın hipotezi çürüdü.** `multi-session.md:86` ("Rapor gövdesini sohbete basma") builder
için yazılmıştır ve `agents/advisor.md` ile `planner.md` bu kuralı hiç yüklemez. Dört
transkriptin hiçbirinde ajanın o kuralı okuduğuna dair iz yok; üçünde gövde zaten
basılmıştır, sonradan düşmüştür. `SKILL.md` §7.0 ve `F1` yasak satırı da aynı sebeple
elendi: gövde yazılmamış değil, yazıldıktan sonra kaybolmuş.

## 4. Düzeltme

`teknesyum/hooks/relay-watch.js`:

- `KAPANIS_OLAYI = { Stop, StopFailure, SubagentStop }` sabiti eklendi; `duyur()` bu üç
  olayda `systemMessage` yazar, bağlama hiçbir şey enjekte etmez.
- `baglamEkle()` aynı olaylarda `systemMessage`'a yönlendirildi ve `duyur()` ile alan
  paylaşacak şekilde birikimli hale getirildi — biri ötekinin metnini ezmiyor.
- Yanlış sınıflandırmayı doğuran yorum düzeltildi, ölçüm notu bırakıldı.

Ajan tanımlarına (`agents/advisor.md`, `agents/planner.md`) ve `multi-session.md`'ye
dokunulmadı; ikisi de sebep değildi.

## 5. Ölçüm

Düzeltme kurulu eklenti kopyasına da uygulandı ve gerçek bir `teknesyum:advisor` çağrısı
yapıldı (`aa0f411d7450c29cc`).

| | Önce | Sonra |
|---|---|---|
| Transkript satırı | 12–28 | 2 |
| Kapanış stub'ı | 6–8 tekrar | yok |
| Ana oturuma dönen | 147–158 karakter | 1171 karakter, üç başlık tam |

Regresyon testi: `test/run.js` → *"SubagentStop duyurusu bağlama değil ekrana yazılır"*.
Test eski kodda düşüyor, yenide geçiyor. Takım 458 → 459, kalan yok.

## 6. Kapsam dışı not

Advisor gerçek çağrıda şunu söyledi: `SubagentStart` duyurusu da `systemMessage`'a
çekilebilir, `PostToolUse` döngü/sessizlik uyarıları ise bağlamda kalmalı çünkü muhatabı
modeldir. `SubagentStart` ajan cevabını yazmadan önce ateşlendiği için gövde kaybı
üretmiyor; bu tur değiştirilmedi.
