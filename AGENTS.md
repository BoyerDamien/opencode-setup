# AGENTS.md

## What this repo is
Centralized, version-controlled OpenCode config: agents, subagents, skills, commands, rules, plugins, MCP servers, and permission rules.

## Setup
- **No secrets.** Never commit tokens, API keys, or credentials. Use env vars or references instead.
- Keep changes minimal — this repo is shared config, not application code.
- Target location for OpenCode to consume: files under `.opencode/` and root-level `opencode.json` / `opencode.jsonc`.
- After cloning, run `mise install` once. It runs two idempotent scripts:
  - `bin/setup-zshrc.sh` appends `OPENCODE_ENABLE_EXA=1` to `~/.zshrc` and `~/.zshenv` (marker-based, safe to re-run, zsh only).
  - `bin/setup-opencode.sh` symlinks the repo's config into `~/.config/opencode/` so OpenCode can discover it from any directory.
  Then `source ~/.zshrc` or open a new shell.

## Before editing
- If editing OpenCode itself (opencode.json, .opencode/**, ~/.config/opencode/**), use the `customize-opencode` skill.
- Prefer referencing shared instructions via `opencode.json` `instructions` rather than duplicating prose here.

## When adding config
- Agents/subagents/skills/plugins/MCP servers/permission rules live under `.opencode/`.
- Verify any new agent or skill loads: run `opencode` and confirm it appears.
- Do not introduce build, lint, or test workflows unless the repo actually needs them — currently there are none.

## Reducing agent hallucinations

This repo uses empirically-validated patterns to reduce LLM hallucinations
in code generation tasks. Full details and sources in
`.opencode/instructions/anti-hallucination.md`. The core rules:

- Prefer **retrieval-led reasoning over pre-training-led reasoning** —
  consult files in the repo before relying on training data.
- Use **decision tables** for ambiguity (multiple reasonable approaches).
- Use **real-code examples** of 3-10 lines, copied from this repo.
- Pair every **"Don't"** with a **"Do"**.
- For multi-step tasks, write **numbered procedural workflows**.
- **Test before claiming done** (`bash -n` on shell scripts, `git grep` for
  secrets).
- **Quote sources** when citing patterns or numbers; do not paraphrase
  from memory.

Explicitly avoided (measured to hurt performance in arxiv 2602.11988 and
Augment's internal study):

- Repository arch overview sections
- Files longer than 150 lines
- LLM-generated context files
- Bare "don'ts" without paired "dos"
- One-line "do not hallucinate" directives

## Model tiers

Three agents map to three Ollama Cloud models. Switch with Tab in the TUI
(primary agents) or mention with `@<name>` (subagents).

| Agent   | Model                            | Tier (Anthropic-equiv) | Use for                                                 |
| ------- | -------------------------------- | ---------------------- | ------------------------------------------------------- |
| `main`  | `ollama-cloud/deepseek-v4-pro`   | Sonnet                 | Default — everyday coding, edits, multi-step work      |
| `fast`  | `ollama-cloud/deepseek-v4-flash` | Haiku                  | Trivial tasks: lookups, renames, one-line answers       |
| `heavy` | `ollama-cloud/kimi-k3`           | Opus                   | Long-horizon reasoning, architecture, deep refactors    |

Decision table:

| Situation                                  | Use                       |
| ------------------------------------------ | ------------------------- |
| One-line answer, rename, status check      | `@fast`                   |
| Regular coding, multi-file edits           | `@main` (or just default) |
| Deep refactor, architecture analysis       | `@heavy`                  |
| Conceptual explanation asked by user       | `@heavy`                  |

Reserve `kimi-k3` for genuinely heavy tasks — it is the most expensive of
the three. Default to `@main` unless the task clearly requires more depth.
