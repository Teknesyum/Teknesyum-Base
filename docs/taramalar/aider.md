# Aider (Aider-AI/aider) Taraması

Karşılaştırma hedefi: Teknesyum Base (Claude Code eklentisi, çok ajanlı relay,
hook ile mekanik kural uygulama, token disiplini).

## 1. Ne yapıyor, hangi problemi çözüyor?

Aider, terminalde çalışan bir AI çift-programlama (pair programming) aracı;
kullanıcı doğal dille istek verir, LLM kod tabanını düzenler ve her değişikliği
otomatik git commit'ler.
100'den fazla dil için repo haritası (repo map) çıkararak modele "hangi dosyada
ne var" bağlamını LLM'in tüm dosyaları okumasına gerek kalmadan verir.
Tek kullanıcılı, CLI-öncelikli bir araç — Teknesyum'daki gibi çok ajanlı iş
dağıtımı yok.
(https://github.com/Aider-AI/aider)

## 2. İş devri (handoff) nasıl oluyor?

Aider'da "architect/editor" modu var: architect modeli çözümü doğal dilde önerir,
aider bu öneriyi alıp editor modeline (aynı veya farklı bir model) göndererek
somut dosya diff'lerine çevirtir.
Devir **bağlamla** (context, konuşma geçmişi + öneri metni) oluyor — ayrı bir
sözleşme dosyası, kabul kriteri veya bağımsız denetçi ajan yok.
Tek konuşma oturumu içinde iki model rolü art arda çalışıyor; Teknesyum'daki
"patron böler → işçi sözleşme dosyası alır → denetçi ayrı ajan doğrular" üçlü
ayrımı yok.
(https://aider.chat/docs/usage/modes.html)

## 3. Bağlam/token disiplini — repo map

Somut ve ölçülü bir mekanizma var:

- **Çıkarma**: tree-sitter ile her kaynak dosyası parse edilir, fonksiyon/sınıf
  imzaları ve tanım satırları (tag) çıkarılır. 130+ dil destekleniyor.
- **Sıralama**: dosyalar düğüm, aralarındaki referanslar kenar olacak şekilde
  bir bağımlılık grafiği kurulur; graf-sıralama (PageRank tarzı) algoritmasıyla
  en çok referans alan semboller öne çıkarılır. Sohbete eklenen dosyalara göre
  kişiselleştirilmiş (personalized) ağırlıklandırma yapılır.
- **Bütçe**: `--map-tokens` anahtarı, varsayılan **~1024 token**. Bu bütçeye
  sığacak en yüksek puanlı tanımlar seçilir, gerisi elenir.
- **Güncelleme**: her istek turunda haritanın ilgili kısmı yeniden gönderiliyor;
  sohbete dosya eklendikçe kapsam daralıp derinleşiyor.

(https://aider.chat/docs/repomap.html ,
https://aider.chat/2023/10/22/repomap.html)

## 4. Kuralları mekanik mi uyguluyor, modele mi bırakıyor?

Karışık: bazı katmanlar mekanik, bazıları tamamen modele güveniyor.

- **Mekanik olanlar**: her editten sonra **otomatik git commit** (varsayılan
  açık, `--no-auto-commits` ile kapatılabilir); commit mesajı zayıf modelle
  (`--weak-model`) üretilir, Conventional Commits biçiminde. Değiştirilen
  dosyalar varsayılan olarak **otomatik lint** edilir; `--auto-test` ile test
  komutu da otomatik çalışır. Lint/test hata dönerse aider bunu otomatik LLM'e
  geri besleyip düzeltme turu başlatır — kullanıcı araya girmeden.
- **Modele bırakılan**: CONVENTIONS.md tamamen soft-enforcement — `/read` veya
  `--read` ile read-only olarak sohbete eklenir, prompt cache'e girer, ama
  uyulup uyulmadığını doğrulayan ayrı bir denetim yok; LLM'in talimata
  uymasına güveniliyor. Teknesyum'daki hook-tabanlı zorunlu uygulama (mekanik,
  atlanamaz) burada yok.

(https://aider.chat/docs/git.html ,
https://aider.chat/docs/usage/lint-test.html ,
https://aider.chat/docs/usage/conventions.html)

## 5. Bizde olmayan, alınmaya değer en fazla 3 fikir

1. **Repo map — graf-sıralamalı, token bütçeli otomatik bağlam seçimi.**
   Neden değerli: Şu an Teknesyum'da bağlam seçimi Explore/Grep ile elle
   yapılıyor; tree-sitter + PageRank tarzı puanlama, büyük yabancı kod
   tabanlarında hangi dosyaların gerçekten ilgili olduğunu otomatik ve ucuz
   çıkarır (sabit ~1k token bütçesiyle).
   Maliyet: tree-sitter parser kurulumu + graf kütüphanesi, ilk sürümde orta
   emek; graphify skill'i kısmen bu boşluğu dolduruyor ama dosya-seviyesinde
   PageRank yok, sembol-seviyesinde.

2. **Edit-sonrası otomatik lint/test + hata döngüsü.**
   Neden değerli: Hook'larla kural uygulanıyor ama "değişiklik derlendi mi,
   test geçti mi" kontrolü şu an builder/auditor ajanına bağlı; aider'daki gibi
   editten hemen sonra otomatik lint/test çalıştırıp başarısızlığı LLM'e
   otomatik geri besleyen bir hook, denetçi ajanı beklemeden erken hata
   yakalar.
   Maliyet: proje başına lint/test komutunun tanımlanması (config), düşük;
   hook mantığı zaten var, sadece tetikleyici eklemek yeterli.

3. **Edit format seçimi modele göre otomatik (whole/diff/udiff/patch).**
   Neden değerli: Zayıf/ucuz modellerde tam dosya döndürme (whole), güçlü
   modellerde parça diff (diff/patch) — model yeteneğine göre format
   değiştirmek token israfını azaltıyor. Teknesyum'da builder ajanları hep
   aynı düzenleme kanalını (Edit tool) kullanıyor; ucuz/zayıf modelle çalışan
   scribe gibi ajanlarda format ayrımı token tasarrufu sağlayabilir.
   Maliyet: düşük-orta; ajan tanımlarına model bazlı "edit stratejisi" notu
   eklemek yeterli, araç değişikliği gerekmez.

## 6. Şüpheli/riskli yanlar

- **Lisans**: Apache-2.0 — risksiz, ticari kullanım serbest.
  (https://api.github.com/repos/Aider-AI/aider)
- **Terk edilmişlik göstergesi**: GitHub API'ye göre repo'ya son push
  **2026-05-22**, ama son resmi **release hâlâ v0.86.0 (2025-08-09)** —
  yani bir yıldan uzun süredir yeni bir sürüm etiketlenmemiş, commit'ler
  release'e dönüşmüyor. Bugünün tarihi (2026-08-19) göz önüne alınırsa bu
  ciddi bir yavaşlama sinyali; doğrulanamadı: sürüm sürecinin neden durduğu
  (bakım modu mu, süreç değişikliği mi).
  (https://api.github.com/repos/Aider-AI/aider ,
  https://api.github.com/repos/Aider-AI/aider/releases/latest)
- **Abartılı iddia**: "haftada 15B token işleniyor" rakamı proje sitesinde
  geçiyor ama bağımsız doğrulanamadı — kendi bildirdiği bir metrik.
- **Açık issue yükü**: 1.818 açık issue — bakım hızının gerisinde kalmış
  olabileceğine dair ek bir işaret, ama tek başına terk edilmişlik kanıtı
  değil.
  (https://api.github.com/repos/Aider-AI/aider)

## Kaynaklar

- https://github.com/Aider-AI/aider
- https://aider.chat/docs/repomap.html
- https://aider.chat/2023/10/22/repomap.html
- https://aider.chat/docs/more/edit-formats.html
- https://aider.chat/docs/usage/conventions.html
- https://aider.chat/docs/usage/lint-test.html
- https://aider.chat/docs/git.html
- https://aider.chat/docs/usage/modes.html
- https://api.github.com/repos/Aider-AI/aider
- https://api.github.com/repos/Aider-AI/aider/releases/latest
- https://github.com/Aider-AI/conventions
