---
description: "Consolidate redundant ~/.memory entries sharing a given tag into one denser entry, after showing a diff and getting explicit approval. Destructive — deletes the source entries once merged. Usage: /local-memory-dream <tag>"
agent: controller
---

The user invoked `/local-memory-dream` with tag: $ARGUMENTS

Follow this algorithm exactly. Never skip the validation step — this operation deletes files.

1. **List entries for this tag.**

   ```bash
   rg -l "tags:.*\b$ARGUMENTS\b" ~/.memory/entries/ 2>/dev/null
   ```

   If fewer than 2 files match, tell the user there's nothing to consolidate for this tag and stop. Note: `$ARGUMENTS` is inserted directly into this regex — safe only because `local-memory-save` constrains tags to lowercase kebab-case; do not pass unvalidated external input as the tag.

2. **Read every matching file in full.**

3. **Judge redundancy by reading**, not by grep: which of these entries genuinely overlap (the same fact/lesson stated more than once, or entries that are really fragments of one bigger picture)? Group overlapping entries; entries with no overlap are left untouched.

4. **For each redundant group, draft one consolidated entry** following the standard format (see `local-memory-save`'s template) that keeps every distinct fact/decision/lesson from the sources — condensing prose, not deleting information.

5. **Show the diff**: list the source files (title + path) on one side, the proposed consolidated entry on the other, so the user can compare line by line.

6. **Wait for explicit validation.** Do not write or delete anything until the user approves. If the user requests changes, revise and show the diff again.

7. **On approval, for each validated group:**

   - Write the consolidated entry (filename `YYYY-MM-DD-<slug>.md`, standard format).
   - Remove the source entries, using the literal path prefix so the permission rule matches:

     ```bash
     rm ~/.memory/entries/<source-file-1>.md
     rm ~/.memory/entries/<source-file-2>.md
     ```

   - Commit:

     ```bash
     git -C ~/.memory add entries/
     git -C ~/.memory commit -m "dream: consolidate <tag> entries into <new title>"
     ```

8. Report to the user which files were merged, into which new file, and that the change can be undone via `git -C ~/.memory log` / `git -C ~/.memory revert` if needed.
