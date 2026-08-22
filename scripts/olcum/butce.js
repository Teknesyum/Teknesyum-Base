#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

const TAVAN_SKILL = 1536;
const PENCERE_VARSAYILAN = 200000;
const BAYT_TOKEN = 4;
const ORAN = 0.01;

const GOZLENEN_HARICI = [
  {
    ad: 'anthropic-skills:consolidate-memory',
    metin:
      'Reflective pass over your memory files — merge duplicates, fix stale facts, prune the index.',
  },
  {
    ad: 'anthropic-skills:docx',
    metin:
      "Use this skill whenever the user wants to create, read, edit, or manipulate Word documents (.docx files) or Word templates (.dotx files). Triggers include: any mention of 'Word doc', 'word document', '.docx', '.dotx', or requests to produce professional documents with formatting like tables of contents, headings, page numbers, or letterheads. Also use when extracting or reorganizing content from .docx or .dotx files, inserting or replacing images in documents, performing find-and-replace in Word files, working with tracked changes or comments, or converting content into a polished Word document. If the user asks for a 'report', 'memo', 'letter', 'template', or similar deliverable as a Word or .docx file, use this skill. Do NOT use for PDFs, spreadsheets, Google Docs, or general coding tasks unrelated to document generation.",
  },
  {
    ad: 'anthropic-skills:explain-usage',
    metin:
      'Explain where this session’s tokens went, with one simple chart in plain language. Use when the user says things like "explain my usage", "where did my tokens go", or asks for a usage breakdown.',
  },
  {
    ad: 'anthropic-skills:pdf',
    metin:
      'Use this skill whenever the user wants to do anything with PDF files. This includes reading or extracting text/tables from PDFs, combining or merging multiple PDFs into one, splitting PDFs apart, rotating pages, adding watermarks, creating new PDFs, filling PDF forms, encrypting/decrypting PDFs, extracting images, and OCR on scanned PDFs to make them searchable. If the user mentions a .pdf file or asks to produce one, use this skill.',
  },
  {
    ad: 'anthropic-skills:pptx',
    metin:
      'Use this skill any time a .pptx or .potx file is involved in any way — as input, output, or both. This includes: creating slide decks, pitch decks, or presentations; reading, parsing, or extracting text from any .pptx or .potx file (even if the extracted content will be used elsewhere, like in an email or summary); editing, modifying, or updating existing presentations; combining or splitting slide files; working with templates (.potx), layouts, speaker notes, or comments. Trigger whenever the user mentions "deck," "slides," "presentation," or references a .pptx or .potx filename, regardless of what they plan to do with the content afterward. If a .pptx or .potx file needs to be opened, created, or touched, use this skill.',
  },
  {
    ad: 'anthropic-skills:schedule',
    metin:
      'Create or update a scheduled task that runs automatically. Use when the user says things like "every day", "each morning", "remind me in an hour", "run this at noon", or wants to reschedule an existing task.',
  },
  {
    ad: 'anthropic-skills:setup-cowork',
    metin: 'Guided Cowork setup — install role-matched plugins, connect your tools, try a skill.',
  },
  {
    ad: 'anthropic-skills:xlsx',
    metin:
      'Use this skill any time a spreadsheet file is the primary input or output. This means any task where the user wants to: open, read, edit, or fix an existing .xlsx, .xlsm, .xltx, .csv, or .tsv file (e.g., adding columns, computing formulas, formatting, charting, cleaning messy data); create a new spreadsheet from scratch or from other data sources; or convert between tabular file formats. Trigger especially when the user references a spreadsheet file by name or path — even casually (like "the xlsx in my downloads") — and wants something done to it or produced from it. Also trigger for cleaning or restructuring messy tabular data files (malformed rows, misplaced headers, junk data) into proper spreadsheets. The deliverable must be a spreadsheet file. Do NOT trigger when the primary deliverable is a Word document, HTML report, standalone Python script, database pipeline, or Google Sheets API integration, even if tabular data is involved.',
  },
  {
    ad: 'design',
    metin:
      'Create a design canvas — a multi-artboard visual design published as an Artifact that runs Claude Design’s canvas editor (an early preview of Claude Design inside Claude Code). You DRAFT the design as .dc.html artboards laid out on one pan/zoom canvas; where saving is enabled for the user’s account they refine every element visually (click-to-select, a properties panel, inline text editing, undo/redo) and Save publishes a new version for everyone, otherwise they get a view-and-export (PNG/PDF) preview of your draft. Good for UI mockups and screen flows, landing pages, marketing and social graphics, and print pieces — posters, flyers, brochures as single-page artboards; memos and reports as one flowing artboard. Use when someone wants a design, mockup, wireframe, UI or screen design, landing page, poster, flyer, brochure, banner, card, one-pager, or any visual layout they would rather tweak by hand than in code. Only for CREATING or re-seeding a canvas; an existing one is edited in its published Artifact.',
  },
  {
    ad: 'dataviz',
    metin:
      'Use this skill whenever you are about to create ANY chart, graph, plot, dashboard, or data visualization, in ANY output medium — an HTML or React artifact, inline SVG, plotting code in any library (matplotlib, plotly, d3, Recharts, …), an image/PNG you will render and upload, or a chart shared into Slack. Read it BEFORE writing the first line of chart code, choosing chart colors, building a stat tile / meter / KPI row, or laying out a dashboard. Produces visualizations that read as one system — elegant, accessible, consistent in light and dark — using a brand-neutral placeholder palette you swap for your own. Teaches a design-system-agnostic method: a form heuristic, a color formula with a runnable validator, mark specs, and interaction rules. A validated default palette is documented in `references/palette.md` — swap that file’s values for your brand’s. Triggers on: "chart", "graph", "plot", "data viz", "visualization", "dashboard", "analytics", "visualize data", "categorical colors", "sequential / diverging palette", "stat tile", "sparkline", "heatmap", "legend", "axis", "tooltip", "chart colors", "color by series".',
  },
  {
    ad: 'artifact-design',
    metin:
      'Design guidance and fundamentals for Artifacts. - Load before writing any artifact, including Markdown ones — format is part of the design pass, never a speed shortcut.',
  },
  {
    ad: 'artifact-diagramming',
    metin:
      'Diagramming know-how for Artifacts — when a picture earns its place, how to draw one that shows the real mechanism, and the inline-SVG mechanics that keep it legible in both themes.',
  },
  {
    ad: 'artifact-capabilities',
    metin:
      'Runtime capabilities a published Artifact page can be granted — behavior static HTML cannot provide on its own, such as the page reading live or connected data, keeping state shared across viewers, handing the viewer a file to save, or updating and republishing itself. Serves this user’s live capability roster and the typed call definitions. Load it whenever the user asks for an artifact needing any such runtime behavior.',
  },
  {
    ad: 'update-config',
    metin:
      'Use this skill to configure the Claude Code harness via settings.json. Automated behaviors ("from now on when X", "each time X", "whenever X", "before/after X") require hooks configured in settings.json - the harness executes these, not Claude, so memory/preferences cannot fulfill them. Also use for: permissions ("allow X", "add permission", "move permission to"), env vars ("set X=Y"), hook troubleshooting, or any changes to settings.json/settings.local.json files. Examples: "allow npm commands", "add bq permission to global settings", "move permission to user settings", "set DEBUG=true", "when claude stops show X". For simple settings like theme/model, suggest the /config command.',
  },
  {
    ad: 'keybindings-help',
    metin:
      'Use when the user wants to customize keyboard shortcuts, rebind keys, add chord bindings, or modify ~/.claude/keybindings.json. Examples: "rebind ctrl+s", "add a chord shortcut", "change the submit key", "customize keybindings".',
  },
  {
    ad: 'code-review',
    metin:
      'Review the current diff, or a PR number/branch/path target, for correctness bugs and reuse/simplification/efficiency cleanups at the given effort level (low/medium: fewer, high-confidence findings; high→max: broader coverage, may include uncertain findings; ultra: deep multi-agent review in the cloud); with no level given, it reuses the level you typed last. Pass --comment to post findings as inline PR comments, or --fix to apply the findings to the working tree after the review. For ultra on a GitHub.com PR target, --post asks to post the finished review’s findings to the PR as a single comment from the user’s GitHub account (not a review; the launch dialog still confirms in interactive sessions, while non-interactive mode posts on the flag alone) and --no-post hides that option.',
  },
  {
    ad: 'simplify',
    metin:
      'Review the changed code for reuse, simplification, efficiency, and altitude cleanups, then apply the fixes. Quality only — it does not hunt for bugs; use /code-review for that.',
  },
  {
    ad: 'fewer-permission-prompts',
    metin:
      'Scan your transcripts for common read-only Bash and MCP tool calls, then add a prioritized allowlist to project .claude/settings.json to reduce permission prompts.',
  },
  {
    ad: 'loop',
    metin:
      'Run a prompt or slash command on a recurring interval (e.g. /loop 5m /foo). Omit the interval to let the model self-pace. - When the user wants to set up a recurring task, poll for status, or run something repeatedly on an interval (e.g. "check the deploy every 5 minutes", "keep running /babysit-prs"). Do NOT invoke for one-off tasks.',
  },
  {
    ad: 'schedule',
    metin:
      'Create, update, list, or run scheduled cloud agents (routines) that execute on a cron schedule. - When the user wants to schedule a recurring cloud agent, set up automated tasks, create a cron job for Claude Code, or manage their scheduled agents/routines. Also use when the user wants a one-time scheduled run ("run this once at 3pm", "remind me to check X tomorrow").',
  },
  {
    ad: 'claude-api',
    metin:
      "Reference for the Claude API / Anthropic SDK — model ids, pricing, params, streaming, tool use, MCP, agents, caching, token counting, model migration.\nTRIGGER — read BEFORE opening the target file; don't skip because it \"looks like a one-liner\" — whenever: the prompt names Claude/Anthropic in any form (Claude, Anthropic, Fable, Opus, Sonnet, Haiku, `anthropic`, `@anthropic-ai`, `claude-*`, `us.anthropic.*`, `[1m]`); the user asks about an LLM (pricing/model choice/limits/caching) — never answer from memory; OR the task is LLM-shaped with provider unstated (agent/MCP/tool-definition/multi-agent/RAG/LLM-judge/computer-use; generate/summarize/extract/classify/rewrite/converse over NL; debugging refusals/cutoffs/streaming/tool-calls/tokens).\nSKIP only when another provider is being worked on (overrides all triggers): OpenAI/GPT/Gemini/Llama/Mistral/Cohere/Ollama named in the query; OR `grep -rE 'openai|langchain_openai|google.generativeai|genai|mistralai|cohere|ollama'` over the project hits (run this grep FIRST if no provider named — don't Read the file).",
  },
  {
    ad: 'run',
    metin:
      "Launch and drive this project's app to see a change working. Use when asked to run, start, or screenshot the app, or to confirm a change works in the real app (not just tests). First looks for a project skill that already covers launching the app; otherwise falls back to built-in patterns per project type (CLI, server, TUI, Electron, browser-driven, library).",
  },
  {
    ad: 'init',
    metin: 'Initialize a new CLAUDE.md file with codebase documentation',
  },
  {
    ad: 'security-review',
    metin: 'Complete a security review of the pending changes on the current branch',
  },
];

