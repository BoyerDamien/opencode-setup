#!/usr/bin/env bash
# Read-only audit of setup-opencode.sh links and GLOBAL-relative instructions.
# Exit 0 only after both audits succeed; all validation failures exit nonzero.
set -euo pipefail

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
GLOBAL="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"

if [[ ! -d "$GLOBAL" ]]; then
  echo "verify-install: $GLOBAL does not exist — run 'mise install' first" >&2
  exit 1
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "verify-install: python3 is required to validate links and instructions" >&2
  echo "FAIL"
  exit 1
fi

# Keep the same repo-relative source : destination pairs as setup-opencode.sh.
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

# Arguments, not Python source interpolation, preserve arbitrary path quoting.
# Capture the subprocess status explicitly; process substitution would lose it.
if audit="$(python3 - "$REPO_ROOT" "$GLOBAL" "${LINKS[@]}" <<'PY'
import json
import os
import sys

repo, global_dir = sys.argv[1:3]
ok = missing = broken = wrong = 0
print("=== symlink audit ===")
for entry in sys.argv[3:]:
    source, name = entry.split(":", 1)
    src = os.path.join(repo, source)
    dest = os.path.join(global_dir, name)
    if not os.path.lexists(dest):
        print(f"  MISSING  {dest}")
        missing += 1
    elif not os.path.islink(dest):
        print(f"  NOT LINK {dest} (expected -> {src})")
        wrong += 1
    elif not os.path.exists(dest):
        print(f"  BROKEN   {dest} -> {os.readlink(dest)}")
        broken += 1
    elif not os.path.exists(src) or os.path.realpath(dest) != os.path.realpath(src):
        print(f"  WRONG    {dest} -> {os.readlink(dest)} (expected -> {src})")
        wrong += 1
    else:
        print(f"  ok       {dest}")
        ok += 1

print("\n=== instructions audit ===")
inst_ok = inst_missing = errors = 0
config = os.path.join(global_dir, "opencode.json")
try:
    with open(config, encoding="utf-8") as f:
        cfg = json.load(f)
    if not isinstance(cfg, dict):
        raise ValueError("JSON configuration must be an object")
    instructions = cfg.get("instructions", [])
    if not isinstance(instructions, list) or any(
        not isinstance(p, str) or not p.strip() for p in instructions
    ):
        raise ValueError("instructions must be a list of non-empty strings")
    for p in instructions:
        # Preserve the original GLOBAL prefix semantics, even for leading '/'.
        full = global_dir + "/" + p
        if os.path.exists(full):
            print(f"  ok       {p}")
            inst_ok += 1
        else:
            print(f"  MISSING  {p}  (-> {full} does not exist)")
            inst_missing += 1
except (OSError, ValueError) as e:
    print(f"verify-install: failed to read/parse/validate {config}: {e}", file=sys.stderr)
    errors += 1

print("\n---")
print(f"symlinks: ok={ok} missing={missing} broken={broken} wrong={wrong}")
print(f"instructions: ok={inst_ok} missing={inst_missing} errors={errors}")
sys.exit(1 if missing + broken + wrong + inst_missing + errors else 0)
PY
)"; then
  printf '%s\n' "$audit"
  echo "OK"
else
  printf '%s\n' "$audit"
  echo "FAIL"
  exit 1
fi
