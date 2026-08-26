#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

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

function slug(p) {
  return path.resolve(p).replace(/[^a-zA-Z0-9]/g, '-');
}

function ozet(metin) {
  return crypto.createHash('sha256').update(metin).digest('hex').slice(0, 16);
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
    const t = setTimeout(() => {
      kesildi = true;
      c.kill();
    }, opt.tavan || TAVAN_MS);
    c.stdout.on('data', (d) => {
      out += d;
    });
    c.stderr.on('data', (d) => {
      err += d;
    });
    c.on('close', (kod) => {
      clearTimeout(t);
      cozum({ kod, out, err, kesildi });
    });
    c.on('error', (e) => {
      clearTimeout(t);
      cozum({ kod: -1, out, err: String(e), kesildi });
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
async function kimlikHazirla(gunluk) {
  const kok = path.join(os.tmpdir(), 'tbench', 'kimlik');
  fs.mkdirSync(kok, { recursive: true });
  const hedef = path.join(kok, '.credentials.json');
  const adaylar = [hedef, KIMLIK].filter((f) => fs.existsSync(f));
  if (!adaylar.length)
    throw new Error('kimlik dosyasi yok: ' + KIMLIK + ' — izole kokte oturum acilamaz');
  const en = adaylar.sort((a, b) => sonKullanma(b) - sonKullanma(a))[0];
  if (en !== hedef) fs.copyFileSync(en, hedef);
  gunluk.push('kimlik kaynagi: ' + en);
  if (sonKullanma(hedef) - Date.now() < 30 * 60 * 1000) {
    const r = await kos('claude', ['-p', 'ping', '--model', 'haiku', '--max-turns', '1'], {
      cwd: kok,
      env: { CLAUDE_CONFIG_DIR: kok },
      tavan: KURULUM_TAVAN_MS,
    });
    gunluk.push('jeton tazeleme kosusu → kod ' + r.kod);
  }
  const kalan = sonKullanma(hedef) - Date.now();
  if (kalan <= 0)
    throw new Error(
      'izole kokte kullanilabilir OAuth jetonu yok — ana kokte bir kez giris yapip ' +
        KIMLIK +
        ' dosyasini tazeleyin'
    );
  gunluk.push('jeton gecerli: ' + Math.round(kalan / 60000) + ' dk kaldi');
  return hedef;
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
  const o = { modelId: null, asistanTuru: 0, aracCagrisi: 0 };
  for (const satir of fs.readFileSync(dosya, 'utf8').split('\n')) {
    if (!satir.trim()) continue;
    let k;
    try {
      k = JSON.parse(satir);
    } catch {
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

async function kosu(gorev, durum, tekrar, benchKok, kimlikDosyasi, kuru) {
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
    if (kuru) return sonuc;

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
      if (j.is_error) gunluk.push('sonuc: ' + String(j.result || '').slice(0, 200));
    } catch {
      gunluk.push('json cikti cozulemedi: ' + String(r.err || r.out).slice(0, 200));
    }
    const dosya = transkriptBul(konfig, calisma, sonuc.oturumId);
    if (dosya) {
      sonuc.transkript = dosya;
      const t = transkriptOzeti(dosya);
      sonuc.modelId = t.modelId;
      sonuc.asistanTuru = t.asistanTuru;
      sonuc.aracCagrisi = t.aracCagrisi;
    } else {
      gunluk.push('transkript bulunamadi: ' + path.join(konfig, 'projects'));
    }
    sonuc.dogrulama = await dogrula(gorev, calisma);
    sonuc.kusurSayisi = kusurSayisi(sonuc.dogrulama);
  } catch (e) {
    sonuc.hata = String((e && e.message) || e);
    gunluk.push('HATA: ' + sonuc.hata);
  }
  return sonuc;
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

(async () => {
  if (bayrak('fixture-testi')) {
    process.exit((await fixtureTesti()) ? 0 : 1);
  }

  const kuru = bayrak('kuru');
  const yeniden = bayrak('yeniden');
  const gorevSuzgeci = deger('gorev');
  const durumSuzgeci = deger('durum');

  // ÖLÇÜLDÜ (B0): klasor adinda `teknesyum` gecemez — transkriptin her satirinda `cwd`
  // yazili ve native kosunun eklenti izi olcumu kendi yolunu iz sayardi.
  const benchKok = path.join(os.tmpdir(), 'tbench-kos', damga());
  fs.mkdirSync(benchKok, { recursive: true });
  process.stdout.write('kosu koku: ' + benchKok + '\n');

  const kimlikGunlugu = [];
  let kimlikDosyasi;
  try {
    kimlikDosyasi = await kimlikHazirla(kimlikGunlugu);
  } catch (e) {
    process.stderr.write(String((e && e.message) || e) + '\n');
    process.exit(2);
  }
  for (const g of kimlikGunlugu) process.stdout.write('  ' + g + '\n');

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

  const t0 = Date.now();
  const sonuclar = [];
  for (const blok of bloklar) {
    const blokSonuclari = await Promise.all(
      blok.map(
        (is, i) =>
          new Promise((cozum) => {
            setTimeout(() => {
              kosu(is.gorev, is.durum, is.tekrar, benchKok, kimlikDosyasi, kuru).then((s) => {
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
                    '\n'
                );
                cozum(s);
              });
            }, i * BASLAMA_ARALIGI_MS);
          })
      )
    );
    for (const s of blokSonuclari) sonuclar.push(s);
  }
  const toplam = Date.now() - t0;

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
