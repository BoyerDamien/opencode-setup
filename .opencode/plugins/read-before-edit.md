# Read-before-edit (OpenCode 2.4.1)

This plugin helps agents read existing files before using `edit`, `write` or
`patch`. It is a workflow guard, **not a concurrent filesystem security boundary**.
Shell commands, custom tools and direct filesystem APIs are outside its scope.

## Reads and paths

Only completed file reads count. Listings, grep/glob and failed reads do not.
Paths resolve against each session's current `location.directory`, including
worktrees, then through symlinks. Agents in the same plugin runtime share read
state; unload/reload requires rereading. Separate locations have separate runtimes.
`OPENCODE_READ_B4_EDIT_DISABLE=1` disables registration during setup.

## Patch grammar

`read-before-edit-patch.mjs` validates the entire patch before checking targets.
It follows the installed 2.4.1 parser's LF splitting, CRLF normalization, heredoc
envelopes, header trimming, move destinations and update-body context rules.
Embedded U+2028/U+2029/CR characters in filenames remain part of the filename.
Unknown or malformed operations are refused, not silently skipped.

The helper is `.mjs` because V2 auto-discovers direct `.js`/`.ts` plugin files.
Keeping it beside the entrypoint also works through the global plugins symlink.

## Global/local discovery

Setup links `~/.config/opencode/plugins` to this repository's `.opencode/plugins`.
Inside this repository V2 sees two literal source paths with the same plugin ID.
Its supervisor activates the first and reports the second as a failed duplicate.
The remaining instance still guards this location; this is not a process-wide
singleton guarding every other location.

The repository-only `.opencode/opencode.json` denies the **global alias** with
`plugin.use` resource `*/opencode/plugins/read-before-edit.js`. The local path
contains `/.opencode/plugins/`, so it does not match. The local copy remains
active, even in a clone without global installation. Other projects still use
their globally discovered copy. The setup script does not link this local config.

Unlike this source-path policy, `plugins: ["-read-before-edit"]` disables all
copies by ID and is not a safe deduplication solution. Renaming IDs would run
two guards rather than remove the duplicate. Editing root `opencode.json` would
also edit the globally symlinked configuration; use the repository-local file.

If a custom config directory does not end in `/opencode`, the policy may miss
its alias; strict integration testing will report the duplicate. Additional
local policies can also disable plugins. Check each location's plugin inventory.

## Concrete concurrency limitation

1. Call A passes its `execute.before` check for absent `race.txt`.
2. Call B creates `race.txt` before A executes, without reading it.
3. A's executor overwrites this now-existing unread file.

The installed binary runs the tool hook before invoking the executor. Its
internal `FileMutation.withLock` serializes the operations using it (edit/patch),
but is not exposed in the documented V2 plugin context. `ctx.tool.transform` can wrap executors,
but a plugin-owned mutex would not share the core lock across runtimes/direct
filesystem operations and would not make these checks atomic with all writers.
No such misleading mutex is added. Symlink retargeting after the hook has the
same limitation. The concurrency test deliberately records this known gap.

An atomic guarantee requires upstream support for validation under the same
mutation exclusion, or a larger execution-policy redesign; this plugin does
not claim that guarantee.

## Verification

```sh
node --test
OPENCODE_INTEGRATION=1 node --test
```

The optional smoke test only reads an already-running managed service and
requires exactly one active instance, with no failed duplicate. The optional
grammar test extracts the installed 2.4.1 parser into an isolated JS context;
no tools or mutations run. Other tests use disposable temporary fixtures.

Sources:
- <https://opencode.ai/docs/build/plugins/server>
- <https://opencode.ai/docs/plugins>
- <https://opencode.ai/docs/policies>
- Installed 2.4.1 `PluginSupervisor.resolve`, `FileMutation`, `Xue/E/R` parser.
