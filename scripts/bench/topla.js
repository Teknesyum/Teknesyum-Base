#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const KOK = path.resolve(__dirname, '..', '..');
const SONUC_KOK = path.join(KOK, 'bench', 'sonuc');
const TABAN_JS = path.join(KOK, 'scripts', 'olcum', 'taban.js');
const RAPOR_MD = path.join(KOK, 'docs', 'BENCH-SONUC.md');
const TOPLAM_JSON = path.join(SONUC_KOK, 'toplam.json');

const GOREVLER = ['ozellik', 'hata', 'rapor', 'teksatir'];
const PROJE_GOREVI = 'proje';
const TUM_GOREVLER = GOREVLER.concat([PROJE_GOREVI]);
const DURUMLAR = ['premium', 'normal', 'eco', 'native'];

// Proje kosusu mikro kosudan ~8 kat buyuk. Gecerlilik kapisi projeleri kosullara esitsiz
// dagittigi icin ham ortalama "kac proje kosusu hayatta kaldi"yi olcer, verimi degil:
// her sutun gorev sinifi ICINDE hesaplanir, siniflar arasi ham toplama yapilmaz.
const SINIFLAR = [
  { ad: 'proje', baslik: 'proje görevi' },
  { ad: 'mikro', baslik: 'mikro görev' },
];

// Uretim ciktilari (toplam.json, proje-istatistik.json) kosu dosyasi sanilmasin diye
// kara liste degil desen beyaz listesi: istatistik.js ile ayni yaklasim.
const KOSU_DOSYASI = new RegExp(
  `^(${TUM_GOREVLER.join('|')})__(${DURUMLAR.join('|')})(__r\\d+)?\\.json$`
);

function sinifi(k) {
  return k.gorev === PROJE_GOREVI ? 'proje' : 'mikro';
}

const FARK_ESIGI = 20;
const TUREV_ESIGI = 0.9;
// Iki ayri ariza, tek etikete indirgenmez: kota duvari vs kimlik/OAuth cokusu.
const LIMIT_ZAYIF = /session limit/i;
const LIMIT_GUCLU = /hit your session limit/i;
const OAUTH_BOZUK = /OAuth session expired|invalid_grant|refresh token (?:expired|invalid)/i;

// Bu blok uretilen rapora her kosuda yeniden basilir: elle eklenen errata bir sonraki
// `node scripts/bench/topla.js` kosusunda silinirdi, sablona alindi.
const ERRATA = [
  '> **GEÇERSİZLİK UYARISI (26.08.2026)**',
  '>',
  '> Bu raporun 26.08.2026 öncesi sürümleri geçerli koşu kapısı olmadan üretildi: oturum',
  "> kotasına çarpıp ortasından kesilen koşular (`You've hit your session limit`) geçerli",
  '> sonuç sayıldı, çünkü `kos.js` çıkış kodunu başarı kararına katmıyordu. Bu sürüm o',
  '> koşuları eler; hangilerinin elendiği §0 bölümünde nedenleriyle yazılıdır.',
  '>',
  '> Geri çekilen hükümler:',
  '>',
  '> - ~~"premium 27 kusurla yarım teslim etti"~~ — 27 kusur kota kesintisinin artefaktıdır;',
  '>   model `rapor.js`i yazmış, `cli.js`e sıra gelmeden kesilmiş. Kesilen koşular',
  '>   elendiğinde eklentili koşullarda hiç kusur kalmıyor.',
  '> - ~~"eco en çok bağlam okudu"~~ — sıralama tur sayısı sıralamasının aynısıdır',
  '>   (r(tur, cacheRead) = 0,992). Cache-read birincil metrik olmaktan çıkarıldı, §6.',
  '> - ~~"randomize blok"~~ — eski düzenekte hiçbir rastgeleleştirme yoktu, koşul sırası',
  '>   her blokta sabitti. Tohumlu permütasyon sonradan eklendi.',
  '>',
  '> **Eşzamanlılık şerhi.** Mikro bench\'in 16 koşusu tek hesapta eşzamanlı koştu; kota ve',
  '> kuyruk çekişmesi denetlenmedi. Koşullar arası süre farkları bu çekişmeyi de içerebilir,',
  '> yalnız eklenti yükünü değil. Ayrıca 26.08\'de ana `.credentials.json` dosyasının',
  '> boşaldığı görüldü (token alanları uzunluk 0, `expiresAt` 0): o günkü bazı "oturum',
  '> limiti" olaylarının gerçek nedeni kota değil kimlik bozulması olabilir. `kos.js` artık',
  '> `session limit` ile `OAuth session expired` imzalarını ayrı raporluyor.',
  '>',
  '>',
  '> **Dengesiz karışım.** İlk sürümde §4 verim tablosu proje koşularıyla mikro koşuları tek',
  '> ortalamada topluyordu. Geçerlilik kapısı proje koşularını koşullara eşitsiz dağıttığı',
  '> (premium 1, normal 1, eco 2, native 3 proje koşusu; mikro her koşulda 4) ve proje koşusu',
  '> mikro koşudan ~8 kat büyük olduğu için ham ortalama fiilen "hangi koşulda kaç proje',
  '> koşusu hayatta kaldı"yı ölçtü ve **ters işaretli** bir hüküm üretti: "native premium\'dan',
  '> %53,8 fazla taze token tüketti". Sınıf içi tablo bunun tersini gösteriyor. Verim tablosu,',
  '> iş/dakika, toplam süre ve fark hükmü artık görev sınıfı içinde hesaplanıyor; bir sınıfın',
  '> geçerli koşusu olmayan hücre "veri yok" basar, karşılaştırmaya girmez.',
  '>',
  '> Kaynak: `docs/BRIFING-ONARIM.md` §2. Bu blok `scripts/bench/topla.js` içinde yaşar;',
  '> bu dosyaya elle yazılan not bir sonraki üretimde silinir.',
];

