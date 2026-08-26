# AGENTS.md

## What this repo is
Centralized, version-controlled OpenCode config: agents, subagents, skills, commands, rules, plugins, MCP servers, and permission rules.

## Setup
- **No secrets.** Never commit tokens, API keys, or credentials. Use env vars or references instead.
- Keep changes minimal — this repo is shared config, not application code.
- Target location for OpenCode to consume: files under `.opencode/` and root-level `opencode.json` / `opencode.jsonc`.
- After cloning, run `mise install` once. It appends `OPENCODE_ENABLE_EXA=1` to `~/.zshrc` (idempotent via marker, safe to re-run, zsh only). Then `source ~/.zshrc` or open a new shell.

## Before editing
- If editing OpenCode itself (opencode.json, .opencode/**, ~/.config/opencode/**), use the `customize-opencode` skill.
- Prefer referencing shared instructions via `opencode.json` `instructions` rather than duplicating prose here.

## When adding config
- Agents/subagents/skills/plugins/MCP servers/permission rules live under `.opencode/`.
- Verify any new agent or skill loads: run `opencode` and confirm it appears.
- Do not introduce build, lint, or test workflows unless the repo actually needs them — currently there are none.
