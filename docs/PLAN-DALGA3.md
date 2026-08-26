# Dalga 3 — Ne sunuyoruz, ne bedelle

Konsey: fable + opus, bagimsiz iki plan, 26.08.2026. Bu belge sentezdir.
Onceki: `docs/PLAN-ONARIM.md` (Dalga 1-2), `docs/BRIFING-ONARIM.md` (teshis).

## 0. Kullanicinin sorusu

> "Bana farkli ne sunuyor bu plugin ve bunu ne kadar maliyetle sunuyor? Native cok
> daha avantajli duruyor. Birkac komut fazla girer, isterse denetimcisini kendi de
> calistirir, isterse 20 paralel ajani native de acar."

Bu soruya bugun **verilecek olculmus bir cevap yok**. Dalga 3'un isi cevabi uretmek,
ve cevap olumsuzsa urunu kucultmek.

## 1. Bilanco (bugun)

| Taraf | Deger | Kaynak |
|---|---|---|
| Odenen | oturumda bir kez **2.979** token | `istem-yuku.js`, gercek `usage` |
| Odenen | ilk iki turda **3.488** token | ayni |
| Odenen | oturum toplami **6.722** token | ayni |
| Alinan | **0 olculmus fayda** | 12 bench kosusunda 0 Agent, 0 Skill |

Kucuk iste bu net zarar. Mikro gorevde premium native'den ~%33 fazla tuketti; proje
olcegindeki gorevde fark ~%2'ye indi. Yani sabit vergi is buyudukce eriyor — ama
kucuk iste tam bedeli oduyoruz ve karsiliginda olculmus hicbir sey almiyoruz.

**Token ikincil degildir.** Onceki turda "birincil metrik token olamaz" denmisti;
bu cerceve yanlisti. Dogrusu: token olculen tek gercek, fayda ise henuz olculmedi.
Fayda olculene kadar bilanco tek tarafli ve negatiftir.

## 2. Konseyin iki kritik bulgusu

### (a) Silmenin gerekcesi maliyet degil, yonlendirme

6.722 token 200k pencerenin %3,4'u. Bu sayi tek basina urunu batirmiyor ve silme
kararini yalniz maliyetle savunursak ilk itirazda geri alinir.

Gercek gerekce: **31 aciklama satiri** (22 komut + 2 skill + 7 ajan) modelin hangi
araci sececegine karar verdigi tek yuzey. Relay orada 31'de 1. Rakip kalemi silmek
tasarruf degil, dikkat mudahalesidir.

Duzeltme: brifingdeki "21 skill" yanlisti, depoda 2 skill var (`relay`,
`teknesyum-ui`). Iki plan da bagimsiz olarak bunu yakaladi.

### (b) En buyuk kaldirac dilde

Olculen katsayi **1,894 karakter/token** — cunku yuzey Turkce. Ayni bilgi Ingilizce
yazildiginda ~3,6. Sabit yuk 2.979 → **~1.570**, yani **%47**.

Karsilastirma: kisaltma denemesi 85 token kazandirdi ve iki ibare testleri kirdi.
Dil kaldiraci 1.400 token, davranis kaybi yok — **govdeler Turkce kalir**, yalniz
her oturumda yuklenen aciklama satirlari cevrilir.

## 3. Siralama — her mesajda devreye giren once

Kullanicinin direktifi: "ozellikle her mesajda devreye giren konulara odaklanacagiz."

| # | Is | Kalem | Beklenen kazanc |
|---|---|---|---|
| D1 | Her-tur enjeksiyonu kosullu yap | 3.488 tok | acik sozlesme yoksa **0** |
| D2 | Yuklenen yuzeyi Ingilizceye cevir | 2.979 tok | **-%47** (~1.400 tok) |
| D3 | Kullanim envanteri + surgun | 31 satir | olculecek |
| D4 | Fayda bench'i (kacan kusur) | — | bilancoun eksik yarisi |
| D5 | Konum belgesi | — | iddia = rakam |

D1 ve D2 birlikte pasif yuku **6.722 → ~1.600** yapar: %76 dusus. Ikisi de davranis
kaybettirmez, cunku D1 relay kullanilmiyorken calisan metni susturur, D2 dili
degistirir icerigi degil.

## 4. D1 — her-tur enjeksiyonu

Bugun `hatirlat()` ilk iki turda 3.317 karakter yaziyor (`sayacGecti(j, eko ? 1 : 2)`).
Acik sozlesme olmayan bir oturumda bu metin **hicbir ise yaramiyor** — relay zaten
kullanilmiyor.

Kural: `.claude/relay/live/*.json` bos ve acik sozlesme yoksa enjeksiyon **sifir**.
Sozlesme acilinca devreye girer.

Risk: relay'in tek tetikleyicisi bu metin olabilir; giderse hic acilmaz. Kapi:
D4'un tam kolunda relay acilmiyorsa geri alinir ve tetikleyici skill description'a
tasinir (o zaten aciliste yukleniyor, ek maliyeti yok).

