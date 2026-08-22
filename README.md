<div align="center">

<img src="assets/banner.svg" alt="Teknesyum Base — relay architecture for contracts, agents, hooks, and audit" width="100%" style="max-width:1200px;height:auto">

**Say what you want. The system organizes the rest.**

A base layer for Claude Code: a multi-agent work relay, an independent auditor, and a
neon UI standard. How big a job is, how many pieces it splits into, which agent runs on
which model, and how the result is verified — the system decides, not you.

<a href="https://github.com/sponsors/Teknesyum"><img src="assets/badge-sponsor.svg" alt="Support Teknesyum" height="38"></a>
&nbsp;
<a href="LICENSE"><img src="assets/badge-license.svg" alt="License MIT" height="38"></a>

</div>

---

## What it solves

Out of the box, Claude Code is a single assistant: you say what to do, it does it. Give it
a large job and the context fills up, it hits the limit, it forgets where it stopped; it
approves its own work; and it produces a differently-styled UI in every project.

| | Before | After |
|---|---|---|
| **Division of work** | One assistant does everything, context bloats | Split into contracts, handed to agents; intermediate output never reaches the main context |
| **Verification** | The author of the code declares it done | A separate auditor verifies it — **if it writes a file, its audit is void** |
| **Interruption** | Hit the limit, start over | Every agent's trace is on disk; the next session picks the work back up on its own |
| **UI** | A different look every time | Same palette, same type scale, same signature |

### What this is not

An opinionated working protocol, not a security boundary. Two things here are mechanical —
hooks run as processes and cannot be talked out of it: the `done/` seal check — which
verifies the seal against the auditor's own `live/` record rather than its shape — and
the syntax check on written files. An agent's declared tool list is **not** one of them:
the harness can and does hand an agent more than it asked for. Everything else — sizing the work, splitting it into contracts,
assigning file ownership, choosing models — is the model following `SKILL.md`. That makes
it automatic, not deterministic. Treat it as a discipline that holds most of the time and
is auditable when it doesn't, not as a system that cannot be circumvented.

**There is no workflow to learn.** Five slash commands exist and all five are optional —
a project can be finished start to finish without typing any of them.

---

## Install

### Windows — one line

```powershell
irm https://raw.githubusercontent.com/Teknesyum/teknesyum-base/main/install.ps1 | iex
```

### macOS / Linux — one line

```bash
curl -fsSL https://raw.githubusercontent.com/Teknesyum/teknesyum-base/main/install.sh | bash
```

### From inside Claude Code

```
/plugin marketplace add Teknesyum/teknesyum-base
```
```
/plugin install teknesyum@teknesyum
```
```
/teknesyum:setup
```

**Restart Claude Code after installing.**

`/setup` inspects the machine, wires up everything that has one obvious answer, and asks
you only about the genuine choices — overwriting an existing statusline, installing a
global npm package, picking your output language. Skip it and the base notices at the next
session start and offers to run it.

**Required:** Claude Code. **Optional:** Node.js (statusline),
`typescript-language-server` (type intelligence), `graphify` (large-codebase indexing).
Whatever is missing is reported; none of it is mandatory.

> **Language.** Command names, agent roles and contract fields are English. What the base
> *writes back to you* — reports, explanations, agent output — follows the language you
> choose during setup, stored in `~/.claude/teknesyum.json`, defaulting to Turkish.
> Asking for `/report` does not mean you want an English report.

---

## How it works

When you ask for something, the `relay` skill engages and **classifies the request
silently**:

| Job size | What happens |
|---|---|
| A question, an explanation | It gets answered. Nothing is set up. |
| A one-line, eyeball-verifiable fix | Done directly — a contract would cost more than the fix |
| One capability, one agent-session of work | A single agent is spawned; the manager supervises |
| ≥3 independent pieces or ≥5 files | In-session relay: plan, contracts, parallel agents, audit |
| A project from scratch, or ≥3 capability areas | Task packets — see below |

The decision is announced in one line, so you can see which rule fired without being asked
to make the call yourself. Preparation happens without asking too: a missing git repo is
initialized with a safety commit before any file is touched, a project of thirty files or
more gets a dependency map built and queried instead of read, UI work is routed to an agent
with the theme standard preloaded, and missing `AGENTS.md` signposts get written when the
job closes.

<div align="center">
<img src="assets/flow.svg" alt="Teknesyum Base relay flow: user request, measurement and classification, optional prior research, plan and owns contract, builder or ui-builder or scribe dispatch, worktree and canonical relay visibility, builder delivery, independent read-only auditor, contract-guard and done gate, hook verification, and return to the user; unrelated open contracts do not block new work, and UI work uses scan, explicit approval, then apply manifest handoff" width="100%" style="max-width:1600px;height:auto">
</div>

### Prior art comes before the first contract

A from-scratch project does not get designed from scratch. Before a single contract is
written, comparable repositories are split across parallel `scout` agents; each writes one
`docs/taramalar/<name>.md` under six fixed headings, and the manager merges them into
`docs/taramalar/RAPOR.md` as **adopted**, **deliberately rejected**, and **suspicious**.

How many repositories is a profile setting, not a mood: **one** on eco, **ten** on normal,
**fifty** on premium. Depth does not scale with the count — every file carries the same six
headings either way; what grows is coverage. Fifty repositories are read in waves, and the
reports from one wave prune the candidates for the next, with the reason written down. Eco
stops at one because every repository is a `scout` agent's worth of budget and agent count
is the one thing eco actually constrains; a single repository still answers *how has
somebody else solved this*.

