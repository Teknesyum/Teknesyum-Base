#!/usr/bin/env node

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const KOK = path.resolve(__dirname, '..', '..');
const RAPOR = path.join(KOK, 'docs', 'BENCH-ISKANDIL.md');
const PREMIUM_JS = path.join(KOK, 'teknesyum', 'scripts', 'premium.js');
const ANA_KOK = path.join(process.env.USERPROFILE || process.env.HOME || '.', '.claude');
const KIMLIK = path.join(ANA_KOK, '.credentials.json');

const DURUMLAR = ['premium', 'normal', 'eco', 'native'];
const TAVAN_MS = 3 * 60 * 1000;
const KURULUM_TAVAN_MS = 5 * 60 * 1000;
const GOREV =
  'README.md dosyasinin sonuna tek satir ekle: "Bench denemesi." Baska hicbir sey yapma.';

// Profil metni SessionStart bannerinda degil UserPromptSubmit baglaminda geliyor
// (relay-watch.js `hatirlat`). Ikisi birlestirilip aranir. `normal` taban profildir ve
// kendi notu yoktur — izi otekilerin yoklugudur.
const PROFIL_IZI = {
  premium: /Premium mod(e is on|u? a[çc][ıi]k)/i,
  eco: /Eco mod(e is on|u? a[çc][ıi]k)/i,
  normal: null,
};

const SAPMA_IZI = /(Buttons deviating from the baseline|Tabandan sapan d[üu]gmeler)/i;

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
      // stdin bos bir boruya baglanirsa `claude` 3 saniye veri bekleyip uyari basiyor.
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

