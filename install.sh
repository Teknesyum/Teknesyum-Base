#!/usr/bin/env bash
# Teknesyum Base
# Install:  curl -fsSL https://raw.githubusercontent.com/Teknesyum/teknesyum-base/v2.62.0/install.sh | bash
set -e

REPO="Teknesyum/teknesyum-base"
CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"

printf '\n  Teknesyum Base\n\n'

if ! command -v claude >/dev/null 2>&1; then
  printf '  Claude Code not found. Install it first: curl -fsSL https://claude.ai/install.sh | bash\n'
  exit 1
fi

printf '  [1/3] Adding marketplace...\n'
claude plugin marketplace add "$REPO"

printf '  [2/3] Installing plugin...\n'
claude plugin install teknesyum@teknesyum

printf '  [3/3] Linking statusline and habits file...\n'
if ! command -v node >/dev/null 2>&1; then
  printf '  Node.js missing - statusline skipped. Run /teknesyum:setup inside Claude Code.\n'
  exit 0
fi

# The post-install step runs from the package that was just installed, never from a
# separately downloaded copy: a tagged plugin used to pull whatever `main` held that day.
POST=""
for BASE in "$CFG/plugins/cache/teknesyum/teknesyum" "$CFG/plugins/teknesyum/teknesyum"; do
  [ -d "$BASE" ] || continue
  VER="$(ls -1 "$BASE" 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -t. -k1,1n -k2,2n -k3,3n | tail -1)"
  [ -n "$VER" ] || continue
  if [ -f "$BASE/$VER/scripts/post-install.js" ]; then
    POST="$BASE/$VER/scripts/post-install.js"
    break
  fi
done

if [ -n "$POST" ]; then
  node "$POST"
else
  printf '  Installed plugin not found on disk - run /teknesyum:setup inside Claude Code.\n'
fi
