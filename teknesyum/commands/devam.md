---
description: Kesilen relay oturumunu kaldığı yerden sürdürür
---

`relay` skill'ini yükle. Bağlamı **sadece** şu dört kaynaktan kur, başka dosya okuma:

1. `.claude/relay/canli/*.json` — **önce burası.** Hook yazdı, ajanın iş birliğine bağlı değil.
2. `.claude/relay/LOG.md` — son 15 satır
3. `.claude/relay/contracts/*.md` — açık sözleşmelerin frontmatter'ı (`done/` hariç)
4. `active` olanın **Kayıt noktası** bölümü

Sonra tek paragrafta durumu söyle ve **doğrudan devam et**:

- **`stop_reason: null`** → ajan hâlâ ayakta olabilir. `SendMessage` ile `agent_id`'ye yaz.
  Yanıt gelirse iş bağlamıyla sürer, hiçbir şeyi yeniden anlatma.
- **`stop_reason` `end_turn` dışında** → ajan ölü. Önce `SendMessage` ile dirilt.
  Yanıt yoksa taze ajan ata ve devir teslim metnini `canli/` dosyasından kur:
  `last_action`, `files`, `son_soz`, `steps` + varsa sözleşmenin Kayıt noktası.
  `tur:` artırma. `LOG.md`'ye `olu` satırı yaz.
- **Ajan yok, bağımlılığı karşılanmış `open` sözleşme var** → dağıt.
- **`blocked` var** → engeli tek cümlede söyle, çözümü öner.

Konuşma geçmişini arama, planı baştan kurma, ne yapılacağını sorma.
