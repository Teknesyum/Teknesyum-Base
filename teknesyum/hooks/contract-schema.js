// Sözleşme kimliği ve durumu tek yerden tanımlanır. Dağınık olduğunda ne olduğu ölçüldü
// (25.08.2026, dış denetim TB-003): `contract-guard.js` yalnız `T` ile başlayan dosyayı
// tanıyordu, depoda ise D, E, F, S, T, U kimlikli 22 açık sözleşme vardı. Yani `done/`
// kapısı, mühür denetimi ve durum gerilemesi 21 sözleşme için hiç çalışmıyordu. Statusline
// "23 iş" derken guard birini görüyordu.
//
// Kimlik biçimi mevcut veriyi kapsayacak kadar geniş, klasör kaçışını dışarıda bırakacak
// kadar dar: tek harf öbeği + sayı. Ayraç, nokta ve uzantı dışı karakter geçmez.
const KIMLIK = /^[A-Z]{1,4}\d{1,4}\.md$/i;

// Merdiven tek yönlüdür. `blocked` her iki yönde serbesttir — engel gerçek bir durumdur,
// kurtarma da öyle; bu yüzden merdivende yok ama DURUMLAR onu tanır. `sealed` mühürlenmiş
// sözleşmedir ve `done` ile aynı basamakta durur: T1 bu durumdaydı ve tablo onu tanımadığı
// için gerileme denetimi sessizce atlanıyordu — mühürlü sözleşme serbestçe `open`
// yazılabiliyordu.
const SIRA = { open: 0, active: 1, submitted: 2, accepted: 3, done: 3, sealed: 3 };

// ÖLÇÜLDÜ (tur 2 denetimi, K4): "bilinen durum" tanımı merdiven tablosuna bağlıyken
// `blocked` bilinmeyen sayılıyor ve bilinmeyen durum sessizce geçiyordu. Tanınan durum
// kümesi merdivenden ayrı tutulur; kümede olmayan her şey bilinmeyendir ve kapı kapanır.
const DURUMLAR = new Set([...Object.keys(SIRA), 'blocked']);

function sozlesmeAdi(ad) {
  return KIMLIK.test(String(ad));
}

function durum(metin) {
  const m = String(metin).match(/^status:[ \t]*([a-z]+)/im);
  return m ? m[1].toLowerCase() : null;
}

function bilinenDurum(d) {
  return d !== null && DURUMLAR.has(d);
}

module.exports = { KIMLIK, SIRA, DURUMLAR, sozlesmeAdi, durum, bilinenDurum };
