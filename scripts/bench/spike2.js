#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const KOK = path.resolve(__dirname, '..', '..');
const RAPOR = path.join(KOK, 'docs', 'SPIKE-ORKESTRASYON.md');
const PREMIUM_JS = path.join(KOK, 'teknesyum', 'scripts', 'premium.js');
const ANA_KOK = path.join(process.env.USERPROFILE || process.env.HOME || '.', '.claude');
const KIMLIK = path.join(ANA_KOK, '.credentials.json');

const TAVAN_MS = 3 * 60 * 1000;
const KURULUM_TAVAN_MS = 5 * 60 * 1000;

const AJAN_GOREV =
  'Bu gorev icin Task aracini kullanmak ZORUNDASIN. Iki alt ajan ac (subagent_type: ' +
  'general-purpose), ikisini ayni mesajda baslat. Birinciye "not-a.md dosyasina tek satir ' +
  'A yaz" gorevini ver, ikinciye "not-b.md dosyasina tek satir B yaz" gorevini ver. ' +
  'Dosyalari kendin yazma, alt ajanlar yazsin. Bittiginde tek cumleyle bildir.';

const OGRET_GOREV =
  'Su olguyu aklinda tut, dosyaya yazma, hicbir arac cagirma: bu projenin kod adi ' +
  'ZUMRUTKAYA. Sadece "tamam" yaz.';

const SOR_GOREV = 'Bu projenin kod adi neydi? Sadece kod adini yaz, baska hicbir sey yazma.';

const OGRET_GOREV_D5 =
  'Su olguyu aklinda tut, dosyaya yazma, hicbir arac cagirma: bu projenin kod adi ' +
  'DEMIRKAPI. Sadece "tamam" yaz.';

const BOLUSME_GOREV =
  'Bu klasorde birbirinden tamamen bagimsiz uc modul var: mod-a.js, mod-b.js, mod-c.js. ' +
  'Aralarinda hicbir bagimlilik yok. Her biri icin ayri bir inceleme notu istiyorum: ' +
  'not-a.md, not-b.md, not-c.md. Her not, ilgili modulun ne yaptigini ve icinde gordugun ' +
  'bir hatayi kisa bir paragrafta anlatsin. Isi nasil orgutleyecegin sana kalmis. ' +
  'Bittiginde tek cumleyle bildir.';

const MOD_A =
  'function ortalama(sayilar) {\n' +
  '  let toplam = 0;\n' +
  '  for (let i = 0; i <= sayilar.length; i++) toplam += sayilar[i];\n' +
  '  return toplam / sayilar.length;\n' +
  '}\n\nmodule.exports = { ortalama };\n';

const MOD_B =
  'function slug(metin) {\n' +
  '  return metin.toLowerCase().replace(" ", "-");\n' +
  '}\n\n' +
  'function basHarf(metin) {\n' +
  '  return metin[0].toUpperCase() + metin.slice(1);\n' +
  '}\n\nmodule.exports = { slug, basHarf };\n';

const MOD_C =
  'function ara(liste, hedef) {\n' +
  '  let alt = 0;\n' +
  '  let ust = liste.length - 1;\n' +
  '  while (alt < ust) {\n' +
  '    const orta = Math.floor((alt + ust) / 2);\n' +
  '    if (liste[orta] === hedef) return orta;\n' +
  '    if (liste[orta] < hedef) alt = orta + 1;\n' +
  '    else ust = orta - 1;\n' +
  '  }\n' +
  '  return -1;\n' +
  '}\n\nmodule.exports = { ara };\n';

const KOTA_IZI =
  /(usage limit|rate.?limit|quota|Claude AI usage limit reached|too many requests|429)/i;

const RED_IZI = /(permission|denied|suspicious Windows path|requires manual approval)/i;

const TUM_DENEYLER = ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'];
const SECIM = process.argv
  .slice(2)
  .map((s) => s.toUpperCase())
  .filter((s) => TUM_DENEYLER.includes(s));

function secili(ad) {
  return SECIM.length === 0 || SECIM.includes(ad);
}

function damga() {
  return new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
}

function slug(p) {
  return path.resolve(p).replace(/[^a-zA-Z0-9]/g, '-');
}

