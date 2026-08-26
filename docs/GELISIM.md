# Gelişim planı — söz verilen iş neden kayboluyor

22.08.2026'da bir gün içinde dört kayıp yaşandı. Dördü de aynı sınıftan: **bir şey
kararlaştırıldı, hiçbir yere yazılmadı, bağlam uzayınca düştü.**

| Ne kayboldu | Nasıl ortaya çıktı |
|---|---|
| `/scan` komutu — "aşama 2'de yapacağım" denildi | Kullanıcı iki saat sonra "scan kodumuz nerede" diye sordu |
| `Senden istediklerim` başlığı — dört tur üst üste | Kullanıcı fark etti |
| Bir düzeltmenin ikinci yarısı — reddedilen kabuk çağrısında kaldı | İki tur sonra denetimde çıktı |
| Bir ajanın "şu satır da düzeltilmeli" notu | T0 bekletti, unutulma sınırındaydı |

Ortak kök: **söz T0'ın belleğinde duruyor, diskte değil.**

---

## Neden bugünkü mekanizmalar yakalamadı

**Relay sözleşmeleri** tam bunun için var — `contracts/T<n>.md`, `status: open`, ve
`SessionStart` kancası açık sayısını bildiriyor. Ama bu oturumda hiç kullanılmadı: on iki
ajan doğrudan brifingle dağıtıldı, sözleşme yazılmadı. Sebebi savunulabilir — sözleşme
yazmak ek tur ve ek token, plan zaten `DENETIM.md`'de yazılıydı. **Pahalı olduğu için
atlandı, atlandığı için takip kalmadı.**

Bu, "zorunlu kıl" çözümünün neden işlemeyeceğini de gösteriyor: zorunlu kılınca ya kalite
düşer ya kural delinir.

**`Stop` kancasında iki bekçi var** (uzun blok, `Senden istediklerim`) ve ikisi de
çalışıyor. Ama ikisi de *o turda yazılan metne* bakıyor; "geçen tur söz verilmişti"
bilgisi hiçbir yerde yok.

---

## Alınan karar

Sözleşmeden hafif bir **açık iş kaydı**: `.claude/relay/live/_acik.md`.

```
- <ne> | <kim istedi / nerede söylendi> | <durum>
```

Yazması bir `Edit`. Okuması `SessionStart`'ta zaten basılan durum satırına bir kalem.
Kapanması bir satır silme. Sözleşmenin maliyetini yaratan şablon ve tur yükü burada yok.

`live/` altında duruyor, yani `.gitignore` kapsamında — proje durumu, depo içeriği değil.

### Kanca tarafı, iki adım

**Adım 1 — `SessionStart` hatırlatması.** Dosya boş değilse açılış satırına eklenir:
`<n> açık iş`. Maliyeti sabit ve küçük, enjeksiyon değil bildirim.

**Adım 2 — `Stop` uyarısı.** Sinyal **regex değil kesişim**:

> Erteleme kalıbı geçti (`sonra`, `aşama 2`, `sıraya aldım`, `bir sonraki turda`)
> **ve** `_acik.md` bu turda değişmedi (mtime kontrolü).

Regex tek başına kirli bir sinyal — "daha sonra bakılabilir" gibi öneri cümleleri de
yakalar. Kesişim yanlış pozitifi büyük ölçüde keser.

**İlk sürüm `block` değil uyarı olacak.** Ölçüldükten sonra sertleşir. Gerekçe: `Stop`
blokları yanlış pozitifte bir tur yakıyor; uyarı hiçbir şey yakmıyor.

---

## Bu planın kendi sınavı

Plan işe yaradıysa, bir sonraki "sonra yapacağım" cümlesinden sonra `_acik.md` değişmiş
olacak. Yaramadıysa yine kullanıcı soracak.

Ölçüt bu kadar basit ve kasıtlı: bu dosyanın kendisi de kaybolabilir, o yüzden ilk satırı
`_acik.md`'ye yazıldı.
