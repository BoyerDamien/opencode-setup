---
name: local-memory-save
description: Write a new entry to the local cross-project memory (~/.memory/entries/) — use after finishing a research task, a development branch, or a brainstorming session that produced a reusable fact or lesson. Always checks for contradictions via local-memory-learn before writing. Trigger words: "save this to memory", "capitalize this", "remember this for other projects", "add to local memory".
---

# local-memory-save

Writes a curated entry to `~/.memory/entries/`. Every write is validated by the user before it exists on disk, and is checked for contradictions via `local-memory-learn` first.

## File format

Filename: `~/.memory/entries/YYYY-MM-DD-<keyword-slug>.md` — the slug must carry the searchable terms (not just the date).

Template:

```markdown
---
title: <short descriptive title>
type: research   # research | lesson
tags: [tag1, tag2]   # 2-4 tags, lowercase, kebab-case
source_project: <repo/project this came from>
date: YYYY-MM-DD
---

# <same as title>

> **Summary:** one sentence, spelling out synonyms explicitly (e.g. "k8s/kubernetes")
> — this is the retrieval hook; without a clear summary the entry is never found again.

## Why / What / Lesson (pick a heading that fits this entry)

- [decision] ... #tag
- [fact] ... #tag
- [lesson] ... #tag

## Relations (optional)

- related_to [[Another Entry Title]]
- supersedes [[Old Entry Title]]
```

Non-negotiable constraints:
1. One entry = one fact / one lesson / one problem-solution pair — never split by size alone.
2. The summary blockquote goes right after the H1, with synonyms spelled out in plain text (retrieval today is lexical — exact match only).
3. 2-4 tags, lowercase, kebab-case.
4. Target ~60-80 lines per entry.

## Algorithm

1. **Draft the entry** from the checkpoint's content (research findings, a lesson from a finished branch, a brainstorming insight), following the template above.

2. **Bootstrap `~/.memory` if needed.** If `~/.memory/entries/` doesn't exist yet:

   ```bash
   mkdir -p ~/.memory/entries
   git -C ~/.memory init
   ```

3. **Call `local-memory-learn`** with the draft's `tags` and summary.

4. **Act on `learn`'s verdict:**
   - `recommendation: "write"` → show the draft to the user, let them validate or edit it, then write it and go to step 5.
   - `recommendation: "discard"` → do not write anything; tell the user the existing entry was kept as-is, and stop.
   - `recommendation: "supersede"` → add `- supersedes [[<old title>]]` to the draft's `## Relations` section, show it to the user for final validation, then write it and go to step 5.
   - `recommendation: "merge"` → replace the draft's body with `merged_content` (keep the frontmatter), add the `supersedes` relation to the old entry, show it to the user for final validation, then write it and go to step 5.

5. **Write and commit:**

   ```bash
   git -C ~/.memory add entries/<filename>.md
   git -C ~/.memory commit -m "save: <title>"
   ```

6. Report the file path to the user.
