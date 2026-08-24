# Konsey — çapraz mekaniğin ilk koşusu ve kendi değerlendirmesi

24.08.2026 · iki üye (fable + opus) · iki tur · sentez T0

Kullanıcı yeni bir konsey mekaniği istedi: **her üye ötekinin görüşünü görür, revizyon
yazar ya da "gerek yok" der; tekrarlanır, bir tur sınırı olur, nihai olarak fable esas
alınır.** Mekanik ilk kez kendi üzerinde koşuldu — konu hem cevap şemasıydı hem
mekaniğin kendisi.

## Sonuç önden

**Mekanik işe yaradı ve ikisi de kendi turu 1 pozisyonunu geri çekti.** Ama ikisi de
mekaniğin **varsayılan olmasını reddetti.**

## Turu 2'de ne değişti

| Üye | Turu 1'de dediği | Turu 2'de |
|---|---|---|
| fable | Bölüm basılmıyor çünkü kural yasaklıyor | **Yanlıştı.** Koddan doğruladı: kapı zaten ateşlenmiyor, sorun pozitif kuralın yokluğu |
| opus | Kuralı profile taşı, `RULES.md`'ye dokunma | **Geri çekti.** Fable'ın "sessiz çatallanma" itirazını kabul etti |
| opus | Şema eşiği: konu ≥2 ya da gövde >15 satır | **Bıraktı.** Fable'ın üç bloğunu aldı |

Opus'un şemayı bırakma gerekçesi konseyin en iyi cümlesi:

> *"Bu eşiği kanca doğrulayamaz, yalnız model kendi kendine yargılar — ve zaten
> unutulduğu için bu iş açıldı. Fable'ın üç bloğu regex'le sınanabilir (`^## Yapılan`),
> benimki sınanamaz. **Sınanabilirlik ölçülebilirlikten önce gelir.**"*

## Ortaklaşılan kararlar

**Kuralın yeri.** `RULES.md` yalnız değişmezi taşır (tek satır, yerinde değiştirilir,
net satır artışı sıfır). Şemanın tam metni `UserPromptSubmit` enjeksiyonunda durur.
İki dosya **aynı iddiayı iki kez söylemez** — örtüşen iddia yoksa çelişecek iddia da yok.

**Şema — üç blok, koşullu.** `Yapılan` · `Dikkat` (yalnız varsa) · `Senden istediklerim`.
`▸` satırları şemanın parçası değil, ayrı makine katmanı, üstünde durur.

Koşul **uzunluk değil tur tipi**: ara turda hiçbir blok başlığı açılmaz.

**Kapanış turu tanımı — mekanik.** Modelin yargısına bırakılmaz. İşletimsel testi
kancada hazır: `acikIs(root)` artı `BITIS`/`DURAKLAMA` kalıplarından biri.

**Başlık kapanış turunda her zaman açılır**, boşsa tek satır. Ara turda açılmaz.

**`Stop` kancasını genişletme dalgası düştü** — fable kendi planından çıkardı, çünkü
teşhis değişti.

## Ayrışan tek madde — T0 kararı

**Kapı `decision: block` kalsın mı.** Fable değinmedi ("kapı dokunulmaz" dedi). Opus
savundu ve gerekçesi ikna edici:

> *"Kural enjeksiyona taşındıktan sonra kapının işi önlemek değil **ölçmek**: haftada
> üçten fazla ateşliyorsa yukarıdaki metin yanlıştır."*

İkisi çelişmiyor — fable kapının **genişletilmemesini** istiyor, opus **sayılmasını**.
İkisi birlikte alınır: kapı olduğu gibi kalır, ateşleme sayısı `live/` altına düşer,
haftalık bakılır.

Fable'ın şerhi de korunur: profil tek başına daha önce battı (`GELISIM.md`, dört tur
unutulan kural). Ölçüm dalgası bu yüzden zorunlu — profil işliyorsa kapı sıfıra yakın
ateşler; ateşlemeye devam ediyorsa **kapı değil profil metni** düzeltilir.

## Mekaniğin kendi değerlendirmesi

**Sınır: 2 tur.** İkisi de aynı sayıyı verdi, gerekçeleri farklı ve ikisi de değerli.

fable:

> *"Bu turun değeri olgu düzeltmesinden geldi; sonraki turlar olguyu değil cümleyi
> cilalar, tur pahalı."*

opus:

> *"Turu 1 ayrışma üretir, turu 2 çelişkiyi ayıklar, turu 3'ten sonra **son sözün
> fable'da olduğunu bilen taraf ortalamaya kayar** — konseyin değeri tam orada biter."*

İkinci gerekçe daha derin: nihai söz hakkının kendisi, uzun turlarda uyum baskısı
yaratıyor.

**Üçüncü tur istisnası.** Yalnız turu 2'de turu 1'de olmayan **yeni** bir anlaşmazlık
doğduysa, ve yalnız o madde için.

**Varsayılan olmayacak — ikisi de reddetti.**

fable'ın koşulu: çapraz tur açılır ancak (a) iki öneri aynı konuda **çelişen teşhis**
veriyorsa, ya da (b) bir üye **"emin değilim"** işareti bırakmışsa. Bu turda ikisi de
vardı.

> *"'Her zaman aç' kuralı, kapıya 'her kapanışta bas' demekle aynı hatadır — kuralı en
> pahalı yerden almak."*

opus bir adım daha ileri gitti ve **hedefli çapraz tur** önerdi:

> *"Çapraz tur bütün brifing için değil, T0'ın işaretlediği **çelişen maddeler** için
> açılmalı. Bu turda çelişen madde ikiydi; geri kalanı yeniden yazmak boş maliyetti.
> Hedefli çapraz tur aynı düzeltmeyi çeyrek fiyatına verir."*

**Alınan:** fable'ın iki koşulu **ve** opus'un hedeflemesi. Tur açılır ama tam brifing
tekrarlanmaz — yalnız çelişen maddeler çapraza girer.

## Ölçülmemiş

- Mekanik tek koşuda değerlendirildi. Bir koşu eğilim gösterir, kanıt değil.
- "Hedefli çapraz tur çeyrek fiyat" opus'un tahmini, ölçülmedi.
- Üçüncü turda ortalamaya kayma gözlenmedi; opus'un öngörüsü, veri değil.
