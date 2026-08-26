# Spike — headless'ta orkestrasyon ve oturum zinciri

Sözleşme: O3.

İki koşu var, ikisi de temiz Max 20x kimliğiyle (ondan önceki iki deneme bayat pro-tier
token yüzünden geçersizdi):

- **Tur 1** — `node scripts/bench/spike2.js`, 26.08.2026 17:31, D1-D4.
  Ham kanıt: `<tmp>/tbench/ork20260826173128/ham.json`.
- **Tur 2** — `node scripts/bench/spike2.js D5 D6`, 26.08.2026 17:50, D5 ve D6.
  Ham kanıt: `<tmp>/tbench/ork20260826175026/ham.json`.

Tur 2, tur 1'in denetiminde çıkan iki ölçüm hatasını kapatmak için koştu: kanca sayımı
(D5) ve emredilmeden alt ajan açma (D6). Bütün koşular çıkış kodu 0, hiçbirinde kota izi
yok.

## Sorular ve cevaplar

| # | Soru | Cevap | Kanıt |
|---|---|---|---|
| 1 | Task/Agent headless `claude -p` içinde açılabiliyor mu? | **EVET** | D1: emredildiğinde 2 `Agent` `tool_use`, iki alt ajan paralel koştu, `not-a.md`/`not-b.md` içerikleriyle doğrulandı (tur 1 `ham.json:87-95`). 25 sn, 4 tur, $0,74 |
| 1b | Emredilmeden **kendiliğinden** açıyor mu? | **HAYIR** (2/2 koşu) | D6: iş bölümüne elverişli üç bağımsız parça, Task'tan hiç söz edilmedi. İki koşuda da `ajanCagrilari: []`, iş `Bash` ile tek başına yapıldı |
| 2 | İzin kipi **alt ajan açmayı** etkiliyor mu? | **HAYIR** | Hem `bypassPermissions` hem `acceptEdits` altında 2 `Agent` açıldı. Kip alt ajan açmayı değil, alt ajanın **işini bitirmesini** etkiliyor — bkz. 2b |
| 2b | `acceptEdits` ile aynı iş yürüyor mu? | **HAYIR** | Alt ajan transkriptlerinde `is_error` `tool_result`: "…contains a suspicious Windows path pattern that requires manual approval", ardından "Permission to use Write has been denied". Dosya oluşmadı |
| 3 | `--resume` zinciri bağlamı taşıyor mu? | **EVET** | D3+D4'te `ZUMRUTKAYA`, D5a+D5b'de `DEMIRKAPI` ikinci çağrıda doğru döndü. Aynı `session_id`, aynı `.jsonl`, çatallanma yok |
| 4 | Zincirlenen turda kanca ve skill listesi yeniden yükleniyor mu? | **KISMEN** | D5: `UserPromptSubmit` her turda koşuyor (sayaç ×2, tur 1 ve tur 2'de birer kez). `SessionStart` yalnız oturum açılışında; zincirlenen turda hiç yok. `skill_listing` / `agent_listing_delta` yalnız tur 1'de |
| 5 | Alt ajan maliyeti ana koşunun `total_cost_usd` değerine giriyor mu? | **EVET, ama dolaylı** | D1 (2 alt ajan) 4 turda $0,7363; iki alt ajanın işi bu tutarın içinde. Ayrı kalem dökümü yok. Karşılaştırma: alt ajansız D6 koşuları $0,278 ve $0,268 |

## D5 — kanca sayımı (soru 4'ün yeniden ölçümü)

Tur 1'in aracı kancaları bir `Set`'e yazıyordu; tekrar sayısı ve hangi turda koştuğu
siliniyordu, üstelik D3 ile D4 aynı `.jsonl`'i okuduğu için iki turun kanıtı birbirine
karışıyordu. Araç sayaç + tur damgasına geçirildi (`kancaSayaci`, `kancaOlaylari`,
`turDokumu`). Tur damgası, transkriptteki kullanıcı istemleri sayılarak veriliyor:
`istem 0` = oturum açılışı (ilk istemden önce), `istem 1` = birinci tur, `istem 2` =
`--resume` ile açılan ikinci tur.

D5b'nin (`--resume`) tur dökümü:

```
oturum acilisi (istem oncesi) · kancalar: SessionStart×2
tur 1 · 2026-08-26T17:50:28.968Z · UserPromptSubmit×1
        ekler: deferred_tools_delta, agent_listing_delta, skill_listing,
               auto_mode, total_tokens_reminder, hook_additional_context
tur 2 · 2026-08-26T17:50:38.042Z · UserPromptSubmit×1
        ekler: total_tokens_reminder, hook_additional_context
```

Cevap: `SessionStart` zincirlenen turda **koşmuyor**, skill ve ajan listesi **yeniden
enjekte edilmiyor**; `UserPromptSubmit` her turda koşuyor. Tur 1'in tablosundaki
"KISMEN" hükmü doğruydu, ama o zamanki araç bunu gösteremiyordu — şimdi gösteriyor.

Aynı ayrıştırıcı tur 1'in `.jsonl`'ine çevrimdışı uygulandı
(`node scripts/bench/spike2.js --coz <jsonl>`) ve aynı tabloyu verdi: tur 1'in ham verisi
de bu cevabı destekliyor.

## D6 — emredilmeden alt ajan açılıyor mu

Görev, alt ajanı emretmiyor ve Task'tan hiç söz etmiyor: birbirinden bağımsız üç modül
(`mod-a.js`, `mod-b.js`, `mod-c.js`), her biri için ayrı bir inceleme notu, "işi nasıl
örgütleyeceğin sana kalmış". Aynı görev iki kez koştu.

| Koşu | Task/Agent | Kullanılan araçlar | Süre | Sonuç |
|---|---|---|---|---|
| D6-1 | 0 | Bash ×3 | 51 sn | üç not da yazıldı |
| D6-2 | 0 | Bash ×2 | 53 sn | üç not da yazıldı |

Model her iki koşuda da işi kendisi yaptı. D6-1'de gerekçesini kendisi yazdı:
*"Toplam 29 satır — ajan açmaya değmez, kendim yaptım."*

Dikkat çekici olan: eklentinin kendi kancası bu koşuya
`Teknesyum ▸ Measure ▸ Three independent files — three agents in parallel` satırını
enjekte etti, yani model dürtüldü — yine de açmadı. Yani sonuç "model fark etmedi"
değil, "model açmaya değmez diye karar verdi".

**Sınır:** görev küçüktü (29 satır, ~50 sn). Bu ölçüm "headless'ta model asla
kendiliğinden ajan açmaz" demiyor; "bu büyüklükteki bir işte iki koşuda da açmadı ve
gerekçesi maliyet" diyor. Büyük bir iş için ayrı ölçüm gerekir.

## Yan bulgu — "setup incomplete"

Her headless koşunun ilk turunda `Teknesyum ▸ setup incomplete · run /setup…` satırı
çıkıyor (D5a'da `statusline file is missing` varyantı). İzole konfigürasyonda statusline
kurulmadığı için basılıyor (`relay-watch.js` `kurulumEksik()`). Relay'i kapatmıyor ama
ölçümde gürültü, kullanıcı deneyiminde yanlış alarm. O7 (relay tetikleyicisi) kapsamında
ele alınmalı.

## Dalga 3 için hüküm

1. **Headless kalır — ama alt ajan kendiliğinden gelmez.** Orkestrasyon `claude -p`
   altında fiilen çalışıyor (D1), yapısal kısıt yok. 12 bench koşusunda alt ajan
   açılmamasının nedeni **ölçülmedi**; ölçülen şu: iş bölümüne elverişli ama küçük bir
   görevde model, dürtülse bile maliyet gerekçesiyle ajan açmıyor (D6, 2/2). Dolayısıyla
   Dalga 3'ün görev sınıfları iş bölümünü ya **emretmeli** ya da tek ajanın makul sürede
   bitiremeyeceği kadar büyük olmalı; "davet etmek" yetmiyor.
2. **İzin kipi `bypassPermissions` olmak zorunda.** `acceptEdits` bu makinede
   kullanılamaz: temp yolundaki `ADMINI~1` 8.3 segmenti izin sistemini tetikliyor ve
   headless koşuda onaylayacak kimse olmadığı için iş sessizce ölüyor. Alternatif: koşu
   kökünü 8.3 içermeyen uzun bir yola taşımak (ör. `C:\tbench\...`). Bu, ölçümü
   çarpıtabilecek bir kusurdur ve O1'in kimlik/geçerlilik kapısına benzer bir kapı
   gerektirir — izin reddi yüzünden boş dönen koşu geçersiz sayılmalı.
3. **Kesinti senaryosu ölçülebilir.** `--resume` bağlamı taşıyor, dolayısıyla "oturumu
   öldür, devam ettir, kurtarılan iş yüzdesini ölç" tasarımı uygulanabilir.
4. **`SessionStart` bağımlı metrik kullanılamaz.** Zincirlenen turlarda bu kanca
   koşmuyor, skill/ajan listesi yeniden enjekte edilmiyor. Her tur ayrı süreç isteyen bir
   metrik tasarlanacaksa bu hesaba katılmalı. `UserPromptSubmit`'e bağlı metrikler
   güvenli.
5. **Orkestrasyonun maliyeti ancak koşullar arası fark olarak ölçülebilir.** Alt ajan
   payı `total_cost_usd` içinde eriyor, ayrı kalemi yok; "ajanlı" ve "ajansız" iki koşu
   karşılaştırılarak çıkarılmalı.