function fixtureKur(dizin) {
  fs.rmSync(dizin, { recursive: true, force: true });
  fs.mkdirSync(dizin, { recursive: true });
  fs.writeFileSync(path.join(dizin, 'README.md'), '# Bench fixture\n', 'utf8');
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

// OAuth erisim jetonu yenilendiginde yenileme jetonu da doner: eski dosyayi kullanan
// oteki kokler ayni anda yenilemeye kalkarsa uc tanesi "OAuth session expired" alir.
// Ilk kosuda dordu birden bunu yasadi. Cozum tek bir kalici kimlik koku: jeton orada,
// sirayla, kosulardan once tazelenir; dort kosu taze jetonun kopyasiyla baslar ve
// kosu suresince yenileme gerekmez.
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

function coz(dosya) {
  const ham = fs.readFileSync(dosya, 'utf8');
  const o = {
    ham,
    kancalar: new Set(),
    skillListesi: '',
    oturumMetni: '',
    istemMetni: '',
    ajanListesi: '',
    turSayisi: 0,
  };
  for (const satir of ham.split('\n')) {
    if (!satir.trim()) continue;
    let k;
    try {
      k = JSON.parse(satir);
    } catch {
      continue;
    }
    if (k.type === 'assistant' && k.message) o.turSayisi++;
    if (k.type !== 'attachment' || !k.attachment) continue;
    const e = k.attachment;
    const govde = String(e.stdout || e.content || e.text || '');
    if (e.hookEvent) o.kancalar.add(e.hookEvent);
    if (e.hookEvent === 'SessionStart') o.oturumMetni += govde + '\n';
    if (e.hookEvent === 'UserPromptSubmit') o.istemMetni += govde + '\n';
    if (e.type === 'skill_listing') o.skillListesi += govde + '\n';
    if (e.type === 'agent_listing_delta') o.ajanListesi += JSON.stringify(e) + '\n';
  }
  return o;
}

function kanit(metin, desen) {
  const s = metin.split('\n').find((x) => desen.test(x));
  return s ? s.trim().slice(0, 180) : '';
}

function parca(metin, desen) {
  const m = desen.exec(metin);
  if (!m) return '';
  return metin
    .slice(m.index, m.index + 140)
    .replace(/\s+/g, ' ')
    .trim();
}

function degerlendir(durum, konfig, fixture, tr, dosya) {
  const c = {};
  if (durum === 'native') {
    const iz = (tr.ham.match(/teknesyum/gi) || []).length;
    c.s1 = {
      cevap: 'YOK',
      kanit: 'native kosuda eklenti kurulmadi — kanca/skill sorusu bu kosuya uygulanmaz',
    };
    c.s3 = {
      cevap: iz === 0 ? 'EVET' : 'HAYIR',
      kanit:
        iz === 0
          ? 'transkriptte /teknesyum/i eslesmesi 0'
          : 'transkriptte /teknesyum/i eslesmesi ' + iz + ' — ' + kanit(tr.ham, /teknesyum/i),
    };
    c.s4 = { cevap: 'YOK', kanit: 'native kosuda profil yazilmadi' };
  } else {
    const kancaVar = tr.kancalar.has('SessionStart') && tr.kancalar.has('UserPromptSubmit');
    const skillVar = /teknesyum:/.test(tr.skillListesi);
    c.s1 = {
      cevap: kancaVar && skillVar ? 'EVET' : 'HAYIR',
      kanit:
        'kanca olaylari: ' +
        ([...tr.kancalar].join(', ') || 'yok') +
        ' · skill listesi: ' +
        (skillVar ? kanit(tr.skillListesi, /teknesyum:/) : 'teknesyum skill yok'),
    };
    c.s3 = { cevap: 'YOK', kanit: 'bu soru yalniz native kosuya sorulur' };
    const baglam = tr.oturumMetni + '\n' + tr.istemMetni;
    const desen = PROFIL_IZI[durum];
    if (desen) {
      const par = parca(baglam, desen);
      c.s4 = {
        cevap: par ? 'EVET' : 'HAYIR',
        kanit: par
          ? 'ilk istemin baglaminda: "' + par + '"'
          : durum + ' profil izi ilk istemin baglaminda bulunamadi',
      };
    } else {
      const yabanci = Object.entries(PROFIL_IZI)
        .filter(([, d]) => d && d.test(baglam))
        .map(([a]) => a);
      const sapma = SAPMA_IZI.test(baglam);
      c.s4 = {
        cevap: !yabanci.length && !sapma ? 'EVET' : 'HAYIR',
        kanit:
          !yabanci.length && !sapma
            ? 'normal taban profil — ilk istemin baglaminda premium/eco notu ve sapan dugme satiri yok'
            : 'normal beklenirken ' + (yabanci.join(', ') || 'sapan dugme satiri') + ' var',
      };
    }
  }
  const projeler = path.join(konfig, 'projects');
  const icerde = dosya.startsWith(projeler);
  c.s2 = {
    cevap: icerde ? 'EVET' : 'HAYIR',
    kanit: (icerde ? 'izole kok altinda: ' : 'izole kok disinda: ') + dosya,
  };
  return c;
}

async function kosu(durum, benchKok, kimlikDosyasi) {
  const gunluk = [];
  const konfig = path.join(benchKok, durum, 'konfig');
  const fixture = path.join(benchKok, durum, 'fixture');
  const sonuc = { durum, konfig, fixture, gunluk, cevaplar: null, hata: null };
  try {
    konfigKur(konfig, kimlikDosyasi);
    fixtureKur(fixture);
    if (durum !== 'native') {
      if (!(await eklentiKur(konfig, gunluk))) throw new Error('eklenti kurulumu basarisiz');
      if (!(await profilYaz(konfig, durum, gunluk))) throw new Error('profil yazimi basarisiz');
    } else {
      gunluk.push('eklenti kurulmadi, profil yazilmadi');
    }
    const t0 = Date.now();
    const r = await kos(
      'claude',
      [
        '-p',
        GOREV,
        '--model',
        'opus',
        '--permission-mode',
        'bypassPermissions',
        '--max-turns',
        '12',
        '--output-format',
        'json',
      ],
      { cwd: fixture, env: { CLAUDE_CONFIG_DIR: konfig }, tavan: TAVAN_MS }
    );
    sonuc.sure = Date.now() - t0;
    sonuc.cikisKodu = r.kod;
    sonuc.kesildi = r.kesildi;
    gunluk.push(
      'claude -p → kod ' +
        r.kod +
        ' · ' +
        Math.round(sonuc.sure / 1000) +
        ' sn' +
        (r.kesildi ? ' · TAVAN ASILDI' : '')
    );
    let sid = null;
    let json = null;
    try {
      json = JSON.parse(r.out);
      sid = json.session_id || null;
    } catch {}
    sonuc.sid = sid;
    sonuc.gorevTamam = /Bench denemesi/.test(
      fs.readFileSync(path.join(fixture, 'README.md'), 'utf8')
    );
    if (json && json.is_error) gunluk.push('sonuc: ' + String(json.result || '').slice(0, 200));
    if (!sonuc.gorevTamam)
      gunluk.push(
        'gorev yapilmadi — README.md degismedi · ' +
          String((json && json.result) || r.err || r.out).slice(0, 200)
      );
    const dosya = transkriptBul(konfig, fixture, sid);
    if (!dosya) throw new Error('transkript bulunamadi: ' + path.join(konfig, 'projects'));
    sonuc.transkript = dosya;
    const tr = coz(dosya);
    sonuc.turSayisi = tr.turSayisi;
    sonuc.cevaplar = degerlendir(durum, konfig, fixture, tr, dosya);
  } catch (e) {
    sonuc.hata = String(e.message || e);
    gunluk.push('HATA: ' + sonuc.hata);
  }
  return sonuc;
}

const SORULAR = {
  s1: 'Headless `claude -p` kancalari ve skilleri calistiriyor mu?',
  s2: 'Transkript izole konfig kokunun `projects/` altina mi dusuyor?',
  s3: 'Native kosuda eklenti gercekten yok mu?',
  s4: 'Profil degisimi ilk isteme yetisiyor mu?',
};

function toplu(sonuclar, anahtar) {
  const ilgili = sonuclar
    .map((s) => s.cevaplar && s.cevaplar[anahtar])
    .filter((c) => c && c.cevap !== 'YOK');
  if (!ilgili.length) return 'BELIRSIZ';
  return ilgili.every((c) => c.cevap === 'EVET') ? 'EVET' : 'HAYIR';
}

function rapor(sonuclar, benchKok, kimlikGunluk) {
  const L = [];
  const hepsi = ['s1', 's2', 's3', 's4'].map((a) => toplu(sonuclar, a));
  const gecti = hepsi.every((x) => x === 'EVET');
  L.push('# Bench iskandili — headless kosu ve izolasyon fizibilitesi');
  L.push('');
  L.push('Uretim: `node scripts/bench/spike.js` · ' + new Date().toISOString());
  L.push('Kosu koku: `' + benchKok + '`');
  L.push('');
  L.push(
    gecti
      ? '**Sonuc: dordu de EVET.** B1/B2 planlandigi gibi kurulabilir; kosular tam otomatik surulur.'
      : '**Sonuc: en az bir soru HAYIR.** Yari-otomatik duzenek serhi asagida.'
  );
  L.push('');
  L.push('## Dort sorunun cevabi');
  L.push('');
  L.push('| # | Soru | Cevap |');
  L.push('|---|---|---|');
  ['s1', 's2', 's3', 's4'].forEach((a, i) => {
    L.push('| ' + (i + 1) + ' | ' + SORULAR[a] + ' | **' + hepsi[i] + '** |');
  });
  L.push('');
  L.push('## Kosu basina kanit');
  L.push('');
  for (const s of sonuclar) {
    L.push('### ' + s.durum);
    L.push('');
    if (s.hata) {
      L.push('**Kosu basarisiz:** ' + s.hata);
      L.push('');
    }
    L.push('- Izole konfig koku: `' + s.konfig + '`');
    L.push('- Fixture: `' + s.fixture + '`');
    if (s.transkript) L.push('- Transkript: `' + s.transkript + '`');
    if (s.sure !== undefined)
      L.push(
        '- Sure: ' +
          Math.round(s.sure / 1000) +
          ' sn · cikis kodu ' +
          s.cikisKodu +
          (s.kesildi ? ' · **3 dk tavani asildi**' : '') +
          (s.turSayisi !== undefined ? ' · asistan turu ' + s.turSayisi : '') +
          ' · gorev ' +
          (s.gorevTamam ? 'tamamlandi' : '**yapilmadi**')
      );
    L.push('');
    L.push('| # | Cevap | Kanit |');
    L.push('|---|---|---|');
    for (const a of ['s1', 's2', 's3', 's4']) {
      const c = s.cevaplar ? s.cevaplar[a] : null;
      L.push(
        '| ' +
          a.slice(1) +
          ' | ' +
          (c ? c.cevap : 'KOSMADI') +
          ' | ' +
          (c ? c.kanit.replace(/\|/g, '\\|') : s.hata || '') +
          ' |'
      );
    }
    L.push('');
    L.push('Kurulum gunlugu:');
    L.push('');
    L.push('```');
    for (const g of s.gunluk) L.push(g);
    L.push('```');
    L.push('');
  }
  L.push('## Izole kokte eklenti kurulumu — nasil yapildi');
  L.push('');
  L.push('Kosu basina bos bir dizin acilir ve `CLAUDE_CONFIG_DIR` ona set edilir. Eklenti');
  L.push('`~/.claude/plugins` onbelleginden kopyalanmaz; marketplace kaydi izole koke');
  L.push('yeniden yapilir — depo kokunun kendisi `directory` kaynakli marketplace olarak');
  L.push('eklenir, sonra eklenti oradan kurulur:');
  L.push('');
  L.push('```');
  L.push('CLAUDE_CONFIG_DIR=<izole>  claude plugin marketplace add <depo koku>');
  L.push('CLAUDE_CONFIG_DIR=<izole>  claude plugin install teknesyum@teknesyum');
  L.push('```');
  L.push('');
  L.push('Ikisi de yalnizca izole koke yazar. Kurulumdan sonra izole `settings.json` icinde');
  L.push('`extraKnownMarketplaces` ve `enabledPlugins: { "teknesyum@teknesyum": true }` olusur;');
  L.push('ana `~/.claude/settings.json` degismez. Profil sonra ayni ortam degiskeniyle');
  L.push('`node teknesyum/scripts/premium.js <durum>` cagrisiyla yazilir ve izole koke duser');
  L.push('(`<izole>/teknesyum.json` + `<izole>/settings.json`).');
  L.push('');
  L.push('Ana kokten yalniz **okunan** tek dosya `~/.claude/.credentials.json`: izole kokte');
  L.push('oturum kimligi yoktur ve `claude -p` "Not logged in" ile 1 doner. Dosya izole koke');
  L.push('kopyalanir; ana kok yazilmaz.');
  L.push('');
  L.push('Native kosuda bu adimlarin hicbiri yapilmaz — bos konfig koku + kimlik dosyasi.');
  L.push('');
  L.push('## Kimlik — paralel kosunun tek gercek engeli');
  L.push('');
  L.push('OAuth erisim jetonu yenilendiginde yenileme jetonu da doner. Dort kosu ayni eski');
  L.push('dosyanin kopyasiyla baslayip ayni anda yenilemeye kalkarsa uc tanesi');
  L.push('`Failed to authenticate: OAuth session expired` alir ve modele hic ulasmaz —');
  L.push('kancalar yine calisir, transkript yine yazilir, yani kosu **sessizce bos doner**.');
  L.push('Ilk denemede dordu birden boyle bitti.');
  L.push('');
  L.push('Duzenek: kalici bir kimlik koku (`<tmp>/tbench/kimlik`). Jeton orada, kosulardan');
  L.push('once ve sirayla tazelenir; dort kosu taze jetonun kopyasiyla baslar ve kosu');
  L.push('suresince yenileme gerekmez. Bu kosunun kimlik gunlugu:');
  L.push('');
  L.push('```');
  for (const g of kimlikGunluk) L.push(g);
  L.push('```');
  L.push('');
  L.push('Kimlik koku bir kez ana kokten tohumlanir; sonra kendini tasir. Tazeleme de');
  L.push('basarisiz olursa spike 2 ile durur ve ana kokte yeniden giris ister.');
  L.push('');
  L.push('## Kosu bayraklari — B1/B2 icin sabit');
  L.push('');
  L.push('```');
  L.push('claude -p "<gorev>" --model opus --permission-mode bypassPermissions \\');
  L.push('       --max-turns 12 --output-format json');
  L.push('```');
  L.push('');
  L.push('- `bypassPermissions` sart. `acceptEdits` ile dort kosu da izin engeline takildi');
  L.push('  ve modele "Yapamadim — izin engeli" dedirtip bos dondu; headless kosuda soruyu');
  L.push('  soracak kimse yok.');
  L.push('- Alt surecin stdini kapali baglanmali (`stdio[0] = ignore`). Bos boruya');
  L.push('  baglanirsa `claude` 3 sn veri bekleyip uyari basiyor ve cikis kodu 1 oluyor.');
  L.push('- `--output-format json` ciktisindaki `session_id` transkript dosyasinin adidir;');
  L.push('  toplama bunun uzerinden yapilir, "en yeni dosya" tahminine gerek kalmaz.');
  L.push('- Gorevin gercekten yapildigi fixture uzerinden dogrulanir. Kanca izleri kimlik');
  L.push('  ve izin hatalarinda da transkripte dustugu icin tek basina yeterli kanit degil.');
  L.push('');
  if (!gecti) {
    L.push('## Serh — yari otomatik duzenek');
    L.push('');
    L.push('Asagidaki sorular HAYIR dondu; B2 brifingi bu maddelerle guncellenmeli:');
    L.push('');
    ['s1', 's2', 's3', 's4'].forEach((a, i) => {
      if (hepsi[i] !== 'EVET') L.push('- ' + SORULAR[a] + ' → ' + hepsi[i]);
    });
    L.push('');
  }
  return L.join('\n') + '\n';
}

(async () => {
  // Klasor adinda `teknesyum` gecemez: transkriptin her satirinda `cwd` yazili ve native
  // kosunun "eklenti izi sifir mi" olcumu kendi yolunu iz sayardi. Ilk kosuda oldu.
  const benchKok = path.join(os.tmpdir(), 'tbench', damga());
  fs.mkdirSync(benchKok, { recursive: true });
  process.stdout.write('bench koku: ' + benchKok + '\n');
  const kimlikGunluk = [];
  let kimlikDosyasi;
  try {
    kimlikDosyasi = await kimlikHazirla(kimlikGunluk);
  } catch (e) {
    process.stderr.write(String(e.message || e) + '\n');
    process.exit(2);
  }
  const sonuclar = await Promise.all(DURUMLAR.map((d) => kosu(d, benchKok, kimlikDosyasi)));
  fs.mkdirSync(path.dirname(RAPOR), { recursive: true });
  fs.writeFileSync(RAPOR, rapor(sonuclar, benchKok, kimlikGunluk), 'utf8');
  for (const s of sonuclar)
    process.stdout.write(
      s.durum.padEnd(8) +
        (s.hata
          ? 'HATA · ' + s.hata
          : ['s1', 's2', 's3', 's4'].map((a) => s.cevaplar[a].cevap).join(' ') +
            ' · gorev ' +
            (s.gorevTamam ? 'tamam' : 'YAPILMADI')) +
        '\n'
    );
  process.stdout.write('rapor: ' + RAPOR + '\n');
  process.exit(sonuclar.some((s) => s.hata || !s.gorevTamam) ? 1 : 0);
})();
