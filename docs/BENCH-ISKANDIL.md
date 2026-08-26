# Bench iskandili — headless kosu ve izolasyon fizibilitesi

Uretim: `node scripts/bench/spike.js` · 2026-08-26T10:43:01.566Z
Kosu koku: `C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239`

**Sonuc: dordu de EVET.** B1/B2 planlandigi gibi kurulabilir; kosular tam otomatik surulur.

## Dort sorunun cevabi

| # | Soru | Cevap |
|---|---|---|
| 1 | Headless `claude -p` kancalari ve skilleri calistiriyor mu? | **EVET** |
| 2 | Transkript izole konfig kokunun `projects/` altina mi dusuyor? | **EVET** |
| 3 | Native kosuda eklenti gercekten yok mu? | **EVET** |
| 4 | Profil degisimi ilk isteme yetisiyor mu? | **EVET** |

## Kosu basina kanit

### premium

- Izole konfig koku: `C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\premium\konfig`
- Fixture: `C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\premium\fixture`
- Transkript: `C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\premium\konfig\projects\C--Users-ADMINI-1-AppData-Local-Temp-tbench-20260826104239-premium-fixture\76bb31d8-cd90-41ef-a7da-57d4206de2a3.jsonl`
- Sure: 21 sn · cikis kodu 0 · asistan turu 5 · gorev tamamlandi

| # | Cevap | Kanit |
|---|---|---|
| 1 | EVET | kanca olaylari: SessionStart, UserPromptSubmit · skill listesi: - teknesyum:autocompact: Otomatik sıkıştırma penceresini profilden türetir ya da elle bir değere sabitler |
| 2 | EVET | izole kok altinda: C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\premium\konfig\projects\C--Users-ADMINI-1-AppData-Local-Temp-tbench-20260826104239-premium-fixture\76bb31d8-cd90-41ef-a7da-57d4206de2a3.jsonl |
| 3 | YOK | bu soru yalniz native kosuya sorulur |
| 4 | EVET | ilk istemin baglaminda: "Premium mode is on (Max 20x). Do not use sonnet or haiku; every agent runs opus. Do not queue independent contracts, run them at once — up t" |

Kurulum gunlugu:

```
marketplace add → kod 0 · Adding marketplace…√ Successfully added marketplace: teknesyum (declared in user settings)
plugin install → kod 0 · Installing plugin "teknesyum@teknesyum"...√ Successfully installed plugin: teknesyum@teknesyum (scope: user)
premium.js premium → kod 0 · profil: premium
claude -p → kod 0 · 21 sn
```

### normal

- Izole konfig koku: `C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\normal\konfig`
- Fixture: `C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\normal\fixture`
- Transkript: `C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\normal\konfig\projects\C--Users-ADMINI-1-AppData-Local-Temp-tbench-20260826104239-normal-fixture\744ae5e9-b552-499d-b1ae-a42871b9b3a5.jsonl`
- Sure: 15 sn · cikis kodu 0 · asistan turu 4 · gorev tamamlandi

| # | Cevap | Kanit |
|---|---|---|
| 1 | EVET | kanca olaylari: SessionStart, UserPromptSubmit · skill listesi: - teknesyum:autocompact: Otomatik sıkıştırma penceresini profilden türetir ya da elle bir değere sabitler |
| 2 | EVET | izole kok altinda: C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\normal\konfig\projects\C--Users-ADMINI-1-AppData-Local-Temp-tbench-20260826104239-normal-fixture\744ae5e9-b552-499d-b1ae-a42871b9b3a5.jsonl |
| 3 | YOK | bu soru yalniz native kosuya sorulur |
| 4 | EVET | normal taban profil — ilk istemin baglaminda premium/eco notu ve sapan dugme satiri yok |

Kurulum gunlugu:

```
marketplace add → kod 0 · Adding marketplace…√ Successfully added marketplace: teknesyum (declared in user settings)
plugin install → kod 0 · Installing plugin "teknesyum@teknesyum"...√ Successfully installed plugin: teknesyum@teknesyum (scope: user)
premium.js normal → kod 0 · profil: normal
claude -p → kod 0 · 15 sn
```

### eco

- Izole konfig koku: `C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\eco\konfig`
- Fixture: `C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\eco\fixture`
- Transkript: `C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\eco\konfig\projects\C--Users-ADMINI-1-AppData-Local-Temp-tbench-20260826104239-eco-fixture\dda31667-7ff2-479c-9fc3-30b36fbd1725.jsonl`
- Sure: 20 sn · cikis kodu 0 · asistan turu 4 · gorev tamamlandi

| # | Cevap | Kanit |
|---|---|---|
| 1 | EVET | kanca olaylari: SessionStart, UserPromptSubmit · skill listesi: - teknesyum:autocompact: Otomatik sıkıştırma penceresini profilden türetir ya da elle bir değere sabitler |
| 2 | EVET | izole kok altinda: C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\eco\konfig\projects\C--Users-ADMINI-1-AppData-Local-Temp-tbench-20260826104239-eco-fixture\dda31667-7ff2-479c-9fc3-30b36fbd1725.jsonl |
| 3 | YOK | bu soru yalniz native kosuya sorulur |
| 4 | EVET | ilk istemin baglaminda: "Eco mode is on. Saving tokens is the top priority; speed and polish can go, correctness cannot. Search with `Grep`/`Glob` first, read a whol" |

