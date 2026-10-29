<!-- @format -->

# Where knowledge goes

Load this when you have a fact, rule, or pitfall to record. Take the first answer that fits.

1. **Can an agent derive it quickly from the code or a command?** Don't record it.
2. **Is it one-off session state, a task status, or a personal preference?** Don't record it in the repository.
3. **Does a topic or docsite page already own it?** Update that owner. Run `node .agents/knowledge/tools/knowledge.mts find <terms>` to look.
4. **Is it public contributor process, such as releases or backports?** Put it on the docsite, and link to it from a topic.
5. **Is it architecture that upstream documents in a `__docs__` folder?** Link to that file. Never edit it.
6. **Does it explain one piece of code?** Write a code comment.
7. **Must every agent know it in every session, and does it apply across the fork?** Propose an `AGENTS.md` fork rule. This needs maintainer approval, and the block has a strict budget.
8. **Does it matter only while one skill runs?** Put it in that skill's `references/` folder.
9. **Otherwise,** put it in a topic. Use an existing topic in the right domain when one fits; create a topic only when the fact doesn't belong in any existing one.

## Path routing

When a topic matters whenever someone edits certain paths, add a route in `taxonomy.yaml` instead of a new `AGENTS.md` row. Routes generate `.github/instructions/rnmacos-*.instructions.md` pointer files. See [entrypoints](entrypoints.md).

## Conflicts

When two homes disagree, verify against the code or CI, fix the wrong one, and link it to the right one. If you can't tell which is right, leave both, mark the topic `draft`, and report the conflict.
