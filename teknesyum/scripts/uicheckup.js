#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { s: ceviri } = require('../hooks/dil.js');

const UI_EXTENSIONS = new Set([
  '.tsx',
  '.jsx',
  '.vue',
  '.svelte',
  '.html',
  '.css',
  '.scss',
  '.xaml',
  '.cs',
]);
const TOKEN_EXTENSIONS = new Set([
  '.json',
  '.yaml',
  '.yml',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.xaml',
]);
const SKIP_NAMES = new Set(['node_modules', '.git', 'build', 'dist', 'bin', 'obj']);

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exitCode = code;
}

function readInput() {
  const args = process.argv.slice(2);
  const targetArg = args.find((arg) => !arg.startsWith('-'));
  const targetFlag = args.indexOf('--target');
  if (targetFlag >= 0 && args[targetFlag + 1]) return { target: args[targetFlag + 1] };
  if (targetArg) return { target: targetArg };
  if (process.stdin.isTTY) return {};
  try {
    const value = fs.readFileSync(0, 'utf8').trim();
    return value ? JSON.parse(value) : {};
  } catch {
    throw new Error('stdin JSON okunamadı');
  }
}

function normalizeTarget(value) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error('target gerekli');
  const absolute = path.resolve(value);
  const stat = fs.lstatSync(absolute);
  if (stat.isSymbolicLink() || !stat.isDirectory())
    throw new Error('target gerçek bir klasör olmalı');
  return fs.realpathSync.native(absolute);
}

function isHidden(name) {
  return name.startsWith('.');
}

function isTokenFile(name, extension) {
  if (!TOKEN_EXTENSIONS.has(extension)) return false;
  return (
    /(^|[._-])(tokens?|theme|variables?)([._-]|$)/i.test(name) ||
    /(^|[/\\])tokens?([/\\])/i.test(name)
  );
}

function collectFiles(root) {
  const files = [];
  function visit(directory) {
    let entries = fs.readdirSync(directory, { withFileTypes: true });
    entries = entries.sort(
      (a, b) =>
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.name.localeCompare(b.name)
    );
    for (const entry of entries) {
      if (isHidden(entry.name) || SKIP_NAMES.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!stat.isFile()) continue;
      const extension = path.extname(entry.name).toLowerCase();
      if (!UI_EXTENSIONS.has(extension) && !isTokenFile(entry.name, extension)) continue;
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      files.push({ absolute, relative, kind: UI_EXTENSIONS.has(extension) ? 'ui' : 'token' });
    }
  }
  visit(root);
  return files.sort(
    (a, b) =>
      a.relative.localeCompare(b.relative, 'en', { sensitivity: 'base' }) ||
      a.relative.localeCompare(b.relative)
  );
}

function catalogRoot() {
  const candidates = [
    path.resolve(__dirname, '..', 'skills', 'teknesyum-ui'),
    path.resolve(__dirname, '..', '..', 'skills', 'teknesyum-ui'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'SKILL.md'))) return candidate;
  }
  throw new Error('teknesyum-ui katalogu bulunamadı');
}