function kok() {
  return path.resolve(__dirname, '..', '..');
}

function onbilgi(dosya) {
  const ham = fs.readFileSync(dosya, 'utf8');
  const eslesme = ham.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!eslesme) return null;
  const govde = eslesme[1];
  const satirlar = govde.split(/\r?\n/);
  const alan = {};
  let anahtar = null;
  for (const satir of satirlar) {
    const bas = satir.match(/^([a-zA-Z][a-zA-Z0-9_-]*):\s?(.*)$/);
    if (bas) {
      anahtar = bas[1];
      alan[anahtar] = bas[2];
    } else if (anahtar && /^\s+\S/.test(satir)) {
      alan[anahtar] += ` ${satir.trim()}`;
    }
  }
  return alan;
}

function girdi(ad, metin, kaynak, dosya) {
  const karakter = metin.length;
  const bayt = Buffer.byteLength(metin, 'utf8');
  const kirpik = Math.min(karakter, TAVAN_SKILL);
  return {
    ad,
    kaynak,
    dosya,
    karakter,
    bayt,
    kirpik,
    satir: ad.length + 4 + kirpik,
  };
}

function metinAlani(alan) {
  if (!alan || !alan.description) return null;
  const aciklama = alan.description.trim();
  const neZaman = alan.whenToUse ? alan.whenToUse.trim() : null;
  return neZaman ? `${aciklama} - ${neZaman}` : aciklama;
}

