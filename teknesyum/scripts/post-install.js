#!/usr/bin/env node
/**
 * Plugin'in taşıyamadığı iki şeyi bağlar: statusline ve huy dosyası.
 * install.ps1 / install.sh kurulu paketin içinden çağırır, elle de çalıştırılabilir:
 *   node teknesyum/scripts/post-install.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const HOME =
  process.env.CLAUDE_CONFIG_DIR || process.env.CLAUDE_HOME || path.join(os.homedir(), '.claude');
const SL = path.join(HOME, 'teknesyum-statusline.js');
const yapilan = [];
const atlanan = [];
const hata = [];

// ÖLÇÜLDÜ (25.08.2026, dış denetim TB-005): post-install `main` üzerinden indiriliyordu ve
// `indir()` yönlendirmeleri sınırsız izliyordu — zaman aşımı, gövde tavanı, alan listesi ve
// sağlama yoktu. Etiketli sürüm kuran kullanıcı o anki `main`'i alıyordu. Betik artık
// kurulan paketin içinden çalışır; indirme yalnız beklenen SHA-256 verildiğinde yapılır.
const IZINLI_ALAN = new Set(['raw.githubusercontent.com', 'objects.githubusercontent.com']);
const YON_TAVANI = 3;
const GOVDE_TAVANI = 2 * 1024 * 1024;
const SURE_TAVANI = 30000;

function adresDenetle(url, adim) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return 'adres çözülemedi';
  }
  if (u.protocol !== 'https:') return 'yalnız https kabul edilir';
  if (!IZINLI_ALAN.has(u.hostname)) return 'alan listede yok: ' + u.hostname;
  if ((adim || 0) > YON_TAVANI) return 'yönlendirme tavanı aşıldı';
  return null;
}

function indir(url, secenek) {
  const o = secenek || {};
  const al = o.get || https.get;
  const t0 = o.basla || Date.now();
  const n = o.adim || 0;
  return new Promise((ok, red) => {
    const kotu = adresDenetle(url, n);
    if (kotu) return red(new Error(kotu));
    const u = new URL(url);

    const kalan = SURE_TAVANI - (Date.now() - t0);
    if (kalan <= 0) return red(new Error('toplam süre aşıldı'));
    const istek = al(u, { timeout: kalan }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        r.resume();
        return indir(new URL(r.headers.location, u).toString(), {
          get: al,
          adim: n + 1,
          basla: t0,
        }).then(ok, red);
      }
      if (r.statusCode !== 200) {
        r.resume();
        return red(new Error('HTTP ' + r.statusCode));
      }
      const parca = [];
      let boy = 0;
      r.on('data', (c) => {
        boy += c.length;
        if (boy > GOVDE_TAVANI) {
          r.destroy();
          return red(new Error('gövde tavanı aşıldı'));
        }
        parca.push(c);
      });
      r.on('end', () => ok(Buffer.concat(parca)));
      r.on('error', red);
    });
    istek.on('timeout', () => {
      istek.destroy();
      red(new Error('sunucu yanıt vermedi'));
    });
    istek.on('error', red);
  });
}

// Kurulum kural yazmaz, kural defteri açar. Buraya konan her satır kurulumu yapan kişinin
// bütün projelerinde yürürlüğe girer; eklentiyi yazanın alışkanlıkları eklentiyi kuranı
// bağlamaz. İlk kural `/rule` ile gelir.
const RULES = `# Rules

Recurring preferences and things that have burned me before. **30-line ceiling** — when it
is full, don't append; delete the weakest line or merge two. Added with \`/rule\`.

<!-- empty on purpose — add your first rule with /rule -->
`;

// ÖLÇÜLDÜ (TB-006): parse hatası bir yazma gerekçesi değil, yazmama gerekçesidir — eski
// sürüm bozuk `settings.json`'ı boş nesne sayıp üstüne yazıyordu ve kullanıcının bütün
// ayarları gidiyordu. Değişiklikler önce plana yazılır, plan bütünüyle doğrulanır, sonra
// tek tek uygulanır; biri düşerse uygulananlar yedekten geri alınır.
const plan = [];
const damga = () =>
  new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex');

function ekle(yol, icerik, etiket) {
  plan.push({ yol, icerik, etiket });
}

function cikar(yol, etiket) {
  plan.push({ yol, sil: true, etiket });
}

function yazilabilir(dizin) {
  try {
    fs.accessSync(dizin, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function oku(yol) {
  try {
    return { ok: true, govde: fs.readFileSync(yol, 'utf8') };
  } catch (e) {
    return { ok: false, hata: e.message };
  }
}

function planDenetle() {
  const engel = [];
  for (const is of plan) {
    const dizin = path.dirname(is.yol);
    let st = null;
    try {
      st = fs.statSync(is.yol);
    } catch {}
    if (st && !st.isFile()) {
      engel.push(is.etiket + ': hedef normal bir dosya değil — ' + is.yol);
      continue;
    }
    try {
      fs.mkdirSync(dizin, { recursive: true });
    } catch (e) {
      engel.push(is.etiket + ': klasör açılamadı (' + e.message + ')');
      continue;
    }
    if (!yazilabilir(dizin)) engel.push(is.etiket + ': klasöre yazılamıyor — ' + dizin);
    else if (fs.existsSync(is.yol) && !yazilabilir(is.yol))
      engel.push(is.etiket + ': dosya salt okunur — ' + is.yol);
  }
  return engel;
}

function uygula() {
  const d = damga();
  const yapildi = [];
  // Geri alma yolunu ölçülebilir kılan arıza enjeksiyonu: n'inci adımda bilerek düşer.
  const cok = Number(process.env.TEKNESYUM_KURULUM_COK || 0);
  try {
    for (const is of plan) {
      if (cok && yapildi.length + 1 === cok)
        throw new Error('arıza enjeksiyonu (adım ' + cok + ')');
      const yedek = fs.existsSync(is.yol) ? is.yol + '.teknesyum-yedek-' + d : null;
      if (yedek) fs.copyFileSync(is.yol, yedek);
      if (is.sil) {
        fs.unlinkSync(is.yol);
      } else {
        const gecici = is.yol + '.teknesyum-tmp-' + d;
        fs.writeFileSync(gecici, is.icerik);
        fs.renameSync(gecici, is.yol);
      }
      yapildi.push({ is, yedek });
      yapilan.push(is.etiket + (yedek ? ' (yedek: ' + path.basename(yedek) + ')' : ''));
    }
    return true;
  } catch (e) {
    hata.push('kurulum yarıda kaldı, geri alınıyor: ' + e.message);
    for (const { is, yedek } of yapildi.reverse()) {
      try {
        if (yedek) fs.copyFileSync(yedek, is.yol);
        else fs.unlinkSync(is.yol);
      } catch (g) {
        hata.push('geri alınamadı: ' + is.yol + ' (' + g.message + ')');
      }
    }
    yapilan.length = 0;
    return false;
  }
}

async function koprulukIcerik() {
  const yerel = path.join(__dirname, 'bridge.js');
  if (fs.existsSync(yerel)) return fs.readFileSync(yerel);

  const url = process.env.TEKNESYUM_KOPRU_URL;
  const beklenen = String(process.env.TEKNESYUM_KOPRU_SHA || '').toLowerCase();
  if (!url || !/^[0-9a-f]{64}$/.test(beklenen)) {
    atlanan.push(
      'statusline köprüsü paketten okunamadı — Claude Code içinde /teknesyum:setup çalıştır'
    );
    return null;
  }
  try {
    const govde = await indir(url);
    const sha = crypto.createHash('sha256').update(govde).digest('hex');
    if (sha !== beklenen) {
      hata.push(
        'köprü sağlaması tutmadı — beklenen ' +
          beklenen.slice(0, 12) +
          ', gelen ' +
          sha.slice(0, 12)
      );
      return null;
    }
    return govde;
  } catch (e) {
    atlanan.push('statusline köprüsü indirilemedi: ' + e.message);
    return null;
  }
}

function rapor(sonSatir) {
  console.log('\n  Teknesyum Base\n');
  for (const y of yapilan) console.log('  ✓ ' + y);
  for (const a of atlanan) console.log('  · ' + a);
  for (const h of hata) console.log('  ✗ ' + h);
  if (hata.length) {
    console.log('\n  İşlem tamamlanmadı — yukarıdaki satırlar elle müdahale bekliyor.\n');
    process.exitCode = 1;
    return;
  }
  console.log('\n  ' + sonSatir + '\n');
}

// Kaldırma yalnız eklentinin izlerini geri çıkarır: kendi imzasını taşıyan statusLine
// bloğu, dokunulmamış RULES.md şablonu ve CLAUDE.md'ye eklenen @RULES.md satırı.
// Kullanıcının kendi içeriği bayt bayt yerinde kalır; her mutasyon damgalı yedek alır.
function kaldir() {
  const sp = path.join(HOME, 'settings.json');
  if (fs.existsSync(sp)) {
    let s = null;
    try {
      s = JSON.parse(fs.readFileSync(sp, 'utf8'));
      if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('nesne değil');
    } catch {
      hata.push('settings.json okunamadı (bozuk JSON) — dosyaya DOKUNULMADI. Elle düzelt: ' + sp);
    }
    if (s) {
      if (
        s.statusLine &&
        s.statusLine.command &&
        /teknesyum-statusline/.test(s.statusLine.command)
      ) {
        delete s.statusLine;
        if (Object.keys(s).length) ekle(sp, JSON.stringify(s, null, 2), 'statusLine kaldırıldı');
        else cikar(sp, 'settings.json kaldırıldı (yalnız eklenti ayarı taşıyordu)');
      } else if (s.statusLine) {
        atlanan.push('statusLine size ait, dokunulmadı');
      }
    }
  }

  if (fs.existsSync(SL)) cikar(SL, 'statusline köprüsü kaldırıldı');

  const hp = path.join(HOME, 'RULES.md');
  if (fs.existsSync(hp)) {
    const r = oku(hp);
    if (!r.ok) hata.push('RULES.md okunamadı, dokunulmadı: ' + r.hata);
    else if (r.govde === RULES) cikar(hp, 'RULES.md kaldırıldı (dokunulmamış şablon)');
    else atlanan.push('RULES.md sizin kurallarınızı taşıyor, korundu');
  }

  const cp = path.join(HOME, 'CLAUDE.md');
  if (fs.existsSync(cp)) {
    const r = oku(cp);
    if (!r.ok) hata.push('CLAUDE.md okunamadı, dokunulmadı: ' + r.hata);
    else if (/(^|\n)@RULES\.md(\r?\n|$)/.test(r.govde)) {
      const yeni = r.govde.replace(/(^|\n)@RULES\.md(\r?\n|$)/, '$1');
      if (yeni === '') cikar(cp, 'CLAUDE.md kaldırıldı (yalnız @RULES.md taşıyordu)');
      else ekle(cp, yeni, "CLAUDE.md'den @RULES.md çıkarıldı");
    } else atlanan.push("CLAUDE.md'de eklenti izi yok, dokunulmadı");
  }

  hata.push(...planDenetle());
  if (hata.length) plan.length = 0;
  if (plan.length) uygula();
  if (!plan.length && !hata.length && !atlanan.length) atlanan.push('kaldırılacak iz bulunamadı');
  rapor('Kaldırma tamam — yedekler *.teknesyum-yedek-* olarak duruyor.');
}

async function main() {
  if (process.argv.includes('--kaldir')) return kaldir();
  try {
    fs.mkdirSync(HOME, { recursive: true });
  } catch (e) {
    console.error('\n  Teknesyum Base\n\n  ✗ ' + HOME + ' açılamadı: ' + e.message + '\n');
    process.exitCode = 1;
    return;
  }

  const kopru = await koprulukIcerik();
  if (kopru) ekle(SL, kopru, 'statusline köprüsü kuruldu');

  const sp = path.join(HOME, 'settings.json');
  let s = null;
  let bozuk = false;
  if (fs.existsSync(sp)) {
    try {
      s = JSON.parse(fs.readFileSync(sp, 'utf8'));
      if (!s || typeof s !== 'object' || Array.isArray(s)) throw new Error('nesne değil');
    } catch {
      bozuk = true;
      s = null;
    }
  } else {
    s = {};
  }

  if (bozuk) {
    hata.push(
      'settings.json okunamadı (bozuk JSON) — dosyaya DOKUNULMADI. ' +
        'Elle düzelt, sonra bu betiği yeniden çalıştır: ' +
        sp
    );
  } else {
    let sDegisti = false;
    if (kopru || fs.existsSync(SL)) {
      if (
        s.statusLine &&
        s.statusLine.command &&
        !/teknesyum-statusline/.test(s.statusLine.command)
      ) {
        atlanan.push('statusLine zaten tanımlı, dokunulmadı — değiştirmek istersen: ' + SL);
      } else {
        const node = process.execPath.replace(/\\/g, '/');
        s.statusLine = {
          type: 'command',
          command: '"' + node + '" "' + SL.replace(/\\/g, '/') + '"',
        };
        sDegisti = true;
      }
    }

    const AUTOCOMPACT = { eco: 150000, normal: 'auto', premium: 500000 };
    let profil = '';
    try {
      const tk = JSON.parse(fs.readFileSync(path.join(HOME, 'teknesyum.json'), 'utf8'));
      if (AUTOCOMPACT[tk.profil]) profil = tk.profil;
    } catch {}
    const acIstek = (process.env.TEKNESYUM_AUTOCOMPACT || '').toLowerCase();
    if (acIstek === 'kapali' || acIstek === 'off') {
      atlanan.push('autoCompactWindow atlandı (TEKNESYUM_AUTOCOMPACT=kapali)');
    } else if (typeof s.autoCompactWindow === 'number') {
      atlanan.push('autoCompactWindow zaten ' + s.autoCompactWindow + ', dokunulmadı');
    } else if (
      acIstek &&
      (!/^\d+$/.test(acIstek) || Number(acIstek) < 100000 || Number(acIstek) > 1000000)
    ) {
      atlanan.push(
        'TEKNESYUM_AUTOCOMPACT 100000–1000000 aralığında değil (' + acIstek + '), atlandı'
      );
    } else if (acIstek) {
      s.autoCompactWindow = Number(acIstek);
      sDegisti = true;
    } else if (profil && AUTOCOMPACT[profil] === 'auto') {
      atlanan.push(
        'autoCompactWindow yazılmadı — ' +
          profil +
          ' profili Claude Code varsayılanını (auto) kullanır'
      );
    } else if (profil) {
      s.autoCompactWindow = AUTOCOMPACT[profil];
      sDegisti = true;
    } else {
      atlanan.push('autoCompactWindow bekliyor — /teknesyum:setup global profili sorup türetecek');
    }

    if (sDegisti) ekle(sp, JSON.stringify(s, null, 2), 'settings.json güncellendi');
  }

  const hp = path.join(HOME, 'RULES.md');
  if (fs.existsSync(hp)) atlanan.push('RULES.md zaten var, korundu');
  else ekle(hp, RULES, 'RULES.md oluşturuldu');

  const cp = path.join(HOME, 'CLAUDE.md');
  const mevcut = fs.existsSync(cp) ? oku(cp) : { ok: true, govde: '' };
  if (!mevcut.ok) hata.push('CLAUDE.md okunamadı, dokunulmadı: ' + mevcut.hata);
  else if (/@RULES\.md/.test(mevcut.govde)) atlanan.push('CLAUDE.md zaten @RULES.md taşıyor');
  else ekle(cp, '@RULES.md\n' + mevcut.govde, "CLAUDE.md'ye @RULES.md eklendi");

  hata.push(...planDenetle());
  if (hata.length) plan.length = 0;
  if (plan.length) uygula();

  const { spawnSync } = require('child_process');
  const varMi = (komut) => {
    const r =
      process.platform === 'win32'
        ? spawnSync(komut + ' --version', { stdio: 'ignore', shell: true })
        : spawnSync(komut, ['--version'], { stdio: 'ignore' });
    return !r.error && r.status === 0;
  };
  const eksik = [];
  if (!varMi('typescript-language-server'))
    eksik.push(
      'typescript-language-server  (npm i -g typescript typescript-language-server)  → TS tip zekâsı'
    );
  if (!varMi('graphify'))
    eksik.push('graphify  (uv tool install graphifyy)  → büyük kod tabanı indeksleme');

  if (eksik.length) {
    atlanan.push('opsiyonel, kurulmadı:');
    for (const e of eksik) atlanan.push('  - ' + e);
  }
  rapor("Claude Code'u yeniden başlat.");
}

if (require.main === module) main();
module.exports = { indir, adresDenetle, IZINLI_ALAN, YON_TAVANI, GOVDE_TAVANI, SURE_TAVANI };
