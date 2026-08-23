#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { konfigKok, oturumKimligi, oturumProfilYolu, read, yaz } = require('../hooks/ortak.js');
const beep = require('../hooks/beep.js');

const { OLAYLAR, VARSAYILAN, OLCULEN_SURE } = beep;

const OLAY_ANLAM = {
  bekleme: 'senden bir şey bekliyorum — izin ya da soru',
  bitti: 'tur bitti',
  hata: 'tur hatayla kapandı',
};

const SURUM = '1.0.0';

function dur(mesaj) {
  process.stderr.write(mesaj + '\n');
  process.exit(1);
}

function bas(satir) {
  process.stdout.write(satir.join('\n') + '\n');
}

function bekle(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
  } catch {}
}

// Süre wav başlığından okunur: `data` yığınının boyu / `fmt ` yığınındaki bayt hızı.
// Okunamayan biçimde (aiff, ogg) boş döner — tabloda süre sütunu boş kalır.
function wavSure(yol) {
  try {
    const fd = fs.openSync(yol, 'r');
    const b = Buffer.alloc(8192);
    const n = fs.readSync(fd, b, 0, 8192, 0);
    fs.closeSync(fd);
    if (n < 44 || b.toString('ascii', 0, 4) !== 'RIFF') return '';
    let i = 12;
    let hiz = 0;
    while (i + 8 <= n) {
      const id = b.toString('ascii', i, i + 4);
      const boy = b.readUInt32LE(i + 4);
      if (id === 'fmt ' && i + 20 <= n) hiz = b.readUInt32LE(i + 16);
      if (id === 'data' && hiz) return (boy / hiz).toFixed(2).replace('.', ',') + ' s';
      i += 8 + boy + (boy % 2);
    }
    return '';
  } catch {
    return '';
  }
}

function sure(alan, olay) {
  if (alan.hz && alan.ms) return (alan.ms / 1000).toFixed(2).replace('.', ',') + ' s';
  const yol = beep.sesYolu(olay, alan.dosya);
  if (!yol) return '';
  return wavSure(yol) || OLCULEN_SURE[path.basename(yol)] || '';
}

function sesAdi(alan) {
  if (alan.hz && alan.ms) return 'bip ' + alan.hz + ' Hz';
  return alan.dosya || VARSAYILAN.bitti.dosya;
}

function uzaktaMi() {
  return Boolean(
    process.env.CLAUDE_CODE_REMOTE ||
      process.env.CLAUDE_CODE_REMOTE_CONTROL ||
      process.env.CLAUDE_CODE_ENTRYPOINT === 'remote'
  );
}

function makineOku() {
  return read(beep.makineDosyasi()) || {};
}

function makineYaz(degistir) {
  const yol = beep.makineDosyasi();
  const k = makineOku();
  k.surum = k.surum || SURUM;
  k.olaylar = k.olaylar || {};
  degistir(k);
  fs.mkdirSync(path.dirname(yol), { recursive: true });
  yaz(yol, k);
  return yol;
}

const OTURUM_DEFTER = ['pid', 'ts', 'cwd'];

function oturumYaz(sid, degistir) {
  const yol = oturumProfilYolu(sid);
  const k = read(yol) || {};
  k.beep = k.beep || {};
  k.beep.olaylar = k.beep.olaylar || {};
  degistir(k.beep);
  fs.mkdirSync(path.dirname(yol), { recursive: true });
  yaz(yol, { ...k, pid: process.pid, ts: Date.now(), cwd: process.cwd() });
  return yol;
}

function oturumSil(sid) {
  const yol = oturumProfilYolu(sid);
  const k = read(yol);
  if (!k) return { yol, vardi: false };
  const vardi = k.beep !== undefined;
  delete k.beep;
  const kalan = Object.keys(k).filter((a) => !OTURUM_DEFTER.includes(a));
  try {
    if (kalan.length) yaz(yol, k);
    else fs.unlinkSync(yol);
  } catch {}
  return { yol, vardi };
}

function oturumBeep(sid) {
  if (!sid) return null;
  const k = read(oturumProfilYolu(sid));
  return k && k.beep ? k.beep : null;
}