Nothing is copied. What gets taken is a pattern, a boundary, a mistake worth not repeating
— never source lines. Adopting a project whole is only ever a library decision, and that
one goes to you. Archived repositories stay in scope: *abandoned* is a warning against
depending on a project, not against reading it. Numbers that cannot be traced to a primary
source are tagged as unverified rather than repeated.

The gate is mechanical, not advisory: writing the first contract of a project that has
never completed any work and holds fewer than ten source files is blocked until the
research exists. Skipping is allowed — one line of reasoning in `docs/taramalar/ATLANDI.md`
opens the gate. Skipping silently is not.

On eco the gate warns instead of blocking: the contract is written, a one-line warning goes
to the session, and the skip is appended to `.claude/relay/live/_sorun.log`. The rule did
not bend, its carrier moved. A warning scrolls out of view and is not a record; the log line
is, and the manager reads that file every round. The hook can record *what* was skipped —
only the manager can record *why*, so the `ATLANDI.md` line is still owed.

### Product standards — three platforms, and staying up to date

Two defaults apply to the programs the relay produces, written down in
`skills/relay/references/standartlar.md`.

**A new project targets Windows, macOS and Linux.** Business logic calls no platform API,
paths are never built by hand, no shell is spawned to run a process, filenames are treated
as case-sensitive, and CI runs the test suite on all three. The portable part is the whole
program except its shell — which is what makes a later port a shell rewrite instead of a
rewrite.

Some programs are single-platform by nature: an overlay drawn over a Windows game, a
launcher built on shell file associations. Those turn the rule off in the project's own
`.claude/teknesyum.json`, with a reason — opting out is free, opting out silently is not:

```json
{ "platformlar": ["win"], "platformNeden": "built on Windows file associations" }
```

**On an existing project the rule never migrates anything on its own.** It asks once —
*this project is Windows-only, port it to three platforms?* — and a `no` is written down and
never asked again; a `yes` gets its own contract instead of being folded into whatever is
already running. The same shape as `/uicheckup`, which scans a project's UI against the
theme standard and writes nothing until you approve the plan.

The audit is deterministic, no model involved:

```bash
node teknesyum/scripts/platform-denetim.js <root> --kati
```

It reports embedded drive letters and home directories, shell invocations, Windows-only
target frameworks, filenames that collide when case is ignored, and the missing legs of a
CI matrix.

**Programs check for their own updates once a day, off the startup path.** Startup reads a
timestamp and nothing else; if the day has turned, the check runs after the window is up,
in the background, with a three-second timeout, and fails silently. The default is to
*tell* you a version exists — a silent background install is allowed only when a published
SHA-256 is verified first, because an updater is a code-execution channel. A program
installed through a package manager never updates itself. The prerequisite is a release
pipeline: every tag built for three platforms with checksums published, or no updater is
written at all.

### Contract layout

For large jobs every task is a file:

```
.claude/relay/
├── PLAN.md              task graph, dependencies
├── LOG.md               one-line event log
├── live/                agent traces — written by a hook, not by the model
└── contracts/
    ├── T3.md            open contracts
    └── done/            completed ones (write-protected)
```

Every contract declares what it owns (`owns`). **Two contracts are never given the same
file** — that is the discipline parallel work rests on. Be precise about what backs it:
ownership is assigned by the manager when contracts are written and checked against
`git status` when they close. No hook rejects a stray write to a file outside a contract's
`owns` set. If you want a hard wall instead of a rule, set `worktree_isolation : on` and
each agent works in its own git worktree, where the file system does the enforcing.

### The completion gate

A contract moves `open → active → submitted → done`. The agent can reach `submitted` and
no further: **it cannot mark its own work complete or move its contract into `done/`.**
That transition belongs to the manager alone, after the auditor returns a pass, and it
requires a seal in the contract's frontmatter:

```yaml
audit: passed
auditor_id: <the auditing agent — must have a live/ record>
diff: <the files the auditor was shown, git diff --name-only>
verification: npm test → exit 0
```

A hook enforces the gate instead of trusting it, and it checks all four fields — a bare
`audit: passed` with the rest left at `—` is refused. It also checks that the fields mean
something: `auditor_id` has to name a `live/` record belonging to an auditor that wrote no
files, and `diff` has to intersect the contract's `owns` (see the auditor section above).
An unsealed file cannot land in `done/`
through `Write`, and cannot get there through the shell either — redirects, `mv`,
`Move-Item`, `cp` and deletions targeting `done/` are refused unless the source already
carries the seal. Reading is untouched. Without this, an agent that finished badly could
declare itself done and quietly drop out of the audit queue.

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

Any `stop_reason` other than `end_turn` means the agent died. It is revived with its own
context first; if that fails, a handover brief for a fresh agent is built from the trace.
**This happens on its own.** Open a session in a project with contracts still in flight and
the base reads the traces and continues — no resume command exists, because none is needed.

Two limits, both measured rather than assumed. A subagent's own tool calls usually do not
reach the hook layer — they did in one worktree-isolated run and in none of the others — so
there is no dependable per-agent progress counter, and the statusline shows who is running
and for how long rather than inventing a percentage. When two agents of the same role are
open it says the elapsed time is ambiguous instead of guessing which one just finished.
And when a session is opened somewhere without a relay directory, traces go to a
per-session folder under `~/.claude/teknesyum/live/`, so tracking works with zero setup.

### Fix loop

When the auditor rejects: rounds 1–3 continue with the **same agent**, preserving context;
rounds 4–5 assign a fresh agent on a stronger model; at the ceiling the decision comes to
you. Nothing moves forward while a critical finding is open.