## 5. D2 — yuzey cevirisi

Cevrilecek: 31 `description` alani + `hooks/dil.js` icindeki `olcu`, `dilTalimati`,
`premiumNotu`, `ecoNotu`.
Cevrilmeyecek: `SKILL.md` govdeleri, `references/`, komut govdeleri, bu belge.

Kabul: katsayi ≥3,2; sabit yuk ≤1.700 token.
Risk kapisi: en cok kullanilan 5 senaryo tekrar kosulur; skill/relay cagri sayisi
dusmemeli. Duserse geri alinir — tetikleyici aciklamanin dilinden besleniyordur.

## 6. D3 — kullanim envanteri ve surgun

`scripts/olcum/kullanim.js`: `~/.claude/projects/**/*.jsonl` taranir; slash komut
cagrilari, `Skill` yuklemeleri, `Task` `subagent_type` alanlari sayilir. Model
cagrisi yok, deterministik.

Esik: 90 gunde <2 cagri **ve** baska bir kalemin yapamadigi bir sey yok → surgun.
Surgun = silme degil, `teknesyum-kisisel` adli ikinci eklentiye tasima. Tasinan
kalem 60 gun cagrilmazsa gercekten silinir.

Yapisal adaylar (envanter onaylarsa): `rc`/`rcall`/`rcadvanced`, `ozel`, `pusla`,
`saveall`, `loadall`, `beep`, `ekran`. `autocompact` → `premium` alt komutu.
`uicheckup` + `scan ui` birlesir.

## 7. D4 — fayda bench'i

Birincil metrik **kacan kusur sayisi**: fixture'a gorunur testi *gecen* 6 kusur
ekilir (sinir kosulu, yaris, yanlis varsayilan), teslimde kac tanesi kaldigi sayilir.
Ikincil metrik **verim** = karsilanan kabul kriteri / 100k token — token buradan
girer ve birincil metrigin yaninda durur, altinda degil.

Kollar: `native` · `tam` · `teshis` (eklenti acik, relay kapali, ajanlar acik).
Ucuncu kol faydanin relay protokolunden mi yoksa yalniz denetci ajandan mi geldigini
ayirir; relay'in 487 satirinin kaderi buna bagli.

Blok: sinif D icin 12 eslestirilmis. Gecerlilik onkosulu: `tam` kolunda ≥1 `Agent`
cagrisi yoksa kosu gecersiz.

**Erken cikis:** `tam` kolunda kacan kusur `native`'den az degilse urunun olculmus
faydasi yoktur. O durumda D5 dogrudan yazilir, sinif K ve C hic kosulmaz.

## 8. D5 — konum

Bugunku veriyle "herkes yuklemeli" savunulamaz: urun Turkce, kancalar Windows'a
bagli, komutlarin ucte biri tek kullanicinin altyapisi, faydasi hic olculmemis.
D2 ve D3 bunlardan ikisini kaldirir, D4 ucuncusune rakam uretir.

Savunulabilir cumle bir olcumdur, bir sifat degil: "tek oturuma sigmayan, cok
modullu, kesintiye ugrayan iste kusur kacirma oranini su kadar dusuruyor, su kadar
token karsiliginda."

## 9. Bu dalgada reddedilenler

- **Sabit yuku kalem kalem kisaltmayi surdurmek.** Denendi: 85 token, iki test kirildi.
- **Frontmatter'a model yaptirimi.** Denendi ve reddedildi; frontmatter da beyandir.
- **Efor sapmasini bloklamak.** Uygulandi ve **geri alindi**: efor cagri aninda
  gecilemiyor, ajan kendi eforunu duzeltemiyor, blok denetci rolunu kilitledi
  (26.08, sekiz ardisik uyari). Artik yalniz deftere dusuyor.
- **Profilleri silmek.** Olcecek eksen kalmaz; C1'de kol olmaktan cikip olculebilir
  tavana baglanir.
- **Tum ajanlari silip tek `builder` birakmak.** Olcmeden kesmek, olcmeden eklemekle
  ayni hatadir.

---

# EK — Ikinci konsey turu (26.08.2026, aksam)

Baskan fable, uye opus. Bagimsiz iki inceleme, tum depo okundu.

## E1. Manseti curuten veri

`~/.claude/teknesyum/canli/kullanim.json` (22-26.08) gercek cagri sayiyor:

| kalem | n | kalem | n |
|---|---:|---|---:|
| ajan:builder | 211 | komut:save | 11 |
| ajan:auditor | 166 | komut:scan | 8 |
| ajan:scout | 137 | komut:premium | 2 |
| ajan:ui-builder | 57 | komut:load / loadall / update | 1 |
| ajan:planner | 45 | skill:relay | 2 |
| ajan:advisor | 39 | skill:teknesyum-ui | 6 |
| ajan:scribe | 20 | | |

**"0 Agent cagrisi" bench artefaktidir.** Bench headless ve tek atislik; o gorev
sinifinda denetim zinciri hic tetiklenmez. Fayda tarafi olculmedi demek dogru,
fayda yok demek yanlisti. §1'in "0 olculmus fayda" satiri bu ek ile duzeltilmistir.