let tabanOnbellek = null;

function taban() {
  if (tabanOnbellek) return tabanOnbellek;
  const kaynak = fs.readFileSync(TABAN_JS, 'utf8');
  const modul = { exports: {} };
  const sahteProcess = new Proxy(process, {
    get: (h, k) => (k === 'argv' ? [process.argv[0], TABAN_JS] : Reflect.get(h, k)),
  });
  const fn = new Function(
    'require',
    'module',
    'exports',
    '__filename',
    '__dirname',
    'process',
    'console',
    `${kaynak}\nmodule.exports = { ozetle, tokenTahmini };`
  );
  fn(
    require,
    modul,
    modul.exports,
    TABAN_JS,
    path.dirname(TABAN_JS),
    sahteProcess,
    { log() {}, error() {} }
  );
  tabanOnbellek = modul.exports;
  return tabanOnbellek;
}

function transkriptleriTopla(kok) {
  const cikti = [];
  const yigin = [kok];
  while (yigin.length > 0) {
    const dizin = yigin.pop();
    let girisler;
    try {
      girisler = fs.readdirSync(dizin, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const giris of girisler) {
      const tam = path.join(dizin, giris.name);
      if (giris.isDirectory()) yigin.push(tam);
      else if (giris.name.endsWith('.jsonl')) cikti.push(tam);
    }
  }
  return cikti.sort();
}

function bicim(n) {
  return n === null || n === undefined ? '-' : n.toLocaleString('tr-TR');
}

function kusurSayisi(dogrulama) {
  if (!dogrulama) return null;
  if (dogrulama.gecti) return 0;
  const g = String(dogrulama.cikti || '').replace(/^KIRMIZI\s*·\s*/, '');
  if (!g.trim()) return 1;
  return g.split('|').filter((x) => x.trim()).length;
}

function say(x) {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

// Gecerli kosu kapisi: cikis kodu, tavan, is_error ve oturum limiti imzasi. Kosuyu
// atmaz, damgalar — elenenler raporun kendi bolumunde nedenleriyle listelenir.
function gecerlilik(ham) {
  const nedenler = [];
  if (ham.hata) nedenler.push('kurulum hatasi: ' + ham.hata);
  if (ham.tavanAsildi && !ham.planliKesinti) nedenler.push('tavan asildi');
  // Planli kesinti cikis kodunu da bozar (taskkill /F -> 1). Kesinti kolunda bu ariza
  // degil olcunun kendisi; yalniz kesinti aninda gecerli sayilir.
  if (say(ham.cikisKodu) !== null && ham.cikisKodu !== 0 && !ham.planliKesinti)
    nedenler.push('cikis kodu ' + ham.cikisKodu);
  if (ham.planliKesinti && ham.agacOldu === false)
    nedenler.push('surec agaci oldurulemedi (oksuz surec kalmis olabilir)');
  if (ham.isError) nedenler.push('json is_error');
  if (ham.kimlikBozuk) nedenler.push('ana kimlik dosyasi bozuk (kosu boyunca)');
  const yakin = [(ham.kurulumGunlugu || []).join('\n'), ham.ciktiOzeti || ''].join('\n');
  let limit = LIMIT_ZAYIF.test(yakin);
  let oauth = OAUTH_BOZUK.test(yakin);
  if ((!limit || !oauth) && ham.transkript && fs.existsSync(ham.transkript)) {
    try {
      const t = fs.readFileSync(ham.transkript, 'utf8');
      // §1 iki dizgiyi de tetikleyici sayar: zayif imza guclu imzayi kapsar, ikisi de aranir.
      limit = limit || LIMIT_ZAYIF.test(t) || LIMIT_GUCLU.test(t);
      oauth = oauth || OAUTH_BOZUK.test(t);
    } catch {
      /* transkript okunamadi, yakin metinle yetinilir */
    }
  }
  if (limit) nedenler.push('oturum limiti imzasi');
  if (oauth) nedenler.push('OAuth oturumu dustu (kimlik arizasi)');
  return {
    gecerli: nedenler.length === 0,
    gecersizNedeni: nedenler.length ? nedenler.join(' · ') : null,
  };
}

function pearson(x, y) {
  const c = [];
  for (let i = 0; i < x.length; i++)
    if (say(x[i]) !== null && say(y[i]) !== null) c.push([x[i], y[i]]);
  const n = c.length;
  if (n < 3) return null;
  const mx = c.reduce((t, p) => t + p[0], 0) / n;
  const my = c.reduce((t, p) => t + p[1], 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [a, b] of c) {
    sxy += (a - mx) * (b - my);
    sxx += (a - mx) * (a - mx);
    syy += (b - my) * (b - my);
  }
  if (sxx === 0 || syy === 0) return null;
  return Number((sxy / Math.sqrt(sxx * syy)).toFixed(4));
}

// Gorev sinifi ic ortalamasina gore merkezler: aksi halde korelasyon sadece "proje
// teksatirdan buyuk"u olcer, metrigin tur sayisina bagimliligini degil.
function merkezle(kosular, al) {
  const grup = new Map();
  for (const k of kosular) {
    const v = say(al(k));
    if (v === null) continue;
    if (!grup.has(k.gorev)) grup.set(k.gorev, []);
    grup.get(k.gorev).push(v);
  }
  const ort = new Map();
  for (const [g, liste] of grup) ort.set(g, liste.reduce((a, b) => a + b, 0) / liste.length);
  return kosular.map((k) => {
    const v = say(al(k));
    return v === null || !ort.has(k.gorev) ? null : v - ort.get(k.gorev);
  });
}

// Tur sayisiyla |r| > 0,9 olan metrik bagimsiz bilgi tasimaz: turev damgasi alir.
function turevTaramasi(kosular, alanlar) {
  const tur = merkezle(kosular, (k) => k.tur);
  return alanlar.map((a) => {
    const r = pearson(merkezle(kosular, a.al), tur);
    return { ad: a.ad, baslik: a.baslik, r, turev: r !== null && Math.abs(r) > TUREV_ESIGI };
  });
}

function harnessKarsilastir(o) {
  const harness = (o.butceIlk ?? 0) - (o.butceSon ?? 0);
  const n = o.turSirasi.length;
  if (harness <= 0 || n < 2) return { harness: harness || null, yeniden: null, sapmaYuzde: null };
  const t = o.turSirasi[n - 2];
  const yeniden = t.input + t.cc + t.cr + t.out;
  return {
    harness,
    yeniden,
    sapmaYuzde: Number((((yeniden - harness) / harness) * 100).toFixed(2)),
  };
}

async function kosuOzeti(dosya) {
  const s = JSON.parse(fs.readFileSync(dosya, 'utf8'));
  const g = gecerlilik(s);
  const k = {
    anahtar: s.anahtar,
    gorev: s.gorev,
    durum: s.durum,
    tekrar: s.tekrar ?? null,
    gecerli: g.gecerli,
    gecersizNedeni: g.gecersizNedeni,
    basari: g.gecerli && s.dogrulama ? (s.dogrulama.gecti ? 1 : 0) : null,
    kusur: g.gecerli ? kusurSayisi(s.dogrulama) : null,
    sureMs: s.sureMs,
    tavanAsildi: !!s.tavanAsildi,
    hata: s.hata,
    modelId: s.modelId,
    bildirilenTur: s.bildirilenTur ?? null,
    maliyetUsd: s.maliyetUsd ?? null,
    transkriptVar: false,
    serh: null,
    tur: null,
    ana: null,
    alt: null,
    toplamKalem: null,
    ajanSayisi: null,
    harness: null,
  };

  if (!s.transkript || !fs.existsSync(s.transkript)) {
    k.serh = 'transkript yok — sonuç JSON alanlarıyla yetinildi';
    k.tur = s.bildirilenTur ?? null;
    k.ajanSayisi = null;
    return k;
  }

  const { ozetle } = taban();
  const o = await ozetle(s.transkript);
  k.transkriptVar = true;
  k.tur = o.tur;
  k.ana = { input: o.input, cc: o.cc, cr: o.cr, out: o.out };
  k.modelId = k.modelId || [...o.modeller.keys()][0] || null;
  k.harness = harnessKarsilastir(o);

  const alt = { input: 0, cc: 0, cr: 0, out: 0, tur: 0, dosya: 0 };
  const projeKoku = path.join(s.konfig, 'projects');
  // OLCULDU 27.08.2026: iki oturumlu kosuda ikinci oturumun transkripti "alt ajan"
  // sayiliyordu, ajan sayisi sutunu siserek okunuyordu. Alt ajan yalniz subagents/
  // altinda yasar.
  for (const t of transkriptleriTopla(projeKoku)) {
    if (path.resolve(t) === path.resolve(s.transkript)) continue;
    if (!t.includes(path.sep + 'subagents' + path.sep) && !t.includes('/subagents/')) continue;
    const a = await ozetle(t);
    alt.input += a.input;
    alt.cc += a.cc;
    alt.cr += a.cr;
    alt.out += a.out;
    alt.tur += a.tur;
    alt.dosya += 1;
  }
  k.alt = alt;
  k.ajanSayisi = 1 + alt.dosya;
  k.toplamKalem = {
    input: k.ana.input + alt.input,
    cc: k.ana.cc + alt.cc,
    cr: k.ana.cr + alt.cr,
    out: k.ana.out + alt.out,
  };
  return k;
}

async function topla() {
  if (!fs.existsSync(SONUC_KOK)) throw new Error(`sonuc koku yok: ${SONUC_KOK}`);
  const dosyalar = fs
    .readdirSync(SONUC_KOK)
    .filter((f) => KOSU_DOSYASI.test(f))
    .map((f) => path.join(SONUC_KOK, f))
    .sort();
  const kosular = [];
  for (const d of dosyalar) kosular.push(await kosuOzeti(d));
  return kosular;
}

// Sinif zorunlu: karisik havuzdan ortalama alinmaz. Sinifin o kosulda hic gecerli
// kosusu yoksa veriYok:true doner, hucre karsilastirmaya girmez.
function durumVerimi(kosular, durum, sinif) {
  const liste = kosular.filter((k) => k.durum === durum && sinifi(k) === sinif);
  const n = liste.length;
  const basarili = liste.filter((k) => k.basari === 1).length;
  const sureMs = liste.reduce((t, k) => t + (k.sureMs || 0), 0);
  const dk = sureMs / 60000;
  const kalem = { input: 0, cc: 0, cr: 0, out: 0 };
  let kalemliK = 0;
  for (const k of liste) {
    if (!k.toplamKalem) continue;
    kalemliK++;
    for (const a of ['input', 'cc', 'cr', 'out']) kalem[a] += k.toplamKalem[a];
  }
  const kusur = liste.reduce((t, k) => t + (k.kusur || 0), 0);
  return {
    durum,
    sinif,
    veriYok: n === 0,
    gorevSayisi: n,
    basarili,
    basariYuzde: n ? Math.round((basarili / n) * 100) : null,
    toplamSureSn: n ? Math.round(sureMs / 1000) : null,
    isPerDakika: dk > 0 ? Number((basarili / dk).toFixed(2)) : null,
    gorevBasinaKalem: kalemliK
      ? {
          input: Math.round(kalem.input / kalemliK),
          cc: Math.round(kalem.cc / kalemliK),
          cr: Math.round(kalem.cr / kalemliK),
          out: Math.round(kalem.out / kalemliK),
        }
      : null,
    kusur: n ? kusur : null,
    kusurPerGorev: n ? Number((kusur / n).toFixed(2)) : null,
    maliyetUsd: n ? Number(liste.reduce((t, k) => t + (k.maliyetUsd || 0), 0).toFixed(4)) : null,
  };
}

function verimSatirlari(kosular) {
  const L = [];
  for (const s of SINIFLAR) {
    L.push(`[${s.baslik}]`);
    L.push(
      `${'kosul'.padEnd(9)}${'basari'.padEnd(9)}${'is/dk'.padEnd(8)}${'gorev basina in/cc/out'.padEnd(34)}${'kusur/gorev'.padEnd(12)}sure`
    );
    for (const d of DURUMLAR) {
      const v = durumVerimi(kosular, d, s.ad);
      if (v.veriYok) {
        L.push(d.padEnd(9) + 'veri yok');
        continue;
      }
      const kb = v.gorevBasinaKalem;
      L.push(
        d.padEnd(9) +
          `${v.basarili}/${v.gorevSayisi} %${v.basariYuzde}`.padEnd(9) +
          String(v.isPerDakika ?? '-').padEnd(8) +
          (kb ? `${bicim(kb.input)}/${bicim(kb.cc)}/${bicim(kb.out)}` : '-').padEnd(34) +
          String(v.kusurPerGorev ?? '-').padEnd(12) +
          `${v.toplamSureSn} sn`
      );
    }
    L.push('');
  }
  return L;
}

function hucre(k) {
  if (!k) return '—';
  const parcalar = [];
  parcalar.push(
    `**${k.basari === null ? '?' : k.basari}**${k.tavanAsildi ? ' TAVAN' : ''}${k.hata ? ' HATA' : ''}`
  );
  if (k.toplamKalem) {
    parcalar.push(
      `in ${bicim(k.toplamKalem.input)} · cc ${bicim(k.toplamKalem.cc)}`,
      `out ${bicim(k.toplamKalem.out)}`
    );
  } else {
    parcalar.push('token: transkript yok');
  }
  parcalar.push(
    `${k.sureMs ? Math.round(k.sureMs / 1000) : '-'} sn · ${k.tur ?? '-'} tur · ${k.ajanSayisi ?? '?'} ajan`
  );
  return parcalar.join('<br>');
}

// Yalniz ayni sinif icindeki degerleri karsilastirir. Verisi olmayan kosul hucresi
// sifir sayilmaz, karsilastirmadan cikar ve "veri yok" olarak bildirilir.
function farkYorumu(kosular, alan, sinif) {
  const deger = {};
  const veriYok = [];
  for (const d of DURUMLAR) {
    const v = durumVerimi(kosular, d, sinif);
    if (v.veriYok || !v.gorevBasinaKalem) {
      veriYok.push(d);
      continue;
    }
    deger[d] = alan === 'taze' ? v.gorevBasinaKalem.input + v.gorevBasinaKalem.cc + v.gorevBasinaKalem.out : v.gorevBasinaKalem.cr;
  }
  const sirali = Object.entries(deger).sort((a, b) => a[1] - b[1]);
  if (sirali.length < 2) return { sinif, deger, veriYok, yetersiz: true, enAz: null, enCok: null, yuzde: null };
  const [enAz, enCok] = [sirali[0], sirali[sirali.length - 1]];
  const yuzde = enAz[1] ? ((enCok[1] - enAz[1]) / enAz[1]) * 100 : 0;
  return { sinif, deger, veriYok, yetersiz: false, enAz, enCok, yuzde: Number(yuzde.toFixed(1)) };
}

function sinifIcindeFark(f, baslik) {
  const serh = f.veriYok.length ? ` Veri yok: ${f.veriYok.join(', ')}.` : '';
  if (f.yetersiz)
    return `${baslik}: karşılaştırılacak yeterli veri yok (en az iki koşul gerekiyor).${serh}`;
  return (
    `${baslik}, görev başına: en az **${f.enAz[0]}** ${bicim(f.enAz[1])}, en çok ` +
    `**${f.enCok[0]}** ${bicim(f.enCok[1])} — aralık %${f.yuzde}. ` +
    `${f.yuzde >= FARK_ESIGI ? '**Fark var.**' : 'Ayırt edilemedi.'}${serh}`
  );
}

function rapor(kosular, elenenler = []) {
  const bul = (g, d) => kosular.find((k) => k.gorev === g && k.durum === d);
  const L = [];
  L.push('# Bench sonucu — dört görev × dört koşul');
  L.push('');
  L.push(
    `Üretim: \`node scripts/bench/topla.js\` — ham koşu dosyaları \`bench/sonuc/*.json\`, bu dosya ve \`bench/sonuc/toplam.json\` o komutla yeniden yazılır.`
  );
  L.push('');
  for (const s of ERRATA) L.push(s);
  L.push('');
  L.push(
    `Geçerli koşu sayısı: **${kosular.length}** · elenen: **${elenenler.length}** · görevler: ${GOREVLER.join(', ')} · koşullar: ${DURUMLAR.join(', ')}.`
  );
  L.push('');
  L.push('## 0. Elenen koşular');
  L.push('');
  if (!elenenler.length) {
    L.push('Elenen koşu yok — bütün koşular geçerli koşu kapısından geçti.');
  } else {
    L.push(
      'Bu koşular çıkış kodu, tavan, `is_error` ya da oturum limiti imzası nedeniyle geçersiz damgalandı. Aşağıdaki hiçbir tabloya, ortalamaya ve hükme girmezler; `kusur` alanları 0 değil **bilinmiyor**dur.'
    );
    L.push('');
    L.push('| koşu | neden |');
    L.push('|---|---|');
    for (const k of elenenler) L.push(`| ${k.anahtar}${k.tekrar ? ` r${k.tekrar}` : ''} | ${k.gecersizNedeni} |`);
  }
  L.push('');
  L.push('## 1. Tablo — satır görev, sütun koşul');
  L.push('');
  L.push(
    'Hücre: başarı (1/0) · birincil token kalemleri (input / cache-create / output) · duvar saati · tur · ajan sayısı. Tek toplam token yazılmaz (BENCH-YONTEM.md §5). Cache-read birincil değildir, §6 türev metrikler bölümünde.'
  );
  L.push('');
  L.push(`| görev | ${DURUMLAR.join(' | ')} |`);
  L.push(`|---|${DURUMLAR.map(() => '---').join('|')}|`);
  for (const g of GOREVLER) {
    L.push(`| **${g}** | ${DURUMLAR.map((d) => hucre(bul(g, d))).join(' | ')} |`);
  }
  L.push('');
  L.push('## 2. Koşu dökümü');
  L.push('');
  L.push('| koşu | başarı | input | cache-create | output | süre | tur | ajan | kusur | model | harness sapma |');
  L.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|');
  for (const k of kosular) {
    const t = k.toplamKalem;
    L.push(
      `| ${k.anahtar} | ${k.basari ?? '?'} | ${t ? bicim(t.input) : '-'} | ${t ? bicim(t.cc) : '-'} | ${t ? bicim(t.out) : '-'} | ${k.sureMs ? `${Math.round(k.sureMs / 1000)} sn` : '-'} | ${k.tur ?? '-'} | ${k.ajanSayisi ?? '?'} | ${k.kusur ?? '?'} | ${k.modelId || '-'} | ${k.harness && k.harness.sapmaYuzde !== null ? `%${k.harness.sapmaYuzde}` : '-'} |`
    );
  }
  L.push('');
  const serhli = kosular.filter((k) => k.serh);
  if (serhli.length) {
    L.push(`> Şerh: ${serhli.length} koşuda transkript bulunamadı (${serhli.map((k) => k.anahtar).join(', ')}); o satırların token kalemleri boş, kalan alanlar sonuç JSON'undan okundu.`);
    L.push('');
  }
  const altVar = kosular.filter((k) => k.alt && k.alt.dosya > 0);
  L.push(
    `Alt ajan transkriptleri de gezildi (\`konfig/projects\` altındaki tüm \`.jsonl\`): ${altVar.length ? `${altVar.length} koşuda alt ajan bulundu, tokenları yukarıdaki kalemlere dahil` : 'hiçbir koşuda alt ajan açılmadı, ajan sayısı her hücrede 1'}.`
  );
  L.push('');

  L.push('## 3. Toplayıcı doğrulaması — harness sayacı');
  L.push('');
  L.push(
    "Harness'ın `total_tokens` sayacı bağlam işgalini ölçer: son hatırlatıcı anındaki bağlam (input + cache-create + cache-read) artı o turun çıktısı. Aynı büyüklük transkriptten okunan tur dizisinden yeniden kuruldu; iki sayının farkı toplayıcının doğruluk ölçüsü."
  );
  L.push('');
  L.push('| koşu | harness sayacı | transkriptten yeniden | sapma |');
  L.push('|---|---:|---:|---:|');
  for (const k of kosular) {
    if (!k.harness) continue;
    L.push(
      `| ${k.anahtar} | ${bicim(k.harness.harness)} | ${bicim(k.harness.yeniden)} | %${k.harness.sapmaYuzde ?? '-'} |`
    );
  }
  const sapmalar = kosular.filter((k) => k.harness && k.harness.sapmaYuzde !== null).map((k) => Math.abs(k.harness.sapmaYuzde));
  L.push('');
  L.push(
    `En büyük sapma **%${sapmalar.length ? Math.max(...sapmalar) : '-'}** — kabul eşiği %5.`
  );
  L.push('');

  L.push('## 4. Verim');
  L.push('');
  L.push(
    'Her sütun **görev sınıfı içinde** hesaplanır. Proje koşusu mikro koşudan ~8 kat büyüktür ve geçerlilik kapısı proje koşularını koşullara eşitsiz dağıttı; sınıfları tek ortalamada toplamak "hangi koşulda kaç proje koşusu hayatta kaldı"yı ölçer, verimi değil. Bir koşulda bir sınıfın geçerli koşusu yoksa hücre **veri yok**tur — sıfır değil, atlanmış da değil.'
  );
  L.push('');
  for (const s of SINIFLAR) {
    L.push(`### 4.${SINIFLAR.indexOf(s) + 1} ${s.baslik}`);
    L.push('');
    L.push('| koşul | başarı | iş/dakika | görev başına in / cc / out | kusur/görev | toplam süre | bildirilen maliyet |');
    L.push('|---|---:|---:|---:|---:|---:|---:|');
    for (const d of DURUMLAR) {
      const v = durumVerimi(kosular, d, s.ad);
      if (v.veriYok) {
        L.push(`| ${d} | veri yok | veri yok | veri yok | veri yok | veri yok | veri yok |`);
        continue;
      }
      const kb = v.gorevBasinaKalem;
      L.push(
        `| ${d} | ${v.basarili}/${v.gorevSayisi} (%${v.basariYuzde}) | ${v.isPerDakika ?? '-'} | ${kb ? `${bicim(kb.input)} / ${bicim(kb.cc)} / ${bicim(kb.out)}` : '-'} | ${v.kusurPerGorev ?? '-'} | ${v.toplamSureSn} sn | $${v.maliyetUsd} |`
      );
    }
    L.push('');
  }
  L.push(
    'Bug oranı `dogrula.js`in bulduğu kusur sayısından gelir: geçen koşu 0 kusur, kalan koşuda `KIRMIZI ·` satırındaki `|` ile ayrılmış madde sayısı.'
  );
  L.push('');

  L.push('## 5. n=1 şerhi');
  L.push('');
  L.push(
    `Her hücre tek koşudur. Aynı istem iki kez koşulduğunda model farklı sayıda araç çağırabilir, dolayısıyla küçük aralıklar gürültüdür. Burada bir aralık ancak **%${FARK_ESIGI}**'yi aşarsa "fark" diye yazılır. Aralık **yalnız aynı görev sınıfı içinde** okunur; karışık havuzdan "fark var" hükmü üretilmez.`
  );
  L.push('');
  for (const s of SINIFLAR) {
    L.push(`- ${s.baslik} — ${sinifIcindeFark(farkYorumu(kosular, 'taze', s.ad), 'Taze token (input+cc+out)')}`);
  }
  // ÖLÇÜLDÜ 27.08 (konsey üyesi buldu): `every` boş dizide `true` döner. Bütün koşular
  // geçerlilik kapısında elenirse rapor "tamamı geçti" yazıyordu — sıfır veriden başarı
  // hükmü. Boş küme artık ayrı cümle kurar; hüküm yalnız veri varken verilir.
  const basariHepsi = kosular.length > 0 && kosular.every((k) => k.basari === 1);
  L.push(
    `- Başarı: ${
      !kosular.length
        ? '**geçerli koşu yok** — bütün koşular geçerlilik kapısında elendi, başarı ekseninde hüküm verilemez.'
        : basariHepsi
          ? 'dört koşulun tamamı dört görevi de geçti — bu görev seti koşulları başarı ekseninde ayırmıyor, ayrım yalnız token ve sürede.'
          : 'koşullar arasında başarı farkı var, ayrıntı §4.'
    }`
  );
  L.push('');

  L.push('## 6. Türev metrikler');
  L.push('');
  L.push(
    `Her metriğin tur sayısıyla Pearson korelasyonu hesaplandı; değerler görev sınıfı içinde merkezlendi, yoksa korelasyon yalnızca "proje görevi tekşatırdan büyük"ü ölçerdi. |r| > ${TUREV_ESIGI} olan metrik bağımsız bilgi taşımaz — tur sayısını başka birimle tekrar yazar — ve **türev** damgası alır. Türev metrikler birincil tablolarda kullanılmaz, hüküm dayanağı olamaz.`
  );
  L.push('');
  const turevler = turevTaramasi(kosular, [
    { ad: 'tazeToken', baslik: 'taze token (in+cc+out)', al: (k) => (k.toplamKalem ? k.toplamKalem.input + k.toplamKalem.cc + k.toplamKalem.out : null) },
    { ad: 'cacheRead', baslik: 'cache-read', al: (k) => (k.toplamKalem ? k.toplamKalem.cr : null) },
    { ad: 'sureSn', baslik: 'süre (sn)', al: (k) => (k.sureMs ? k.sureMs / 1000 : null) },
    { ad: 'kusur', baslik: 'kusur', al: (k) => k.kusur },
    { ad: 'ajan', baslik: 'ajan sayısı', al: (k) => k.ajanSayisi },
  ]);
  L.push('| metrik | r(tur) | damga |');
  L.push('|---|---:|---|');
  for (const t of turevler)
    L.push(`| ${t.baslik} | ${t.r === null ? '-' : t.r} | ${t.turev ? '**türev**' : 'birincil'} |`);
  L.push('');
  const crTurev = turevler.find((t) => t.ad === 'cacheRead' && t.turev);
  for (const s of SINIFLAR) {
    L.push(`- ${s.baslik} — ${sinifIcindeFark(farkYorumu(kosular, 'cr', s.ad), 'Cache-read')}`);
  }
  L.push('');
  L.push(
    crTurev
      ? 'Yukarıdaki aralıklar türev bir metriğe aittir, koşullar arası hüküm için kullanılamaz.'
      : 'Cache-read bu veride türev damgası almadı, aralıklar birincil sayılabilir.'
  );
  L.push('');
  L.push('| koşu | cache-read | tur |');
  L.push('|---|---:|---:|');
  for (const k of kosular)
    L.push(
      `| ${k.anahtar}${k.tekrar ? `__r${k.tekrar}` : ''} | ${k.toplamKalem ? bicim(k.toplamKalem.cr) : '-'} | ${k.tur ?? '-'} |`
    );
  L.push('');
  L.push('---');
  L.push('');
  L.push(
    'Bu dosya üretilir; elle düzenlenmez. Bir önceki (geçersiz sayılan Chess960) tur raporu git geçmişinde durur.'
  );
  L.push('');
  return L.join('\n');
}

async function main() {
  const hepsi = await topla();
  if (!hepsi.length) {
    process.stderr.write(`sonuc dosyasi yok: ${SONUC_KOK}\n`);
    process.exit(1);
  }
  const kosular = hepsi.filter((k) => k.gecerli);
  const elenenler = hepsi.filter((k) => !k.gecerli);
  const verim = {};
  for (const s of SINIFLAR) {
    verim[s.ad] = {};
    for (const d of DURUMLAR) verim[s.ad][d] = durumVerimi(kosular, d, s.ad);
  }
  fs.writeFileSync(
    TOPLAM_JSON,
    `${JSON.stringify({ uretim: new Date().toISOString(), kosular, elenenler, verim }, null, 2)}\n`,
    'utf8'
  );
  fs.writeFileSync(RAPOR_MD, rapor(kosular, elenenler), 'utf8');
  process.stdout.write(`gecerli kosu: ${kosular.length} · elenen: ${elenenler.length}\n`);
  for (const k of elenenler)
    process.stdout.write(`  elendi ${k.anahtar}${k.tekrar ? `__r${k.tekrar}` : ''} — ${k.gecersizNedeni}\n`);
  process.stdout.write('\n');
  for (const s of verimSatirlari(kosular)) process.stdout.write(`${s}\n`);
  process.stdout.write(`\nrapor: ${RAPOR_MD}\nham toplam: ${TOPLAM_JSON}\n`);
  const sapmalar = kosular
    .filter((k) => k.harness && k.harness.sapmaYuzde !== null)
    .map((k) => Math.abs(k.harness.sapmaYuzde));
  if (sapmalar.length) {
    const en = Math.max(...sapmalar);
    process.stdout.write(`harness karsilastirmasi: en buyuk sapma %${en} (esik %5)\n`);
    if (en > 5) process.exitCode = 1;
  }
}

module.exports = {
  topla,
  kosuOzeti,
  durumVerimi,
  verimSatirlari,
  gecerlilik,
  pearson,
  turevTaramasi,
  farkYorumu,
  sinifi,
  GOREVLER,
  TUM_GOREVLER,
  DURUMLAR,
  SINIFLAR,
  TUREV_ESIGI,
};

if (require.main === module) main();