function kos(cmd, args, opt = {}) {
  return new Promise((cozum) => {
    const c = spawn(cmd, args, {
      cwd: opt.cwd || KOK,
      env: { ...process.env, ...(opt.env || {}) },
      windowsHide: true,
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

function fixtureKur(dizin, dosyalar) {
  fs.rmSync(dizin, { recursive: true, force: true });
  fs.mkdirSync(dizin, { recursive: true });
  const icerik = dosyalar || { 'README.md': '# Spike 2 fixture\n' };
  for (const [ad, govde] of Object.entries(icerik))
    fs.writeFileSync(path.join(dizin, ad), govde, 'utf8');
}

function konfigKur(dizin, kimlikDosyasi) {
  fs.rmSync(dizin, { recursive: true, force: true });
  fs.mkdirSync(dizin, { recursive: true });
  fs.copyFileSync(kimlikDosyasi, path.join(dizin, '.credentials.json'));
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
  if (sonKullanma(hedef) - Date.now() < 15 * 60 * 1000) {
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
  const ilk = (r.out || r.err).split('\n')[0].trim();
  gunluk.push('premium.js ' + durum + ' → kod ' + r.kod + ' · ' + ilk);
  return r.kod === 0;
}

function projeDizini(konfig, fixture) {
  return path.join(konfig, 'projects', slug(fixture));
}

function transkriptBul(konfig, fixture, sid) {
  const dizin = projeDizini(konfig, fixture);
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

function yanKolBul(konfig, fixture, sid) {
  if (!sid) return [];
  const dizin = path.join(projeDizini(konfig, fixture), sid, 'subagents');
  if (!fs.existsSync(dizin)) return [];
  return fs
    .readdirSync(dizin)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => path.join(dizin, f));
}

function metinCikar(deger) {
  if (typeof deger === 'string') return deger;
  if (Array.isArray(deger))
    return deger.map((p) => (typeof p === 'string' ? p : p && p.text ? p.text : '')).join(' ');
  return '';
}

function coz(dosya) {
  const ham = fs.readFileSync(dosya, 'utf8');
  const o = {
    dosya,
    kancaSayaci: {},
    kancaOlaylari: [],
    ekOlaylari: [],
    skillListesi: '',
    araclar: [],
    ajanCagrilari: [],
    yanKolSatiri: 0,
    kullaniciIstemleri: [],
    istemDamgalari: [],
    redler: [],
    asistanMetni: '',
    turSayisi: 0,
    satirSayisi: 0,
    bozukSatir: 0,
  };
  let istemNo = 0;
  let satirNo = -1;
  for (const satir of ham.split('\n')) {
    satirNo++;
    if (!satir.trim()) continue;
    let k;
    try {
      k = JSON.parse(satir);
    } catch {
      o.bozukSatir++;
      continue;
    }
    o.satirSayisi++;
    const ts = k.timestamp || '';
    if (k.isSidechain) o.yanKolSatiri++;
    if (k.type === 'assistant' && k.message) {
      o.turSayisi++;
      for (const p of k.message.content || []) {
        if (p.type === 'tool_use') {
          o.araclar.push(p.name);
          if (/^(Task|Agent)$/.test(p.name)) {
            o.ajanCagrilari.push({
              istem: istemNo,
              satir: JSON.stringify({
                type: 'tool_use',
                name: p.name,
                input: p.input,
                isSidechain: !!k.isSidechain,
              }).slice(0, 400),
              tip: (p.input && (p.input.subagent_type || p.input.description)) || '',
            });
          }
        }
        if (p.type === 'text') o.asistanMetni += p.text + '\n';
      }
    }
    if (k.type === 'user' && k.message) {
      if (typeof k.message.content === 'string') {
        istemNo++;
        o.istemDamgalari.push({ istem: istemNo, ts, satirNo });
        o.kullaniciIstemleri.push(k.message.content.slice(0, 120));
      } else if (Array.isArray(k.message.content)) {
        for (const p of k.message.content) {
          if (p.type !== 'tool_result') continue;
          const govde = metinCikar(p.content);
          if (!RED_IZI.test(govde)) continue;
          o.redler.push({ istem: istemNo, satirNo, isError: !!p.is_error, metin: govde.slice(0, 260) });
        }
      }
    }
    if (k.type !== 'attachment' || !k.attachment) continue;
    const e = k.attachment;
    const govde = String(e.stdout || e.content || e.text || '');
    o.ekOlaylari.push({ istem: istemNo, tip: e.type || '', ts, satirNo });
    if (e.hookEvent) {
      o.kancaSayaci[e.hookEvent] = (o.kancaSayaci[e.hookEvent] || 0) + 1;
      o.kancaOlaylari.push({ istem: istemNo, olay: e.hookEvent, ts, satirNo });
    }
    if (e.type === 'skill_listing') o.skillListesi += govde + '\n';
  }
  return o;
}

function turDokumu(tr) {
  if (!tr) return null;
  const enBuyuk = Math.max(0, ...tr.ekOlaylari.map((e) => e.istem), ...tr.istemDamgalari.map((i) => i.istem));
  const cikti = [];
  for (let i = 0; i <= enBuyuk; i++) {
    const kancalar = {};
    for (const h of tr.kancaOlaylari.filter((h) => h.istem === i))
      kancalar[h.olay] = (kancalar[h.olay] || 0) + 1;
    const ekler = [...new Set(tr.ekOlaylari.filter((e) => e.istem === i).map((e) => e.tip))].filter(Boolean);
    const istem = tr.istemDamgalari.find((x) => x.istem === i);
    cikti.push({
      istem: i,
      etiket: i === 0 ? 'oturum acilisi (istem oncesi)' : 'tur ' + i,
      damga: istem ? istem.ts : '',
      kancalar,
      ekler,
    });
  }
  return cikti;
}

function jsonCoz(r) {
  try {
    return JSON.parse(r.out);
  } catch {
    return null;
  }
}

function kotaVar(r, json) {
  const metin = String((json && json.result) || '') + '\n' + r.err + '\n' + r.out.slice(0, 4000);
  return KOTA_IZI.test(metin);
}

async function deney(ad, args, ortam, gunluk) {
  const t0 = Date.now();
  const r = await kos('claude', args, ortam);
  const sure = Date.now() - t0;
  const json = jsonCoz(r);
  const kota = kotaVar(r, json);
  gunluk.push(
    ad +
      ' → kod ' +
      r.kod +
      ' · ' +
      Math.round(sure / 1000) +
      ' sn' +
      (r.kesildi ? ' · TAVAN ASILDI' : '') +
      (kota ? ' · KOTA IZI' : '')
  );
  if (json)
    gunluk.push(
      '  session_id=' +
        (json.session_id || '?') +
        ' · total_cost_usd=' +
        (json.total_cost_usd !== undefined ? json.total_cost_usd : '?') +
        ' · num_turns=' +
        (json.num_turns !== undefined ? json.num_turns : '?') +
        ' · is_error=' +
        String(json.is_error)
    );
  if (json && json.result)
    gunluk.push('  result: ' + String(json.result).replace(/\s+/g, ' ').slice(0, 300));
  if (!json) gunluk.push('  ham cikti: ' + (r.out || r.err).replace(/\s+/g, ' ').slice(0, 300));
  return { ad, r, json, kota, sure, kesildi: r.kesildi };
}

function istem(gorev, opt) {
  const a = ['-p', gorev, '--model', 'opus', '--permission-mode', opt.kip, '--max-turns',
    String(opt.tur), '--output-format', 'json'];
  return opt.resume ? ['--resume', opt.resume, ...a] : a;
}

async function kosDeney(ad, gorev, opt, ortam, gunluk) {
  const { konfig, env, fixture } = ortam;
  if (opt.fixture !== false) fixtureKur(fixture, opt.dosyalar);
  const d = await deney(ad, istem(gorev, opt), { cwd: fixture, env, tavan: TAVAN_MS }, gunluk);
  d.fixture = fixture;
  d.transkript = transkriptBul(konfig, fixture, d.json && d.json.session_id);
  d.tr = d.transkript ? coz(d.transkript) : null;
  d.yanKollar = yanKolBul(konfig, fixture, d.json && d.json.session_id).map(coz);
  d.dosyalar = fs.readdirSync(fixture).sort();
  gunluk.push('  fixture dosyalari: ' + d.dosyalar.join(', '));
  if (d.tr)
    gunluk.push(
      '  araclar: ' +
        (d.tr.araclar.join(', ') || 'yok') +
        ' · Task/Agent cagrisi: ' +
        d.tr.ajanCagrilari.length +
        ' · isSidechain satiri: ' +
        d.tr.yanKolSatiri +
        ' · asistan turu: ' +
        d.tr.turSayisi +
        ' · transkript satiri: ' +
        d.tr.satirSayisi +
        ' · bozuk satir: ' +
        d.tr.bozukSatir +
        ' · alt ajan transkripti: ' +
        d.yanKollar.length
    );
  if (d.tr) {
    const redler = [...d.tr.redler, ...d.yanKollar.flatMap((y) => y.redler)];
    if (redler.length)
      gunluk.push('  izin reddi ' + redler.length + ' adet · ilk: ' + redler[0].metin.slice(0, 200));
  }
  return d;
}

function kancaOzeti(d, gunluk) {
  if (!d || !d.tr) return;
  gunluk.push(
    '  kanca sayaci: ' +
      (Object.entries(d.tr.kancaSayaci)
        .map(([a, n]) => a + '×' + n)
        .join(', ') || 'yok')
  );
  for (const t of turDokumu(d.tr))
    gunluk.push(
      '    ' +
        t.etiket +
        ' · kancalar: ' +
        (Object.entries(t.kancalar)
          .map(([a, n]) => a + '×' + n)
          .join(', ') || 'yok') +
        ' · ekler: ' +
        (t.ekler.join(', ') || 'yok')
    );
}

function hamKayit(d) {
  if (!d) return null;
  return {
    ad: d.ad,
    kod: d.r.kod,
    kesildi: d.kesildi,
    kota: d.kota,
    sure: d.sure,
    json: d.json,
    transkript: d.transkript,
    dosyalar: d.dosyalar,
    araclar: d.tr ? d.tr.araclar : null,
    ajanCagrilari: d.tr ? d.tr.ajanCagrilari : null,
    yanKolSatiri: d.tr ? d.tr.yanKolSatiri : null,
    kancaSayaci: d.tr ? d.tr.kancaSayaci : null,
    kancaOlaylari: d.tr ? d.tr.kancaOlaylari : null,
    turDokumu: turDokumu(d.tr),
    skillTeknesyum: d.tr ? /teknesyum:/.test(d.tr.skillListesi) : null,
    skillOrnek: d.tr
      ? (d.tr.skillListesi.split('\n').find((x) => /teknesyum:/.test(x)) || '').slice(0, 200)
      : null,
    kullaniciIstemleri: d.tr ? d.tr.kullaniciIstemleri : null,
    istemDamgalari: d.tr ? d.tr.istemDamgalari : null,
    redler: d.tr ? d.tr.redler : null,
    altAjanRedleri: d.yanKollar ? d.yanKollar.flatMap((y) => y.redler) : null,
    altAjanTranskriptleri: d.yanKollar ? d.yanKollar.map((y) => y.dosya) : null,
    asistanMetni: d.tr ? d.tr.asistanMetni.replace(/\s+/g, ' ').slice(0, 600) : null,
    turSayisi: d.tr ? d.tr.turSayisi : null,
    satirSayisi: d.tr ? d.tr.satirSayisi : null,
    bozukSatir: d.tr ? d.tr.bozukSatir : null,
  };
}

function cozDosyaKipi(dosya) {
  const tr = coz(dosya);
  process.stdout.write('transkript: ' + dosya + '\n');
  process.stdout.write(
    'satir ' + tr.satirSayisi + ' · bozuk ' + tr.bozukSatir + ' · asistan turu ' + tr.turSayisi +
      ' · Task/Agent ' + tr.ajanCagrilari.length + ' · izin reddi ' + tr.redler.length + '\n'
  );
  process.stdout.write(
    'kanca sayaci: ' +
      (Object.entries(tr.kancaSayaci).map(([a, n]) => a + '×' + n).join(', ') || 'yok') + '\n'
  );
  for (const t of turDokumu(tr))
    process.stdout.write(
      '  ' + t.etiket + ' · ' + (t.damga || '-') + ' · kancalar: ' +
        (Object.entries(t.kancalar).map(([a, n]) => a + '×' + n).join(', ') || 'yok') +
        ' · ekler: ' + (t.ekler.join(', ') || 'yok') + '\n'
    );
  for (const r of tr.redler) process.stdout.write('  red: ' + r.metin.slice(0, 180) + '\n');
}

(async () => {
  const cozIndeks = process.argv.indexOf('--coz');
  if (cozIndeks !== -1) {
    cozDosyaKipi(process.argv[cozIndeks + 1]);
    return;
  }

  const benchKok = path.join(os.tmpdir(), 'tbench', 'ork' + damga());
  fs.mkdirSync(benchKok, { recursive: true });
  process.stdout.write('spike2 koku: ' + benchKok + '\n');
  process.stdout.write('deneyler: ' + (SECIM.length ? SECIM.join(', ') : 'hepsi') + '\n');

  const kimlikGunluk = [];
  let kimlikDosyasi;
  try {
    kimlikDosyasi = await kimlikHazirla(kimlikGunluk);
  } catch (e) {
    process.stderr.write(String(e.message || e) + '\n');
    process.exit(2);
  }

  const gunluk = [];
  const konfig = path.join(benchKok, 'konfig');
  konfigKur(konfig, kimlikDosyasi);
  if (!(await eklentiKur(konfig, gunluk))) {
    process.stderr.write('eklenti kurulumu basarisiz\n');
    process.exit(2);
  }
  if (!(await profilYaz(konfig, 'premium', gunluk))) {
    process.stderr.write('profil yazimi basarisiz\n');
    process.exit(2);
  }

  const env = { CLAUDE_CONFIG_DIR: konfig };
  const deneyler = [];
  const ort = (ad) => ({ konfig, env, fixture: path.join(benchKok, ad) });

  if (secili('D1')) {
    const d1 = await kosDeney('D1 bypassPermissions', AJAN_GOREV, { kip: 'bypassPermissions', tur: 20 }, ort('d1'), gunluk);
    deneyler.push(d1);
  }

  if (secili('D2')) {
    const d2 = await kosDeney('D2 acceptEdits', AJAN_GOREV, { kip: 'acceptEdits', tur: 20 }, ort('d2'), gunluk);
    deneyler.push(d2);
  }

  const o3 = ort('d3');
  let d3 = null;
  if (secili('D3')) {
    d3 = await kosDeney('D3 ogret', OGRET_GOREV, { kip: 'bypassPermissions', tur: 3 }, o3, gunluk);
    deneyler.push(d3);
  }

  if (secili('D4')) {
    const sid = d3 && d3.json && d3.json.session_id;
    if (!sid) gunluk.push('D4 kosmadi: D3 session_id dondurmedi');
    else {
      const d4 = await kosDeney(
        'D4 resume',
        SOR_GOREV,
        { kip: 'bypassPermissions', tur: 3, resume: sid, fixture: false },
        o3,
        gunluk
      );
      kancaOzeti(d4, gunluk);
      deneyler.push(d4);
    }
  }

  if (secili('D5')) {
    const o5 = ort('d5');
    const d5a = await kosDeney('D5a ogret', OGRET_GOREV_D5, { kip: 'bypassPermissions', tur: 3 }, o5, gunluk);
    kancaOzeti(d5a, gunluk);
    deneyler.push(d5a);
    const sid5 = d5a.json && d5a.json.session_id;
    if (!sid5) gunluk.push('D5b kosmadi: D5a session_id dondurmedi');
    else {
      const d5b = await kosDeney(
        'D5b resume',
        SOR_GOREV,
        { kip: 'bypassPermissions', tur: 3, resume: sid5, fixture: false },
        o5,
        gunluk
      );
      gunluk.push('  ayni transkript dosyasi mi: ' + String(d5a.transkript === d5b.transkript));
      kancaOzeti(d5b, gunluk);
      deneyler.push(d5b);
    }
  }

  if (secili('D6')) {
    const dosyalar = { 'mod-a.js': MOD_A, 'mod-b.js': MOD_B, 'mod-c.js': MOD_C };
    for (const n of [1, 2]) {
      const d6 = await kosDeney(
        'D6-' + n + ' bolusme (emirsiz)',
        BOLUSME_GOREV,
        { kip: 'bypassPermissions', tur: 20, dosyalar },
        ort('d6-' + n),
        gunluk
      );
      gunluk.push(
        '  KENDILIGINDEN AJAN: ' +
          (d6.tr && d6.tr.ajanCagrilari.length ? 'EVET (' + d6.tr.ajanCagrilari.length + ')' : 'HAYIR')
      );
      deneyler.push(d6);
    }
  }

  const kotaCarpti = deneyler.some((d) => d.kota);
  fs.writeFileSync(
    path.join(benchKok, 'ham.json'),
    JSON.stringify(
      { benchKok, konfig, kimlikGunluk, gunluk, deneyler: deneyler.map(hamKayit) },
      null,
      2
    ),
    'utf8'
  );

  process.stdout.write('\n=== ozet ===\n');
  for (const g of kimlikGunluk) process.stdout.write(g + '\n');
  for (const g of gunluk) process.stdout.write(g + '\n');
  process.stdout.write('\nham kanit: ' + path.join(benchKok, 'ham.json') + '\n');
  process.stdout.write('rapor elle yazilir: ' + RAPOR + '\n');
  process.exit(kotaCarpti ? 3 : 0);
})();
