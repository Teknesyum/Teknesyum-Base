#!/usr/bin/env node

const { execFileSync } = require('child_process');

const YEREL_ZAMAN_ASIMI = 1000;
const UZAK_ZAMAN_ASIMI = 3000;

function git(depo, args, zamanAsimi) {
  try {
    return execFileSync('git', ['-C', depo].concat(args), {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: zamanAsimi || YEREL_ZAMAN_ASIMI,
      windowsHide: true,
    });
  } catch {
    return null;
  }
}

function kok(dizin) {
  if (!dizin) return null;
  const c = git(dizin, ['rev-parse', '--show-toplevel']);
  return c && c.trim() ? c.trim() : null;
}

function dal(depo) {
  const c = git(depo, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const d = c && c.trim();
  return d && d !== 'HEAD' ? d : null;
}

function yerelSha(depo) {
  const c = git(depo, ['rev-parse', 'HEAD']);
  const s = c && c.trim();
  return /^[0-9a-f]{40}$/.test(s || '') ? s : null;
}

function uzakSha(depo, d) {
  const c = git(depo, ['ls-remote', 'origin', 'refs/heads/' + d], UZAK_ZAMAN_ASIMI);
  const m = c && c.match(/^([0-9a-f]{40})\s/);
  return m ? m[1] : null;
}

function yereldeVar(depo, sha) {
  return git(depo, ['cat-file', '-e', sha + '^{commit}']) !== null;
}

function durum(dizin) {
  const depo = kok(dizin);
  if (!depo) return null;
  return geride(depo);
}

function geride(depo) {
  if (!depo) return null;
  const d = dal(depo);
  if (!d) return null;
  const y = yerelSha(depo);
  if (!y) return null;
  const u = uzakSha(depo, d);
  if (!u) return null;
  if (u === y) return { depo, dal: d, geride: false };
  return { depo, dal: d, geride: !yereldeVar(depo, u) };
}

function metin(s) {
  if (!s) return 'depo sorulamadı';
  if (s.geride) return 'uzakta yerelde olmayan iş var · ' + s.dal + ' · git pull';
  return 'güncel · ' + s.dal;
}

module.exports = { kok, dal, geride, durum, metin, UZAK_ZAMAN_ASIMI };

if (require.main === module) {
  const s = durum(process.cwd());
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(s) + '\n');
  else process.stdout.write(metin(s) + '\n');
}