// §9 göçü. Kullanıcının `settings.json` dosyasına elle eklenmiş ses kancaları
// eklentininkiyle birlikte çalışır ve her olayda çift ses tetikler. Rapor yazıldığında
// oradaki elle eklenmiş kancalar `[console]::beep` çağırıyordu; sonradan aynı elle
// düzenlemeyle `Media.SoundPlayer` yapıldılar. Ölçüt bu yüzden çağrının kendisine değil
// "elle eklenmiş PowerShell ses kancası" desenine bakar. Eklentinin kancası burada değil
// `hooks/hooks.json` içinde durduğu için kendi kendini silmez.
const SES_DESENI = ['[console]::beep', 'media.soundplayer', 'systemsounds'];
const GOC_OLAYLARI = ['Notification', 'Stop', 'StopFailure'];

function gocEt() {
  const yol = path.join(konfigKok(), 'settings.json');
  let k;
  try {
    k = JSON.parse(fs.readFileSync(yol, 'utf8'));
  } catch {
    return [];
  }
  if (!k || !k.hooks) return [];
  const silinen = [];
  for (const olay of GOC_OLAYLARI) {
    const grup = k.hooks[olay];
    if (!Array.isArray(grup)) continue;
    const kalanGrup = [];
    for (const g of grup) {
      const kancalar = Array.isArray(g && g.hooks) ? g.hooks : [];
      const kalan = kancalar.filter((h) => {
        const c = String((h && h.command) || '').toLowerCase();
        const eslesir = c.includes('powershell') && SES_DESENI.some((d) => c.includes(d));
        if (eslesir) silinen.push(olay);
        return !eslesir;
      });
      if (kancalar.length && !kalan.length) continue;
      kalanGrup.push(kalan.length === kancalar.length ? g : { ...g, hooks: kalan });
    }
    if (kalanGrup.length) k.hooks[olay] = kalanGrup;
    else delete k.hooks[olay];
  }
  if (!silinen.length) return [];
  try {
    fs.writeFileSync(yol, JSON.stringify(k, null, 2) + '\n', 'utf8');
  } catch {
    return [];
  }
  return [
    'settings.json temizlendi · elle eklenmiş ' +
      silinen.length +
      ' PowerShell ses kancası silindi (' +
      [...new Set(silinen)].join(', ') +
      ') — eklentinin kancasıyla birlikte her olayda çift ses veriyorlardı',
  ];
}

function durum(gocSatiri) {
  const sid = oturumKimligi();
  const a = beep.coz(process.cwd(), sid);
  const gen = [
    'toptan durum · ' + (a.toptan.deger ? 'kapalı' : 'açık') + ' (' + a.toptan.kaynak + ')',
    '',
  ];
  const satir = OLAYLAR.map((o) => {
    const alan = a.olaylar[o];
    const durum = a.toptan.deger ? 'kapalı*' : alan.kapali ? 'kapalı' : 'açık';
    return [o, sesAdi(alan), sure(alan, o), durum, '(' + alan.kaynak + ')', OLAY_ANLAM[o]];
  });
  const gen2 = ['olay', 'ses', 'süre', 'durum', 'kaynak', 'ne demek'];
  const hepsi = [gen2, ...satir];
  const w = gen2.map((_, i) => Math.max(...hepsi.map((r) => r[i].length)));
  const ciz = (r) => r.map((h, i) => (i === r.length - 1 ? h : h.padEnd(w[i]))).join('  ');
  const not = [
    '',
    'örnek · ekran başındayken: /beep bitti off — bekleme ve hata sesi açık kalır',
    'kapsam · çıplak komut makineye yazar, sonuna `this` eklenince yalnız bu sohbete',
  ];
  if (a.toptan.deger) not.push('* toptan kapalı — olay satırlarındaki açık/kapalı beklemede');
  if (process.platform !== 'win32')
    not.push(
      'platform · ' + process.platform + ' üzerinde `bip <hz> <ms>` çalışmaz, yalnız dosya çalar'
    );
  if (uzaktaMi())
    not.push('uzak denetim açık · makinede çalan ses telefona ulaşmaz, `PushNotification` ayrı yol');
  else not.push('uzaktan sürerken (`/rc`) bu ses telefona ulaşmaz — o yol `PushNotification`');
  bas([...gocSatiri, ...(gocSatiri.length ? [''] : []), ...gen, ciz(gen2), ...satir.map(ciz), ...not]);
}

