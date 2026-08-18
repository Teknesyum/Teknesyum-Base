# Rota: kütüphane ve ekosistem taraması

**Kaldığım yer:** D4 (sürüyor)
**Amaç:** Teknesyum Base'i güçlendirecek kütüphane, standart ve eklentileri tarayıp
alınabilir olanları standarda katmak, kurulması gerekenleri kullanıcıya bildirmek.

**Çıktı dosyası:** `docs/tarama-bulgulari.md`

| # | Durak | Durum | Bulgu |
|---|---|---|---|
| D1 | Animasyon ve etkileşim kütüphaneleri | bitti | tarama-bulgulari.md §D1 |
| D2 | Bileşen kaynakları ve lisansları | bitti | tarama-bulgulari.md §D2 |
| D3 | Erişilebilirlik ve hareket standartları | bitti | tarama-bulgulari.md §D3 |
| D4 | Masaüstü: WPF / Electron tema ve iskelet | sürüyor | — |
| D5 | Ajan sistemi: SDK, MCP, hafıza, orkestrasyon | bekliyor | — |
| D6 | Claude Code eklenti ekosistemi | bekliyor | — |
| D7 | Deterministik araçlar (lint, format, ast) | bekliyor | — |
| D8 | i18n ve yerelleştirme altyapısı | bekliyor | — |
| D9 | Test ve görsel doğrulama | bekliyor | — |
| D10 | Paketleme ve dağıtım | bekliyor | — |

## Kurallar

Seri tarama. Alt ajan açılmaz.

Her durak bitince bu dosya güncellenir ve commit atılır.

Bulgular `docs/tarama-bulgulari.md` içine yazılır; burada yalnızca durum tutulur.

Her bulgu için üç alan zorunlu: **lisans**, **alınacak kural**, **alınmayacak kısım**.
