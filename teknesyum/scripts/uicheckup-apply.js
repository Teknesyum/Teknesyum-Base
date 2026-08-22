#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function hata(mesaj) {
  process.stderr.write(`${mesaj}\n`);
  process.exitCode = 1;
}

function yardim() {
  process.stdout.write(
    'Kullanım: node uicheckup-apply.js --approve --plan <plan.json> --plan-digest <sha256> --target <kök>\n'
  );
  process.stdout.write(
    'Girdi: aynı alanları taşıyan JSON stdin veya argv. Hedef dosyalarına yazmaz; doğrulanmış manifest üretir.\n'
  );
}

function argumanlariCoz() {
  const argumanlar = process.argv.slice(2);
  if (argumanlar.includes('--help') || argumanlar.includes('-h')) return { help: true };
  const girdi = {};
  for (let sira = 0; sira < argumanlar.length; sira += 1) {
    const arguman = argumanlar[sira];
    if (arguman === '--approve') girdi.approve = true;
    else if (arguman === '--plan' || arguman === '--plan-file') girdi.plan = argumanlar[++sira];
    else if (arguman === '--plan-digest' || arguman === '--digest')
      girdi.planDigest = argumanlar[++sira];
    else if (arguman === '--target' || arguman === '--root') girdi.target = argumanlar[++sira];
    else if (!arguman.startsWith('-') && !girdi.plan) girdi.plan = arguman;
    else throw new Error(`Bilinmeyen argüman: ${arguman}`);
  }
  if (!process.stdin.isTTY) {
    const metin = fs.readFileSync(0, 'utf8').trim();
    if (metin) Object.assign(girdi, JSON.parse(metin));
  }
  return girdi;
}

function planOku(deger) {
  if (typeof deger !== 'string' || deger.trim() === '') throw new Error('plan gerekli');
  const metin =
    fs.existsSync(deger) && fs.statSync(deger).isFile() ? fs.readFileSync(deger, 'utf8') : deger;
  try {
    return JSON.parse(metin);
  } catch {
    throw new Error('plan JSON okunamadı');
  }
}

function gercekKok(deger) {
  if (typeof deger !== 'string' || deger.trim() === '') throw new Error('target gerekli');
  const mutlak = path.resolve(deger);
  const durum = fs.lstatSync(mutlak);
  if (!durum.isDirectory() || durum.isSymbolicLink())
    throw new Error('target gerçek bir klasör olmalı');
  return fs.realpathSync.native(mutlak);
}

function guvenliGorece(deger) {
  if (
    typeof deger !== 'string' ||
    deger === '' ||
    path.isAbsolute(deger) ||
    path.win32.isAbsolute(deger)
  )
    throw new Error('plan dosya yolu kök dışı');
  const duzgun = deger.replace(/[\\/]+/g, '/');
  if (duzgun.split('/').some((parca) => parca === '..' || parca === ''))
    throw new Error('plan dosya yolu traversal içeriyor');
  if (duzgun === '.' || duzgun.startsWith('/')) throw new Error('plan dosya yolu kök dışı');
  return duzgun;
}

function ozet(icerik) {
  return crypto.createHash('sha256').update(icerik).digest('hex');
}

function planOzeti(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan))
    throw new Error('plan nesnesi gerekli');
  if (typeof plan.digest !== 'string' || !/^[a-f0-9]{64}$/i.test(plan.digest))
    throw new Error('plan digest eksik veya geçersiz');
  const kopya = { ...plan };
  delete kopya.digest;
  const gercek = ozet(JSON.stringify(kopya));
  if (gercek !== plan.digest) throw new Error('stale plan: plan digest uyuşmuyor');
  return plan.digest;
}

function dogrula(girdi) {
  if (girdi.approve !== true) throw new Error('uygulama için --approve gerekli');
  const plan = planOku(girdi.plan);
  const gercekPlanOzeti = planOzeti(plan);
  if (
    typeof girdi.planDigest !== 'string' ||
    girdi.planDigest.toLowerCase() !== gercekPlanOzeti.toLowerCase()
  )
    throw new Error('stale plan: plan digest doğrulanamadı');
  const kok = gercekKok(girdi.target);
  const planKoku = gercekKok(plan.target);
  if (kok !== planKoku) throw new Error('target kökü plan ile uyuşmuyor');
  if (!Array.isArray(plan.files) || !Array.isArray(plan.findings))
    throw new Error('plan manifest alanları geçersiz');
  const gorulen = new Set();
  const dosyalar = plan.files.map((kayit) => {
    if (!kayit || typeof kayit !== 'object') throw new Error('plan dosya kaydı geçersiz');
    const gorece = guvenliGorece(kayit.file);
    if (gorulen.has(gorece)) throw new Error('plan dosya kaydı tekrarlı');
    gorulen.add(gorece);
    if (typeof kayit.digest !== 'string' || !/^[a-f0-9]{64}$/i.test(kayit.digest))
      throw new Error(`dosya digest geçersiz: ${gorece}`);
    const mutlak = path.resolve(kok, gorece);
    const disari = path.relative(kok, mutlak);
    if (disari === '..' || disari.startsWith(`..${path.sep}`) || path.isAbsolute(disari))
      throw new Error('plan dosya yolu kök dışı');
    const durum = fs.lstatSync(mutlak);
    if (!durum.isFile() || durum.isSymbolicLink())
      throw new Error(`hedef dosya geçersiz: ${gorece}`);
    const gercek = ozet(fs.readFileSync(mutlak));
    if (gercek.toLowerCase() !== kayit.digest.toLowerCase())
      throw new Error(`stale plan: dosya digest uyuşmuyor: ${gorece}`);
    return { file: gorece, digest: gercek };
  });
  const bulgular = plan.findings.map((bulgu) => {
    if (!bulgu || typeof bulgu.file !== 'string') throw new Error('bulgu dosyası geçersiz');
    const gorece = guvenliGorece(bulgu.file);
    if (!gorulen.has(gorece)) throw new Error(`bulgu plan dosyalarında yok: ${gorece}`);
    return { ...bulgu, file: gorece };
  });
  return {
    type: 'teknesyum-ui-checkup-manifest',
    version: 1,
    approved: true,
    writeTarget: false,
    handoff: 'ui-builder/relay',
    target: kok,
    planDigest: gercekPlanOzeti,
    catalog: plan.catalog,
    files: dosyalar,
    findings: bulgular,
  };
}

try {
  const girdi = argumanlariCoz();
  if (girdi.help) yardim();
  else process.stdout.write(`${JSON.stringify(dogrula(girdi))}\n`);
} catch (error) {
  hata(error instanceof Error ? error.message : String(error));
}
