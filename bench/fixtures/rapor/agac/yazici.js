const fs = require('node:fs');
const ayar = require('./ayar');

function yaz(kayit) {
  process.stdout.write(JSON.stringify(kayit) + '\n');
}

function olusuz(kayit) {
  fs.appendFileSync(ayar.olusuzYolu, JSON.stringify(kayit) + '\n');
}

module.exports = { yaz, olusuz };