function dinle() {
  const sid = oturumKimligi();
  const a = beep.coz(process.cwd(), sid);
  const rapor = [];
  for (const o of OLAYLAR) {
    const alan = a.olaylar[o];
    rapor.push(o + ' · ' + sesAdi(alan) + ' · ' + (sure(alan, o) || 'süre okunamadı'));
    beep.cal(alan, o);
    if (o !== OLAYLAR[OLAYLAR.length - 1]) bekle(600);
  }
  bas([
    'üç ses sırayla çalındı:',
    '',
    ...rapor.map((r) => '  ' + r),
    '',
    'Duymadıysan ses eklentinin dışında kesiliyor: çıkış aygıtı, sanal ses kartının kanal',
    'karıştırıcısı ya da uygulama ses seviyesi. `/beep <olay> <dosya>` ile başka bir dosya dene.',
  ]);
}

function hedef(oturuma) {
  if (!oturuma) return { yaz: makineYaz, ad: 'makine', yol: beep.makineDosyasi() };
  const sid = oturumKimligi();
  if (!sid) dur('`this` bir oturum kimliği ister; bu koşumda CLAUDE_CODE_SESSION_ID yok');
  return {
    yaz: (d) => oturumYaz(sid, d),
    ad: 'oturum',
    yol: oturumProfilYolu(sid),
  };
}

// §5: `this` ile ayar yapılmış bir sohbette çıplak komut geneli değiştirir ama burada
// hiçbir şey değişmez. Söylenmezse kullanıcı komutun çalışmadığını sanır.
function golgeUyarisi(oturuma) {
  if (oturuma) return [];
  const g = oturumBeep(oturumKimligi());
  if (!g) return [];
  return [
    '',
    'Makine varsayılanı yazıldı.',
    'Bu sohbette oturuma özel ses ayarı yürürlükte — oturuma özel ayar üstte kalır.',
    'Bu sohbeti de geneline döndürmek için: /beep this sil',
  ];
}

function yazVeBildir(oturuma, ne, degistir) {
  const h = hedef(oturuma);
  const yol = h.yaz(degistir);
  bas([ne + ' · kapsam: ' + h.ad, 'kayıt: ' + yol, ...golgeUyarisi(oturuma)]);
}

function toptan(acik, oturuma) {
  yazVeBildir(
    oturuma,
    acik ? 'bütün sesler açıldı (tek tek yapılmış ayarlar korundu)' : 'bütün sesler kapatıldı',
    (k) => {
      k.kapali = !acik;
    }
  );
}

function olayAcKapa(olay, acik, oturuma) {
  yazVeBildir(oturuma, olay + ' sesi ' + (acik ? 'açıldı' : 'kapatıldı'), (k) => {
    k.olaylar[olay] = { ...(k.olaylar[olay] || {}), kapali: !acik };
  });
}

function olayDosya(olay, dosya, oturuma) {
  yazVeBildir(oturuma, olay + ' sesi ' + dosya + ' oldu', (k) => {
    const o = { ...(k.olaylar[olay] || {}), dosya };
    delete o.hz;
    delete o.ms;
    k.olaylar[olay] = o;
  });
}

function olayBip(olay, hz, ms, oturuma) {
  if (!Number.isFinite(hz) || hz < 37 || hz > 32767) dur('hz 37 ile 32767 arasında olmalı');
  if (!Number.isFinite(ms) || ms < 1) dur('ms pozitif bir sayı olmalı');
  yazVeBildir(oturuma, olay + ' sesi sistem hoparlörü bipine çevrildi', (k) => {
    const o = { ...(k.olaylar[olay] || {}), hz, ms };
    delete o.dosya;
    k.olaylar[olay] = o;
  });
}

