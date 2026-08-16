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
| **Verification** | The author of the code declares it done | A separate auditor verifies it — it **cannot write or run anything** and can do nothing but approve or reject |
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
/teknesyum:setup
```

**Restart Claude Code after installing.**

The third line inspects the machine, wires up everything that has one obvious answer, and
asks you only about the choices that are genuinely yours — such as overwriting an existing
statusline or installing a global npm package. If you skip it, the base notices on the next
session start and offers to run it.

**Required:** Claude Code. **Optional:** Node.js (for the statusline),
`typescript-language-server` (TS type intelligence), `graphify` (large-codebase indexing).
Anything missing is reported during install; none of it is mandatory.

> Command names, agent roles and contract fields are **English**. What the base *writes
> back to you* — reports, explanations, agent output — follows the language you pick
> during setup; it is stored in `~/.claude/teknesyum.json` and defaults to Turkish.
> Agent prompts themselves are Turkish. The tooling is language-agnostic about your code.

---

## How it works

When you ask for something, `relay` engages and **classifies it silently**:

| Job size | What happens |
|---|---|
| A question, an explanation | It gets answered. Nothing is set up. |
| A one-line, eyeball-verifiable fix | Done directly — a packet would cost more than the fix |
| One capability, one agent-session of work | A single agent is spawned; the manager supervises |
| ≥3 independent pieces or ≥5 files | In-session relay: plan, contracts, parallel agents, audit |
| A project from scratch, or ≥3 independent capability areas | Task packets — see below |

You are never asked "is this a big job?". Preparation happens without asking, too:

- **No git repo?** One is initialized and a safety commit is made before any file is touched
- **Codebase large and unfamiliar?** It gets indexed first, then the graph is queried instead of reading files
- **UI work involved?** It goes to an agent with the theme standard preloaded
- **Missing `CLAUDE.md` signposts?** They get written when the job closes

### Task packets — moving work out of the session

**The manager plans; it does not do the work.** Opus writes nothing but the files under
`.claude/relay/`. Everything else is executed either by an agent it spawns in-session, or
by a *task packet* run outside the session entirely.

Subagents inside one session have a ceiling: each eats into the main context, and they all
die when the session closes. So large work is split into three to five packets, each
owning a **non-overlapping set of files**.

The split is deliberate: **the packet file is long and exact, the prompt you copy is one
line.** The file spends tokens on the executing side, where precision pays off — numbered
imperative steps, the exact writable paths, the files that must not be touched,
measurable acceptance criteria, explicit prohibitions. What you paste is just:

```
.claude/relay/G2.md oku ve içindeki görevi eksiksiz uygula.
```

Packet files carry no tool-specific syntax — no slash commands, no skill names, no
reference to the planning conversation. **A packet can be handed to a different tool
entirely**: another Claude Code session, Codex, a GPT-based agent.

There is no command to run when a packet finishes. You come back and say so; the manager
reads the packet reports and `git status` itself, flags any write that landed outside a
packet's declared area, runs the auditor, carries the produced signatures into dependent
packets, and prints the next wave of one-line prompts.

### Contract layout

For large jobs, every task is written to a file:

```
.claude/relay/
├── PLAN.md              task graph, dependencies
├── LOG.md               one-line event log
├── live/               agent traces — written by a hook, not by the model
└── contracts/
    ├── T3.md            open contracts
    └── done/            completed ones (write-protected)
