#!/usr/bin/env bash
# Teknesyum Base
# Install:  curl -fsSL https://raw.githubusercontent.com/Teknesyum/teknesyum-base/main/install.sh | bash
set -e

REPO="Teknesyum/teknesyum-base"
RAW="https://raw.githubusercontent.com/$REPO/main"

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
if command -v node >/dev/null 2>&1; then
  TMP="$(mktemp)"
  curl -fsSL "$RAW/scripts/post-install.js" -o "$TMP"
  node "$TMP"
  rm -f "$TMP"
else
  printf '  Node.js missing - statusline skipped. Run /teknesyum:setup inside Claude Code.\n'
fi
