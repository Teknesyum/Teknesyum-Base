# Hata: advisor ve planner ajanları gövdesiz dönüyor

**Durum:** kapalı (24.08.2026), arşivlendi.
**Belirti:** Alt ajan 150 bin token harcayıp 27 adım atıyor, ana oturuma 147 karakterlik
"Rapor teslim edildi" cümlesi dönüyor. Dört vakanın üçü böyle, biri sağlam — aralıklı.
**Kaynak:** `teknesyum/hooks/relay-watch.js` — `duyur()`
**Görüldüğü proje:** Teknesyum Base

---

## 1. Ne oldu

`SubagentStop` kancası duyurusunu `additionalContext` ile veriyordu. O olay, `Stop` gibi,
ajan cevabını yazdıktan sonra çalışır; bağlama metin girince ajanın turu yeniden açılır,
ajan yeni bir kapanış mesajı yazar ve ana oturuma yalnız son asistan mesajı gittiği için
gövde düşer. Yeni mesaj yine `SubagentStop` doğurduğu için stub 6–8 kez tekrarlanır.

Çalışan vakada da döngü aynen oldu; fark, ajanın kapanış mesajında gövdeyi yeniden
yazmayı seçmesiydi. Aralıklılığın sebebi bu.

Düzeltme: `Stop`, `StopFailure` ve `SubagentStop` artık kapanış olayı sayılıyor ve
duyuru bağlama değil `systemMessage`'a yazılıyor.

Tam teşhis, kanıt transkriptleri ve ölçüm: `docs/HATA-ajan-gövdesiz-dönüyor.md`.

## 2. Ölçü

Gerçek bir advisor çağrısında üç başlıklı gövde ana oturuma ulaşıyor.

**Karşılandı.** `aa0f411d7450c29cc` çağrısı: transkript 2 satır, kapanış stub'ı yok,
dönen mesaj 1171 karakter ve üç başlık tam. Öncesinde 12–28 satır, 6–8 stub, 147–158
karakter. Regresyon testi `test/run.js` içinde; eski kodda düşüyor, yenide geçiyor.