Komut tarafi tersi yonde: **beep, autocompact, ekran, help, log, ozel, pusla, rc,
rcall, rcadvanced, report, rule, uicheckup, uisetup, saveall** — tek kayit yok.
Sayac 22.08'de dogdu, 5 gunluk. Yon verir, hukum vermez → tasima > silme.

## E2. Konum — iki uye birlesti

> Teknesyum Base, biten isin "bitti" sayilmasini modelin beyanina degil kancanin
> dogrulayabildigi bir denetim zincirine baglar.

Elenen adaylar ve gerekcesi:

| aday | neden degil |
|---|---|
| token tasarrufu | eklenti net token harciyor |
| paralel ajan | native de 20 ajan aciyor |
| UI standardi | bir CLAUDE.md satiri + tokens.json ile taklit edilir |
| sureklilik | native `--resume` + `/rewind` var |
| profiller | yaptirimsiz prompt metni |
| Turkce | %47 pahali yuzey; maliyet, iddia degil |

Kalan cekirdek: `contract-guard.js` (baglama 0 token yazar, `done/` kilidini ve
muhur kanitini mekanik uygular), `auditor` (`tools: Read, Grep, Glob, LSP` — yazan
ajanin kendi isini onaylamasi arac seviyesinde kilitli), sozlesme protokolu.

## E3. Ayrildiklari nokta — olcum metrigi

**Baskan (fable):** kacan kusur sayisi + her kosuya **zorunlu kesinti**. Gerekce:
iddianin yarisi "kesilen iste dosyadan surme"; kusur metrigi bunu hic olcmuyor.
Kusurlari kosan taraf degil ayri bir model eksin (secim yanliligi).

**Uye (opus):** kacan kusuru **reddediyor**, yerine **yanlis tamam orani** —
`done` muhurlenen sozlesmelerin bagimsiz son-dogrulamada dusme yuzdesi. Gerekce
uc katli: (1) 12 kosunun 10'u sifir kusurdu, tavan etkisi kollari ayirt etmiyor;
(2) ekili kusur modelin dikkatini olcer, eklentinin kapisini degil; (3) tek atislik
gorevde denetim zinciri hic tetiklenmez.

Uye ayrica **A/B eksenini** degistiriyor: eklenti acik/kapali degil, **yalniz denetim
zinciri acik/kapali, gerisi sabit** — yoksa bagimsiz degisken fiilen sistem promptu
boyutu olur.

**T0 karari:** uyenin metrigi birincil (yanlis tamam orani), baskanin kesinti kolu
ikincil metrik olarak eklenir (kesinti sonrasi kurtarilan is yuzdesi). Ikisi celismiyor;
biri kapinin dogrulugunu, digeri sureklilik iddiasini olcer. Eksen uyeninki.

## E4. Sira — iki uye de plani duzeltti

**Once kes, sonra cevir.** D2 cevirisi atilacak satirlara da uygulandi, o emek gitti.

| # | is | kabul olcutu |
|---|---|---|
| A1 | yuzey kesimi: rc/rcall/rcadvanced/ozel/pusla/autocompact/beep/saveall/loadall | acilis sabiti 2.979 → ≤1.400 |
| A2 | enjeksiyon kesimi: `olcu`, `seviye2`, `premiumNotu`, `yonlendirmeYonerge` | rolesiz oturumda 0 karakter (D1 bunu yapti) |
| B1 | muhur sarti: `submitted → done` gecisi auditor muhru olmadan yazilamaz | 10 sentetik muhursuz deneme %100 engellenir |
| B2 | rolenin kosuda devre disi kalmasi — kok neden `roleKoku()` mu | headless `SessionStart` ciktisinda role durumu gorunur |
| C | olcum duzenegi (E3) | once eksen spike'i, sonra guc |
| D | yuzey Ingilizceye — **kesimden sonra** | katsayi ≥3,2 |
| E | `teknesyum-ui` ayri eklentiye | Base yuzeyinden cikar |

## E5. Reddedilenler

- Eklentiyi sifirdan yazmak — `contract-guard.js` ve auditor kilidi calisiyor.
- Yuku kisaltarak cozmek — denendi, net 85 token. Kalem kaldirmadan bitmez.
- Her kullanilmayan komutu aninda silmek — sayac 5 gunluk, tasima > silme.
- 12 bloklu tam guclu bench'i simdi kurmak — yanlis ekseni yuksek gucle olcmek pahali.
- Profilleri gercek paralellige baglamak — olculmemis iddia uzerine ikinci olculmemis iddia.

## E6. Duzeltilen yanlis hukum

Baskan `denetim-kaydi.js` ve `kapsayici.js` icin "olu kod" dedi: `hooks.json`'da
bagli degiller, dogru — ama `contract.js` ve `relay-watch.js` onlari modul olarak
`require` ediyor. Olu degiller. Hukum T0 tarafindan reddedildi.
