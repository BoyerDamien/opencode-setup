#!/usr/bin/env bash
# Idempotent: ensures OPENCODE_ENABLE_EXA=1 is exported in ~/.zshrc
set -euo pipefail

if [[ $EUID -eq 0 ]]; then
  echo "setup-zshrc: skipping (running as root)" >&2
  exit 0
fi

case "${SHELL:-}" in
  */zsh) ;;
  *)
    echo "setup-zshrc: skipping (shell=${SHELL:-unset}, expected zsh)" >&2
    exit 0
    ;;
esac

ZSHRC="${ZDOTDIR:-$HOME}/.zshrc"
MARKER='# opencode-setup:websearch'
BLOCK="$MARKER
export OPENCODE_ENABLE_EXA=1
# opencode-setup:end"

if [[ ! -f "$ZSHRC" ]] || ! grep -Fq "$MARKER" "$ZSHRC"; then
  {
    echo ""
    echo "$BLOCK"
  } >> "$ZSHRC"
  echo "Added OPENCODE_ENABLE_EXA=1 to $ZSHRC"
else
  echo "$ZSHRC already configured"
fi