Kurulum gunlugu:

```
marketplace add → kod 0 · Adding marketplace…√ Successfully added marketplace: teknesyum (declared in user settings)
plugin install → kod 0 · Installing plugin "teknesyum@teknesyum"...√ Successfully installed plugin: teknesyum@teknesyum (scope: user)
premium.js eco → kod 0 · profil: eco
claude -p → kod 0 · 20 sn
```

### native

- Izole konfig koku: `C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\native\konfig`
- Fixture: `C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\native\fixture`
- Transkript: `C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\native\konfig\projects\C--Users-ADMINI-1-AppData-Local-Temp-tbench-20260826104239-native-fixture\59a91d44-f90f-428f-a152-846d48846041.jsonl`
- Sure: 18 sn · cikis kodu 0 · asistan turu 4 · gorev tamamlandi

| # | Cevap | Kanit |
|---|---|---|
| 1 | YOK | native kosuda eklenti kurulmadi — kanca/skill sorusu bu kosuya uygulanmaz |
| 2 | EVET | izole kok altinda: C:\Users\ADMINI~1\AppData\Local\Temp\tbench\20260826104239\native\konfig\projects\C--Users-ADMINI-1-AppData-Local-Temp-tbench-20260826104239-native-fixture\59a91d44-f90f-428f-a152-846d48846041.jsonl |
| 3 | EVET | transkriptte /teknesyum/i eslesmesi 0 |
| 4 | YOK | native kosuda profil yazilmadi |

Kurulum gunlugu:

```
eklenti kurulmadi, profil yazilmadi
claude -p → kod 0 · 18 sn
```

## Izole kokte eklenti kurulumu — nasil yapildi

Kosu basina bos bir dizin acilir ve `CLAUDE_CONFIG_DIR` ona set edilir. Eklenti
`~/.claude/plugins` onbelleginden kopyalanmaz; marketplace kaydi izole koke
yeniden yapilir — depo kokunun kendisi `directory` kaynakli marketplace olarak
eklenir, sonra eklenti oradan kurulur:

```
CLAUDE_CONFIG_DIR=<izole>  claude plugin marketplace add <depo koku>
CLAUDE_CONFIG_DIR=<izole>  claude plugin install teknesyum@teknesyum
```

Ikisi de yalnizca izole koke yazar. Kurulumdan sonra izole `settings.json` icinde
`extraKnownMarketplaces` ve `enabledPlugins: { "teknesyum@teknesyum": true }` olusur;
ana `~/.claude/settings.json` degismez. Profil sonra ayni ortam degiskeniyle
`node teknesyum/scripts/premium.js <durum>` cagrisiyla yazilir ve izole koke duser
(`<izole>/teknesyum.json` + `<izole>/settings.json`).

Ana kokten yalniz **okunan** tek dosya `~/.claude/.credentials.json`: izole kokte
oturum kimligi yoktur ve `claude -p` "Not logged in" ile 1 doner. Dosya izole koke
kopyalanir; ana kok yazilmaz.

Native kosuda bu adimlarin hicbiri yapilmaz — bos konfig koku + kimlik dosyasi.

## Kimlik — paralel kosunun tek gercek engeli

OAuth erisim jetonu yenilendiginde yenileme jetonu da doner. Dort kosu ayni eski
dosyanin kopyasiyla baslayip ayni anda yenilemeye kalkarsa uc tanesi
`Failed to authenticate: OAuth session expired` alir ve modele hic ulasmaz —
kancalar yine calisir, transkript yine yazilir, yani kosu **sessizce bos doner**.
Ilk denemede dordu birden boyle bitti.

Duzenek: kalici bir kimlik koku (`<tmp>/tbench/kimlik`). Jeton orada, kosulardan
once ve sirayla tazelenir; dort kosu taze jetonun kopyasiyla baslar ve kosu
suresince yenileme gerekmez. Bu kosunun kimlik gunlugu:

```
kimlik kaynagi: C:\Users\ADMINI~1\AppData\Local\Temp\tbench\kimlik\.credentials.json
jeton gecerli: 470 dk kaldi
```

Kimlik koku bir kez ana kokten tohumlanir; sonra kendini tasir. Tazeleme de
basarisiz olursa spike 2 ile durur ve ana kokte yeniden giris ister.

## Kosu bayraklari — B1/B2 icin sabit

```
claude -p "<gorev>" --model opus --permission-mode bypassPermissions \
       --max-turns 12 --output-format json
```

- `bypassPermissions` sart. `acceptEdits` ile dort kosu da izin engeline takildi
  ve modele "Yapamadim — izin engeli" dedirtip bos dondu; headless kosuda soruyu
  soracak kimse yok.
- Alt surecin stdini kapali baglanmali (`stdio[0] = ignore`). Bos boruya
  baglanirsa `claude` 3 sn veri bekleyip uyari basiyor ve cikis kodu 1 oluyor.
- `--output-format json` ciktisindaki `session_id` transkript dosyasinin adidir;
  toplama bunun uzerinden yapilir, "en yeni dosya" tahminine gerek kalmaz.
- Gorevin gercekten yapildigi fixture uzerinden dogrulanir. Kanca izleri kimlik
  ve izin hatalarinda da transkripte dustugu icin tek basina yeterli kanit degil.