### Task packets — moving work out of the session

**The manager plans; it does not do the work.** It writes nothing outside `.claude/relay/`.
Everything else is executed by an agent it spawns, or by a *task packet* run outside the
session entirely.

Subagents share one context ceiling and all die when the session closes, so large work is
split into three to five packets, each owning a **non-overlapping set of files**. The split
is deliberate: the packet file is long and exact — numbered steps, writable paths,
untouchable files, measurable acceptance criteria — while what you paste is one line:

```
.claude/relay/G2.md oku ve içindeki görevi eksiksiz uygula.
```

Packet files carry no tool-specific syntax, so **a packet can be handed to a different tool
entirely**: another Claude Code session, Codex, a GPT-based agent. When one comes back you
just say so; the manager reads the packet reports and `git status` itself, flags writes
outside the declared area, runs the auditor, carries the produced signatures into dependent
packets, and prints the next wave of prompts.

The return trip obeys the same rule, and this is the half that is usually missing. A worker
that finishes does not narrate its work into the chat; it writes the report to a file and
hands back at most five lines — what closed, where the report is, and one open question if
there is one:

```
T3 teslim edildi · 747 test yeşil, build temiz
Rapor: docs/tasks/T19-isolated-performance-e2e.md
Açık: main'e commit yetkisi bende mi?
```

Both directions are enforced by the `Stop` hook, and in both directions: a packet or report
body dumped into the chat is refused, and so is announcing completion while a contract is
open without handing back the block. A ceiling without a floor just produces workers that
finish silently.

---

## Components

### Agents

| Agent | Job | Default model |
|---|---|---|
| `builder` | Code — modules, algorithms, endpoints, refactors, tests | sonnet |
| `ui-builder` | UI; the theme standard is preloaded into its context | sonnet |
| `auditor` | Verifies acceptance criteria — **if it writes, its audit is void** | sonnet |
| `scribe` | Mechanical bulk work — naming, formatting, documentation | haiku |
| `scout` | Prior-art research — scans comparable repos, writes no code | sonnet |
| `planner` | Plan council member — proposes, **is not allowed to write** | fable · opus |
| `advisor` | One-question second opinion — writes nothing, runs at low effort | fable |

Role determines the kind of work, model the weight; they are separate axes, and the model
is chosen at call time. `planner` is the exception: its two council members are two
different models by definition, so the choice is not the manager's to make. `advisor` is
the other: `fable` at low effort on every profile, premium included.

Agents are named `<Model>-<Job Name>`. The model comes first, capitalised — `Opus`,
`Fable`, `Sonnet`, `Haiku` — and every word of the job name is capitalised except short
conjunctions, which stay lowercase: `Fable-Kanca Sızıntıları`, `Opus-Ortak Katman`,
`Opus-Ajan Sağlığı ve Tur Özeti`. The name is the first thing visible in a list of running
agents, so carrying the model there says which weight is on which job without opening the
record. The name is free text and the `model` parameter is what actually gets dispatched;
the `görev veriliyor` line prints both, so a mismatch shows up rather than hiding. This is
a label, not a heading — it does not follow the sentence-case rule that governs document
titles and filenames, and neither rule should be bent to match the other.

The auditor must not be able to fix what it is auditing, and that guarantee is built in
three layers because no single one of them holds.

1. **The definition asks for nothing that writes.** `agents/auditor.md` declares `Read`,
   `Grep`, `Glob` and `LSP` — no `Write`, no `Edit`, and no `Bash`, because a shell is a
   write tool. A test asserts that line.
2. **The agent declares no `memory`.** Agents that ask for project memory were measured
   being opened with `Write` and `Edit` added on top of what they declared, so the auditor,
   the planner and the advisor give the memory up. `tools:` is a floor for the harness, not
   a ceiling — layers 1 and 2 are a request, not an enforcement.
3. **The seal gate checks what actually happened.** `contract-guard.js` refuses to let a
   contract into `done/` unless `auditor_id` resolves to a real `live/` record whose
   `agent_type` is `auditor` and whose `files` list is **empty**, and unless `diff` carries
   a file list that intersects the contract's `owns`. If the auditor touched one file, the
   audit is void no matter what tools it was handed. When `live/` cannot be read the gate
   falls open to the format check — otherwise contracts moved by hand outside the relay
   would be locked out — and records what it could not verify in `live/_sorun.log`.

Evidence that needs a command (tests, build, `git diff --name-only`) is run by the manager
and pasted into the audit request; anything not supplied comes back marked unproven rather
than silently passing.

### Commands

| Command | When |
|---|---|
| `/report` | "Where are we?" Contract progress, running agents, what is left |
| `/rule` | "Don't do that again." Records a permanent rule in the right layer |
| `/setup` | Wires this machine up. Once, at install time |
| `/uisetup` | Configures or disables the UI standard |
| `/uicheckup` | Scans UI files and prepares an approved relay manifest |
| `/premium` | Switches between the premium, normal and eco profiles, and reports which one is live |
| `/save` | Writes this session to disk — transcript, context, git state, unsent text |
| `/load` | Reads a saved session back and picks up where it stopped |
| `/saveall` | Saves every project's last session into its own folder |
| `/loadall` | Loads the state of every project onto one screen |
| `/rc` | Opens a remote-control session so the project can be driven from a phone |
| `/rcall` | Does the same for every project in the parent folder |
| `/rcadvanced` | Remote control with the choices left to you: mode, permissions, capacity |
| `/help` | What the base does and when, on one screen |

There is no command to set a relay up and none to resume interrupted work — both happen on
their own.

### Three profiles

