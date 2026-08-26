#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');

const { gecerlilik } = require('./topla.js');

const KOK = path.resolve(__dirname, '..', '..');
const FIXTURE_KOK = path.join(KOK, 'bench', 'fixtures');
const GOREV_KOK = path.join(KOK, 'bench', 'gorevler');
const SONUC_KOK = path.join(KOK, 'bench', 'sonuc');
const PREMIUM_JS = path.join(KOK, 'teknesyum', 'scripts', 'premium.js');
const ANA_KOK = path.join(process.env.USERPROFILE || process.env.HOME || '.', '.claude');
const KIMLIK = path.join(ANA_KOK, '.credentials.json');

const GOREVLER = ['ozellik', 'hata', 'rapor', 'teksatir'];
const TUM_GOREVLER = GOREVLER.concat(['proje']);
const DURUMLAR = ['premium', 'normal', 'eco', 'native'];

const TAVAN_MS = 4 * 60 * 1000;
const KURULUM_TAVAN_MS = 5 * 60 * 1000;
const MAX_TUR = 30;
const BASLAMA_ARALIGI_MS = 400;
const DOGRULA_TAVAN_MS = 60 * 1000;

const BLOK_MAX_DENEME = 2;
const VARSAYILAN_BEKLE_DK = 0;

const GOREV_TAVAN_MS = { proje: 45 * 60 * 1000 };
const GOREV_MAX_TUR = { proje: 400 };
const GOREV_DOGRULA_TAVAN_MS = { proje: 120 * 1000 };
const KUSUR_ESIGI = { proje: 140 };

function bayrak(ad) {
  return process.argv.includes('--' + ad);
}

function deger(ad) {
  const on = '--' + ad + '=';
  const s = process.argv.find((a) => a.startsWith(on));
  return s ? s.slice(on.length) : null;
}

function damga() {
  return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
}

// istatistik.js ile ayni mulberry32; ayni tohum ayni siralamayi verir.
function prng(tohum) {
  let a = tohum >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function permutasyonSirasi(n, tohum) {
  const rast = prng(tohum);
  const d = [];
  for (let i = 0; i < n; i++) d.push(i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rast() * (i + 1));
    const t = d[i];
    d[i] = d[j];
    d[j] = t;
  }
  return d;
}

function blokTohumu(tohum, blokIndisi, deneme) {
  return (tohum + blokIndisi * 1013 + (deneme - 1) * 7919) >>> 0;
}

// Gecerli kosu kapisi topla.js'te yasar; kos.js sonucu damgalar, kusuru bilinmiyora cevirir.
function damgala(sonuc) {
  const g = gecerlilik(sonuc);
  sonuc.gecerli = g.gecerli;
  sonuc.gecersizNedeni = g.gecersizNedeni;
  if (!g.gecerli) sonuc.kusurSayisi = null;
  return sonuc;
}

function kotayaCarpti(sonuc) {
  return !!(sonuc && sonuc.gecersizNedeni && /oturum limiti/.test(sonuc.gecersizNedeni));
}

function slug(p) {
  return path.resolve(p).replace(/[^a-zA-Z0-9]/g, '-');
}

function ozet(metin) {
  return crypto.createHash('sha256').update(metin).digest('hex').slice(0, 16);
}

// OLCULDU 27.08.2026 (konsey tur 2, uye bulgusu - defter B1): `c.kill()` Windows'ta
// yalniz tutamac sahibini olduruyor. `claude`'un dogurdugu rg/git/hook node surecleri
// oksuz kalip kendi konfiglerine yazmaya devam ediyor - kota yiyor, transkripti kirletiyor.
function agaciOldur(c) {
  if (!c.pid) return false;
  const r = spawnSync('taskkill', ['/PID', String(c.pid), '/T', '/F'], {
    windowsHide: true,
    timeout: 15000,
    encoding: 'utf8',
  });
  if (!r.error && (r.status === 0 || r.status === 128)) return true;
  try {
    c.kill();
  } catch {}
  return false;
}

