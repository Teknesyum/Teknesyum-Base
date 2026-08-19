#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function help() {
  process.stdout.write('Kullanım: node uicheckup-apply.js --approve --plan <plan.json> --plan-digest <sha256> --target <kök>\n');
  process.stdout.write('Girdi: aynı alanları taşıyan JSON stdin veya argv. Hedef dosyalarına yazmaz; doğrulanmış manifest üretir.\n');
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) return { help: true };
  const input = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--approve') input.approve = true;
    else if (arg === '--plan' || arg === '--plan-file') input.plan = args[++index];
    else if (arg === '--plan-digest' || arg === '--digest') input.planDigest = args[++index];
    else if (arg === '--target' || arg === '--root') input.target = args[++index];
    else if (!arg.startsWith('-') && !input.plan) input.plan = arg;
    else throw new Error(`Bilinmeyen argüman: ${arg}`);
  }
  if (!process.stdin.isTTY) {
    const text = fs.readFileSync(0, 'utf8').trim();
    if (text) Object.assign(input, JSON.parse(text));
  }
  return input;
}

function readPlan(value) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('plan gerekli');
  const text = fs.existsSync(value) && fs.statSync(value).isFile() ? fs.readFileSync(value, 'utf8') : value;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('plan JSON okunamadı');
  }
}

function realRoot(value) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('target gerekli');
  const absolute = path.resolve(value);
  const stat = fs.lstatSync(absolute);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('target gerçek bir klasör olmalı');
  return fs.realpathSync.native(absolute);
}

function safeRelative(value) {
  if (typeof value !== 'string' || value === '' || path.isAbsolute(value) || path.win32.isAbsolute(value)) throw new Error('plan dosya yolu kök dışı');
  const normalized = value.replace(/[\\/]+/g, '/');
  if (normalized.split('/').some((part) => part === '..' || part === '')) throw new Error('plan dosya yolu traversal içeriyor');
  if (normalized === '.' || normalized.startsWith('/')) throw new Error('plan dosya yolu kök dışı');
  return normalized;
}

function digest(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function planDigest(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) throw new Error('plan nesnesi gerekli');
  if (typeof plan.digest !== 'string' || !/^[a-f0-9]{64}$/i.test(plan.digest)) throw new Error('plan digest eksik veya geçersiz');
  const copy = { ...plan };
  delete copy.digest;
  const actual = digest(JSON.stringify(copy));
  if (actual !== plan.digest) throw new Error('stale plan: plan digest uyuşmuyor');
  return plan.digest;
}

function verify(input) {
  if (input.approve !== true) throw new Error('uygulama için --approve gerekli');
  const plan = readPlan(input.plan);
  const actualPlanDigest = planDigest(plan);
  if (typeof input.planDigest !== 'string' || input.planDigest.toLowerCase() !== actualPlanDigest.toLowerCase()) throw new Error('stale plan: plan digest doğrulanamadı');
  const root = realRoot(input.target);
  const planRoot = realRoot(plan.target);
  if (root !== planRoot) throw new Error('target kökü plan ile uyuşmuyor');
  if (!Array.isArray(plan.files) || !Array.isArray(plan.findings)) throw new Error('plan manifest alanları geçersiz');
  const seen = new Set();
  const files = plan.files.map((record) => {
    if (!record || typeof record !== 'object') throw new Error('plan dosya kaydı geçersiz');
    const relative = safeRelative(record.file);
    if (seen.has(relative)) throw new Error('plan dosya kaydı tekrarlı');
    seen.add(relative);
    if (typeof record.digest !== 'string' || !/^[a-f0-9]{64}$/i.test(record.digest)) throw new Error(`dosya digest geçersiz: ${relative}`);
    const absolute = path.resolve(root, relative);
    const outside = path.relative(root, absolute);
    if (outside === '..' || outside.startsWith(`..${path.sep}`) || path.isAbsolute(outside)) throw new Error('plan dosya yolu kök dışı');
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`hedef dosya geçersiz: ${relative}`);
    const actual = digest(fs.readFileSync(absolute));
    if (actual.toLowerCase() !== record.digest.toLowerCase()) throw new Error(`stale plan: dosya digest uyuşmuyor: ${relative}`);
    return { file: relative, digest: actual };
  });
  const findings = plan.findings.map((finding) => {
    if (!finding || typeof finding.file !== 'string') throw new Error('bulgu dosyası geçersiz');
    const relative = safeRelative(finding.file);
    if (!seen.has(relative)) throw new Error(`bulgu plan dosyalarında yok: ${relative}`);
    return { ...finding, file: relative };
  });
  return {
    type: 'teknesyum-ui-checkup-manifest',
    version: 1,
    approved: true,
    writeTarget: false,
    handoff: 'ui-builder/relay',
    target: root,
    planDigest: actualPlanDigest,
    catalog: plan.catalog,
    files,
    findings,
  };
}

try {
  const input = parseArgs();
  if (input.help) help();
  else process.stdout.write(`${JSON.stringify(verify(input))}\n`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
