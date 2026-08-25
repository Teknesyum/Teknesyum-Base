#!/usr/bin/env node

// Terminal açan üç platform da bir kabuk metni istiyor. Kullanıcının verdiği ad ve proje
// yolu o metne gömülünce `$(...)`, backtick, `&`, `%VAR%` çalışır hale geliyordu
// (ölçüldü: dış denetim TB-002). Bu betik araya girer: kabuk yalnız bizim ürettiğimiz
// sabit yolları görür, kullanıcı değerleri diskteki bir JSON'dan argv olarak okunur ve
// hiçbir ayrıştırma katmanından geçmez.
const fs = require('fs');
const { spawnSync } = require('child_process');

const plan = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
try {
  fs.unlinkSync(process.argv[2]);
} catch {}

const r = spawnSync(plan.exe, plan.args, {
  cwd: plan.cwd,
  stdio: 'inherit',
  windowsHide: false,
});
process.exitCode = r.status === null ? 1 : r.status;
