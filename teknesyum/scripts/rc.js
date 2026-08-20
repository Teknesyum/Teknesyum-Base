#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { s: ceviri } = require('../hooks/dil.js');

// Masaüstü uygulamasında `/rc` yok: uzak denetim yalnız terminal istemcisinde açılıyor.
// Bu betik o boşluğu kapatır — istemciyi bulur, yoksa kurar, projenin kökünde bir uzak
// denetim oturumu başlatır. Kullanıcıya kalan tek iş telefondaki oturuma dokunmak.
// Masaüstü uygulaması bu özelliği kendi kazandığında betik de komut da silinir.

function bayrak(ad) {
  return process.argv.includes('--' + ad);
}

function arg(ad) {
  const i = process.argv.indexOf('--' + ad);
  return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : null;
}

function ev() {
  return process.env.USERPROFILE || process.env.HOME || '';
}

function tirnak(s) {
  return '"' + String(s).replace(/"/g, '') + '"';
}

function claudeYolu() {
  const bul = process.platform === 'win32' ? 'where' : 'which';
  try {
    const r = spawnSync(bul, ['claude'], { encoding: 'utf8' });
    const ilk = String(r.stdout || '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)[0];
    if (ilk && fs.existsSync(ilk)) return ilk;
  } catch {}
  const yerel = path.join(
    ev(),
    '.local',
    'bin',
    process.platform === 'win32' ? 'claude.exe' : 'claude'
  );
  return fs.existsSync(yerel) ? yerel : null;
}

function kurulumKomutu() {
  if (process.platform === 'win32') return 'irm https://claude.ai/install.ps1 | iex';
  return 'curl -fsSL https://claude.ai/install.sh | bash';
}

function kur() {
  const r =
    process.platform === 'win32'
      ? spawnSync(
          'powershell',
          ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', kurulumKomutu()],
          { stdio: 'inherit' }
        )
      : spawnSync('bash', ['-lc', kurulumKomutu()], { stdio: 'inherit' });
  return r.status === 0;
}

function surum(exe) {
  try {
    const r = spawnSync(exe, ['--version'], { encoding: 'utf8' });
    const m = String(r.stdout || '').match(/(\d+)\.(\d+)\.(\d+)/);
    return m ? m.slice(1, 4).map(Number) : null;
  } catch {
    return null;
  }
}

// ÖLÇÜLDÜ: `remote-control` alt komutu eski sürümlerde yok; olmayanı çağırmak
// "unknown command" ile düşüyor ve kullanıcı sebebi göremiyordu. Sürüm önce sorulur.
const EN_AZ = [2, 1, 196];

function eski(v) {
  if (!v) return false;
  for (let i = 0; i < 3; i++) {
    if (v[i] > EN_AZ[i]) return false;
    if (v[i] < EN_AZ[i]) return true;
  }
  return false;
}

function istemciAyari() {
  return path.join(ev(), '.claude.json');
}

function anahtar(kok) {
  return path.resolve(kok).replace(/\\/g, '/');
}

// ÖLÇÜLDÜ: pencere açılır açılmaz iki soru soruyordu — "Enable Remote Control?" ve
// "Spawn mode". Birincisi `remoteDialogSeen`, ikincisi projenin `remoteControlSpawnMode`
// anahtarına bakıyor. `/rc` ikisini de önceden yazar, soru kalmaz; `/rcadvanced`
// tersini yapar, soruları geri getirir.
function istemciAyarYaz(degistir) {
  const dosya = istemciAyari();
  let j;
  try {
    j = JSON.parse(fs.readFileSync(dosya, 'utf8'));
  } catch {
    return false;
  }
  if (!degistir(j)) return false;
  const gecici = dosya + '.teknesyum.tmp';
  try {
    fs.writeFileSync(gecici, JSON.stringify(j, null, 2));
    fs.renameSync(gecici, dosya);
    return true;
  } catch {
    try {
      fs.unlinkSync(gecici);
    } catch {}
    return false;
  }
}

function sorulariSustur(kok) {
  return istemciAyarYaz((j) => {
    let d = false;
    if (j.remoteDialogSeen !== true) {
      j.remoteDialogSeen = true;
      d = true;
    }
    if (!Array.isArray(j.remoteControlSurfacesSeen) || !j.remoteControlSurfacesSeen.length) {
      j.remoteControlSurfacesSeen = ['mobile'];
      d = true;
    }
    j.projects = j.projects || {};
    const k = anahtar(kok);
    j.projects[k] = j.projects[k] || {};
    if (j.projects[k].remoteControlSpawnMode !== 'same-dir') {
      j.projects[k].remoteControlSpawnMode = 'same-dir';
      d = true;
    }
    return d;
  });
}

function sorulariAc(kok) {
  return istemciAyarYaz((j) => {
    const k = anahtar(kok);
    if (!j.projects || !j.projects[k] || !j.projects[k].remoteControlSpawnMode) return false;
    delete j.projects[k].remoteControlSpawnMode;
    return true;
  });
}

function komutSatiri(exe, ad, ekler) {
  return [tirnak(exe), 'remote-control', '--name', tirnak(ad)].concat(ekler).join(' ');
}

function baslat(satir, kok) {
  try {
    if (process.platform === 'win32') {
      // Tırnaklı komutu `start` argümanı olarak geçirmek kabuk katmanlarında bozuluyor;
      // tek satırlık bir toplu iş dosyası aradaki bütün kaçış katmanlarını siliyor.
      const bat = path.join(
        os.tmpdir(),
        'teknesyum-rc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.cmd'
      );
      fs.writeFileSync(bat, ['@echo off', 'cd /d ' + tirnak(kok), satir, 'pause'].join('\r\n'));
      const r = spawnSync('cmd', ['/c', 'start', '', bat], { cwd: kok });
      return r.status === 0;
    }
    if (process.platform === 'darwin') {
      const betik =
        'tell application "Terminal" to do script "cd ' + tirnak(kok) + ' && ' + satir + '"';
      return spawnSync('osascript', ['-e', betik]).status === 0;
    }
    for (const terminal of ['x-terminal-emulator', 'gnome-terminal', 'konsole', 'xterm']) {
      const r = spawnSync(terminal, ['-e', 'bash', '-lc', 'cd ' + tirnak(kok) + ' && ' + satir]);
      if (r.status === 0) return true;
    }
  } catch {}
  return false;
}

// Kayıt adsız alınır: ad verilirse başka bir sohbetin aynı adlı kaydına çarpar ve
// sahiplik kontrolü işi keser. Adsız kayıt tarih + oturum kimliği taşır, çakışmaz.
function kaydet(kok) {
  const betik = path.join(__dirname, 'oturum.js');
  if (!fs.existsSync(betik)) return null;
  const r = spawnSync(process.execPath, [betik, 'kaydet', '--proje', kok], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  const m = String(r.stdout || '').match(/^kay[ıi]t:[ \t]*(.+)$/m);
  return m ? m[1].trim() : null;
}

function teknesyumAyari() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ev(), '.claude', 'teknesyum.json'), 'utf8'));
  } catch {
    return {};
  }
}

