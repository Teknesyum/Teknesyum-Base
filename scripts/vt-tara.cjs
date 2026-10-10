const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

const file = process.argv[2];
const out = process.argv[3];
if (!file || !out) {
  console.error("Usage: node scripts/vt-tara.cjs <file> <report.json>");
  process.exit(2);
}
const keyFile = path.join(os.homedir(), ".claude", "teknesyum-private", "private", "anahtarlar", "virustotal.key");
const key = (process.env.VT_API_KEY || (fs.existsSync(keyFile) ? fs.readFileSync(keyFile, "utf8") : "")).trim();
if (!key) {
  console.error("VT_API_KEY is not set and the shelf key file is missing.");
  process.exit(2);
}
const API = "https://www.virustotal.com/api/v3";
const headers = { "x-apikey": key };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(url, init = {}) {
  const r = await fetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const text = await r.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  return { status: r.status, body, text };
}

(async () => {
  const bytes = fs.readFileSync(file);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  console.log(`file ${path.basename(file)} ${bytes.length} bytes sha256 ${sha256}`);

  const form = new FormData();
  form.append("file", new Blob([bytes]), path.basename(file));
  const up = await call(`${API}/files`, { method: "POST", body: form });
  if (up.status !== 200) {
    console.error(`upload failed: HTTP ${up.status} ${up.text.slice(0, 300)}`);
    process.exit(1);
  }
  const id = up.body.data.id;
  console.log("uploaded, waiting for analysis");

  let analysis = null;
  for (let i = 0; i < 60; i++) {
    await sleep(20000);
    const a = await call(`${API}/analyses/${id}`);
    const st = a.body?.data?.attributes?.status;
    console.log(`  ${i + 1}: ${st ?? "HTTP " + a.status}`);
    if (st === "completed") { analysis = a.body; break; }
  }
  if (!analysis) {
    console.error("analysis did not complete in 20 minutes");
    process.exit(1);
  }

  const rep = await call(`${API}/files/${sha256}`);
  const attr = rep.body?.data?.attributes ?? {};
  const results = analysis.data.attributes.results;
  const flagged = Object.values(results)
    .filter((r) => r.category === "malicious" || r.category === "suspicious")
    .map((r) => ({ engine: r.engine_name, category: r.category, result: r.result }));
  const summary = {
    file: path.basename(file),
    sha256,
    scannedAt: new Date().toISOString(),
    link: `https://www.virustotal.com/gui/file/${sha256}`,
    stats: analysis.data.attributes.stats,
    flagged,
    defender: results.Microsoft ?? null,
    signature: attr.signature_info ?? null,
    tags: attr.tags ?? [],
    results,
  };
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ stats: summary.stats, flagged, defender: summary.defender, link: summary.link }, null, 2));
})().catch((e) => {
  console.error(String(e?.message ?? e));
  process.exit(1);
});