function klasordenTopla(dizin, desen, adlandir, kaynak, biriktir) {
  if (!fs.existsSync(dizin)) return;
  for (const ad of fs.readdirSync(dizin)) {
    const tam = path.join(dizin, ad);
    const hedef = desen === 'skill' ? path.join(tam, 'SKILL.md') : tam;
    if (desen === 'skill' && !fs.existsSync(hedef)) continue;
    if (desen === 'md' && !ad.endsWith('.md')) continue;
    const metin = metinAlani(onbilgi(hedef));
    if (!metin) continue;
    biriktir.push(girdi(adlandir(ad), metin, kaynak, hedef));
  }
}

function baseTopla() {
  const t = path.join(kok(), 'teknesyum');
  const liste = [];
  klasordenTopla(path.join(t, 'skills'), 'skill', (a) => `teknesyum:${a}`, 'base-skill', liste);
  klasordenTopla(
    path.join(t, 'commands'),
    'md',
    (a) => `teknesyum:${a.replace(/\.md$/, '')}`,
    'base-komut',
    liste
  );
  return liste;
}

function baseAjan() {
  const liste = [];
  klasordenTopla(
    path.join(kok(), 'teknesyum', 'agents'),
    'md',
    (a) => `teknesyum:${a.replace(/\.md$/, '')}`,
    'base-ajan',
    liste
  );
  return liste;
}

