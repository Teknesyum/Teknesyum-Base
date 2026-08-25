#!/usr/bin/env node
// Yayın notuna yapıştırılacak sağlamalar. Kurulum tek satırı sürüm sabitli bir URL'ye
// bakar; kullanıcı indirdiğini buradaki değerle karşılaştırabilsin diye yayımlanır.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const kok = path.join(__dirname, '..');
const dosya = ['install.ps1', 'install.sh'];

for (const d of dosya) {
  const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(kok, d))).digest('hex');
  process.stdout.write(sha + '  ' + d + '\n');
}