There are three, and `/premium` moves between them: **premium**, **normal**, **eco**. The
whole profile swaps in one move — agent frontmatter, relay knobs, and the machine-level
field are written together, because a profile that only half applies is worse than either
half. `normal` is the default and is what used to be called `standard`; `/premium kapat`
still lands there.

| | eco | normal | premium |
|---|---|---|---|
| builder · ui-builder | haiku / medium / 40 turns | sonnet / medium / 60 turns | opus / xhigh / 80 turns |
| auditor | haiku / medium / 20 turns | sonnet / high / 30 turns | opus / xhigh / 40 turns |
| scout | haiku / low / 25 turns | sonnet / high / 45 turns | opus / high / 60 turns |
| scribe | haiku / low / 30 turns | haiku / low / 40 turns | opus / low / 40 turns |
| planner | haiku / low / 30 turns | sonnet / high / 40 turns | opus / xhigh / 40 turns |
| advisor | haiku / low / 12 turns | sonnet / low / 15 turns | fable / low / 20 turns |
| parallel agents | 1 | 2 | 20 |
| worktree isolation | off | off | on |
| model escalation | on | on | off — already at the top |
| audit | critical | every contract | every contract |
| report · briefing | short · quiet | short · milestone | detailed · every-step |
| plan council | off | off | on — fable + opus |
| second opinion | off | off | on — fable |
| prior-art repositories | 1 | 10 | 50 |

