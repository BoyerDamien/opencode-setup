#!/usr/bin/env bash
# Idempotent: ensures OPENCODE_ENABLE_EXA=1 is exported in ~/.zshrc and ~/.zshenv
# ~/.zshrc  : sourced for interactive zsh shells
# ~/.zshenv : sourced for all zsh shells (interactive, non-interactive, sub-processes)
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

MARKER='# opencode-setup:websearch'
BLOCK="$MARKER
export OPENCODE_ENABLE_EXA=1
# opencode-setup:end"

# Files to patch: $ZDOTDIR/.zshrc if ZDOTDIR set, else $HOME/.zshrc.
# ~/.zshenv always lives at $HOME/.zshenv (zsh never honors ZDOTDIR for zshenv).
TARGETS=(
  "${ZDOTDIR:-$HOME}/.zshrc"
  "${HOME}/.zshenv"
)

for TARGET in "${TARGETS[@]}"; do
  if [[ ! -f "$TARGET" ]] || ! grep -Fq "$MARKER" "$TARGET"; then
    {
      echo ""
      echo "$BLOCK"
    } >> "$TARGET"
    echo "Added OPENCODE_ENABLE_EXA=1 to $TARGET"
  else
    echo "$TARGET already configured"
  fi
done
