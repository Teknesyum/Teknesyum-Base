const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const OWNER = 'Teknesyum';
const SKIP = new Set(['.github', 'Teknesyum', 'Teknesyum-Private', 'Teknesyum-Base-Legacy']);
const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'src/assets/apps');
const push = process.argv.includes('--push');
const only = process.argv.filter((a) => !a.startsWith('--')).slice(2);

const entries = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/katalog.json'), 'utf8'));

function gh(args, input) {
  try {
    return execFileSync('gh', args, { encoding: 'utf8', input, maxBuffer: 64 << 20, stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    if (String(e.stderr).includes('404')) return null;
    throw new Error(`gh ${args.slice(0, 3).join(' ')}: ${e.stderr}`);
  }
}

function remote(repo, file) {
  const out = gh(['api', `repos/${OWNER}/${repo}/contents/${file}`]);
  if (!out) return null;
  const j = JSON.parse(out);
  return { sha: j.sha, data: Buffer.from(j.content || '', 'base64') };
}

function manifestFor(repo, base, media) {
  const e = entries[repo];
  const catalog = {};
  for (const k of ['category', 'tags', 'summary', 'points', 'uses', 'lead', 'fork']) if (e[k] !== undefined) catalog[k] = e[k];
  const m = { ...base };
  if (media.icon) m.icon = '.teknesyum/icon.png';
  if (media.shot) m.screenshot = '.teknesyum/shot.jpg';
  if (media.full) m.full = '.teknesyum/full.jpg';
  m.catalog = catalog;
  return Buffer.from(JSON.stringify(m, null, 2) + '\n');
}

function api(method, route, body) {
  const tmp = path.join(os.tmpdir(), 'uyum-body.json');
  fs.writeFileSync(tmp, JSON.stringify(body));
  const out = gh(['api', '-X', method, `repos/${OWNER}/${route}`, '--input', tmp]);
  fs.unlinkSync(tmp);
  return JSON.parse(out);
}

function commit(repo, files) {
  const info = JSON.parse(gh(['api', `repos/${OWNER}/${repo}`]));
  const branch = info.default_branch;
  const head = JSON.parse(gh(['api', `repos/${OWNER}/${repo}/git/ref/heads/${branch}`])).object.sha;
  const baseTree = JSON.parse(gh(['api', `repos/${OWNER}/${repo}/git/commits/${head}`])).tree.sha;
  const tree = files.map((f) => ({
    path: f.file,
    mode: '100644',
    type: 'blob',
    sha: api('POST', `${repo}/git/blobs`, { content: f.data.toString('base64'), encoding: 'base64' }).sha,
  }));
  const t = api('POST', `${repo}/git/trees`, { base_tree: baseTree, tree }).sha;
  const c = api('POST', `${repo}/git/commits`, { message: 'Add .teknesyum catalog folder [skip ci]', tree: t, parents: [head] }).sha;
  api('PATCH', `${repo}/git/refs/heads/${branch}`, { sha: c });
}

const repos = JSON.parse(gh(['repo', 'list', OWNER, '--limit', '200', '--json', 'name,isArchived']))
  .filter((r) => !r.isArchived && !SKIP.has(r.name) && entries[r.name])
  .map((r) => r.name)
  .filter((n) => !only.length || only.includes(n));

for (const repo of repos) {
  const media = {};
  for (const [kind, ext] of [['icon', 'png'], ['shot', 'jpg'], ['full', 'jpg']]) {
    const f = path.join(ASSETS, `${repo}.${kind}.${ext}`);
    if (fs.existsSync(f)) media[kind] = { file: `.teknesyum/${kind}.${ext}`, data: fs.readFileSync(f) };
  }
  const own = remote(repo, '.teknesyum/teknesyum.json');
  const root = own ? null : remote(repo, 'teknesyum.json');
  let base = {};
  try {
    base = JSON.parse((own || root)?.data.toString('utf8').replace(/^﻿/, '') || '{}');
  } catch {}
  delete base.catalog;
  const files = [{ file: '.teknesyum/teknesyum.json', data: manifestFor(repo, base, media) }, ...Object.values(media)];
  const changed = files.filter((f) => {
    const cur = f.file === '.teknesyum/teknesyum.json' ? own : remote(repo, f.file);
    return !(cur && cur.data.equals(f.data));
  });
  if (push && changed.length) commit(repo, changed);
  console.log(`${repo}: ${changed.length ? (push ? 'yazıldı ' : 'değişecek ') + changed.map((f) => f.file).join(', ') : 'güncel'}`);
}