function temizle() {
  const sid = oturumKimligi();
  if (!sid) dur('`this sil` bir oturum kimliği ister; bu koşumda CLAUDE_CODE_SESSION_ID yok');
  const r = oturumSil(sid);
  bas([
    r.vardi
      ? 'oturuma özel ses ayarı silindi · ' + r.yol
      : 'bu sohbette oturuma özel ses ayarı zaten yoktu',
    'yürürlükteki ayar: makine (' + beep.makineDosyasi() + ')',
  ]);
}

function yardim() {
  bas([
    'beep.js — sesli bildirim ayarı',
    '',
    '  node beep.js                       durum tablosu, hiçbir dosya yazılmaz',
    '  node beep.js on | off              hepsini aç ya da kapat',
    '  node beep.js <olay> on | off       tek olayı aç ya da kapat',
    '  node beep.js dinle                 üç sesi de çal, duyduğunu doğrula (takma ad: test)',
    '  node beep.js <olay> <dosya>        o olayın sesini değiştir',
    '  node beep.js <olay> bip <hz> <ms>  o olayı sistem hoparlörü bipine çevir (yalnız win32)',
    '  node beep.js … this                yukarıdakilerin hepsi, yalnız bu sohbet için',
    '  node beep.js this sil              bu sohbete özel ayarı sil, geneline dön',
    '',
    'Olaylar: ' + OLAYLAR.map((o) => o + ' (' + OLAY_ANLAM[o] + ')').join(' · '),
    '',
    'Okuma sırası: <proje>/.claude/teknesyum-beep.json → oturum kaydı →',
    '~/.claude/teknesyum-beep.json → varsayılan. Ayar dosyası hiç olmadan da ses çalar.',
    '',
    'Ses işletim sisteminin bildirim sistemine uğramaz, doğrudan ses aygıtına gider;',
    'odaklanma modu toast’ı yutar, sesi yutmaz. Varsayılan yol `Media.SoundPlayer` + kısa',
    'wav — `[console]::beep` sistem hoparlörü sürücüsü yoksa sessizce başarılı döner.',
  ]);
}

function pozisyonelHepsi(bas2) {
  const g = process.argv.slice(bas2);
  const c = [];
  for (let i = 0; i < g.length; i++) {
    if (g[i].startsWith('--')) {
      if (g[i + 1] && !g[i + 1].startsWith('--')) i++;
      continue;
    }
    c.push(g[i]);
  }
  return c;
}

// `this` sözlüğün parçası değil, sözlüğün üstüne binen tek kelimelik kapsam ekidir.
// Yeri hep sonda: ya son kelime, ya `sil` alt komutundan hemen önce.
function kapsamAyir(a0) {
  const a = a0.slice();
  let oturuma = false;
  const son = a.length - 1;
  if (a[son] === 'this') {
    a.pop();
    oturuma = true;
  } else if (son >= 1 && a[son] === 'sil' && a[son - 1] === 'this') {
    a.splice(son - 1, 1);
    oturuma = true;
  }
  return { arg: a, oturuma };
}

const ACIK = { on: true, off: false };

function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) return yardim();
  const goc = gocEt();
  const { arg, oturuma } = kapsamAyir(pozisyonelHepsi(2));
  const [a, b, c, d] = arg;

  if (!a) return durum(goc);
  if (goc.length) bas([...goc, '']);
  if (a === 'yardim' || a === 'help') return yardim();
  if (a === 'durum' || a === 'status') return durum([]);
  if (a === 'dinle' || a === 'test') return dinle();
  if (a === 'sil' && oturuma) return temizle();
  if (ACIK[a] !== undefined && !b) return toptan(ACIK[a], oturuma);
  if (!OLAYLAR.includes(a)) return dur('bilinmeyen olay: ' + a + ' · ' + OLAYLAR.join(' | '));
  if (!b) return dur(a + ' için ne yapayım? on | off | <dosya> | bip <hz> <ms>');
  if (ACIK[b] !== undefined) return olayAcKapa(a, ACIK[b], oturuma);
  if (b === 'bip') return olayBip(a, Number(c), Number(d), oturuma);
  return olayDosya(a, arg.slice(1).join(' '), oturuma);
}

main();
