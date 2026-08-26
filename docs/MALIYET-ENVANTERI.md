# Maliyet envanteri — hangi özellik ne kadar tüketiyor

Ölçüm: `node scripts/olcum/istem-yuku.js`. Katsayı **2,492 karakter/token**, kontrollü
A/B deneyiyle ölçüldü (27.08.2026), yayılım A 1,0001 · B 1,00003.

**Ölçüm aleti 27.08'de onarıldı.** Önceki hâli `cache_read_input_tokens`'ı topluyordu
ve o değer istemle ilgisiz şekilde 54.866–342.973 arası oynuyordu; alt koşu da ajanikti.
Aynı gün üç koşuda 1,894 · 2,494 · 0,037 verdi. Şimdi alt koşu `--max-turns 1` ile tek
tura kilitli ve yayılım 1,15'i aşarsa katsayı **hiç üretilmiyor**.

---

## 1. Oturum bilançosu

| Kalem | sıklık | karakter | token |
|---|---|---:|---:|
| Komut açıklamaları (22) | oturumda bir kez | 2.066 | 829 |
| Ajan açıklamaları (7) | oturumda bir kez | 2.401 | 963 |
| Skill açıklamaları (2) | oturumda bir kez | 898 | 360 |
| SessionStart kancası | oturumda bir kez | 614 | 246 |
| **Sabit alt toplam** | | **5.979** | **2.399** |
| UserPromptSubmit enjeksiyonu | ilk 2 turda, sonrası tavanlı | 7.494 | 3.008 |
| **Oturum toplamı** | | **13.473** | **5.406** |

Y1'in kapısı (27.08) enjeksiyonu **açık sözleşme yoksa hiç yazmıyor**. Açık sözleşmesiz
bir oturumda gerçek yük bu yüzden **2.399 token**. Sözleşme açıksa 5.406.

Başlangıç noktasıyla karşılaştırma (26.08 sabahı, Türkçe yüzey, kapısız):

| | pasif oturum | aktif oturum |
|---|---:|---:|
| 26.08 | 6.722 | 6.722 |
| 27.08 | **2.399** | 5.406 |
| değişim | **−%64** | −%20 |

---

## 2. Kalem kalem — oturumda bir kez ödenenler

### Komutlar (22 kalem, 829 token)

| komut | token | 5 günde çağrı |
|---|---:|---:|
| scan | 51 | 8 |
| uisetup | 50 | 0 |
| uicheckup | 47 | 0 |
| rcadvanced | 43 | 0 |
| autocompact | 42 | 0 |
| setup | 42 | 0 |
| premium | 40 | 2 |
| pusla | 40 | 0 |
| beep | 39 | 0 |
| loadall | 39 | 1 |
| ozel | 39 | 0 |
| rcall | 39 | 0 |
| rc | 37 | 0 |
| save | 37 | 11 |
| ekran | 36 | 0 |
| update | 35 | 1 |
| saveall | 33 | 2 |
| log | 30 | 0 |
| load | 29 | 1 |
| report | 28 | 0 |
| rule | 27 | 0 |
| help | 26 | 0 |

Çağrı sayıları `~/.claude/teknesyum/canli/kullanim.json` (22–26.08, 5 gün).
**Sıfır çağrılı 14 komut = 484 token**, komut yüzeyinin %58'i.

### Ajanlar (7 kalem, 963 token)

| ajan | token | 5 günde çağrı |
|---|---:|---:|
| advisor | 167 | 39 |
| planner | 154 | 45 |
| scout | 152 | 137 |
| ui-builder | 135 | 57 |
| auditor | 128 | 166 |
| builder | 125 | 211 |
| scribe | 102 | 20 |

Yedisi de kullanımda. **Bu küme ölçülmüş fayda taşıyor**; kesim adayı değil,
kısaltma adayı.

### Skiller (2 kalem, 360 token)

| skill | token | 5 günde çağrı |
|---|---:|---:|
| relay | 204 | 2 |
| teknesyum-ui | 156 | 6 |

---

## 3. Kalem kalem — her mesajda / her turda ödenenler

Bu bölümün ayrıntısı `docs/HER-MESAJ-YUKU.md` dosyasında.
Özet: enjeksiyonun 3.747 karakterinin **%56'sı tek bir kalem** (`premiumNotu`).

---

## 4. Bedava olanlar

Bağlama tek karakter yazmayan ama iş yapan kalemler:

| kalem | ne yapar | bağlam maliyeti |
|---|---|---:|
| `contract-guard.js` | `done/` kilidi, durum merdiveni, mühür kanıtı | 0 |
| `ekran-kapisi.js` | masaüstü/GUI kapısı | 0 |
| `statusline.js` | kullanıcının gördüğü sürekli durum | 0 |
| `beep.js` (kanca) | bitiş sesi | 0 |
| `harita.js` | deterministik proje haritası | 0 |
| `calisanBildir()` | Stop'ta çalışan ajan sayısı | yalnız ajan varken 1 satır |

**Kesim bu kümeye dokunmamalı.** Eklentinin savunulabilir çekirdeği burada;
maliyeti sıfır olduğu için maliyet gerekçesiyle kesilemez.