// Kullanıcı arşivi klasör adıyla ayırıyor: `!Arşivlendi`, `!Tamamlandı`. Kural bu yüzden
// ada bakar — `!`, `.`, `_` ile başlayan klasör toplu uzak denetime girmez.
function elenir(ad, atla) {
  if (/^[!._~]/.test(ad)) return true;
  return atla.some((x) => String(x).toLowerCase() === ad.toLowerCase());
}

function projeMi(yol) {
  return ['.git', 'AGENTS.md', 'package.json', '.claude', 'CLAUDE.md'].some((f) =>
    fs.existsSync(path.join(yol, f))
  );
}

function projeler(dip) {
  const atla = teknesyumAyari().rcAtla || [];
  let girisler = [];
  try {
    girisler = fs.readdirSync(dip, { withFileTypes: true });
  } catch {
    return { alinan: [], elenen: [] };
  }
  const alinan = [];
  const elenen = [];
  for (const g of girisler) {
    if (!g.isDirectory()) continue;
    const yol = path.join(dip, g.name);
    if (elenir(g.name, atla)) {
      elenen.push(g.name);
      continue;
    }
    if (projeMi(yol)) alinan.push({ ad: g.name, yol });
  }
  alinan.sort((a, b) => a.ad.localeCompare(b.ad));
  return { alinan, elenen };
}

