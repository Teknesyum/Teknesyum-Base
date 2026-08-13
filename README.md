<div align="center">

# Claude Code Adamantium Base

**Talebini söyle. Gerisini sistem kursun.**

Claude Code için tek paket: çok ajanlı iş rölesi + neon arayüz standardı.
İş büyüklüğünü, kaç parçaya bölüneceğini, hangi ajanın hangi modelle çalışacağını,
denetimin nasıl yapılacağını sen değil sistem belirler.

[![Sponsor](https://img.shields.io/badge/Sponsor-Teknesyum-b026ff?style=flat-square&logo=githubsponsors)](https://github.com/sponsors/Teknesyum)
[![License](https://img.shields.io/badge/License-MIT-00f3ff?style=flat-square)](LICENSE)

</div>

---

## Ne işe yarar

Claude Code varsayılan halinde tek bir asistandır: sen ne yapacağını söylersin, o yapar.
Büyük iş verdiğinde bağlamı dolar, limite takılır, kaldığı yeri unutur; kendi işini
kendisi onaylar; her projede farklı bir arayüz üretir.

Bu paket dört şeyi değiştirir:

| | Öncesi | Sonrası |
|---|---|---|
| **İş bölümü** | Tek asistan her şeyi yapar, bağlam şişer | Sözleşmelere bölünür, ajanlara dağıtılır, ara çıktı ana bağlamı kirletmez |
| **Doğrulama** | Kodu yazan "bitti" der | Ayrı bir denetçi doğrular — **yazma aracı yoktur**, onaylamaktan başka bir şey yapamaz |
| **Kesinti** | Limite takılınca baştan başlarsın | Her ajanın izi diske yazılır, kaldığı yerden sürer |
| **Arayüz** | Her projede farklı görünüm | Aynı palet, aynı tipografi, aynı imza — her projede |

---

## Kurulum

### Windows — tek satır

```powershell
irm https://raw.githubusercontent.com/Teknesyum/claude-code-adamantium-base/main/install.ps1 | iex
```

### macOS / Linux — tek satır

```bash
curl -fsSL https://raw.githubusercontent.com/Teknesyum/claude-code-adamantium-base/main/install.sh | bash
```

### Claude Code içinden — üç satır

```
/plugin marketplace add Teknesyum/claude-code-adamantium-base
```
```
/plugin install teknesyum@teknesyum
```
```
/teknesyum:kurulum
```

Kurulumdan sonra **Claude Code'u yeniden başlat.**

**Gereken:** Claude Code. **Opsiyonel:** Node.js (statusline için), `typescript-language-server`
(TS tip zekâsı), `graphify` (büyük kod tabanı indeksleme). Eksik olanlar kurulumda bildirilir,
zorunlu değildir.

---

## Nasıl çalışır

Bir şey istediğinde `relay` devreye girer ve **sessizce sınıflandırır**:

| İşin boyu | Ne olur |
|---|---|
| Soru, açıklama | Cevaplanır. Hiçbir şey kurulmaz. |
| 1-2 dosya | Doğrudan yapılır. Ajan açılmaz. |
| 3-4 dosya, tek yetenek | Tek sözleşme, tek ajan. |
| ≥3 bağımsız parça veya ≥5 dosya | Tam röle: plan, sözleşmeler, paralel ajanlar, denetim |

Sana "bu büyük bir iş mi" diye sorulmaz. Hazırlık da sorulmadan yapılır:

- **Git yoksa** dosya değiştirmeden önce depo kurulur ve güvenlik commit'i atılır
- **Kod tabanı yabancı ve büyükse** önce indekslenir, sonra dosya okumak yerine grafik sorgulanır
- **Arayüz işi varsa** tema standardı yüklü bir ajana gider
- **Yönlendirici `CLAUDE.md` eksikse** iş bitiminde yazdırılır

### Sözleşme düzeni

Büyük işlerde her görev bir dosyaya yazılır:

```
.claude/relay/
├── PLAN.md              görev grafiği, bağımlılıklar
├── LOG.md               tek satırlık olay kaydı
├── canli/               ajan izleri — hook yazar, model değil
└── contracts/
    ├── T3.md            açık sözleşmeler
    └── done/            tamamlananlar (yazmaya kapalı)
```

Her sözleşme neyi sahiplendiğini (`owns`) beyan eder. **İki sözleşme aynı dosyayı
sahiplenemez** — paralel çalışmanın tek güvencesi budur. Ajan bitince sözleşmesini
`done/` klasörüne taşır; oraya yazmak bir hook tarafından engellenir.

### Kesintiye dayanıklılık

Ajanın her adımı `canli/<agent_id>.json` dosyasına **hook tarafından** yazılır — modelin
iş birliğine bağlı değildir:

```json
{
  "contract": "T3", "steps": 34,
  "last_action": "Edit src/theme/tokens.ts",
  "files": ["src/App.tsx", "src/theme/tokens.ts"],
  "stop_reason": "max_tokens",
  "son_soz": "Tema tokenları yazıldı, panel entegrasyonu kaldı."
}
```

`stop_reason` `end_turn` dışında bir değerse ajan ölmüştür. Önce aynı ajan bağlamıyla
diriltilir; olmazsa taze ajana devir teslim metni bu dosyadan kurulur. `/devam` bunu
otomatik yapar.

### Düzeltme döngüsü

Denetçi "kaldı" derse: 1-3. turlarda **aynı ajan** devam ettirilir (bağlamı korunur),
4-5. turlarda taze ve bir üst modelde ajan atanır, tavanda karar sana gelir.
Açık kritik bulgu varken sonraki göreve geçilmez.

---

## Bileşenler

### Ajanlar

| Ajan | İşi | Varsayılan model |
|---|---|---|
| `usta` | Kod yazar — modül, algoritma, endpoint, refactor, test | sonnet |
| `usta-arayuz` | Arayüz yazar; tema standardı bağlamına önyüklü | sonnet |
| `denetci` | Kabul kriterlerini doğrular — **Write/Edit araçları yok** | sonnet |
| `kayitci` | Mekanik toplu iş — isim, biçim, dokümantasyon | haiku |

Rol işin türünü, model ağırlığını belirler; ikisi ayrı eksendir. Model çağrı anında seçilir.

### Komutlar

| Komut | Ne yapar |
|---|---|
| `/durum` | Sözleşme ilerlemesi + ajan başına tur bütçesi barları |
| `/devam` | Kesilen oturumu ajan izlerinden sürdürür |
| `/iskele` | Röleyi açıkça kurar (normalde otomatik) |
| `/huy` | Kalıcı kural ekler, doğru katmana yazar |
| `/teknesyumui` | Arayüz standardını ayarlar veya kapatır |
| `/kurulum` | Statusline ve huy dosyasını bağlar |

### Statusline

```
⬢ Opus 5  ·  Mangala  ·  ⎇ main
ctx ██████░░░░ 61%   5s 34%   7g 12%   ▸ T3 ████░░ 4/8
  ⚙ T4 usta          ███░░░░░  23/60  Edit src/hooks/useMangala.js
  ⨯ T3 usta-arayuz   ░░░░░░░░   3/60  max_tokens
```

Bağlam doluluğu, **plan limitin** (5 saatlik ve haftalık), sözleşme ilerlemesi ve her
ajanın tur bütçesi. Modele değil sana gösterildiği için **token maliyeti sıfır**.

### Hook'lar

- `koru-sozlesme.js` — tamamlanmış sözleşmelere yazmayı harness seviyesinde engeller
- `relay-izle.js` — ajan izlerini diske yazar (`SubagentStart` / `PostToolUse` / `SubagentStop`)

---

## Arayüz standardı

Varsayılan palet — neon üçlüsü, koyu zemin:

| | Hex | Kullanım |
|---|---|---|
| Birincil | `#00f3ff` | Eylem, aktif durum, sayısal vurgu, başlık |
| İkincil | `#ff00ea` | Uyarı, ters eylem, kritik değer |
| Üçüncül | `#b026ff` | Mod anahtarları, scrollbar, ikincil buton |
| Başarı | `#34d399` | Yalnızca "tamamlandı" |
| Zemin | `#08090a` | Panel |

Tipografi: **Segoe UI** (metin) + **Consolas** (her sayı, tuş, kod, süre).
Ölçek 10 → 13 → 14 → 18 → 24, ara boyut yok.

Kural seti renk ve ölçü uydurmayı yasaklar: radius dört değerden biri, aralık beş
değerden biri, renkli metin glow'suz bırakılamaz, sayı sans fontla yazılamaz.

Desteklenen stack'ler: Tailwind v4, düz CSS, React, Electron, WPF (XAML), WinForms, ANSI konsol.

### Özelleştirme

```
/teknesyumui                      mevcut ayarı göster
/teknesyumui kapat                arayüz standardını tamamen devre dışı bırak
/teknesyumui palet #ff6b00        birincil rengi değiştir
/teknesyumui font Inter           varsayılan fontu değiştir
/teknesyumui imza kapat           imza bloğunu kaldır
/teknesyumui not <metin>          kendi kuralını yaz — çelişirse seninki kazanır
/teknesyumui sifirla              varsayılanlara dön
```

Ayarlar `~/.claude/teknesyum-ui.json` dosyasında tutulur; sadece değiştirdiğin alan yazılır,
gerisi varsayılandan gelir. Projeye özel ayar için o projede `.claude/teknesyum-ui.json`
oluştur — kullanıcı geneline üstündür.

`kapat` dersen skill hiçbir renk veya ölçü dayatmaz, projenin kendi tarzıyla devam edilir.

### İmza bloğu

Üretilen arayüzlerin ayarlar/hakkında bölümünün en altına sağa yaslı, küçük bir imza
eklenir: GitHub bağlantısı ve destek bağlantısı. `/teknesyumui imza kapat` ile kaldırılır,
`/teknesyumui imza github <url>` ile kendi hesabına çevrilir.

---

## Maliyet

Claude Code'un kendi ölçümü:

```
Skills (7) · Agents (4) · Hooks (4)
Always-on:  ~527 token     her oturuma eklenen
```

200k bağlamın **binde ikisinden azı**. Skill gövdeleri yalnızca tetiklendiklerinde yüklenir;
röle protokolünün tamamı ancak gerçekten röle kurulduğunda okunur.

Tasarım boyunca tek kural: **ara çıktı / geri dönen rapor oranı yüksekse delege et.**
Keşif ve tarama alt ajanın bağlamında ölür, ana oturuma sadece sonuç döner.

---

## Ayarlar

Davranış düğmeleri `skills/relay/AYAR.md` içinde:

| Düğme | Varsayılan | Ne yapar |
|---|---|---|
| `soru_esigi` | `kritik` | Ajan ne zaman durup sorar |
| `onay_kapisi` | `yok` | Plan onaya sunulsun mu |
| `denetim` | `her-sozlesme` | Denetçi ne zaman çalışır |
| `duzeltme_tavani` | `5` | Kaç turdan sonra karar sana gelir |
| `model_tirmanisi` | `acik` | 3. turda üst modele çıkılsın mı |
| `paralel_genislik` | `2` | Eşzamanlı ajan tavanı |
| `worktree_izolasyonu` | `kapali` | Ajanlar izole repo kopyasında mı çalışsın |

Projeye özel ezme: `<proje>/.claude/relay/AYAR.md`.

---

## Gerçek ölçüm

Bir React projesinde uçtan uca çalıştırıldı: **8 sözleşme, 16 ajan.**

Denetçiler **4 gerçek hata** yakaladı ve hiçbiri build veya lint ile yakalanamazdı:
- `@import` yanlış yerdeydi, fontlar sessizce düşüyordu — ajan "zararsız uyarı" demişti
- Bir klavye kısayolu hiç yazılmamıştı ama ajan çıktısında "yapıldı" yazıyordu
- İki kez ham hex rengi kullanılmıştı, token varken

İkisi **ajanın raporuyla kodun çeliştiği** vakalardı. Denetçi olmasaydı ikisi de geçerdi.

Oturum limiti üç ajanı aynı anda düşürdü; üçü de bağlamlarıyla diriltildi, taze ajana
geçmek gerekmedi. Sekiz sözleşmenin tamamı kapandı, tek bir sahiplik ihlali olmadı,
bağımlılık dosyası değişmedi.

---

## Güncelleme ve sürümler

```
/plugin marketplace update teknesyum
```
```
/reload-plugins
```

Varsayılan palet, font ve imza sürümle değişebilir; `~/.claude/teknesyum-ui.json`
içindeki kendi ayarların korunur. Ayar dosyası kendi `surum` alanını taşır, uyumsuzluk
olduğunda uyarılırsın.

---

## Destek

Bu paket boş zamanda geliştiriliyor ve ücretsiz.

<a href="https://github.com/sponsors/Teknesyum"><img src="https://img.shields.io/badge/☕_Buy_me_a_coffee-b026ff?style=for-the-badge" alt="Sponsor" /></a>

**[github.com/Teknesyum](https://github.com/Teknesyum)** · MIT