function kurulEklentiler() {
  const dosya = path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');
  if (!fs.existsSync(dosya)) return [];
  const veri = JSON.parse(fs.readFileSync(dosya, 'utf8'));
  const yollar = [];
  for (const [anahtar, kayitlar] of Object.entries(veri.plugins || {})) {
    for (const kayit of kayitlar) {
      if (kayit.installPath) yollar.push({ anahtar, yol: kayit.installPath });
    }
  }
  return yollar;
}

function hariciTopla() {
  const liste = [];
  const ev = path.join(os.homedir(), '.claude');
  klasordenTopla(path.join(ev, 'skills'), 'skill', (a) => a, 'kisisel-skill', liste);
  klasordenTopla(
    path.join(ev, 'commands'),
    'md',
    (a) => a.replace(/\.md$/, ''),
    'kisisel-komut',
    liste
  );
  for (const eklenti of kurulEklentiler()) {
    const ad = eklenti.anahtar.split('@')[0];
    if (ad === 'teknesyum') continue;
    klasordenTopla(
      path.join(eklenti.yol, 'skills'),
      'skill',
      (a) => `${ad}:${a}`,
      'eklenti-skill',
      liste
    );
    klasordenTopla(
      path.join(eklenti.yol, 'commands'),
      'md',
      (a) => `${ad}:${a.replace(/\.md$/, '')}`,
      'eklenti-komut',
      liste
    );
  }
  for (const g of GOZLENEN_HARICI) {
    liste.push(girdi(g.ad, g.metin, 'ikili-gomulu', '(ikiliye gömülü)'));
  }
  return liste;
}

function toplam(liste, alan) {
  return liste.reduce((a, b) => a + b[alan], 0);
}

function butce(pencere) {
  return Math.max(1, Math.floor(pencere * BAYT_TOKEN * ORAN));
}

function bicim(n) {
  return n.toLocaleString('tr-TR');
}

function oncelikSimule(hepsi, sinir) {
  const gomulu = (g) => g.kaynak === 'ikili-gomulu';
  const toplamSatir = toplam(hepsi, 'satir') + Math.max(0, hepsi.length - 1);
  if (toplamSatir <= sinir) {
    return { kip: 'fits', taban: toplamSatir, kalan: sinir - toplamSatir, dusen: [] };
  }
  const taban =
    hepsi.reduce((a, g) => a + (gomulu(g) ? g.satir : g.ad.length + 2), 0) +
    Math.max(0, hepsi.length - 1);
  let kalan = sinir - taban;
  const dusen = [];
  for (const g of hepsi.filter((x) => !gomulu(x))) {
    const fark = g.satir - (g.ad.length + 2);
    if (fark <= kalan) kalan -= fark;
    else dusen.push(g.ad);
  }
  return { kip: 'priority', taban, kalan, dusen };
}

