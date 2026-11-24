// Supporting .mjs module: V2 auto-discovers only direct .js/.ts plugin files.
// Target scanner for OpenCode 2.4.1's effective patch grammar (Xue/E/R).
// Parse the entire input before authorizing anything. Unknown operations fail
// closed; context/data lines are not headers. LF separates lines, not U+2028/29.
const prefixes = ["*** Add File: ", "*** Delete File: ", "*** Update File: "];
const boundary = (line) => line === "*** End Patch" || prefixes.some((prefix) => line.startsWith(prefix));
const fail = () => { throw new Error("read-before-edit: unsupported or malformed patch operation"); };

export function patchTargets(text) {
  if (typeof text !== "string" || !text) fail();
  // OpenCode also accepts a heredoc envelope. Match its exact unwrapping rule.
  const unwrapped = text.trim().match(/^(?:cat\s+)?<<(['"]?)(\w+)\1\s*\n([\s\S]*?)\n\2\s*$/)?.[3] ?? text.trim();
  const lines = unwrapped.split("\n").map((line) => line.endsWith("\r") ? line.slice(0, -1) : line);
  const end = lines.length - 1;
  if (lines[0]?.trim() !== "*** Begin Patch" || lines[end]?.trim() !== "*** End Patch" || end < 1) fail();
  const targets = [];
  let cursor = 1;
  const target = (line, prefix) => {
    const filename = line.slice(prefix.length).trim();
    if (!filename) fail();
    targets.push(filename);
  };
  while (cursor < end) {
    const header = lines[cursor].trim();
    if (cursor === 1 && header.startsWith("*** Environment ID:") && header.slice(19).trim()) {
      cursor++;
      continue;
    }
    const prefix = prefixes.find((value) => header.startsWith(value));
    if (!prefix) fail();
    target(header, prefix);
    cursor++;
    if (prefix === prefixes[0]) {
      while (cursor < end && !boundary(lines[cursor].trim())) {
        if (!lines[cursor].startsWith("+")) fail();
        cursor++;
      }
      continue;
    }
    if (prefix === prefixes[1]) {
      if (cursor < end && !boundary(lines[cursor].trim())) fail();
      continue;
    }
    // Update headers may precede Move to with End of File markers.
    while (lines[cursor]?.trimEnd() === "*** End of File") cursor++;
    const move = lines[cursor]?.trimEnd();
    if (move === "*** Move to:" || move?.startsWith("*** Move to: ")) {
      target(move, "*** Move to:");
      cursor++;
    }
    let chunkLines = null;
    let eof = false;
    while (cursor < end) {
      const line = lines[cursor];
      const trimmed = line.trimEnd();
      const chunk = trimmed === "@@" || trimmed.startsWith("@@ ");
      if (eof) {
        if (!trimmed) { cursor++; continue; }
        if (chunk) eof = false;
        else if (boundary(trimmed)) break;
        else fail();
      }
      if (trimmed === "*** End of File") {
        if (chunkLines === 0) fail();
        if (chunkLines !== null) eof = true;
        cursor++;
        continue;
      }
      if (boundary(trimmed)) break;
      if (chunk) {
        if (chunkLines === 0) fail();
        chunkLines = 0;
      } else {
        if (line !== "" && ![" ", "+", "-"].some((value) => line.startsWith(value))) fail();
        chunkLines = (chunkLines ?? 0) + 1;
      }
      cursor++;
    }
    if (!chunkLines) fail();
  }
  if (!targets.length) fail();
  return targets;
}
