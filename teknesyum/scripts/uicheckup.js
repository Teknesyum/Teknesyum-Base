#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UI_EXTENSIONS = new Set(['.tsx', '.jsx', '.vue', '.svelte', '.html', '.css', '.scss', '.xaml', '.cs']);
const TOKEN_EXTENSIONS = new Set(['.json', '.yaml', '.yml', '.css', '.scss', '.sass', '.less', '.xaml']);
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
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('target gerçek bir klasör olmalı');
  return fs.realpathSync.native(absolute);
}

function isHidden(name) {
  return name.startsWith('.');
}

function isTokenFile(name, extension) {
  if (!TOKEN_EXTENSIONS.has(extension)) return false;
  return /(^|[._-])(tokens?|theme|variables?)([._-]|$)/i.test(name) || /(^|[/\\])tokens?([/\\])/i.test(name);
}

function collectFiles(root) {
  const files = [];
  function visit(directory) {
    let entries = fs.readdirSync(directory, { withFileTypes: true });
    entries = entries.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.name.localeCompare(b.name));
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
  return files.sort((a, b) => a.relative.localeCompare(b.relative, 'en', { sensitivity: 'base' }) || a.relative.localeCompare(b.relative));
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
      if (fs.lstatSync(absolute).isFile() && path.extname(name).toLowerCase() === '.md') paths.push(path.join('references', name));
    }
  }
  const documents = paths.map((relative) => ({ path: relative.split(path.sep).join('/'), content: fs.readFileSync(path.join(root, relative), 'utf8') }));
  const rules = [];
  for (const document of documents) {
    const lines = document.content.split(/\r?\n/);
    lines.forEach((line, index) => {
      const match = line.match(/^#{2,4}\s+(.+?)\s*$/);
      if (!match) return;
      const title = match[1].replace(/[`*_]/g, '').trim();
      const slug = title.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      rules.push({ id: slug || `section-${rules.length + 1}`, title, source: document.path, line: index + 1 });
    });
  }
  rules.sort((a, b) => a.source.localeCompare(b.source) || a.line - b.line || a.id.localeCompare(b.id));
  const source = documents.map((document) => `${document.path}\n${document.content}`).join('\n');
  return { root, documents, rules, digest: crypto.createHash('sha256').update(source).digest('hex') };
}

function ruleFor(catalog, terms, fallback) {
  const found = catalog.rules.find((rule) => terms.some((term) => rule.title.toLowerCase().includes(term)));
  if (found) return found.id;
  const section = catalog.rules.find((rule) => rule.id.startsWith(fallback));
  return section ? section.id : fallback;
}

function finding(file, line, rule, severity, suggestion) {
  return { file, line, rule, severity, suggestion };
}

function inspect(file, text, catalog) {
  const lines = text.split(/\r?\n/);
  const findings = [];
  const caseRule = ruleFor(catalog, ['uppercase', 'büyük harf'], 'text-case');
  const colorRule = ruleFor(catalog, ['ara gri', 'gray', 'grey'], 'color-palette');
  const motionRule = ruleFor(catalog, ['width', 'height', 'box-shadow', 'animasyonlanır'], 'motion-properties');
  lines.forEach((lineText, index) => {
    const line = index + 1;
    if (/\b(?:[A-ZÇĞİÖŞÜ]{3,})(?:\s+[A-ZÇĞİÖŞÜ]{2,})*\b/.test(lineText) && !/^[\s]*import\b/.test(lineText)) {
      findings.push(finding(file, line, caseRule, 'warning', 'Görünen metni cümle biçiminde yazın.'));
    }
    if (/(?:#(?:d1d5db|9ca3af|6b7280)|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))/i.test(lineText)) {
      findings.push(finding(file, line, colorRule, 'warning', 'Rengi merkezi UI tokenından kullanın.'));
    }
    if (/\b(?:transition|animation)\s*:[^;]*(?:width|height|top|left|margin|box-shadow|filter)\b/i.test(lineText)) {
      findings.push(finding(file, line, motionRule, 'error', 'Yerleşim yerine opacity veya transform animasyonu kullanın.'));
    }
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
    records.push({ file: file.relative, kind: file.kind, digest: crypto.createHash('sha256').update(content).digest('hex') });
    findings.push(...inspect(file.relative, text, catalog));
  }
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule) || a.severity.localeCompare(b.severity) || a.suggestion.localeCompare(b.suggestion));
  const output = { target: root, catalog: { digest: catalog.digest, rules: catalog.rules }, files: records, findings };
  const canonical = JSON.stringify(output);
  output.digest = crypto.createHash('sha256').update(canonical).digest('hex');
  return output;
}

try {
  process.stdout.write(`${JSON.stringify(run(readInput()))}\n`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