function kos(cmd, args, opt = {}) {
  return new Promise((cozum) => {
    const c = spawn(cmd, args, {
      cwd: opt.cwd || KOK,
      env: { ...process.env, ...(opt.env || {}) },
      windowsHide: true,
      // ÖLÇÜLDÜ (B0): stdin bos boruya baglanirsa `claude` 3 sn bekleyip 1 ile cikiyor.
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    let kesildi = false;
    let agacOldu = null;
    const t = setTimeout(() => {
      kesildi = true;
      agacOldu = agaciOldur(c);
    }, opt.tavan || TAVAN_MS);
    c.stdout.on('data', (d) => {
      out += d;
    });
    c.stderr.on('data', (d) => {
      err += d;
    });
    c.on('close', (kod) => {
      clearTimeout(t);
      cozum({ kod, out, err, kesildi, agacOldu, planli: !!(opt.planliKesinti && kesildi) });
    });
    c.on('error', (e) => {
      clearTimeout(t);
      cozum({ kod: -1, out, err: String(e), kesildi, agacOldu, planli: !!(opt.planliKesinti && kesildi) });
    });
  });
}

function kopyala(kaynak, hedef) {
  fs.mkdirSync(hedef, { recursive: true });
  for (const ad of fs.readdirSync(kaynak).sort()) {
    const a = path.join(kaynak, ad);
    const b = path.join(hedef, ad);
    if (fs.statSync(a).isDirectory()) kopyala(a, b);
    else fs.copyFileSync(a, b);
  }
}

function agacOzeti(dizin, on = '') {
  const parcalar = [];
  for (const ad of fs.readdirSync(dizin).sort()) {
    if (ad === '.git' || ad === 'node_modules') continue;
    const tam = path.join(dizin, ad);
    const goreli = on ? on + '/' + ad : ad;
    if (fs.statSync(tam).isDirectory()) parcalar.push(agacOzeti(tam, goreli));
    else
      parcalar.push(
        goreli + ':' + crypto.createHash('sha256').update(fs.readFileSync(tam)).digest('hex')
      );
  }
  return parcalar.join('\n');
}

function sadelestir(satir) {
  return satir.split(KOK).join('<KOK>').replace(/[A-Za-z]:\\[^\s"']+/g, '<YOL>');
}

// §5: ana kimlik dosyasi salt-okunur kaynaktir. Duzenek onu yazmaz; butunlugu kosu
// oncesi ve sonrasi denetlenir. 26.08'de refresh rotasyonu ana dosyayi bosaltmisti:
// accessToken/refreshToken uzunluk 0, expiresAt 0. Bu "kota" gibi gorunup kota degildi.
function kimlikButunlugu(dosya) {
  if (!fs.existsSync(dosya)) return { saglam: false, neden: 'dosya yok', imza: null };
  let ham;
  try {
    ham = fs.readFileSync(dosya, 'utf8');
  } catch (e) {
    return { saglam: false, neden: 'okunamadi: ' + String((e && e.message) || e), imza: null };
  }
  const imza = ozet(ham);
  let o;
  try {
    const j = JSON.parse(ham);
    o = j.claudeAiOauth || j;
  } catch {
    return { saglam: false, neden: 'JSON cozulemedi', imza };
  }
  const eksik = [];
  if (!o.accessToken || String(o.accessToken).length === 0) eksik.push('accessToken bos');
  if (!o.refreshToken || String(o.refreshToken).length === 0) eksik.push('refreshToken bos');
  if (!Number(o.expiresAt)) eksik.push('expiresAt 0');
  return {
    saglam: eksik.length === 0,
    neden: eksik.length ? eksik.join(', ') : null,
    imza,
    expiresAt: Number(o.expiresAt) || 0,
  };
}

function sonKullanma(dosya) {
  try {
    const j = JSON.parse(fs.readFileSync(dosya, 'utf8'));
    const o = j.claudeAiOauth || j;
    return Number(o.expiresAt) || 0;
  } catch {
    return 0;
  }
}

// ÖLÇÜLDÜ (B0): paralel kosular ayni eski jetonla ayni anda yenilemeye kalkarsa uc tanesi
// "OAuth session expired" alip modele hic ulasmadan sessizce bos doner. Tek kalici kimlik
// koku tutulur, jeton kosulardan once ve sirayla orada tazelenir.
// Tazeleme penceresi kosunun tavanini kapsamali: sabit 30 dk, 45 dk'lik proje tavaninin
// altinda kalip blok ortasinda eszamanli yenilemeye kapi acardi. Pencere = en buyuk gorev
// tavani x blok sayisi + kurulum payi.
function tazelemePenceresiMs(gorevListesi, blokSayisi) {
  const gorevler = gorevListesi && gorevListesi.length ? gorevListesi : TUM_GOREVLER;
  const enBuyuk = gorevler.reduce((t, g) => Math.max(t, GOREV_TAVAN_MS[g] || TAVAN_MS), 0);
  return enBuyuk * Math.max(1, blokSayisi || 1) + KURULUM_TAVAN_MS;
}

async function kimlikHazirla(gunluk, gorevListesi, blokSayisi) {
  const kok = path.join(os.tmpdir(), 'tbench', 'kimlik');
  fs.mkdirSync(kok, { recursive: true });
  const hedef = path.join(kok, '.credentials.json');

  const anaOnce = kimlikButunlugu(KIMLIK);
  gunluk.push(
    'ana kimlik on denetim: ' + (anaOnce.saglam ? 'saglam' : 'BOZUK — ' + anaOnce.neden)
  );
  if (fs.existsSync(KIMLIK) && !anaOnce.saglam) {
    const yedek = kimlikButunlugu(hedef);
    if (!yedek.saglam)
      throw new Error(
        'ana kimlik dosyasi bozuk (' + anaOnce.neden + ') ve izole kokte saglam kopya yok — ' +
          'bu bir kota arizasi degil kimlik arizasidir. ' + KIMLIK +
          ' dosyasini bir kez elle giris yaparak tazeleyin; duzenek bu dosyayi yazmaz.'
      );
    gunluk.push(
      'UYARI: ana kimlik bozuk. Izole kokteki saglam kopyayla devam ediliyor ama ' +
        'BU DALDAN GECERLI SONUC CIKMAZ: kosu sonu denetimi (kimlikSonDenetim) ana dosyayi ' +
        'hala bozuk gorecek ve butun kosulari gecersiz damgalayacak. Kosu yalniz teshis ' +
        'icindir; olcum istiyorsaniz once ' + KIMLIK + ' dosyasini elle giris yaparak tazeleyin.'
    );
  }

  const adaylar = [hedef, KIMLIK].filter((f) => kimlikButunlugu(f).saglam);
  if (!adaylar.length)
    throw new Error('kullanilabilir kimlik dosyasi yok: ' + KIMLIK + ' — izole kokte oturum acilamaz');
  const en = adaylar.sort((a, b) => sonKullanma(b) - sonKullanma(a))[0];
  if (en !== hedef) fs.copyFileSync(en, hedef);
  gunluk.push('kimlik kaynagi: ' + en);
  // Tazeleme SIRALI ve yalniz izole kokte: CLAUDE_CONFIG_DIR=kok, ana dosyaya dokunulmaz.
  const pencere = tazelemePenceresiMs(gorevListesi, blokSayisi);
  gunluk.push('tazeleme penceresi: ' + Math.round(pencere / 60000) + ' dk (kosu tavanini kapsar)');
  if (sonKullanma(hedef) - Date.now() < pencere) {
    const r = await kos('claude', ['-p', 'ping', '--model', 'haiku', '--max-turns', '1'], {
      cwd: kok,
      env: { CLAUDE_CONFIG_DIR: kok },
      tavan: KURULUM_TAVAN_MS,
    });
    gunluk.push('jeton tazeleme kosusu (sirali, izole kok) → kod ' + r.kod);
    const anaSonra = kimlikButunlugu(KIMLIK);
    if (anaSonra.imza !== anaOnce.imza)
      gunluk.push(
        'UYARI: tazeleme sirasinda ana kimlik dosyasi degisti — duzenek yazmadi, ' +
          'baska bir surec dokundu. Sonrasi: ' + (anaSonra.saglam ? 'saglam' : 'BOZUK — ' + anaSonra.neden)
      );
  }
  const kalan = sonKullanma(hedef) - Date.now();
  if (kalan <= 0)
    throw new Error(
      'izole kokte kullanilabilir OAuth jetonu yok — ana kokte bir kez giris yapip ' +
        KIMLIK +
        ' dosyasini tazeleyin'
    );
  gunluk.push('jeton gecerli: ' + Math.round(kalan / 60000) + ' dk kaldi');
  if (kalan < pencere)
    gunluk.push(
      'UYARI: kalan jeton omru pencereden kisa (' + Math.round(kalan / 60000) + ' dk < ' +
        Math.round(pencere / 60000) + ' dk) — jeton blok ortasinda dusebilir; dusen kosular ' +
        'OAuth imzasiyla gecersiz damgalanir.'
    );
  const taban = kimlikButunlugu(KIMLIK);
  return { dosya: hedef, anaImzasi: taban.imza, anaSaglam: taban.saglam, anaNeden: taban.neden };
}

// §5: kosu sonrasi ana dosyanin butunlugu. Bozulma gorulurse kosular gecersiz damgalanir.
function kimlikSonDenetim(taban) {
  const son = kimlikButunlugu(KIMLIK);
  const nedenler = [];
  if (!son.saglam) nedenler.push('ana kimlik bozuldu: ' + son.neden);
  else if (taban.anaSaglam && son.imza !== taban.anaImzasi)
    nedenler.push('ana kimlik dosyasi kosu sirasinda degisti (duzenek yazmaz)');
  return { saglam: !nedenler.length, neden: nedenler.join(' · ') || null };
}

function konfigKur(dizin, kimlikDosyasi) {
  fs.rmSync(dizin, { recursive: true, force: true });
  fs.mkdirSync(dizin, { recursive: true });
  fs.copyFileSync(kimlikDosyasi, path.join(dizin, '.credentials.json'));
}

async function eklentiKur(konfig, gunluk) {
  const env = { CLAUDE_CONFIG_DIR: konfig };
  const a = await kos('claude', ['plugin', 'marketplace', 'add', KOK], {
    env,
    tavan: KURULUM_TAVAN_MS,
  });
  gunluk.push('marketplace add → kod ' + a.kod + ' · ' + (a.out || a.err).trim().slice(0, 160));
  if (a.kod !== 0) return false;
  const b = await kos('claude', ['plugin', 'install', 'teknesyum@teknesyum'], {
    env,
    tavan: KURULUM_TAVAN_MS,
  });
  gunluk.push('plugin install → kod ' + b.kod + ' · ' + (b.out || b.err).trim().slice(0, 160));
  return b.kod === 0;
}

async function profilYaz(konfig, durum, gunluk) {
  const r = await kos(process.execPath, [PREMIUM_JS, durum], {
    env: { CLAUDE_CONFIG_DIR: konfig },
    tavan: KURULUM_TAVAN_MS,
  });
  gunluk.push('premium.js ' + durum + ' → kod ' + r.kod + ' · ' + (r.out || r.err).split('\n')[0].trim());
  return r.kod === 0;
}

function transkriptBul(konfig, fixture, sid) {
  const dizin = path.join(konfig, 'projects', slug(fixture));
  if (!fs.existsSync(dizin)) return null;
  if (sid) {
    const tam = path.join(dizin, sid + '.jsonl');
    if (fs.existsSync(tam)) return tam;
  }
  const liste = fs
    .readdirSync(dizin)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => path.join(dizin, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return liste[0] || null;
}

function transkriptOzeti(dosya) {
  // OLCULDU 27.08.2026: `taskkill /F` transkriptin son satirini yarim birakiyor. Bozuk
  // satiri sessizce atlamak tam da olculmek istenen turu (kesme ani) kayip ediyordu.
  const o = { modelId: null, asistanTuru: 0, aracCagrisi: 0, bozukSatir: 0 };
  for (const satir of fs.readFileSync(dosya, 'utf8').split('\n')) {
    if (!satir.trim()) continue;
    let k;
    try {
      k = JSON.parse(satir);
    } catch {
      o.bozukSatir++;
      continue;
    }
    if (k.type !== 'assistant' || !k.message) continue;
    o.asistanTuru++;
    if (k.message.model) o.modelId = k.message.model;
    const govde = k.message.content;
    if (Array.isArray(govde)) o.aracCagrisi += govde.filter((p) => p.type === 'tool_use').length;
  }
  return o;
}

async function dogrula(gorev, calisma) {
  const betik = path.join(FIXTURE_KOK, gorev, 'dogrula.js');
  const r = await kos(process.execPath, [betik, calisma], {
    tavan: GOREV_DOGRULA_TAVAN_MS[gorev] || DOGRULA_TAVAN_MS,
  });
  return {
    gecti: r.kod === 0,
    cikti: (r.out || r.err).trim().split('\n')[0] || '',
  };
}

// topla.js ile ayni mantik: KIRMIZI satirindaki `|` ile ayrilmis madde sayisi.
function kusurSayisi(dogrulama) {
  if (!dogrulama) return null;
  if (dogrulama.gecti) return 0;
  const g = String(dogrulama.cikti || '').replace(/^KIRMIZI\s*·\s*/, '');
  if (!g.trim()) return 1;
  return g.split('|').filter((x) => x.trim()).length;
}

function kosuAdi(gorev, durum, tekrar) {
  return gorev + '__' + durum + (tekrar === null ? '' : '__r' + tekrar);
}

async function kosu(gorev, durum, tekrar, benchKok, kimlikDosyasi, kuru, tohumBilgisi) {
  const anahtar = gorev + '__' + durum;
  const ad = kosuAdi(gorev, durum, tekrar);
  const konfig = path.join(benchKok, ad, 'konfig');
  const calisma = path.join(benchKok, ad, 'calisma');
  const gunluk = [];
  const sonuc = {
    anahtar,
    dosyaAdi: ad,
    gorev,
    durum,
    tekrar,
    konfig,
    calisma,
    fixtureOzeti: null,
    kurulumImzasi: null,
    baslangic: null,
    bitis: null,
    sureMs: null,
    cikisKodu: null,
    tavanAsildi: false,
    oturumId: null,
    modelId: null,
    asistanTuru: null,
    aracCagrisi: null,
    transkript: null,
    dogrulama: null,
    kusurSayisi: null,
    kurulumGunlugu: gunluk,
    hata: null,
    ciktiOzeti: null,
    isError: false,
    kimlikBozuk: false,
    gecerli: null,
    gecersizNedeni: null,
    tohum: (tohumBilgisi && tohumBilgisi.tohum) ?? null,
    blokTohumu: (tohumBilgisi && tohumBilgisi.blokTohumu) ?? null,
    blokSirasi: (tohumBilgisi && tohumBilgisi.blokSirasi) ?? null,
    blokDenemesi: (tohumBilgisi && tohumBilgisi.deneme) ?? null,
  };
  try {
    konfigKur(konfig, kimlikDosyasi);
    fs.rmSync(calisma, { recursive: true, force: true });
    kopyala(path.join(FIXTURE_KOK, gorev, 'agac'), calisma);
    sonuc.fixtureOzeti = ozet(agacOzeti(calisma));
    if (durum === 'native') {
      gunluk.push('eklenti kurulmadi, profil yazilmadi');
    } else {
      if (!(await eklentiKur(konfig, gunluk))) throw new Error('eklenti kurulumu basarisiz');
      if (!(await profilYaz(konfig, durum, gunluk))) throw new Error('profil yazimi basarisiz');
    }
    sonuc.kurulumImzasi = ozet(gunluk.map(sadelestir).join('\n'));
    if (kuru) return damgala(sonuc);

    const istem = fs.readFileSync(path.join(GOREV_KOK, gorev + '.md'), 'utf8').trim();
    const t0 = Date.now();
    sonuc.baslangic = new Date(t0).toISOString();
    // ÖLÇÜLDÜ (B0): bypassPermissions sart — acceptEdits ile headless kosu izin engeline
    // takilip bos donuyor, soruyu soracak kimse yok.
    const r = await kos(
      'claude',
      [
        '-p',
        istem,
        '--model',
        'opus',
        '--permission-mode',
        'bypassPermissions',
        '--max-turns',
        String(GOREV_MAX_TUR[gorev] || MAX_TUR),
        '--output-format',
        'json',
      ],
      {
        cwd: calisma,
        env: { CLAUDE_CONFIG_DIR: konfig },
        tavan: GOREV_TAVAN_MS[gorev] || TAVAN_MS,
      }
    );
    sonuc.bitis = new Date().toISOString();
    sonuc.sureMs = Date.now() - t0;
    sonuc.cikisKodu = r.kod;
    sonuc.tavanAsildi = r.kesildi;
    // Tasarim geregi kesilen kosu tavan asmis sayilmaz: yoksa kesinti kolundaki her kosu
    // gecerlilik kapisinda elenir ve birincil metrik n=0 cikar.
    sonuc.planliKesinti = !!r.planli;
    sonuc.agacOldu = r.agacOldu;
    gunluk.push(
      'claude -p → kod ' +
        r.kod +
        ' · ' +
        Math.round(sonuc.sureMs / 1000) +
        ' sn' +
        (r.kesildi ? ' · TAVAN ASILDI' : '')
    );
    try {
      const j = JSON.parse(r.out);
      sonuc.oturumId = j.session_id || null;
      if (j.total_cost_usd !== undefined) sonuc.maliyetUsd = j.total_cost_usd;
      if (j.num_turns !== undefined) sonuc.bildirilenTur = j.num_turns;
      sonuc.isError = !!j.is_error;
      sonuc.ciktiOzeti = String(j.result || '').slice(0, 2000);
      if (j.is_error) gunluk.push('sonuc: ' + sonuc.ciktiOzeti.slice(0, 200));
    } catch {
      sonuc.ciktiOzeti = String(r.err || r.out).slice(0, 2000);
      gunluk.push('json cikti cozulemedi: ' + sonuc.ciktiOzeti.slice(0, 200));
    }
    const dosya = transkriptBul(konfig, calisma, sonuc.oturumId);
    if (dosya) {
      sonuc.transkript = dosya;
      const t = transkriptOzeti(dosya);
      sonuc.modelId = t.modelId;
      sonuc.asistanTuru = t.asistanTuru;
      sonuc.aracCagrisi = t.aracCagrisi;
      sonuc.bozukSatir = t.bozukSatir;
      if (t.bozukSatir) gunluk.push('transkriptte ' + t.bozukSatir + ' bozuk satir (kesme izi)');
    } else {
      gunluk.push('transkript bulunamadi: ' + path.join(konfig, 'projects'));
    }
    sonuc.dogrulama = await dogrula(gorev, calisma);
    sonuc.kusurSayisi = kusurSayisi(sonuc.dogrulama);
  } catch (e) {
    sonuc.hata = String((e && e.message) || e);
    gunluk.push('HATA: ' + sonuc.hata);
  }
  return damgala(sonuc);
}

function yaz(sonuc, kuru) {
  const dizin = kuru ? path.join(SONUC_KOK, 'kuru') : SONUC_KOK;
  fs.mkdirSync(dizin, { recursive: true });
  const dosya = path.join(dizin, (sonuc.dosyaAdi || sonuc.anahtar) + '.json');
  fs.writeFileSync(dosya, JSON.stringify(sonuc, null, 2) + '\n', 'utf8');
  return dosya;
}

async function fixtureTesti() {
  const gecici = path.join(os.tmpdir(), 'tbench', 'fixture-testi-' + damga());
  let hepsiGecti = true;
  for (const gorev of TUM_GOREVLER) {
    const kirmizi = path.join(gecici, gorev, 'temiz');
    const yesil = path.join(gecici, gorev, 'cozum');
    kopyala(path.join(FIXTURE_KOK, gorev, 'agac'), kirmizi);
    kopyala(path.join(FIXTURE_KOK, gorev, 'agac'), yesil);
    kopyala(path.join(FIXTURE_KOK, gorev, 'cozum'), yesil);
    const a = await dogrula(gorev, kirmizi);
    const b = await dogrula(gorev, yesil);
    const kusur = kusurSayisi(a);
    const esik = KUSUR_ESIGI[gorev] || 1;
    const iyi = !a.gecti && b.gecti && kusur >= esik;
    if (!iyi) hepsiGecti = false;
    process.stdout.write(
      gorev.padEnd(10) +
        (iyi ? 'TAMAM' : 'BOZUK') +
        ' · temiz agac: ' +
        (a.gecti ? 'YESIL (olmamali)' : 'kirmizi, kusur ' + kusur + ' (esik ' + esik + ')') +
        ' · referans cozum: ' +
        (b.gecti ? 'yesil' : 'KIRMIZI (olmamali) — ' + b.cikti) +
        '\n'
    );
  }
  fs.rmSync(gecici, { recursive: true, force: true });
  return hepsiGecti;
}

// Blok ici sira tohumlu permutasyonla belirlenir. Blok kota duvarina carparsa geri
// alinip yeniden denenir; ayni blok en cok BLOK_MAX_DENEME kez kosar, sonsuz dongu yok.
async function blokKos(blok, blokIndisi, ayar) {
  const koscu = ayar.koscu;
  const tohum = ayar.tohum;
  const maxDeneme = ayar.maxDeneme || BLOK_MAX_DENEME;
  const bekleDk = ayar.bekleDk || 0;
  const aralikMs = ayar.aralikMs === undefined ? BASLAMA_ARALIGI_MS : ayar.aralikMs;
  const yaz = ayar.yaz || (() => {});
  const uyu = ayar.uyu || ((ms) => new Promise((c) => setTimeout(c, ms)));
  let sonuclar = [];
  let deneme = 0;
  while (deneme < maxDeneme) {
    deneme++;
    const bt = blokTohumu(tohum, blokIndisi, deneme);
    const sira = permutasyonSirasi(blok.length, bt);
    yaz(
      'blok ' + (blokIndisi + 1) + ' deneme ' + deneme + '/' + maxDeneme + ' · tohum ' + bt +
        ' · sira: ' + sira.map((i) => blok[i].ad).join(' → ')
    );
    sonuclar = new Array(blok.length);
    await Promise.all(
      sira.map(
        (idx, yer) =>
          new Promise((cozum) => {
            setTimeout(() => {
              koscu(blok[idx], {
                tohum,
                blokTohumu: bt,
                blokSirasi: yer,
                deneme,
              }).then((s) => {
                sonuclar[idx] = s;
                cozum(s);
              });
            }, yer * aralikMs);
          })
      )
    );
    const limitli = sonuclar.filter(kotayaCarpti);
    if (!limitli.length) return { sonuclar, deneme, kotaCarpmasi: 0 };
    if (deneme >= maxDeneme) {
      yaz(
        'blok ' + (blokIndisi + 1) + ' kota duvarini ' + maxDeneme +
          ' denemede de asamadi — ' + limitli.length + ' kosu gecersiz kaldi'
      );
      return { sonuclar, deneme, kotaCarpmasi: limitli.length };
    }
    yaz(
      'blok ' + (blokIndisi + 1) + ' kota duvarina carpti (' + limitli.length +
        ' kosu) — kuyruga geri alindi' + (bekleDk ? ', ' + bekleDk + ' dk beklenecek' : ', bekleme yok (--bekle=<dk>)')
    );
    if (bekleDk) await uyu(bekleDk * 60000);
  }
  return { sonuclar, deneme, kotaCarpmasi: 0 };
}

async function kendiTesti() {
  const iddialar = [];
  const onay = (ad, kosul, gorulen) => iddialar.push({ ad, gecti: !!kosul, gorulen });

  const s1 = permutasyonSirasi(4, blokTohumu(1, 0, 1));
  const s1b = permutasyonSirasi(4, blokTohumu(1, 0, 1));
  const s2 = permutasyonSirasi(4, blokTohumu(2, 0, 1));
  onay('ayni tohum ayni sira', s1.join() === s1b.join(), s1.join());
  onay('farkli tohum farkli sira', s1.join() !== s2.join(), s1.join() + ' vs ' + s2.join());
  onay('permutasyon tam: her indis bir kez', s1.slice().sort().join() === '0,1,2,3', s1.join());

  const limitCiktisi = "You've hit your session limit · resets 6:30pm (Europe/Istanbul)";
  const gecersiz = damgala({
    cikisKodu: 1,
    tavanAsildi: false,
    kurulumGunlugu: ['claude -p → kod 1', 'sonuc: ' + limitCiktisi],
    kusurSayisi: 27,
  });
  onay('limit imzasi gecersiz damgaliyor', gecersiz.gecerli === false, gecersiz.gecerli);
  onay('gecersizde kusur null', gecersiz.kusurSayisi === null, gecersiz.kusurSayisi);
  onay('neden yaziliyor', /oturum limiti/.test(gecersiz.gecersizNedeni || ''), gecersiz.gecersizNedeni);
  onay('kota carpmasi taniniyor', kotayaCarpti(gecersiz), true);

  const temiz = damgala({ cikisKodu: 0, tavanAsildi: false, kurulumGunlugu: ['claude -p → kod 0'], kusurSayisi: 0 });
  onay('temiz kosu gecerli', temiz.gecerli === true, temiz.gecerli);
  onay('temiz kosuda kusur korunuyor', temiz.kusurSayisi === 0, temiz.kusurSayisi);

  // OLCULDU 27.08.2026: kesinti yamasi sentetik uzun surecle kosturulmadan benche
  // girmez (konsey tur 2 serhi). Cocuk kendi cocugunu doguruyor; agac oldurulmezse
  // torun hayatta kalir ve damgasini diske yazar.
  {
    const damga = path.join(os.tmpdir(), 'tbench-torun-' + Date.now() + '.txt');
    const torun = 'setTimeout(()=>require("fs").writeFileSync(process.argv[1],"yasiyor"),4000)';
    const ebeveyn = 'require("child_process").spawn(process.execPath,["-e",' + JSON.stringify(torun) + ',process.argv[1]],{stdio:"ignore"});setTimeout(()=>{},20000)';
    const r = await kos(process.execPath, ['-e', ebeveyn, damga], { tavan: 1200, planliKesinti: true });
    onay('kesinti damgalandi', r.kesildi === true, r.kesildi);
    onay('planli kesinti isaretlendi', r.planli === true, r.planli);
    onay('surec agaci olduruldu', r.agacOldu === true, r.agacOldu);
    await new Promise((c) => setTimeout(c, 5000));
    onay('torun hayatta kalmadi', fs.existsSync(damga) === false, fs.existsSync(damga));
    try { fs.unlinkSync(damga); } catch {}
  }

  const blok = DURUMLAR.map((d) => ({ gorev: 'sentetik', durum: d, tekrar: 1, ad: 'sentetik__' + d }));
  const sentetik = (limitDenemeleri) => {
    const cagri = [];
    return {
      cagri,
      koscu: (is, bilgi) => {
        cagri.push(is.ad + '@' + bilgi.deneme);
        const limit = limitDenemeleri.includes(bilgi.deneme) && is.durum === 'premium';
        return Promise.resolve(
          damgala({
            dosyaAdi: is.ad,
            cikisKodu: limit ? 1 : 0,
            tavanAsildi: false,
            kurulumGunlugu: [limit ? 'sonuc: ' + limitCiktisi : 'claude -p → kod 0'],
            kusurSayisi: 3,
            tohum: bilgi.tohum,
            blokDenemesi: bilgi.deneme,
          })
        );
      },
    };
  };

  const a = sentetik([1]);
  const ra = await blokKos(blok, 0, { koscu: a.koscu, tohum: 7, aralikMs: 0, yaz: () => {} });
  onay('kota carpan blok yeniden denendi', ra.deneme === 2, ra.deneme);
  onay('ikinci denemede blok temiz', ra.kotaCarpmasi === 0, ra.kotaCarpmasi);
  onay('blok bastan kosuldu: 2 x 4 cagri', a.cagri.length === 8, a.cagri.length);
  onay(
    'ikinci deneme sonuclari gecerli',
    ra.sonuclar.every((s) => s.gecerli),
    ra.sonuclar.map((s) => s.dosyaAdi + ':' + s.gecerli).join(', ')
  );

  const b = sentetik([1, 2, 3]);
  const rb = await blokKos(blok, 0, { koscu: b.koscu, tohum: 7, aralikMs: 0, yaz: () => {} });
  onay('sonsuz dongu yok: en cok 2 deneme', rb.deneme === BLOK_MAX_DENEME, rb.deneme);
  onay('inatci kota: 2 x 4 cagriyla durdu', b.cagri.length === 8, b.cagri.length);
  onay('inatci kota gecersiz kaldi', rb.kotaCarpmasi === 1, rb.kotaCarpmasi);
  onay(
    'inatci kotada kusur null',
    rb.sonuclar.find((s) => !s.gecerli).kusurSayisi === null,
    rb.sonuclar.find((s) => !s.gecerli).kusurSayisi
  );

  let beklendi = 0;
  const c = sentetik([1]);
  await blokKos(blok, 0, {
    koscu: c.koscu,
    tohum: 7,
    aralikMs: 0,
    bekleDk: 5,
    yaz: () => {},
    uyu: (ms) => {
      beklendi = ms;
      return Promise.resolve();
    },
  });
  onay('--bekle dakikayi ms olarak uyguluyor', beklendi === 5 * 60000, beklendi);

  const oauthCiktisi = 'OAuth session expired · please run /login';
  const oauthKosu = damgala({
    cikisKodu: 1,
    kurulumGunlugu: ['claude -p → kod 1', 'sonuc: ' + oauthCiktisi],
    kusurSayisi: 5,
  });
  onay('OAuth arizasi ayri imza', /OAuth oturumu dustu/.test(oauthKosu.gecersizNedeni || ''), oauthKosu.gecersizNedeni);
  onay(
    'OAuth arizasi kota sayilmiyor',
    !/oturum limiti/.test(oauthKosu.gecersizNedeni || '') && !kotayaCarpti(oauthKosu),
    oauthKosu.gecersizNedeni
  );
  onay('kota arizasi OAuth sayilmiyor', !/OAuth/.test(gecersiz.gecersizNedeni || ''), gecersiz.gecersizNedeni);

  const kimlikDizini = path.join(os.tmpdir(), 'tbench-kimlik-testi');
  fs.rmSync(kimlikDizini, { recursive: true, force: true });
  fs.mkdirSync(kimlikDizini, { recursive: true });
  const yazKimlik = (ad, govde) => {
    const f = path.join(kimlikDizini, ad);
    fs.writeFileSync(f, JSON.stringify(govde), 'utf8');
    return f;
  };
  const saglamDosya = yazKimlik('saglam.json', {
    claudeAiOauth: { accessToken: 'a'.repeat(40), refreshToken: 'r'.repeat(40), expiresAt: Date.now() + 3600000 },
  });
  const bosDosya = yazKimlik('bos.json', {
    claudeAiOauth: { accessToken: '', refreshToken: '', expiresAt: 0 },
  });
  onay('saglam kimlik saglam okunuyor', kimlikButunlugu(saglamDosya).saglam === true, kimlikButunlugu(saglamDosya).neden);
  const bos = kimlikButunlugu(bosDosya);
  onay('bosalmis kimlik BOZUK', bos.saglam === false, bos.saglam);
  onay(
    'bozulma nedeni ucunu de sayiyor',
    /accessToken bos/.test(bos.neden) && /refreshToken bos/.test(bos.neden) && /expiresAt 0/.test(bos.neden),
    bos.neden
  );
  const yokDosya = kimlikButunlugu(path.join(kimlikDizini, 'yok.json'));
  onay('olmayan kimlik BOZUK', yokDosya.saglam === false, yokDosya.saglam + ' · ' + yokDosya.neden);
  const pProje = tazelemePenceresiMs(['proje'], 3);
  const pMikro = tazelemePenceresiMs(GOREVLER, 1);
  onay('tazeleme penceresi proje tavanini kapsiyor', pProje >= GOREV_TAVAN_MS.proje, pProje);
  onay('pencere blok sayisiyla buyuyor', pProje === GOREV_TAVAN_MS.proje * 3 + KURULUM_TAVAN_MS, pProje);
  onay('mikro pencere mikro tavani kapsiyor', pMikro >= TAVAN_MS, pMikro);
  onay('bos gorev listesinde en buyuk tavan alinir', tazelemePenceresiMs([], 1) === GOREV_TAVAN_MS.proje + KURULUM_TAVAN_MS, tazelemePenceresiMs([], 1));

  const kimlikli = damgala({ cikisKodu: 0, kimlikBozuk: true, kusurSayisi: 0 });
  onay('kimlik bozulmasi gecersizlik sebebi', kimlikli.gecerli === false, kimlikli.gecerli);
  onay('kimlik bozulmasinda kusur null', kimlikli.kusurSayisi === null, kimlikli.kusurSayisi);
  fs.rmSync(kimlikDizini, { recursive: true, force: true });

  let hepsi = true;
  for (const i of iddialar) {
    if (!i.gecti) hepsi = false;
    process.stdout.write(
      (i.gecti ? 'TAMAM ' : 'BOZUK ') + i.ad + (i.gecti ? '' : ' — gorulen: ' + i.gorulen) + '\n'
    );
  }
  process.stdout.write((hepsi ? 'kendi testi GECTI' : 'kendi testi KALDI') + ' · ' + iddialar.length + ' iddia\n');
  return hepsi;
}

(async () => {
  if (bayrak('kendi-testi')) {
    process.exit((await kendiTesti()) ? 0 : 1);
  }
  if (bayrak('fixture-testi')) {
    process.exit((await fixtureTesti()) ? 0 : 1);
  }

  const kuru = bayrak('kuru');
  const yeniden = bayrak('yeniden');
  const gorevSuzgeci = deger('gorev');
  const durumSuzgeci = deger('durum');

  const tohumDegeri = deger('tohum');
  const tohum = tohumDegeri === null ? (Date.now() >>> 0) : Number(tohumDegeri);
  if (!Number.isInteger(tohum)) {
    process.stderr.write('--tohum tam sayi olmali: ' + tohumDegeri + '\n');
    process.exit(2);
  }
  const bekleDegeri = deger('bekle');
  const bekleDk = bekleDegeri === null ? VARSAYILAN_BEKLE_DK : Number(bekleDegeri);
  if (!Number.isFinite(bekleDk) || bekleDk < 0) {
    process.stderr.write('--bekle negatif olmayan sayi olmali: ' + bekleDegeri + '\n');
    process.exit(2);
  }
  process.stdout.write('tohum: ' + tohum + ' · kota beklemesi: ' + bekleDk + ' dk\n');

  // ÖLÇÜLDÜ (B0): klasor adinda `teknesyum` gecemez — transkriptin her satirinda `cwd`
  // yazili ve native kosunun eklenti izi olcumu kendi yolunu iz sayardi.
  const benchKok = path.join(os.tmpdir(), 'tbench-kos', damga());
  fs.mkdirSync(benchKok, { recursive: true });
  process.stdout.write('kosu koku: ' + benchKok + '\n');

  const tekrarDegeri = deger('tekrar');
  const tekrarSayisi = tekrarDegeri === null ? 1 : Number(tekrarDegeri);
  if (!Number.isInteger(tekrarSayisi) || tekrarSayisi < 1) {
    process.stderr.write('--tekrar tam sayi ve en az 1 olmali: ' + tekrarDegeri + '\n');
    process.exit(2);
  }
  const gorevListesi = gorevSuzgeci ? [gorevSuzgeci] : GOREVLER;
  for (const g of gorevListesi) {
    if (!TUM_GOREVLER.includes(g)) {
      process.stderr.write('bilinmeyen gorev: ' + g + '\n');
      process.exit(2);
    }
  }

  const sonucDizini = kuru ? path.join(SONUC_KOK, 'kuru') : SONUC_KOK;
  // Tekrarlar blok olarak sirali kosar: blok icinde kosullar paralel, bloklar arka arkaya.
  const bloklar = [];
  for (let t = 1; t <= tekrarSayisi; t++) {
    const blok = [];
    const tekrar = tekrarDegeri === null ? null : t;
    for (const gorev of gorevListesi) {
      for (const durum of DURUMLAR) {
        if (durumSuzgeci && durum !== durumSuzgeci) continue;
        const ad = kosuAdi(gorev, durum, tekrar);
        const varOlan = path.join(sonucDizini, ad + '.json');
        if (!yeniden && fs.existsSync(varOlan)) {
          process.stdout.write('atlandi (sonuc var): ' + ad + '\n');
          continue;
        }
        blok.push({ gorev, durum, tekrar, ad });
      }
    }
    if (blok.length) bloklar.push(blok);
  }
  if (!bloklar.length) {
    process.stdout.write('surulecek kosu yok — --yeniden ile zorla\n');
    process.exit(0);
  }

  process.stdout.write('\nblok plani (tohum ' + tohum + '):\n');
  bloklar.forEach((blok, i) => {
    const bt = blokTohumu(tohum, i, 1);
    const sira = permutasyonSirasi(blok.length, bt);
    process.stdout.write(
      '  blok ' + (i + 1) + ' · tohum ' + bt + ' · ' + sira.map((x) => blok[x].ad).join(' → ') + '\n'
    );
  });
  process.stdout.write('\n');
  // Plani gormek icin kimlik gerekmez: --sira burada durur.
  if (bayrak('sira')) process.exit(0);

  const kimlikGunlugu = [];
  let kimlik;
  try {
    kimlik = await kimlikHazirla(
      kimlikGunlugu,
      [...new Set(bloklar.flat().map((x) => x.gorev))],
      bloklar.length
    );
  } catch (e) {
    process.stderr.write(String((e && e.message) || e) + '\n');
    process.exit(2);
  }
  const kimlikDosyasi = kimlik.dosya;
  for (const g of kimlikGunlugu) process.stdout.write('  ' + g + '\n');

  const t0 = Date.now();
  const sonuclar = [];
  const koscu = (is, bilgi) =>
    kosu(is.gorev, is.durum, is.tekrar, benchKok, kimlikDosyasi, kuru, bilgi).then((s) => {
      yaz(s, kuru);
      process.stdout.write(
        'bitti ' +
          s.dosyaAdi.padEnd(24) +
          (s.hata
            ? 'HATA · ' + s.hata
            : (kuru
                ? 'kuru · fixture ' + s.fixtureOzeti + ' · kurulum ' + s.kurulumImzasi
                : (s.dogrulama && s.dogrulama.gecti ? 'GECTI' : 'KALDI') +
                  ' · ' +
                  Math.round(s.sureMs / 1000) +
                  ' sn' +
                  (s.tavanAsildi ? ' · TAVAN' : ''))) +
          (s.gecerli === false ? ' · GECERSIZ: ' + s.gecersizNedeni : '') +
          '\n'
      );
      return s;
    });
  for (let i = 0; i < bloklar.length; i++) {
    const r = await blokKos(bloklar[i], i, {
      koscu,
      tohum,
      bekleDk,
      yaz: (m) => process.stdout.write(m + '\n'),
    });
    for (const s of r.sonuclar) sonuclar.push(s);
  }
  const toplam = Date.now() - t0;

  const kimlikSon = kimlikSonDenetim(kimlik);
  if (!kimlikSon.saglam) {
    process.stderr.write(
      '\nKIMLIK BUTUNLUGU BOZULDU: ' + kimlikSon.neden + '\n' +
        'Bu kosunun butun sonuclari gecersiz damgalandi — bu bir kota arizasi degil.\n' +
        KIMLIK + ' dosyasini bir kez elle giris yaparak tazeleyin.\n'
    );
    for (const s of sonuclar) {
      s.kimlikBozuk = true;
      damgala(s);
      yaz(s, kuru);
    }
  } else {
    process.stdout.write('ana kimlik butunlugu: kosu oncesi ve sonrasi saglam\n');
  }

  process.stdout.write('\n');
  for (const s of sonuclar)
    process.stdout.write(
      kuru
        ? s.dosyaAdi.padEnd(24) +
            (s.hata ? 'HATA · ' + s.hata : 'fixture ' + s.fixtureOzeti + ' · kurulum ' + s.kurulumImzasi) +
            '\n'
        : s.dosyaAdi.padEnd(24) +
        (s.hata ? 'HATA' : s.dogrulama && s.dogrulama.gecti ? 'GECTI' : 'KALDI').padEnd(6) +
        (s.sureMs ? Math.round(s.sureMs / 1000) + ' sn' : '-').padEnd(8) +
        (s.modelId || '-').padEnd(28) +
        (s.hata || (s.dogrulama && !s.dogrulama.gecti ? s.dogrulama.cikti : '')).slice(0, 90) +
        '\n'
    );
  process.stdout.write(
    '\ntoplam duvar saati: ' +
      Math.round(toplam / 1000) +
      ' sn · sonuclar: ' +
      (kuru ? path.join(SONUC_KOK, 'kuru') : SONUC_KOK) +
      '\n'
  );
  process.exit(sonuclar.some((s) => s.hata) ? 1 : 0);
})();