function bas(satirlar, kod) {
  process.stdout.write(satirlar.join('\n') + '\n');
  if (kod) process.exitCode = kod;
}

function istemci(satirlar) {
  let exe = claudeYolu();
  if (!exe && bayrak('kur')) {
    satirlar.push(ceviri('rcKuruluyor'));
    if (kur()) exe = claudeYolu();
  }
  if (!exe) {
    satirlar.push(...ceviri('rcIstemciYok', kurulumKomutu()));
    bas(satirlar, 3);
    return null;
  }
  if (eski(surum(exe))) {
    satirlar.push(ceviri('rcSurumEski', EN_AZ.join('.')));
    bas(satirlar, 4);
    return null;
  }
  return exe;
}

function hepsi(satirlar, exe) {
  const dip = path.resolve(arg('kok') || path.dirname(process.cwd()));
  const tavan = Number(arg('tavan')) > 0 ? Number(arg('tavan')) : 12;
  const { alinan, elenen } = projeler(dip);
  if (!alinan.length) {
    satirlar.push(ceviri('rcHepsiYok', dip));
    bas(satirlar, 6);
    return;
  }
  const secilen = alinan.slice(0, tavan);
  const acilan = [];
  const kalan = [];
  for (const p of secilen) {
    sorulariSustur(p.yol);
    const satir = komutSatiri(exe, p.ad, ['--spawn', 'same-dir']);
    if (bayrak('metin') || !baslat(satir, p.yol)) kalan.push(p.ad + ' → ' + satir);
    else acilan.push(p.ad);
  }
  satirlar.push(...ceviri('rcHepsiOzet', acilan, elenen, kalan, alinan.length - secilen.length));
  bas(satirlar, kalan.length && !bayrak('metin') ? 5 : 0);
}

function main() {
  const satirlar = [];
  const exe = istemci(satirlar);
  if (!exe) return;

  if (bayrak('hepsi')) return hepsi(satirlar, exe);

  const kok = path.resolve(arg('kok') || process.cwd());
  const ad =
    arg('ad') || process.argv.slice(2).find((x) => !x.startsWith('--')) || path.basename(kok);
  const gelismis = bayrak('gelismis');

  const ekler = [];
  if (gelismis) {
    sorulariAc(kok);
    const spawn = arg('spawn');
    if (spawn) ekler.push('--spawn', spawn);
    const izin = arg('izin');
    if (izin) ekler.push('--permission-mode', izin);
    const kapasite = arg('kapasite');
    if (kapasite) ekler.push('--capacity', kapasite);
  } else {
    sorulariSustur(kok);
    ekler.push('--spawn', 'same-dir');
  }

  const satir = komutSatiri(exe, ad, ekler);
  if (bayrak('metin')) {
    satirlar.push(...ceviri('rcElle', satir, ad));
    bas(satirlar);
    return;
  }

  const kayit = bayrak('kaydetme') ? null : kaydet(kok);
  if (!baslat(satir, kok)) {
    satirlar.push(...ceviri('rcAcilamadi', satir, ad));
    bas(satirlar, 5);
    return;
  }
  satirlar.push(...ceviri('rcAcildi', ad, kayit));
  if (gelismis) satirlar.push(...ceviri('rcSorularAcik'));
  bas(satirlar);
}

if (require.main === module) main();
module.exports = { claudeYolu, kurulumKomutu, eski, elenir, projeler, komutSatiri, EN_AZ };
