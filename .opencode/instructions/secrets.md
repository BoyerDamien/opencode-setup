# Secrets policy

## Rule
Never commit secrets, API keys, tokens, credentials, or any sensitive data to this repo. This applies to all files: `opencode.json`, `tui.json`, `mcp`, `provider`, `agent`, `command`, `skill`, `prompt`, and any file under `.opencode/`.

## How to reference secrets
- **Environment variable**: `"apiKey": "{env:ANTHROPIC_API_KEY}"` — the user sets it in their shell or `~/.config/opencode/opencode.json`.
- **External file**: `"apiKey": "{file:~/.secrets/openai-key}"` — keep secrets outside the repo entirely.
- **Per-user override**: users can extend or override settings via `~/.config/opencode/opencode.json` (global) or per-project overrides — keep this repo generic.

## Before committing
- `git grep -iE 'sk-[a-z0-9]{20,}|api[_-]?key|token|secret|password|bearer'` must return nothing.
- Never paste real keys in examples, tests, or commit messages.
