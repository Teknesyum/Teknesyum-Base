<div align="center">

# Claude Code Adamantium Base

**State what you want. Let the system organize the rest.**

One package for Claude Code: a multi-agent work relay plus a neon UI standard.
How big the job is, how many pieces it splits into, which agent runs on which model,
and how the result gets verified — the system decides, not you.

[![Sponsor](https://img.shields.io/badge/Sponsor-Teknesyum-b026ff?style=flat-square&logo=githubsponsors)](https://github.com/sponsors/Teknesyum)
[![License](https://img.shields.io/badge/License-MIT-00f3ff?style=flat-square)](LICENSE)

</div>

---

## What it solves

Out of the box, Claude Code is a single assistant: you say what to do, it does it.
Give it a large job and the context fills up, it hits the limit, it forgets where it
stopped; it approves its own work; and it produces a different-looking UI in every project.

This package changes four things:

| | Before | After |
|---|---|---|
| **Division of work** | One assistant does everything, context bloats | Split into contracts, handed to agents; intermediate output never pollutes the main context |
| **Verification** | The author of the code declares it done | A separate auditor verifies it — it **has no write tools** and can do nothing but approve or reject |
| **Interruption** | Hit the limit, start over | Every agent's trace is written to disk; work resumes where it stopped |
| **UI** | A different look in every project | Same palette, same typography, same signature — everywhere |

---

## Install

### Windows — one line

```powershell
irm https://raw.githubusercontent.com/Teknesyum/claude-code-adamantium-base/main/install.ps1 | iex
```

### macOS / Linux — one line

```bash
curl -fsSL https://raw.githubusercontent.com/Teknesyum/claude-code-adamantium-base/main/install.sh | bash
```

### From inside Claude Code — three lines

```
/plugin marketplace add Teknesyum/claude-code-adamantium-base
```
```
/plugin install teknesyum@teknesyum
```
```
/teknesyum:kurulum
```

**Restart Claude Code after installing.**

**Required:** Claude Code. **Optional:** Node.js (for the statusline),
`typescript-language-server` (TS type intelligence), `graphify` (large-codebase indexing).
Anything missing is reported during install; none of it is mandatory.

> The plugin's user-facing text, agent prompts and commands are written in **Turkish**.
> The tooling itself is language-agnostic — it writes code and UI in whatever language
> your project uses.

---

## How it works

When you ask for something, `relay` engages and **classifies it silently**:

| Job size | What happens |
|---|---|
| A question, an explanation | It gets answered. Nothing is set up. |
| 1–2 files | Done directly. No agent is spawned. |
| 3–4 files, single skill | One contract, one agent. |
| ≥3 independent pieces or ≥5 files | Full relay: plan, contracts, parallel agents, audit |

You are never asked "is this a big job?". Preparation happens without asking, too:

- **No git repo?** One is initialized and a safety commit is made before any file is touched
- **Codebase large and unfamiliar?** It gets indexed first, then the graph is queried instead of reading files
- **UI work involved?** It goes to an agent with the theme standard preloaded
- **Missing `CLAUDE.md` signposts?** They get written when the job closes

### Contract layout

For large jobs, every task is written to a file:

```
.claude/relay/
├── PLAN.md              task graph, dependencies
├── LOG.md               one-line event log
├── canli/               agent traces — written by a hook, not by the model
└── contracts/
    ├── T3.md            open contracts
    └── done/            completed ones (write-protected)
```

Every contract declares what it owns (`owns`). **Two contracts can never own the same
file** — that is the only guarantee parallel work has. When an agent finishes, it moves
its contract into `done/`; writing there is blocked by a hook.

### Surviving interruptions

Every step an agent takes is written to `canli/<agent_id>.json` **by a hook** — it does
not depend on the model cooperating:

```json
{
  "contract": "T3", "steps": 34,
  "last_action": "Edit src/theme/tokens.ts",
  "files": ["src/App.tsx", "src/theme/tokens.ts"],
  "stop_reason": "max_tokens",
  "son_soz": "Theme tokens written, panel integration still pending."
}
```

Any `stop_reason` other than `end_turn` means the agent died. It is first revived with
its own context; if that fails, a handover brief for a fresh agent is built from this
file. `/devam` does all of it automatically.

### Fix loop

When the auditor says "rejected": rounds 1–3 continue with the **same agent** (context
preserved), rounds 4–5 assign a fresh agent on a stronger model, and at the ceiling the
decision comes to you. No job moves forward while a critical finding is open.

---

## Components

### Agents

| Agent | Job | Default model |
|---|---|---|
| `usta` | Writes code — modules, algorithms, endpoints, refactors, tests | sonnet |
| `usta-arayuz` | Writes UI; theme standard preloaded into its context | sonnet |
| `denetci` | Verifies acceptance criteria — **has no Write/Edit tools** | sonnet |
| `kayitci` | Mechanical bulk work — naming, formatting, documentation | haiku |

Role determines the kind of work, model determines the weight; they are separate axes.
The model is chosen at call time.

### Commands

| Command | What it does |
|---|---|
| `/durum` | Contract progress + per-agent turn-budget bars |
| `/devam` | Resumes an interrupted session from agent traces |
| `/iskele` | Sets up the relay explicitly (normally automatic) |
| `/huy` | Records a permanent rule in the right layer |
| `/teknesyumui` | Configures or disables the UI standard |
| `/kurulum` | Wires up the statusline and the habits file |

### Statusline

```
⬢ Opus 5  ·  Mangala  ·  ⎇ main
ctx ██████░░░░ 61%   5s 34%   7g 12%   ▸ T3 ████░░ 4/8
  ⚙ T4 usta          ███░░░░░  23/60  Edit src/hooks/useMangala.js
  ⨯ T3 usta-arayuz   ░░░░░░░░   3/60  ran out of context → /devam
```

Context usage, **your plan limits** (5-hour and weekly), contract progress, and each
agent's turn budget. It is rendered for you and never for the model, so its
**token cost is zero**.

### Hooks

- `koru-sozlesme.js` — blocks writes to completed contracts at the harness level
- `relay-izle.js` — writes agent traces to disk (`SubagentStart` / `PostToolUse` / `SubagentStop`)

---

## UI standard

Default palette — neon triad on a dark ground:

| | Hex | Used for |
|---|---|---|
| Primary | `#00f3ff` | Actions, active state, numeric emphasis, headings |
| Secondary | `#ff00ea` | Warnings, destructive actions, critical values |
| Tertiary | `#b026ff` | Mode switches, scrollbars, secondary buttons |
| Success | `#34d399` | "Completed" and nothing else |
| Surface | `#08090a` | Panels |

Typography: **Segoe UI** for text, **Consolas** for every number, key, code fragment and
duration. Scale 10 → 13 → 14 → 18 → 24, no sizes in between.

The rule set forbids inventing colors and dimensions: radius is one of four values,
spacing one of five, neon text is never left without a glow, numbers are never set in a
sans font.

Supported stacks: Tailwind v4, plain CSS, React, Electron, WPF (XAML), WinForms, ANSI console.

Desktop UI carries extra hard rules — nothing may be clipped, no button strip may drop an
element, no system title bar is left in its default light chrome, and native scrollbars are
darkened. UI strings never live in code: every project keeps a `locale/` folder that a
translator can work in without opening a source file.

### Customization

```
/teknesyumui                      show current settings
/teknesyumui kapat                disable the UI standard entirely
/teknesyumui palet #ff6b00        change the primary color
/teknesyumui font Inter           change the default font
/teknesyumui imza kapat           remove the signature block
/teknesyumui not <text>           write your own rule — yours wins on conflict
/teknesyumui sifirla              restore defaults
```

Settings live in `~/.claude/teknesyum-ui.json`; only fields you change are written, the
rest come from defaults. For per-project settings, create `.claude/teknesyum-ui.json` in
that project — it overrides the user-level file.

With `kapat`, the skill imposes no color or dimension at all and the project's own style
is followed.

### Signature block

A small, right-aligned signature is added to the bottom of the settings/about section of
generated UIs: a GitHub link and a support link. The support button is **outlined** —
transparent fill, colored border, colored label, vector icon. Remove it with
`/teknesyumui imza kapat`, or point it at your own account with
`/teknesyumui imza github <url>`.

---

## Cost

Claude Code's own measurement:

```
Skills (8) · Agents (4) · Hooks (4)
Always-on:  ~1,211 tokens     added to each session
```

Well under one percent of a 200k context, and it is paid once per session — later
messages hit the prompt cache at roughly a tenth of that. Skill bodies load only when
triggered; the full relay protocol is read only when a relay is actually set up.

One rule shaped the whole design: **delegate when the ratio of intermediate output to
returned summary is high.** Exploration and scanning die inside the subagent's context;
only the conclusion comes back to the main session.

---

## Settings

Behavior knobs live in `skills/relay/AYAR.md`:

| Knob | Default | What it controls |
|---|---|---|
| `soru_esigi` | `kritik` | When an agent stops to ask you something |
| `onay_kapisi` | `yok` | Whether the plan is submitted for approval |
| `denetim` | `her-sozlesme` | When the auditor runs |
| `duzeltme_tavani` | `5` | After how many rounds the decision comes to you |
| `model_tirmanisi` | `acik` | Whether round 3 escalates to a stronger model |
| `paralel_genislik` | `2` | Cap on concurrent agents |
| `worktree_izolasyonu` | `kapali` | Whether agents work in an isolated repo copy |

Per-project override: `<project>/.claude/relay/AYAR.md`.

---

## Measured on a real run

Run end to end on a React project: **8 contracts, 16 agents.**

The auditors caught **4 real defects**, none of which build or lint could have caught:
- An `@import` in the wrong place, silently dropping fonts — the agent had called it a "harmless warning"
- A keyboard shortcut that was never implemented, while the agent's output said "done"
- Raw hex colors used twice where a token existed

Two of those were cases where **the agent's report contradicted the code**. Without the
auditor, both would have passed.

The session limit killed three agents at once; all three were revived with their own
context, and no handover to a fresh agent was needed. All eight contracts closed, with no
ownership violation and no change to the dependency files.

---

## Updating

```
/plugin marketplace update teknesyum
```
```
/reload-plugins
```

The default palette, font and signature may change between versions; your own settings in
`~/.claude/teknesyum-ui.json` are preserved. The settings file carries its own `surum`
field and you are warned when it drifts out of sync.

---

## Support

This package is built in spare time and is free.

<a href="https://github.com/sponsors/Teknesyum"><img src="https://img.shields.io/badge/Buy_me_a_coffee-b026ff?style=for-the-badge&logo=githubsponsors&logoColor=b026ff&labelColor=0d0d0f" alt="Sponsor" /></a>

**[github.com/Teknesyum](https://github.com/Teknesyum)** · MIT
