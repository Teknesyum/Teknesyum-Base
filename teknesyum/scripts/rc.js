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

function baslat(exe, kok, ad) {
  const satir = tirnak(exe) + ' remote-control --name ' + tirnak(ad);
  try {
    if (process.platform === 'win32') {
      // Tırnaklı komutu `start` argümanı olarak geçirmek kabuk katmanlarında bozuluyor;
      // tek satırlık bir toplu iş dosyası aradaki bütün kaçış katmanlarını siliyor.
      const bat = path.join(os.tmpdir(), 'teknesyum-rc-' + Date.now() + '.cmd');
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

function main() {
  const kok = path.resolve(arg('kok') || process.cwd());
  const ad =
    arg('ad') || process.argv.slice(2).find((x) => !x.startsWith('--')) || path.basename(kok);
  const satirlar = [];

  let exe = claudeYolu();
  if (!exe && bayrak('kur')) {
    satirlar.push(ceviri('rcKuruluyor'));
    if (kur()) exe = claudeYolu();
  }
  if (!exe) {
    satirlar.push(...ceviri('rcIstemciYok', kurulumKomutu()));
    process.stdout.write(satirlar.join('\n') + '\n');
    process.exitCode = 3;
    return;
  }
  if (eski(surum(exe))) {
    satirlar.push(ceviri('rcSurumEski', EN_AZ.join('.')));
    process.stdout.write(satirlar.join('\n') + '\n');
    process.exitCode = 4;
    return;
  }

  const komut = tirnak(exe) + ' remote-control --name ' + tirnak(ad);
  if (bayrak('metin')) {
    satirlar.push(...ceviri('rcElle', komut, ad));
    process.stdout.write(satirlar.join('\n') + '\n');
    return;
  }

  const kayit = bayrak('kaydetme') ? null : kaydet(kok);
  if (!baslat(exe, kok, ad)) {
    satirlar.push(...ceviri('rcAcilamadi', komut, ad));
    process.stdout.write(satirlar.join('\n') + '\n');
    process.exitCode = 5;
    return;
  }
  satirlar.push(...ceviri('rcAcildi', ad, kayit));
  process.stdout.write(satirlar.join('\n') + '\n');
}

if (require.main === module) main();
module.exports = { claudeYolu, kurulumKomutu, eski, EN_AZ };
