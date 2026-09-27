const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'data', 'katalog.json');
const catalog = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
const owner = process.argv[2] || 'Teknesyum';
const live = JSON.parse(
  execFileSync('gh', ['repo', 'list', owner, '--limit', '500', '--json', 'name'], { encoding: 'utf8' })
).map(r => r.name);

const lower = new Set(live.map(n => n.toLowerCase()));
const known = new Set(Object.keys(catalog).map(n => n.toLowerCase()));
const gone = Object.keys(catalog).filter(n => !lower.has(n.toLowerCase()));
const missing = live.filter(n => !known.has(n.toLowerCase()));
const text = JSON.stringify(catalog);
const mentioned = gone.filter(n => new RegExp(`\\b${n}\\b`, 'i').test(text.replace(`"${n}":`, '')));

if (missing.length) console.log(`Catalog has no entry for: ${missing.join(', ')}`);
if (gone.length) {
  console.error(`Catalog lists repos no longer on ${owner}: ${gone.join(', ')}`);
  if (mentioned.length) console.error(`Also mentioned in other entries: ${mentioned.join(', ')}`);
  process.exit(1);
}
console.log(`Catalog matches ${owner} (${live.length} repos).`);
