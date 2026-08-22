# Rota: kütüphane ve ekosistem taraması

**Durum:** kapandı
**Kaldığım yer:** tarama kapandı — durma ölçütü D15'te devreye girdi
**Amaç:** Teknesyum Base'i güçlendirecek kütüphane, standart ve eklentileri tarayıp
alınabilir olanları standarda katmak, kurulması gerekenleri kullanıcıya bildirmek.

**Çıktı dosyası:** `docs/taramalar/tarama-bulgulari.md`

| # | Durak | Durum | Bulgu |
|---|---|---|---|
| D1 | Animasyon ve etkileşim kütüphaneleri | bitti | tarama-bulgulari.md §D1 |
| D2 | Bileşen kaynakları ve lisansları | bitti | tarama-bulgulari.md §D2 |
| D3 | Erişilebilirlik ve hareket standartları | bitti | tarama-bulgulari.md §D3 |
| D4 | Masaüstü: WPF / Electron tema ve iskelet | bitti | tarama-bulgulari.md §D4 |
| D5 | Ajan sistemi: SDK, MCP, hafıza, orkestrasyon | bitti | tarama-bulgulari.md §D5 |
| D6 | Claude Code eklenti ekosistemi | bitti | tarama-bulgulari.md §D6 |
| D7 | Deterministik araçlar (lint, format, ast) | bitti | tarama-bulgulari.md §D7 |
| D8 | i18n ve yerelleştirme altyapısı | bitti | tarama-bulgulari.md §D8 |
| D9 | Test ve görsel doğrulama | bitti | tarama-bulgulari.md §D9 |
| D10 | Paketleme ve dağıtım | bitti | tarama-bulgulari.md §D10 |
| D11 | Bağlantılı not / bilgi tabanı (Obsidian sorusu) | bitti | tarama-bulgulari.md §D11 |
| D12 | Statik analiz: ölü kod, bağımlılık, güvenlik | bitti | tarama-bulgulari.md §D12 |
| D13 | Claude Code eklenti ekosistemi — ikinci dalga | bitti | tarama-bulgulari.md §D13 |
| D14 | Sürüm, değişiklik günlüğü, yayın otomasyonu | bitti | tarama-bulgulari.md §D14 |
| D15 | Bağlam mühendisliği ve token ölçümü | bitti | tarama-bulgulari.md §D15 |

## Kurallar

Seri tarama. Alt ajan açılmaz.

Her durak bitince bu dosya güncellenir ve commit atılır.

Bulgular `docs/taramalar/tarama-bulgulari.md` içine yazılır; burada yalnızca durum tutulur.

Her bulgu için üç alan zorunlu: **lisans**, **alınacak kural**, **alınmayacak kısım**.

**Durma ölçütü.** Tarama, durak sayısına göre değil **getiriye** göre biter. Art arda iki
durak standarda tek satır eklemediyse o dal kapanır. Yeni durak yalnızca somut bir eksik
görüldüğünde açılır — "daha bakalım" diye açılmaz.
