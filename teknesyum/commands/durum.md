---
description: Relay ilerleme durumunu ve ajan progress barlarını gösterir
allowed-tools: Read, Glob, Bash
---

`.claude/relay/` oku (yoksa: "relay kurulu değil, /iskele kullan" de ve dur).

Sadece şunları oku: `canli/*.json`, `contracts/*.md` frontmatter'ları, `contracts/done/`
dosya listesi, `LOG.md` son 10 satır. Sözleşme gövdelerini açma — `active` olanın
Kayıt noktası hariç.

Bağımlılıkları çöz: `done/`'a bakarak hangi `open` sözleşmelerin başlayabileceğini
hesapla, HAZIR işaretle.

Ajan barı: `steps / tur_tavani` oranı. Tavanlar — usta 60, usta-arayuz 60, denetci 30,
kayitci 40. `stop_reason` `null` ise çalışıyor, `end_turn` ise bitti, başka değer ise ÖLÜ.

Şu formatta bas, başka hiçbir şey yazma:

```
PROJE  ████████████░░░░░░░░  7/12

  ✓ T1  Solver çekirdeği          usta/opus
  ✓ T2  Vektör matrisi            usta/sonnet
  ▸ T3  Makro motoru              usta/opus       tur 2
  ● T4  Ayarlar paneli            usta-arayuz     HAZIR (T3 bitti)
  ⏸ T5  Paketleme                 kayitci         bekliyor: T4
  ⨯ T6  İkon üretimi              kayitci         engelli: kaynak görsel yok

AJANLAR
  ⚙ T3  usta          ███████░░░░░  34/60   Edit macro.cjs            2 dk önce
  ⨯ T4  usta-arayuz   ██░░░░░░░░░░   9/60   ÖLDÜ: max_tokens          8 dk önce
        son: "Tema tokenları yazıldı, panel entegrasyonu kaldı"
        dokundu: src/theme/tokens.ts, src/App.tsx

SON     T3 kaldi · tur 1, kabul 2
KALAN   5 sözleşme · 2 paralel yürüyebilir
RİSK    T6 engelli — kaynak görsel yok, senden gelmesi lazım
```

`KALAN` her zaman basılır. `RİSK` sadece gerçekten engel, ölü ajan, tavana yaklaşan
düzeltme turu veya sahipsiz dosya varsa basılır — uydurma, yoksa satırı yazma.

`ayrinti` argümanı verildiyse `active` ve `blocked` sözleşmelerin **Kabul kriteri**
bölümlerini de aç, her biri için karşılanan/kalan maddeleri işaretle. Argümansız çağrıda
gövdeleri açma.

Kullanıcının müdahale edebileceği bir şey varsa (engeli kaldırmak, kapsam daraltmak,
sırayı değiştirmek) en alta tek satır ekle. Yoksa ekleme.

Argüman: $ARGUMENTS

Sözleşme simgeleri: ✓ done · ▸ active · ● hazır · ⏸ bekliyor · ⨯ blocked
Ajan simgeleri: ⚙ çalışıyor · ✓ bitti · ⨯ ölü

Ölü ajan varsa listenin altına tek satır ekle: `→ /devam ile kurtarılabilir`.
Ajan yoksa AJANLAR bölümünü hiç basma.
