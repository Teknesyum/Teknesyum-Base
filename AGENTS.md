# Teknesyum Base

Windows desktop app (Tauri 2 + React + TypeScript) to browse, install, update and remove
the programs published in a GitHub account. Default account: Teknesyum.

- `src/` React UI. Colours, sizes and motion come only from `teknesyum-ui/css/theme.css` (`--tk-*`).
- `src/api/types.ts` is the contract between UI and Rust commands.
- `src-tauri/src/` Rust: GitHub client, cache, settings, installer.
- Two builds: normal (public repos) and `--features pro` (private repos, read-only token).
- Every repo may carry a `teknesyum.json` manifest describing how it installs.
- Git content is English. Working papers live in ignored paths (`docs/plan.md`, `tmp/`).
- Finished files move to `trash/`, never deleted.

Run: `npm run tauri dev` · Build: `npm run tauri build`
