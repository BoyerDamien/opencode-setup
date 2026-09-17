---
name: local-memory-retrieve
description: 'Search the local cross-project memory (~/.memory/entries/) for research findings or lessons already captured, by keyword/tags/type. Use before starting new research, before brainstorming on a topic, or as the internal search step of local-memory-learn. Trigger words: "check memory", "have we looked into this before", "search local memory", "~/.memory".'
---

# local-memory-retrieve

Searches `~/.memory/entries/` for entries matching a query. Cheap by design: lexical search (`rg`), bounded extraction per result — never a full-corpus read.

## Parameters

- `query` (required): free-text keywords, `|`-separated for the underlying search.
- `tags` (optional): array of tags to filter on, e.g. `["opencode", "memory"]`.
- `type` (optional): `research` or `lesson`.
- `limit` (optional, default `10`): max number of results.
- `mode` (optional, default `preview`): `preview` returns compact results only; `full` also returns full file content for each result.

## Output

A list of `{file, title, summary, tags}` per match (mode `preview`), or the same objects plus `content` (mode `full`). An empty list is a valid, non-error result.

## Algorithm

1. **Bootstrap check.** If `~/.memory/entries/` does not exist, return an empty list immediately — do not error, do not create it (only `local-memory-save` creates it).

2. **Candidate files by query.** Build an OR-pattern from the query keywords:

   ```bash
   rg -l -i "keyword1|keyword2|keyword3" ~/.memory/entries/ 2>/dev/null
   ```

3. **Narrow by `tags`, if given.** For each tag, require the frontmatter `tags:` line to contain it:

   ```bash
   rg -l "tags:.*\btag1\b" ~/.memory/entries/ 2>/dev/null
   ```

   Keep only files present in both this list and the query candidates from step 2.

4. **Narrow by `type`, if given.**

   ```bash
   rg -l "^type: research" ~/.memory/entries/ 2>/dev/null
   ```

   Intersect again with the running candidate set.

5. **Cap at `limit`.** Sort remaining candidates by filename descending (the `YYYY-MM-DD-` prefix makes this most-recent-first) and keep the first `limit`.

6. **Extract preview per candidate.** For each kept file, read only the first 15 lines:

   ```bash
   sed -n '1,15p' <file>
   ```

   From these lines, pull the `title:` frontmatter value, the `tags:` frontmatter value, and the `> **Summary:** ...` blockquote text (it may span 1-2 lines).

7. **Mode `full`:** additionally read the whole file and attach it as `content` on that result.

8. Return the list of results.

## Notes for callers

- Never assume `~/.memory` exists — always handle the empty/missing case per step 1.
- Cost is proportional to `limit`, not to the number of files in `~/.memory` — `rg -l` scales fine on its own; only the per-file extraction in step 6 needs to stay capped.