**Premium** is for a budget that does not run out. Sonnet and haiku are dropped entirely;
the difference between roles moves from the model to the effort. `scribe` still runs at low
effort on opus, because labouring over a rename is a loss at any price. Effort tops out at
`xhigh`, the highest value the frontmatter accepts. `advisor` is the deliberate exception —
`fable` at low effort, for reasons in [the second opinion](#the-second-opinion).

**Eco** is for the case where tokens genuinely are the constraint. Every role runs `haiku`.
Effort stays at `medium` for the three roles that produce or verify code, and drops to `low`
everywhere else: haiku already cuts the cost by an order of magnitude, and taking the coding
roles below `medium` on top of that buys work that fails its acceptance criteria — the extra
rounds cost more than the tokens saved. `audit` falls back to `critical`, because the
largest lever in eco is the number of agents and the auditor is a second agent per contract.
Model escalation stays on: when haiku is not enough, raising the model beats spending rounds.

Eco's philosophy is one sentence: **saving tokens outranks everything, and speed or elegance
can be spent to buy it.** Correctness cannot. Eco may be slow and inelegant; it may not be
wrong. That is why the ordering of principles inverts here — on premium and normal the
manager weighs user comfort first and treats tokens as a budget, on eco tokens come first —
while the correctness layer does not move at all. The audit still runs, `critical` is a
floor rather than a target, the four-field seal still guards `done/`, contracts still own
their files, and acceptance criteria are still run before they are ticked. What eco cuts is
the *amount* of work, never the *verification* of it: unverified work gets written twice,
which costs more than it saved.

The parallel ceiling is meant to be used, not admired. On premium, splitting the work across
five or ten agents at once is the expected move; **failing to split work that could be split
is what has to justify itself.** The cap is 20 and it is not there for tokens — with
`worktree_isolation` on, every agent is a repo copy and a process, and if the manager enters
a bad loop the cap is the safety net. The decision of how many to open belongs to the
manager, and the measure is wall-clock time, not tokens.

Two things do not change on any profile. A deterministic tool still comes before a model
call — `biome`, `rg` and `sed` are chosen for being right, not for being cheap. And the
auditor still cannot write. Premium buys depth, not permission.

The machine-level field is `profil` in `~/.claude/teknesyum.json`, holding `eco`, `normal`
or `premium`. Installs that predate it carry a boolean `premium` instead; that is read as
`premium` when true and `normal` otherwise, and both fields are written from then on.

### The plan council

On premium the plan stops being one model's work. Once the prior-art research is in, the
manager opens **two `planner` agents on the same briefing** — one `fable`, one `opus`.
Neither of them builds anything: `planner` asks for no write tool and no memory, so
the side that designs the work does not start it. Each returns a proposal under five headings — understanding,
plan, risks, points of divergence, and what it rejected.

The manager synthesises. Where both members agree, the decision is taken as confirmed.
Where they diverge, both options and both reasons go into `PLAN.md` under a **Konsey
ayrışması** heading together with the choice made and why — a disagreement resolved
silently is a question asked again six months later. An idea only one member saw is
weighed before it is dropped; that is usually where the council earns its cost. Agreement
is a signal, not proof: two members can be wrong together, and the manager still refuses.

Then the manager writes `PLAN.md`. This does not soften the rule that planning is never
delegated — what is delegated is the generation of options, never the decision. A cold
agent plans badly because it lacks context; a council member sees the same briefing, the
same research report and the same codebase, and the pen stays with the side that carries
the context.

With the profile on, the session start prints `Teknesyum ▸ premium mod` and the first two
prompts carry a behaviour note into the model: open the parallelism, do not fall back to
sonnet, do not use token thrift as a reason. `/premium durum` compares the flag against the
files and says so when a plugin update has reverted them; `TEKNESYUM_PREMIUM=1|0` overrides
for one session without touching anything on disk.

### The second opinion

The council is for a whole plan and it costs two agents. Most of the time what is missing
is smaller than that: one node where the manager genuinely does not know which way to go.
`second_opinion` — also a premium default — covers that case with one agent and one
question.

A separate agent answers it: `advisor`, on `fable`, under three headings and no more than
twenty lines — the call it would make, at most three reasons, and what the asker missed. The
third heading is why the feature exists; the first two often only confirm what the manager
already thought.

It used to be a second mode of `planner`, selected by a `GÖRÜŞ:` prefix on the briefing.
Splitting it out was forced by a measured constraint: the `Agent` tool's schema carries
`model` but not `effort`, so effort can only come from the agent definition's frontmatter.
Two modes in one file meant one effort for both. As its own agent, `advisor` runs at **low
effort even on premium** — which is the point, because the trigger list is nine items long
and a consultation that is expensive is a consultation that never happens.

The nine: a choice between two roads where being wrong is expensive to undo; a bug that has
survived three rounds with the root cause still unclear; a rule about to be broken; a
request that reads two ways; every time the user asks for a plan; a finding that cannot be
shown to be a bug, because no reproduction step, failing test or log line can be written for
it; two agents whose reports disagree about the same file or the same measurement with no
run that settles it; an acceptance criterion written into a contract with no command that
makes it pass or fail; and any expensive-to-undo release step — a version tag, a merge to
`main`, a change to a published interface or schema.

Each of them names a missing or conflicting artifact, which is deliberate: a trigger phrased
as "when you are unsure" either never fires or always fires. Nine items did not lower the
bar — if the artifact is not missing, the item does not fire. It still does not open for
mechanical work, pattern-fixed work, or anything with one right answer.

The fifth occasion is not the council. The council runs once on a from-scratch project,
after the prior-art research and before `PLAN.md`, with two members returning full
proposals. The plan check runs whenever the user says "make a plan", with one member
returning at most twenty lines before the plan is handed over. Where a from-scratch
`PLAN.md` is being written the council covers it and no separate check is taken; with the
council off, or on work that is not a from-scratch project, the check is the single-member
version.

Asking the user still comes first. The opinion replaces a guess, never a question — it only
applies where `ask_threshold` does not allow asking. And it binds nothing: where the manager
disagrees it writes down why, and the user is told an opinion was taken with a
`Teknesyum ▸ Opinion ▸ …` line.

### Watching the agents

Twenty agents in parallel is twenty chances for one of them to spin. The hooks already recorded
enough to notice — they just were not reading it back.

An agent that has produced no event for `agent_stall` minutes and never sent
`SubagentStop` is **stuck**. One whose last action repeats `agent_loop` times while its
transcript keeps growing is **looping** — the growth matters, because an agent waiting on a
long tool call also repeats its last action and is perfectly healthy. Both land on one line
and in `live/_sorun.log`.

A hook cannot stop a subagent. It says what it found and the main session decides, with
`TaskStop`. The report says which agent, how long, and what can be done about it.

With `debug` on, an agent that fails or stops unexpectedly gets a `Teknesyum ▸ Debug ▸`
line as well. It is the same detection, not a second one beside it — one measurement, two
readers.

Every turn closes with its own receipt:

```
Total Süre: 3dk 35sn // Tahmini Token: ~5000
```

The time is stamped between `UserPromptSubmit` and `Stop`. The token figure is the growth
of the transcript files — main session and subagents together — divided by four. The line
says `~` because that is honestly what it is: `stat` the size, no parsing, no second pass
over megabytes of JSONL. The health scan needs the same numbers, so it is one measurement
shared by two features rather than two that drift apart.

### Session save and load

Relay resumes work on its own, but what it resumes are *contracts* — the plan, not the
conversation. `/save` covers the other half. It writes the session to
`<project>/.claude/oturumlar/<name>/` as four files: `ham.jsonl`, a byte-for-byte copy of
the transcript, so nothing is lost; `ozet.md`, the digest `/load` reads back, with every
turn, each tool call as name plus target, the last ten turns kept long and older ones
trimmed; `durum.json`, holding the session id, model, context usage, git HEAD and dirty
files, open relay contracts, the message queue and the unsent text; and `calisma.diff`, a
patch of the dirty working tree at save time, untracked files included.

The unsent text is what sits in the input box, typed but never submitted. Claude Code keeps
only a 200-character preview of it, so that is what the record holds. Messages queued while
Claude was working are stored in full.

`/load` with no argument takes the newest record and compares it against the repo as it
stands now: a moved `git HEAD`, a different project root, or a stored patch each come back
as a warning line. The patch is never applied on its own — `/load` reports it, you decide.
Records are local and stay out of git.

Several chats can work in one project at the same time, so no record is allowed to land on
another. Which transcript belongs to the running chat is not guessed — Claude Code puts its
session id in the environment and the script reads it. An unnamed record carries that id
next to the date, so two chats saving in the same minute get separate folders. A named
record can be refreshed by the chat that owns it; a chat writing over someone else's record
is refused until `--ustune` says so explicitly. The pointer file keeps one entry per
session rather than a single "latest", so one chat saving never erases another's trail.

Every `/load` starts with an index of all records — name, time, session id, turn count —
with the one it opened marked. That way a load never silently hides the fact that another
chat has a record waiting. `/load hepsi` opens all of them; anything else opens one.

```
/save                 name the record after the date and session
/save relay-refactor  name it yourself
/load                 index of all records, newest one opened
/load relay-refactor  a specific one
/load hepsi           every record
/load son             pick the previous session up from its transcript, no record needed
/saveall              save every project's last session into its own folder
/loadall              the state of every project on one screen
```

`/saveall` and `/loadall` work across the whole folder of projects, with the same
exclusion rule as `/rcall` — `!`, `.` and `_` folders stay out. Saving writes each
project's own record under its `.claude/oturumlar/`, never into a shared pile, and the
folder gitignores itself so a multi-megabyte transcript never reaches a repository.
Loading reads nothing back into context wholesale: per project you get its folder path,
the git state, the open contracts with their status, when the last session ran and whether
it has a record — enough to choose where to continue, and no more. Each project also gets
a **continuation prompt** in a copyable block, built from what the project says on disk:
which record to open, which contracts are waiting, whether the working tree is dirty. Ten
projects means ten blocks; you paste one into that project's session and the work resumes
from there.

A session that dies does not get to take the thread with it. When the remote-control
window closes, the process crashes, or you simply never typed `/save`, the transcript is
still on disk — `/load son` summarizes the project's previous session straight from it,
and a bare `/load` falls through to the same place when no record exists. The relay state
is independent of all this: contracts, their status and `LOG.md` live in the project, so a
new session reports what is open at start-up regardless. If there is also a recent session
to pick up, the start-up line says so.

### Drive the project from a phone

Claude Code's Remote Control keeps the session on your machine and lets a phone or browser
steer it. Today it is started from the terminal client, and the desktop app has no button
for it — `/rc` fills that gap and does the whole errand: it finds the terminal client
(offering to install it when it is missing, `/rc kur`), answers the client's start-up
questions ahead of time, saves the current chat, opens a terminal window in the project
root and starts the remote session named after the folder. Nothing is asked of you.

What is left for you is one tap: Claude app → **Code** tab → the session name. The
terminal window shows a QR code when you press the space bar, and the record `/rc` just
saved is loaded on the phone with `/load <name>`, so the conversation continues rather
than restarting.

```
/rc                    open remote control for this project, no questions
/rc kur                install the terminal client first, then open
/rcall                 open one session per project in the parent folder
/rcadvanced            pick the spawn mode, permission mode, capacity yourself
/rcadvanced metin      print the command instead of opening a window
/rcadvanced kaydetme   open without saving the chat first
```

`/rcall` walks the folder above the project and puts every project in it on remote
control. Folders whose name starts with `!`, `.` or `_` — where archived and finished
work lives — stay out; anything else you want skipped goes into the `rcAtla` list in
`~/.claude/teknesyum.json`. The default cap is twelve windows (`/rcall tavan 30`).

If a window cannot be opened, the command prints one copy-pasteable line rather than
handing you a set of instructions. This command exists only until the desktop app grows a
remote-control control of its own; on that day it is removed.

### UI checkup

`/uicheckup` uses a deliberate two-stage flow. The first stage scans the target project without
writing to it and emits a deterministic JSON plan containing the UI files, findings, file digests
and plan digest. Review and save that plan before the second stage.

```powershell
node "<plugin>/scripts/uicheckup.js" "<target>" > ui-plan.json
```

The second stage requires explicit approval, the plan digest and the same target root. It rechecks
the plan and every file, rejects stale plans and path traversal, and emits a write-free manifest.
That manifest is handed to `ui-builder/relay`; the apply CLI never silently patches target files.

```powershell
node "<plugin>/scripts/uicheckup-apply.js" --approve --plan ui-plan.json --plan-digest <digest> --target "<target>"
```

The same Node commands and semantics work on Windows PowerShell, macOS and Linux shells. Shell
redirection is shown only for saving the scan output; the checkup itself uses no platform-specific
path assumptions.

### Statusline

Multiple lines showing context usage, **your plan limits** (5-hour and weekly), contract
progress, and the agents running right now with their elapsed time. Dead agents are
labelled in plain language. It is rendered for you and never for the model, so its
**token cost is zero**.

`settings.json` points at a small bridge in your config directory rather than at the plugin
itself. The plugin cache is versioned, so a direct path breaks on the next update and a
hand-made copy freezes at whatever version you copied; the bridge resolves the newest
installed version at render time and stays correct across updates.

### Hooks

- `contract-guard.js` — enforces the completion gate on `Write`, `Edit` and `Bash`; keeps
  the contract status ladder one-way (`open → active → submitted → done`, with `blocked`
  reachable from anywhere), so a correction round cannot reset the audit queue; and holds
  the prior-art gate shut on a brand-new project
- `relay-watch.js` — eleven events. It writes agent traces (`SubagentStart` / `PostToolUse` /
  `SubagentStop`) including the model and effort the agent *actually* ran at, narrates what
  the base is doing (`SessionStart` / dispatch / agent finish), requires a sizing verdict on
  every request (`UserPromptSubmit`), enforces the handoff rule in both directions (`Stop`),
  parses every `.js`/`.json` the moment it is written and hands the syntax error straight
  back (`PostToolUse`), feeds open contracts and the route position back into a freshly
  compacted context (`PostCompact`), seals unfinished agent records at shutdown
  (`SessionEnd`), records rate-limit and overload interruptions (`StopFailure`), and records
  a failing tool without counting it as progress (`PostToolUseFailure`)
- `kapsayici.js` — covers the session that was opened one folder too high

### Opened in the parent folder

Claude Code keys everything it stores per project on the folder the session was opened in.
Open the session on the folder that holds all your projects and work in a subfolder, and
the subagent memory of ten different projects lands in one shared bucket —
`<parent>/.claude/agent-memory` — instead of the project it belongs to.

The base does not ask you to pick a different folder. It notices that the folder is a
container — not a project itself, but holding projects — follows which project the files
you touch belong to, and at the end of every turn moves whatever agent memory piled up in
the parent into that project, merging the `MEMORY.md` index instead of overwriting it. The
active project is also handed to the model, so `/save`, `/rc`, the map and the relay write
to the project root rather than the folder above it.

Sessions opened on a project directly never enter this path; nothing changes for them.

### Visible steering

You cannot see inside the agents, so the base narrates itself. One line per real event,
emitted by a hook rather than promised by a model:

```
Teknesyum ▸ röle kurulu · sözleşme 4/7 bitti · 3 açık · kaldığım yerden sürdürüyorum
Teknesyum ▸ görev veriliyor · builder · sonnet · tab component
Teknesyum ▸ bitti · builder · 4 dk
```

Every work request also gets a sizing verdict — including the requests that need no agent
at all, so silence never means "is this thing even loaded?":

```
`Teknesyum ▸ Size ▸ One file, verifiable by eye — no agent needed, I did it myself`
`Teknesyum ▸ Size ▸ New project, three skill areas — split into 8 contracts as task packets`
```

The sizing and difference lines are printed as code spans, so they read as a block instead
of disappearing into the prose around them. The label is capitalised, `▸` separates it from
the sentence, and the sentence itself is written in ordinary case.

**How much of this you see is a setting** — `steering` in `~/.claude/teknesyum.json`,
asked once by `/setup`:

| Level | What you see |
|---|---|
| `0` | Nothing. No `Teknesyum ▸` line is ever printed. |
| `1` | Session start, dispatch, agent finish, sizing verdict. **Default.** |
| `2` | All of the above plus a line wherever the base changed the outcome. |

Level 2 exists because the interesting part is invisible: work split across agents that a
plain session would have run sequentially, a deterministic tool chosen over a model call,
an auditor sending a contract back, a hook refusing a write.

```
`Teknesyum ▸ Diff ▸ Split the job into 4 contracts across 2 agents — one session would have run them in a row`
`Teknesyum ▸ Diff ▸ Mapped the imports with harita.js — one disk scan instead of reading 30 files`
`Teknesyum ▸ Diff ▸ The auditor sent T2 back — acceptance criterion 3 was not met`
```

A difference line is a trace record, not a boast — if you cannot say what a plain session
would have done instead, the line is not written. `TEKNESYUM_SESSIZ=1` still equals level
`0`; `TEKNESYUM_STEERING=0|1|2` overrides for a single session.

### Tests

```bash
node test/run.js
```

102 checks driving the real hooks and the real statusline with real payloads: the
announcements, the trace files, the completion gate (including shell bypasses and relative
Windows paths), concurrent hook processes writing the same file, and the packaging
invariants — no `hooks` key in the manifest, a valid `.lsp.json`, the auditor's tool list,
no pinned version in the statusline bridge, no stale command name anywhere in the tree.
Plain Node, no dependencies; CI runs it on every push.

### Code intelligence

Before opening files, agents ask what is connected to what:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/harita.js" .
```

`harita.js` reads `import` / `require` / `using` lines straight from source and writes
`.claude/harita.md` plus `harita.json`: hubs, cycles, orphans, file-to-file edges. **No
model call and no parser to install** — a 123-file project takes seconds and produces
about 9 kB. C# `using` resolves to a namespace node rather than a single file, because
binding a namespace to one file produced convincing but fake edges. The rule is thirty
source files, or a job touching three or more modules; below that `Grep` is cheaper.

This is not a replacement for a semantic graph — it answers *what breaks if I touch this*,
not *what does this mean*. Understanding a foreign codebase is still a job for something
that reads it.

The plugin ships an `.lsp.json` registering `typescript-language-server` for
`.ts .tsx .mts .cts .js .jsx .mjs .cjs`. Agents then resolve definitions and references
through the language server instead of grepping, and see compile errors without a build.

```bash
npm i -g typescript-language-server typescript@5
```

Two things worth knowing, both learned the hard way:

- **Pin TypeScript to 5.x.** The 7.x line is the native port and ships no `lib/tsserver.js`,
  so the server dies during `initialize` — and Claude Code silently continues without LSP,
  with no warning anywhere.
- **The server starts lazily**, on the first `LSP` tool call rather than at session start.
  Checking the process list proves nothing; the tool being present does.

If `typescript-lsp@claude-plugins-official` is also enabled, both declare the same
extensions, the second is ignored and a warning is printed. Disable one.

---

## UI standard

Default palette — a neon triad on a dark ground:

| | Hex | Used for |
|---|---|---|
| Primary | `#00f3ff` | Actions, active state, numeric emphasis, headings |
| Secondary | `#ff00ea` | Warnings, destructive actions, critical values |
| Tertiary | `#b026ff` | Mode switches, scrollbars, secondary buttons |
| Success | `#34d399` | "Completed", and nothing else |
| Ground | `#000000` | The window itself — true black |
| Text | `#ffffff` | Anything meant to be read |

Contrast is not negotiable: mid greys (`#d1d5db`, `#9ca3af`, `#6b7280`) are not in this
palette. Hierarchy comes from size, weight, tracking and neon color — never from dimming
text toward the background. The floor is 7:1.

Typography: **Segoe UI** for text, **Consolas** for every number, key, code fragment and
duration. Scale 10 → 13 → 14 → 18 → 24, nothing in between.

The rules forbid inventing colors and dimensions: radius is one of four values, spacing one
of five, neon text is never left without a glow, numbers are never set in a sans font, and
nothing may cover a neighbour's outline or clip its glow.

Supported stacks: Tailwind v4, plain CSS, React, Electron, WPF (XAML), WinForms, ANSI
console. **The theme covers the whole application** — a checklist walks the places a native
grey box usually survives: scrollbars, message boxes, combo box popups, checkboxes,
tooltips, context menus, tab headers, focus rings, disabled states. Desktop UI carries
extra hard rules on top: nothing may be clipped, no button strip may drop an element, the
system title bar is replaced by a themed strip.

### Project layout

The base also has an opinion about where things live, because a root directory full of
loose notes is the first thing that makes a project unreadable:

```
src/  docs/  locale/  settings/  tools/  tests/  .claude/  README.md  <the executable>
```

`docs/` holds every document a human reads — plan, roadmap, decision log, task packets,
prior-art scans, notes agents leave each other. Folder signposts are `AGENTS.md`, so every
tool reads the same file; a one-line `CLAUDE.md` holding `@AGENTS.md` sits next to it, since
Claude Code's own discovery of `AGENTS.md` could not be verified. `.claude/relay/` holds live contract state, because a hook
guards that path. UI strings never live in code: `locale/tr.json` is the source, adding a
language is copying one file, and a translator never opens a source file.

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

Settings live in `~/.claude/teknesyum-ui.json`; only the fields you change are written.
For per-project settings create `.claude/teknesyum-ui.json` in that project — it overrides
the user-level file. With `kapat`, no color or dimension is imposed at all and the
project's own style is followed.

A small right-aligned signature is added to the settings/about section of generated UIs: a
GitHub link and a support link, the support button outlined rather than filled. Remove it
with `/uisetup imza kapat`, or point it at your own account with `/uisetup imza github <url>`.

---

## Settings

Behavior knobs live in `skills/relay/SETTINGS.md`:

| Knob | Default | What it controls |
|---|---|---|
| `ask_threshold` | `critical` | When an agent stops to ask you something |
| `approval_gate` | `none` | Whether the plan is submitted for approval |
| `audit` | `every-contract` | When the auditor runs |
| `fix_ceiling` | `5` | After how many rounds the decision comes to you |
| `model_escalation` | `on` | Whether round 4 escalates to a stronger model |
| `parallel_width` | `2` | Cap on concurrent agents — 1 on eco, 20 on premium |
| `worktree_isolation` | `off` | Whether agents work in an isolated repo copy |
| `report_length` | `short` | How much an agent reports back to the manager |
| `briefing` | `milestone` | How often the manager reports to you |

Per-project override: `<project>/.claude/relay/SETTINGS.md`.

Three settings are per-machine rather than per-project, and `/setup` asks for all of
them: `dil` (`en` default, or `tr`) in `~/.claude/teknesyum.json` — it governs both the
notifications you see and the language agents write to each other in; `steering` (`0` | `1` | `2`, see [Visible steering](#visible-steering)) in
`~/.claude/teknesyum.json`, and the UI standard in `~/.claude/teknesyum-ui.json` — keep the
defaults, customize the palette, typography and signature, or switch it off entirely with
`"kapali": true` so no color or measurement is imposed.

---

## Cost

Claude Code's own measurement:

```
Skills (8) · Agents (4) · Hooks (5)
Always-on:  ~1,211 tokens     added to each session
```

Well under one percent of a 200k context, paid once per session — later messages hit the
prompt cache at roughly a tenth of that. Skill bodies load only when triggered; the full
relay protocol is read only when a relay is actually set up.

One rule shaped the whole design: **delegate when the ratio of intermediate output to
returned summary is high.** Exploration and scanning die inside the subagent's context;
only the conclusion comes back.

Opening an agent is not something the manager asks permission for. There is no rule that
holds agents back until the user requests one — the call is made on the size of the job,
and when the user does ask for agents they get opened without debate. On premium the
posture inverts: going parallel is the default and leaving splittable work unsplit is what
needs a reason, because the binding constraint there is wall-clock time rather than tokens.
The cap is 20, the call is the manager's, and "it would cost tokens" is not a reason. The
sizing table itself does not move; a small job stays a small job.

---

## Measured on a real run

End to end on a React project: **8 contracts, 16 agents.**

The auditors caught **4 real defects**, none of which build or lint could have caught:

- An `@import` in the wrong place, silently dropping fonts — the agent had called it a
  "harmless warning"
- A keyboard shortcut that was never implemented, while the agent's output said "done"
- Raw hex colors used twice where a token existed

Two of those were cases where **the agent's report contradicted the code.** Without the
auditor, both would have shipped.

The session limit killed three agents at once; all three were revived with their own
context and no handover was needed. All eight contracts closed, with no ownership violation
and no change to the dependency files.

---

## Updating

```
/plugin marketplace update teknesyum
```
```
/plugin update teknesyum@teknesyum
```

Restart Claude Code afterwards. Your settings in `~/.claude/teknesyum-ui.json` are
preserved across updates.

**Upgrading from 1.x:** agent roles, contract fields, settings keys and the trace folder
were renamed to English in 2.0.0. Projects with open contracts need the frontmatter field
names updated by hand (`rol → role`, `tur → round`, `denetim → audit`,
`dogrulama → verification`, `yan_etki → side_effects`). The old `canli/` trace folder keeps
working — a project that already has one is still written to, so no trace is lost.

---

## Support

<div align="center" role="region" aria-label="Support Teknesyum" style="border:2px solid #00f3ff;border-radius:24px;background:#000000;padding:24px">

<a href="https://github.com/sponsors/Teknesyum"><img src="assets/support.svg" alt="Support Teknesyum — built in spare time, free, MIT" width="100%" style="max-width:1200px;height:auto"></a>

<a href="https://github.com/sponsors/Teknesyum"><img src="assets/badge-sponsor.svg" alt="Support Teknesyum" height="38"></a>
&nbsp;
<a href="LICENSE"><img src="assets/badge-license.svg" alt="License MIT" height="38"></a>

</div>
