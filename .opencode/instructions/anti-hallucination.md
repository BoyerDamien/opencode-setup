# Anti-hallucination patterns for coding agents

Compiled from empirical research (Vercel 524pts HN, Augment 142pts, arxiv
2602.11988 from ETH SRI Lab) and vendor best practices (Anthropic, Cursor,
Aider, OpenAI Codex).

## 1. Retrieval-led reasoning directive

The single most impactful line you can put in any context file. Forces the
agent to consult provided docs/files before relying on training data, which
is always stale.

```
IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning
for any task in this repository.
```

Source: Vercel eval showed this exact phrasing + an 8KB docs index lifted
pass rate from 53% to 100% on Next.js 16 APIs that were not in model
training data.

## 2. Decision tables resolve ambiguity before code is written

When the codebase has 2-3 reasonable ways to do something, force the
choice up front with a table. The agent reads the table once instead of
guessing and inventing a hybrid.

Example for this repo (which bash invocation to use):

| Situation                     | Use                       |
| ----------------------------- | ------------------------- |
| Idempotent setup script       | the script directly       |
| One-off host-file patch       | the heredoc version       |
| Already-installed via         | skip, print "configured"  |

## 3. Real-code examples, 3-10 lines max

Snippets copied from the actual repo. Anything longer makes the agent
pattern-match on the wrong thing (Augment observed this empirically).

Good example from this repo (`bin/setup-opencode.sh:1`):

```bash
#!/usr/bin/env bash
set -euo pipefail
```

Good example from this repo (`bin/setup-opencode.sh:resolve symlink`):

```bash
resolve() {
  local p="$1"
  while [[ -L "$p" ]]; do
    p="$(readlink "$p")"
  done
  printf '%s\n' "$p"
}
```

Bad example: a 40-line snippet showing the entire function. The agent will
fixate on the irrelevant parts.

## 4. "Don't" must be paired with a "Do"

A bare prohibition makes the agent cautious and exploratory. Pair every
prohibition with a concrete alternative so the agent knows what to do.

| Don't                                | Do                                                       |
| ------------------------------------ | -------------------------------------------------------- |
| Don't modify secrets.md              | Add new secrets policy in a new file under instructions/ |
| Don't add commit hooks without asking  | Ask first; never assume mise hook ordering               |
| Don't bump dependencies silently  | Run `mise install` and commit the lockfile update          |

## 5. Procedural workflows for multi-step tasks

Numbered steps reduce missing files and forgotten constraints. Augment
measured missing-wiring-files dropping from 40% to 10% with a 6-step
deploy workflow.

Example: adding a new instruction file

1. Create the file under `.opencode/instructions/<name>.md`.
2. Add the path to `opencode.json` `instructions` array.
3. Verify the file loads: run `opencode` in TUI, the file should appear
   in the loaded instructions.
4. Commit with message `docs(instructions): add <name>`.

## 6. Domain-specific rules

Generic advice ("write good code") is useless. Specific rules catch real
bugs.

For this repo:

- Never commit secrets. Use `{env:VAR}` or `{file:path}` references.
- Never add build, lint, or test workflows unless the repo actually
  needs them. Currently there are none.
- Never modify `secrets.md` from an agent context; it is the policy.
- Idempotent scripts only: every setup script must be re-runnable without
  side effects beyond the intended change.

## 7. Test before claiming "done"

Anthropic best practice: ask the agent to self-verify before returning.
For this repo the equivalent is to run `bash -n` on shell scripts and
`git grep` for secrets before commit.

## 8. Quote before answering

When citing patterns or sources, quote the actual phrase. Do not paraphrase
training-data memory. This is the retrieval-led principle applied to the
agent's own output.

## Anti-patterns to avoid

These were measured to hurt performance:

- **Repository overview**: arxiv 2602.11988 found arch-overview sections
  provide zero perf gain while increasing cost 20%. Do not write one.
- **>150 line files**: Augment observed gains invert beyond that length.
  Move detail into referenced files.
- **LLM-generated context files**: arxiv found they underperform human
  ones by 7pp on average. Write by hand, keep short.
- **15+ bare "don'ts"**: Augment observed agent paralysis, +25% cost,
  -20% completeness.
- **"Do not hallucinate"**: a single-line directive with no structure.
  Meme-tier. Does not reduce hallucinations.