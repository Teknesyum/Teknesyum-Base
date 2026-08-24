# Fable brifingi — Teknesyum Base'in tamamı

Bu dosya tek bir soru için yazıldı: **bu eklenti nerede gereksiz iş yapıyor, nerede
token yakıyor, nerede verimlilik kaybediyor.**

Kullanıcının cümlesi: *"şu plugin'imizin mükemmel bir işleyişe sahip olmasını istiyorum.
'Şurda şunu gereksiz yapıyorsun ve token'ini yakıyor' ya da 'verimlilik şu adımda
kaybediliyor, şunu yapmak lazım' gibi veriler lazım."*

## Envanter — ölçüldü

| | |
|---|---|
| Kanca + betik | **10.670 satır** JavaScript |
| En büyük dosyalar | `relay-watch.js` 1.806 · `oturum.js` 1.528 · `tarama.js` 1.443 · `dil.js` 1.021 |
| Skill ve referans metni | **243 kB** |
| Komut | 22 |
| Ajan | 7 |
| Test | 458 |
| Sürüm | 2.52.0 |

## Eklenti ne yapıyor

**Relay** — iş yönetimi. Kullanıcı bir şey istediğinde işi ölçer, sözleşmelere böler,
ajanlara dağıtır, denetletir, mühürler. Sözleşme dosyaları `.claude/relay/contracts/`
altında; her birinin `owns` kümesi, kabul kriterleri ve mühür alanları var.

**Profiller** — `eco` · `normal` · `premium`. Ajan modeli, paralel tavanı, denetim eşiği,
ön araştırma derinliği profile göre değişir. Profil oturum başına kayıtlı; makine geneli
değil.

**Kancalar** — `relay-watch.js` on bir olayı dinliyor: `PreToolUse`, `PostToolUse`,
`Stop`, `UserPromptSubmit`, `SessionStart`, `SubagentStart`, `SubagentStop`,
`PostCompact`, `SessionEnd`, `StopFailure`, `PostToolUseFailure`. Ajan sağlığı, tur
makbuzu, açık iş kuyruğu, yönlendirme tavanı, depo sürüm kapısı hep burada.

**teknesyum-ui** — neon arayüz standardı. Palet, tipografi, hareket kuralları, dört
platform (Web, React, Electron, WPF/WinForms).

**Kayıt** — `/save` oturumu diske yazar ve özel aynaya push eder; `/load` başka makinede
kaldığın yerden sürdürür.

## Bugün ölçülen şeyler — bunları varsayma, veri olarak kullan

1. **Bir oturumun maliyetinin %89'u konuşma hacminden geliyor.** `docs/OLCUM-TABAN.md`.
   Modelin kendi ürettiği metin her turda bağlama geri yazılıyor; araç sonuçlarının
   tamamı maliyetin %2,5'i. Bu, "her tura X bas" biçimindeki her çözümü pahalı kılıyor.

2. **Base'in bir oturumdaki toplam ayak izi 4.826 token** — o koşunun %2,5'i. Yani
   enjeksiyon pahalı değil; pahalı olan tur sayısı ve çıktı uzunluğu.

3. **`relay/SKILL.md` çağrı başına ~9.700 token** ve ikinci çağrı gövdeyi **yeniden
   yazıyor**, cache'ten okumuyor. 83 çağrının **59'u alt ajan transkriptinde** — her alt
   ajan protokolü kendi bağlamında baştan yüklüyor. Tek bir oturum yalnız buna
   ~76.000 token ödemiş. `docs/OLCUM-CAGRI.md`.

4. **Skill bölümlerinin çoğu okunmuyor.** En yaygın bölüm relaylı oturumların yarısında
   iz bırakıyor; §1.6 ürün standardı 87 oturum grubunun **tamamında sıfır**, §3.2 rota
   toplam 1 kez.

5. **`relay/SKILL.md` 62 kB** ve kendi §6'sının tavanı ~30 kB. Açık günlük var.

6. **Description bütçesi aşılmıyor** — `pencere × 4 × 0,01`, 1M'de 40.000, liste 13.938.
   Base'in payı %5,5. Ama pencere 200k'ya düşerse Base'in 18 girdisi birden
   çağrılamaz hale geliyor. `docs/OLCUM-BUTCE.md`.

7. **Kancalar kurulu önbellekten koşuyor**, depodan değil. Bugün yazılan üç özellik
   güncelleme yapılana kadar tümüyle ölüydü ve "üretimde çalışıyor" sanıldı.

## Bugünün deseni — beş kapatılmış hata günlüğünün ortak sonucu

*Kural vardı, onu okuma anı yoktu.* Çözümlerin hiçbiri "kuralı daha iyi yaz" olmadı;
hepsi **kuralı okunan yere koy** ya da **kancaya bağla** biçiminde oldu.

Bu desen doğru ama bir maliyeti var: her kural bir kanca daha demek, her kanca bir süreç
daha. `PostToolUse` matcher'sız çalışıyor — her araç çağrısında bir `node` süreci.
Ölçülen: Windows'ta 20–60 ms.

## Sana sorulan

Sırayla ve somut:

1. **Gereksiz iş nerede.** Hangi kanca, hangi bölüm, hangi kural karşılığını vermiyor.
   Dosya ve satır ver.

2. **Token nerede yanıyor.** Yukarıdaki ölçümlerin gösterdiğinden **başka** bir yer var
   mı. Varsa nasıl ölçülür.

3. **Verimlilik hangi adımda kaybediliyor.** Bugün üç sözleşme denetimden kaldı ve
   üçünde de kusur gerçekti; ama üçü de birer tur daha yedi. Bu döngü kaçınılmaz mı,
   yoksa sözleşme yazımında kaçırılan bir şey mi var.

4. **Ne kaldırılmalı.** Bir eklentiyi iyileştirmenin en ucuz yolu bazen silmektir.
   Karşılığını vermeyen ne var.

5. **Kaçırdığımız.** Brifingde sorulmayan ama en çok kazandıracak olan.

## Ölçüt

"Şunu da ekleyin" listesi istemiyorum — eklenti zaten 10.670 satır. **Kaldırılacak,
birleştirilecek, ucuzlatılacak** şeyler istiyorum.

Ölçülebilir olsun: "şu dosyada şu fonksiyon şu yüzden gereksiz" ya da "şu kural şu
ölçümle çelişiyor". Genel tavsiye değersiz.

Yanılıyorsak söyle. Yukarıdaki yedi ölçümden biri yanlış yorumlanmışsa onu söylemek
yeni bir öneriden değerlidir.