function rapor() {
  const base = baseTopla();
  const ajan = baseAjan();
  const harici = hariciTopla();
  const hepsi = [...base, ...harici];
  const listeToplam = toplam(hepsi, 'satir') + Math.max(0, hepsi.length - 1);
  const b200 = butce(PENCERE_VARSAYILAN);
  const b1m = butce(1000000);

  const cikti = [];
  const yaz = (s) => cikti.push(s);

  yaz('# Bütçe ölçümü');
  yaz('');
  yaz(`Sınır (200k pencere): ${bicim(b200)} karakter`);
  yaz(`Sınır (1M pencere):   ${bicim(b1m)} karakter`);
  yaz(`Skill başına tavan:   ${bicim(TAVAN_SKILL)} karakter`);
  yaz('');
  yaz('## Base');
  yaz(`girdi: ${base.length}`);
  yaz(`description karakter: ${bicim(toplam(base, 'karakter'))}`);
  yaz(`description bayt:     ${bicim(toplam(base, 'bayt'))}`);
  yaz(`liste satır maliyeti: ${bicim(toplam(base, 'satir'))}`);
  yaz('');
  yaz('## Base ajanları (bütçe dışı, ayrı liste)');
  yaz(`girdi: ${ajan.length}`);
  yaz(`description karakter: ${bicim(toplam(ajan, 'karakter'))}`);
  yaz(`description bayt:     ${bicim(toplam(ajan, 'bayt'))}`);
  yaz('');
  yaz('## Base dışı');
  yaz(`girdi: ${harici.length}`);
  yaz(`description karakter: ${bicim(toplam(harici, 'karakter'))}`);
  yaz(`description bayt:     ${bicim(toplam(harici, 'bayt'))}`);
  yaz(`liste satır maliyeti: ${bicim(toplam(harici, 'satir'))}`);
  yaz('');
  yaz('## Toplam');
  yaz(`girdi: ${hepsi.length}`);
  yaz(`liste toplamı (harness formülü): ${bicim(listeToplam)} karakter`);
  yaz(`200k bütçeye uzaklık: ${bicim(b200 - listeToplam)}`);
  yaz(`1M bütçeye uzaklık:   ${bicim(b1m - listeToplam)}`);
  yaz(`Base payı (200k): %${((toplam(base, 'satir') / b200) * 100).toFixed(1)}`);
  yaz('');
  yaz('## Öncelik kipi benzetimi');
  for (const [etiket, sinir] of [
    ['200k pencere', b200],
    ['1M pencere', b1m],
  ]) {
    const s = oncelikSimule(hepsi, sinir);
    yaz(`${etiket}: kip=${s.kip} taban=${bicim(s.taban)} kalan=${bicim(s.kalan)}`);
    yaz(`  name-only'ye düşen: ${s.dusen.length === 0 ? 'yok' : s.dusen.join(', ')}`);
  }
  yaz('');
  yaz('## Tavanı aşan description (kırpılır)');
  const asan = hepsi.filter((g) => g.karakter > TAVAN_SKILL);
  yaz(asan.length === 0 ? 'yok' : asan.map((g) => `${g.ad} ${g.karakter}`).join('\n'));
  yaz('');
  yaz('## Base girdileri, büyükten küçüğe');
  for (const g of [...base].sort((a, b) => b.karakter - a.karakter)) {
    yaz(`${g.karakter}\t${g.bayt}\t${g.satir}\t${g.ad}`);
  }
  yaz('');
  yaz('## Base ajanları, büyükten küçüğe');
  for (const g of [...ajan].sort((a, b) => b.karakter - a.karakter)) {
    yaz(`${g.karakter}\t${g.bayt}\t${g.ad}`);
  }
  yaz('');
  yaz('## Base dışı girdiler, büyükten küçüğe');
  for (const g of [...harici].sort((a, b) => b.karakter - a.karakter)) {
    yaz(`${g.karakter}\t${g.bayt}\t${g.satir}\t${g.kaynak}\t${g.ad}`);
  }
  return cikti.join('\n');
}

if (require.main === module) {
  process.stdout.write(`${rapor()}\n`);
}

module.exports = { rapor, baseTopla, hariciTopla, butce };