function readCatalog() {
  const root = catalogRoot();
  const paths = ['SKILL.md'];
  const references = path.join(root, 'references');
  if (fs.existsSync(references)) {
    for (const name of fs.readdirSync(references).sort((a, b) => a.localeCompare(b))) {
      const absolute = path.join(references, name);
      if (fs.lstatSync(absolute).isFile() && path.extname(name).toLowerCase() === '.md')
        paths.push(path.join('references', name));
    }
  }
  const documents = paths.map((relative) => ({
    path: relative.split(path.sep).join('/'),
    content: fs.readFileSync(path.join(root, relative), 'utf8'),
  }));
  const rules = [];
  for (const document of documents) {
    const lines = document.content.split(/\r?\n/);
    lines.forEach((line, index) => {
      const match = line.match(/^#{2,4}\s+(.+?)\s*$/);
      if (!match) return;
      const title = match[1].replace(/[`*_]/g, '').trim();
      const slug = title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      rules.push({
        id: slug || `section-${rules.length + 1}`,
        title,
        source: document.path,
        line: index + 1,
      });
    });
  }
  rules.sort(
    (a, b) => a.source.localeCompare(b.source) || a.line - b.line || a.id.localeCompare(b.id)
  );
  const source = documents.map((document) => `${document.path}\n${document.content}`).join('\n');
  return {
    root,
    documents,
    rules,
    digest: crypto.createHash('sha256').update(source).digest('hex'),
  };
}

function ruleFor(catalog, terms, fallback) {
  const found = catalog.rules.find((rule) =>
    terms.some((term) => rule.title.toLowerCase().includes(term))
  );
  if (found) return found.id;
  const section = catalog.rules.find((rule) => rule.id.startsWith(fallback));
  return section ? section.id : fallback;
}

function finding(file, line, rule, severity, suggestion) {
  return { file, line, rule, severity, suggestion };
}

const PALET = new Set([
  '#00f3ff',
  '#ff00ea',
  '#b026ff',
  '#34d399',
  '#000000',
  '#0a0a0c',
  '#ffffff',
  '#71717a',
]);
const PUNTO = new Set([10, 13, 14, 18, 24]);
const BULGU_TAVANI = 200;
const BUYUK = '[A-Z\u00c7\u011e\u0130\u00d6\u015e\u00dc]';
const UPPERCASE = new RegExp('(^|[^p{L}])' + BUYUK + '{3,}([^p{L}]|$)', 'u');
const GORUNEN_NITELIK =
  /\b(?:Content|Text|Header|ToolTip|title|label|placeholder|alt|aria-label)\s*=\s*["']([^"']+)["']/gi;
const RENK = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)/g;
const BEYAZ_ZEMIN =
  /\b(?:background|background-color|Background)\s*[:=]\s*["']?\s*(#fff(?:fff)?\b|white\b)/i;

function gorunenParcalar(lineText) {
  const out = [];
  for (const m of lineText.matchAll(/>([^<>{}]+)</g)) out.push(m[1]);
  for (const m of lineText.matchAll(GORUNEN_NITELIK)) out.push(m[1]);
  return out.filter((s) => /\p{L}/u.test(s));
}

function hexNormal(value) {
  const v = value.toLowerCase();
  if (!v.startsWith('#')) return v.replace(/\s+/g, '');
  if (v.length === 4) return '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
  if (v.length === 9 && v.endsWith('ff')) return v.slice(0, 7);
  return v;
}

function paletDisi(value) {
  const v = hexNormal(value);
  if (v === 'transparent' || /^rgba?\([^)]*,\s*0\s*\)$/.test(v)) return false;
  if (v.startsWith('#')) return !PALET.has(v);
  return true;
}

function puntoBulgusu(lineText) {
  const out = [];
  for (const m of lineText.matchAll(/font-size\s*:\s*([\d.]+)px/gi)) out.push(Number(m[1]));
  for (const m of lineText.matchAll(/FontSize\s*=\s*"([\d.]+)"/g)) out.push(Number(m[1]));
  return out.filter((n) => Number.isFinite(n) && !PUNTO.has(n));
}

function inspect(file, text, catalog) {
  const lines = text.split(/\r?\n/);
  const findings = [];
  const caseRule = ruleFor(catalog, ['uppercase', 'b\u00fcy\u00fck harf'], 'text-case');
  const colorRule = ruleFor(catalog, ['palet', 'palette', 'renk'], 'color-palette');
  const groundRule = ruleFor(catalog, ['zemin', 'ground', 'background'], 'color-palette');
  const typeRule = ruleFor(catalog, ['punto', 'tipografi', 'type scale'], 'typography');
  const motionRule = ruleFor(
    catalog,
    ['width', 'height', 'box-shadow', 'animasyonlan\u0131r'],
    'motion-properties'
  );
  lines.forEach((lineText, index) => {
    const line = index + 1;
    // ÖLÇÜLDÜ: kural her satırdaki büyük harf dizisini yakalıyordu — sabit adı, HTTP,
    // sınıf adı, hepsi bulguydu ve çıktı okunmaz oluyordu. Kural görünen metne aittir:
    // JSX metin düğümü ve etiketli nitelik. Kodun kendi adlandırması bu kuralın dışı.
    if (gorunenParcalar(lineText).some((parca) => UPPERCASE.test(parca)))
      findings.push(finding(file, line, caseRule, 'warning', ceviri('uiBuyukHarf')));
    if (BEYAZ_ZEMIN.test(lineText))
      findings.push(finding(file, line, groundRule, 'error', ceviri('uiZemin')));
    // ÖLÇÜLDÜ: üç gri sabiti aranıyordu; paletin dışındaki diğer bütün renkler sessizce
    // geçiyordu. Ölçüt listede olmak değil, palette olmaktır.
    else
      for (const m of lineText.match(RENK) || []) {
        if (!paletDisi(m)) continue;
        findings.push(finding(file, line, colorRule, 'warning', ceviri('uiPalet')));
        break;
      }
    if (puntoBulgusu(lineText).length)
      findings.push(finding(file, line, typeRule, 'warning', ceviri('uiPunto')));
    if (
      /\b(?:transition|animation)\s*:[^;]*(?:width|height|top|left|margin|box-shadow|filter)\b/i.test(
        lineText
      )
    )
      findings.push(finding(file, line, motionRule, 'error', ceviri('uiHareket')));
  });
  return findings;
}

function run(input) {
  const root = normalizeTarget(input.target || input.path);
  const catalog = readCatalog();
  const files = collectFiles(root);
  const findings = [];
  const records = [];
  for (const file of files) {
    const content = fs.readFileSync(file.absolute);
    const text = content.toString('utf8');
    records.push({
      file: file.relative,
      kind: file.kind,
      digest: crypto.createHash('sha256').update(content).digest('hex'),
    });
    findings.push(...inspect(file.relative, text, catalog));
  }
  findings.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.rule.localeCompare(b.rule) ||
      a.severity.localeCompare(b.severity) ||
      a.suggestion.localeCompare(b.suggestion)
  );
  // ÖLÇÜLDÜ: tarama tüm kataloğu (60+ başlık) ve sınırsız bulguyu basıyordu; orta boy
  // bir araydüzde çıktı model bağlamının büyük bölümünü yiyordu. Tavanın üstü `truncated`
  // alanında sayı olarak durur; atlanan bulgu gizlenmez, sayılır.
  const kesilen = Math.max(0, findings.length - BULGU_TAVANI);
  const gosterilen = findings.slice(0, BULGU_TAVANI);
  const atif = new Set(gosterilen.map((f) => f.rule));
  const output = {
    target: root,
    catalog: {
      digest: catalog.digest,
      rules: catalog.rules.filter((rule) => atif.has(rule.id)),
    },
    files: records,
    findings: gosterilen,
    truncated: kesilen,
  };
  const canonical = JSON.stringify(output);
  output.digest = crypto.createHash('sha256').update(canonical).digest('hex');
  return output;
}

try {
  process.stdout.write(`${JSON.stringify(run(readInput()))}\n`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
