// Native compaction owns timing; this plugin only augments its prompt.
export default {
  id: "auto-compact",
  async setup({ session }) {
    session.hook("compaction", (event) => {
      event.system.push({
        type: "text",
        text: "Preserve: architectural decisions, unresolved bugs, TODOs, " +
          "project conventions agreed in this conversation and not already recorded on disk, " +
          "and the state of modified files. " +
          "Discard: redundant tool outputs, debug messages, and content " +
          "already reflected in the files on disk.",
      });
    });
  },
};
