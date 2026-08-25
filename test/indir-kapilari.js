const path = require('path');
const { EventEmitter } = require('events');
const { Readable } = require('stream');

const PIM = require(path.join(__dirname, '..', 'teknesyum', 'scripts', 'post-install.js'));
const IYI = 'https://raw.githubusercontent.com/Teknesyum/teknesyum-base/v1.0.0/x.js';

function sahteGet(cevaplar) {
  let i = 0;
  return (_u, _o, cb) => {
    const c = cevaplar[Math.min(i++, cevaplar.length - 1)];
    const istek = new EventEmitter();
    istek.destroy = () => {};
    setImmediate(() => {
      if (c.timeout) return istek.emit('timeout');
      const r = new Readable({ read() {} });
      r.statusCode = c.status;
      r.headers = c.headers || {};
      cb(r);
      setImmediate(() => {
        if (c.body) r.push(c.body);
        r.push(null);
      });
    });
    return istek;
  };
}

async function hata(cevaplar, ek) {
  try {
    await PIM.indir(IYI, { get: sahteGet(cevaplar), ...(ek || {}) });
    return '';
  } catch (e) {
    return e.message;
  }
}

const bekle = [
  [[{ status: 302, headers: { location: IYI } }], 'yönlendirme tavanı aşıldı'],
  [[{ timeout: true }], 'sunucu yanıt vermedi'],
  [[{ status: 404 }], 'HTTP 404'],
  [[{ status: 200, body: Buffer.alloc(PIM.GOVDE_TAVANI + 1024) }], 'gövde tavanı aşıldı'],
  [
    [{ status: 302, headers: { location: 'https://evil.example.com/x' } }],
    'alan listede yok: evil.example.com',
  ],
  [[{ status: 200, body: 'kucuk' }], ''],
];

(async () => {
  for (const [cevap, beklenen] of bekle) {
    const gelen = await hata(cevap);
    if (gelen !== beklenen) {
      process.stdout.write('beklenen "' + beklenen + '", gelen "' + gelen + '"');
      process.exitCode = 1;
      return;
    }
  }

  const tukenmis = await hata([{ status: 200, body: 'kucuk' }], {
    basla: Date.now() - PIM.SURE_TAVANI - 1,
  });
  if (tukenmis !== 'toplam süre aşıldı') {
    process.stdout.write(
      'bütçe tükenince "toplam süre aşıldı" beklenirdi, gelen "' + tukenmis + '"'
    );
    process.exitCode = 1;
    return;
  }

  const verilen = [];
  const olcenGet = (u, o, cb) => {
    verilen.push(o.timeout);
    return sahteGet([{ status: 200, body: 'kucuk' }])(u, o, cb);
  };
  await PIM.indir(IYI, { get: olcenGet, basla: Date.now() - (PIM.SURE_TAVANI - 5000) });
  if (!(verilen[0] > 0 && verilen[0] <= 5000)) {
    process.stdout.write('istek zaman aşımı kalan bütçeden düşmeli, verilen: ' + verilen[0]);
    process.exitCode = 1;
    return;
  }
  process.stdout.write('tamam');
})();
