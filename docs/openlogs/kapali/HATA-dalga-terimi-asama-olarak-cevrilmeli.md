# Hata: "dalga" terimi Türkçe metinlerde "aşama" olarak geçmeli

**Durum:** açık.
**Belirti:** Yol haritası adımları (D0-D9) Türkçe belgelerde ve konuşmada "dalga"
diye anılıyor. Kullanıcı kararı: doğru çeviri **aşama**. İngilizce "wave" kalabilir,
Türkçe karşılığı her yerde "aşama" olacak.
**Kaynak:** docs/PLAN.md, AGENTS.md, arayuz/locale/tr.json, docs altındaki Türkçe belgeler.
**Görüldüğü proje:** VideoEdit

---

## Dikkat

Arayüzdeki boru hattının 11 adımı da halihazırda "aşama" (AsamaSeridi). D0-D9 için
"aşama" kullanılınca ikisi çakışıyor; metinde ayrım gerekirse boru hattı adımına
"adım" ya da bağlamdan ayrıştırıcı bir ek düşünülmeli — karar kullanıcıya sorulmadan
değiştirilmesin, yalnız "dalga" → "aşama" değişimi kesin.

## Kapanma ölçüsü

1. Türkçe belge ve arayüz metinlerinde "dalga" geçmiyor.
2. Bundan sonraki oturum raporlarında D0-D9 "aşama" diye anılıyor.
