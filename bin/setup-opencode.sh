#!/usr/bin/env bash
# Symlinks repo files into ~/.config/opencode/ so OpenCode can discover them
# globally (regardless of CWD or walk-up). Idempotent.
#
# Usage:
#   bin/setup-opencode.sh              install (default)
#   bin/setup-opencode.sh --uninstall  remove symlinks created by install
#   bin/setup-opencode.sh --force      overwrite non-symlink targets (backs them up)
#   bin/setup-opencode.sh --purge      also remove backup .bak files on uninstall
#
# Each symlink target is verified against the repo before being created/removed,
# so uninstall is safe even if the user manually messed with ~/.config/opencode.
set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
GLOBAL="${XDG_CONFIG_HOME:-$HOME}/opencode"

# repo-relative source : destination name in ~/.config/opencode/
LINKS=(
  "opencode.json:opencode.json"
  "agent-lsp.json:agent-lsp.json"
  "tui.json:tui.json"
  "AGENTS.md:AGENTS.md"
  ".opencode/agents:agents"
  ".opencode/commands:commands"
  ".opencode/instructions:instructions"
  ".opencode/plugins:plugins"
  ".opencode/prompts:prompts"
  ".opencode/skills:skills"
)

MODE="install"
FORCE="false"
PURGE="false"

for arg in "$@"; do
  case "$arg" in
  --uninstall) MODE="uninstall" ;;
  --force) FORCE="true" ;;
  --purge) PURGE="true" ;;
  -h | --help)
    sed -n '2,12p' "${BASH_SOURCE[0]}"
    exit 0
    ;;
  *)
    echo "setup-opencode: unknown argument: $arg" >&2
    exit 2
    ;;
  esac
done

if [[ $EUID -eq 0 ]]; then
  echo "setup-opencode: skipping (running as root)" >&2
  exit 0
fi

# Resolve symlink target (handles relative paths) to absolute path
resolve() {
  local target="$1"
  if [[ -L "$target" ]]; then
    local link
    link="$(readlink "$target")"
    if [[ "$link" = /* ]]; then
      printf '%s\n' "$link"
    else
      (cd -- "$(dirname -- "$target")" && printf '%s/%s\n' "$(pwd)" "$link")
    fi
  else
    printf '%s\n' "$target"
  fi
}

backup_dir="$GLOBAL/.bak"
mkdir -p "$GLOBAL" "$backup_dir"

created=0
skipped=0
updated=0
removed=0

for entry in "${LINKS[@]}"; do
  src="$REPO_ROOT/${entry%%:*}"
  dest="$GLOBAL/${entry##*:}"

  if [[ ! -e "$src" && ! -L "$src" ]]; then
    echo "setup-opencode: skip $dest (source $src does not exist)" >&2
    skipped=$((skipped + 1))
    continue
  fi

  if [[ "$MODE" == "install" ]]; then
    if [[ ! -e "$dest" && ! -L "$dest" ]]; then
      ln -s "$src" "$dest"
      echo "linked $dest -> $src"
      created=$((created + 1))
    elif [[ -L "$dest" ]] && [[ "$(resolve "$dest")" == "$src" ]]; then
      : # already correct, no-op
    elif [[ -L "$dest" && ! -e "$dest" ]]; then
      echo "setup-opencode: $dest is a broken symlink, replacing"
      rm "$dest"
      ln -s "$src" "$dest"
      updated=$((updated + 1))
    else
      if [[ "$FORCE" == "true" ]]; then
        ts="$(date +%Y%m%d-%H%M%S)"
        mv "$dest" "$backup_dir/${entry##*:}.$ts"
        ln -s "$src" "$dest"
        echo "setup-opencode: backed up $dest -> $backup_dir/${entry##*:}.$ts, then linked"
        updated=$((updated + 1))
      else
        echo "setup-opencode: $dest exists and is not a symlink to $src — refusing (use --force)" >&2
        skipped=$((skipped + 1))
      fi
    fi
  else # uninstall
    if [[ -L "$dest" ]] && [[ "$(resolve "$dest")" == "$src" ]]; then
      rm "$dest"
      echo "removed $dest"
      removed=$((removed + 1))
    elif [[ -e "$dest" || -L "$dest" ]]; then
      echo "setup-opencode: $dest is not a symlink to this repo — skipping (would not delete)" >&2
      skipped=$((skipped + 1))
    fi
  fi
done

# --purge: also remove backups from a previous --force install
if [[ "$MODE" == "uninstall" && "$PURGE" == "true" && -d "$backup_dir" ]]; then
  purged=$(find "$backup_dir" -mindepth 1 -maxdepth 1 | wc -l)
  find "$backup_dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  echo "purged $purged backup file(s) from $backup_dir"
fi

echo "---"
case "$MODE" in
install)
  echo "Done. created=$created updated=$updated skipped=$skipped"
  [[ $skipped -gt 0 ]] && exit 1 || exit 0
  ;;
uninstall)
  echo "Done. removed=$removed skipped=$skipped"
  [[ $skipped -gt 0 ]] && exit 1 || exit 0
  ;;
esac
