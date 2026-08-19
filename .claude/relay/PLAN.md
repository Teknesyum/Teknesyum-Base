# Plan: Platform uyumluluğu ve uicheckup

Amaç: Eklentinin Windows, macOS ve Linux'ta aynı davranışla kurulup çalışmasını güçlendirmek; `uicheckup` ile başka projelerin UI dosyalarını teknesyum-ui kurallarına göre tarayıp onay sonrası düzeltme akışı sağlamak.

| # | Sözleşme | Durum | Bağımlılık |
|---|---|---|---|
| T1 | UI tarama ve plan üretimi | open | — |
| T2 | Onaylı UI düzeltme komutu ve ajan akışı | open | T1 |
| T3 | Platform bağımsız çalışma ve kurulum | open | — |
| T4 | Test, komut kaydı ve dış dokümantasyon | open | T1, T2, T3 |

Kapsam dışı: Başka projelerdeki UI kodunu bu depoda topluca değiştirmek; kullanıcı onayı olmadan düzeltme uygulamak; mevcut arayüz standardını değiştirmek.

Kabul kapısı: `uicheckup` ilk çağrıda yalnız tarama ve plan üretir. Düzeltme yalnız açık bir plan kimliği ve kullanıcının açık onayından sonra çalışır. Onay yoksa hiçbir hedef dosyaya yazılmaz.

Son işlem: testler yeşil, platforma özgü yol/shell kullanımı gözden geçirilmiş, README ve CHANGELOG güncellenmiş, güvenlik kontrolünden sonra tek commit.