```

Every contract declares what it owns (`owns`). **Two contracts can never own the same
file** — that is the only guarantee parallel work has.

### The completion gate

A contract moves `open → active → submitted → done`. The agent can reach `submitted` and
no further: **it cannot mark its own work complete or move its contract into `done/`.**
That transition belongs to the manager alone, after the auditor returns a pass, and it
requires a seal written into the contract's frontmatter:

```yaml
audit: passed
auditor_id: <the auditing agent>
diff: <the range the auditor was shown>
verification: npm test → exit 0
```

A hook enforces the gate rather than trusting it: an unsealed file cannot land in `done/`
through `Write`, and cannot get there through the shell either — redirects, `mv`,
`Move-Item`, `cp` and deletions targeting `done/` are all refused unless the source file
already carries the seal. Reading is untouched. Without this, an agent that finished
badly could declare itself done and drop out of the audit queue entirely.

### Surviving interruptions

When an agent starts and when it ends is written to `live/` **by a hook** — it does not
depend on the model cooperating:

```json
{
  "contract": "T3", "agent_type": "builder",
  "stop_reason": "max_tokens",
  "last_word": "Theme tokens written, panel integration still pending."
}
```

Any `stop_reason` other than `end_turn` means the agent died. It is first revived with
its own context; if that fails, a handover brief for a fresh agent is built from this
file. This happens on its own: when a session opens with contracts still in flight, the
base reads the traces and picks the work back up without being asked. There is no resume
command to remember.

Two limits worth knowing, both measured rather than assumed. A subagent's own tool calls
usually do not reach the hook layer — they did in one worktree-isolated run and in none of
the others — so there is no dependable per-agent progress counter. The statusline shows
which agents are running and for how long, not how far along they are, and when two agents
of the same role are open it says so instead of guessing which one just finished. And when
the session was opened somewhere without a relay directory, traces go to a per-session
folder under `~/.claude/teknesyum/live/` instead, so tracking works with no setup at all.

### Fix loop

When the auditor says "rejected": rounds 1–3 continue with the **same agent** (context
preserved), rounds 4–5 assign a fresh agent on a stronger model, and at the ceiling the
decision comes to you. No job moves forward while a critical finding is open.

---

## Components

### Agents

| Agent | Job | Default model |
|---|---|---|
| `builder` | Writes code — modules, algorithms, endpoints, refactors, tests | sonnet |
| `ui-builder` | Writes UI; theme standard preloaded into its context | sonnet |
| `auditor` | Verifies acceptance criteria — **cannot write or run anything** | sonnet |
| `scribe` | Mechanical bulk work — naming, formatting, documentation | haiku |

Role determines the kind of work, model determines the weight; they are separate axes.
The model is chosen at call time.

The auditor's restriction is enforced by the harness, not by its prompt: it holds
`Read`, `Grep`, `Glob` and `LSP` — no `Write`, no `Edit`, and **no `Bash`**, since a shell
is a write tool. Evidence that needs a command (tests, build, `git diff --name-only`) is
run by the manager and pasted into the audit request; anything not supplied comes back
marked `? unproven` rather than silently passing. A test asserts the tool list, so the
guarantee cannot quietly erode.

### Commands

| Command | What it does |
|---|---|
| `/report` | Contract progress, running agents, what is left |
| `/rule` | Records a permanent rule in the right layer |
| `/setup` | Inspects the machine, wires up what it can, asks about the rest |
| `/uisetup` | Configures or disables the UI standard |
| `/help` | What the base does and when, on one screen |

There is no command for resuming interrupted work and none for setting a relay up —
both happen on their own. Five commands is the whole surface, and you can finish a
project without typing any of them.

### Statusline

A multi-line statusline showing context usage, **your plan limits** (5-hour and weekly),
contract progress, and the agents running right now with their elapsed time. Dead agents
are labelled in plain language — there is no command to type; they get picked back up
on the next session. It is rendered for you
and never for the model, so its **token cost is zero**.

`settings.json` points at a small bridge in your config directory rather than at the
plugin itself. The plugin cache is versioned, so a direct path would break on the next
update and a hand-made copy would freeze at the version you copied; the bridge resolves
the newest installed version at render time and stays correct across updates.

### Hooks

- `contract-guard.js` — enforces the completion gate on `Write`, `Edit` and `Bash`
- `relay-watch.js` — writes agent traces to disk (`SubagentStart` / `PostToolUse` / `SubagentStop`)
  and prints what the base is doing (`SessionStart` / dispatch / agent finish)

### Visible steering

You cannot see inside the agents, so the base narrates itself. One line per real event,
emitted by the hook rather than promised by the model:

```
Adamantium ▸ röle kurulu · sözleşme 4/7 bitti · 3 açık
Adamantium ▸ görev veriliyor · builder · sonnet · tab component
Adamantium ▸ bitti · builder · 4 dk
```

Set `TEKNESYUM_SESSIZ=1` to silence them.

### Tests

```bash
node test/run.js
```

36 checks driving the real hooks and the real statusline with real payloads. They cover
the announcements, the trace files, the completion gate (including shell bypasses and
relative Windows paths), concurrent hook processes writing the same file, the packaging
invariants — no `hooks` key in the manifest, a valid `.lsp.json`, the auditor's tool
list, no pinned version in the statusline bridge — and every regression that shipped
before the suite existed. Runs on plain Node with no dependencies; CI runs it on every push.

### Code intelligence

The plugin ships an `.lsp.json` that registers `typescript-language-server` for
`.ts .tsx .mts .cts .js .jsx .mjs .cjs`. With it, agents resolve definitions and
references through the language server instead of grepping, and see compile errors
without waiting for a build.

Install the binaries once:

```bash
npm i -g typescript-language-server typescript@5
```

Two things are worth knowing, both learned the hard way:

- **Pin TypeScript to 5.x.** The 7.x line is the native port and ships no
  `lib/tsserver.js`, so the language server dies during `initialize` — and Claude Code
  silently continues without LSP, with no warning anywhere.
- **The server starts lazily**, on the first `LSP` tool call rather than at session start.
  Checking the process list proves nothing; the tool being present does.

If you also have `typescript-lsp@claude-plugins-official` enabled, both declare the same
extensions, the second one is ignored and a warning is printed. Disable one.

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
/uisetup                      show current settings
/uisetup kapat                disable the UI standard entirely
/uisetup palet #ff6b00        change the primary color
/uisetup font Inter           change the default font
/uisetup imza kapat           remove the signature block
/uisetup not <text>           write your own rule — yours wins on conflict
/uisetup sifirla              restore defaults
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
`/uisetup imza kapat`, or point it at your own account with
`/uisetup imza github <url>`.

---

## Cost

Claude Code's own measurement:

```
Skills (8) · Agents (4) · Hooks (5)
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

Behavior knobs live in `skills/relay/SETTINGS.md`:

| Knob | Default | What it controls |
|---|---|---|
| `ask_threshold` | `kritik` | When an agent stops to ask you something |
| `approval_gate` | `yok` | Whether the plan is submitted for approval |
| `audit` | `her-sozlesme` | When the auditor runs |
| `fix_ceiling` | `5` | After how many rounds the decision comes to you |
| `model_escalation` | `acik` | Whether round 3 escalates to a stronger model |
| `parallel_width` | `2` | Cap on concurrent agents |
| `worktree_isolation` | `kapali` | Whether agents work in an isolated repo copy |

Per-project override: `<project>/.claude/relay/SETTINGS.md`.

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
