<!-- @format -->

# Audit

Load this for a periodic review, after an upstream merge, or when guidance seems stale. Run it at least every 45 days.

1. Run the reports:

   ```sh
   node .agents/knowledge/tools/knowledge.mts report --stale --budget
   node .agents/knowledge/tools/knowledge.mts report --similar
   node .agents/knowledge/tools/knowledge.mts report --stale --online   # also checks watched PRs with gh
   ```

2. For each stale topic, re-check its sources. Fix what changed, set `verified` to today, and change `draft` to `active` once every claim is verified.
3. For each watched PR or issue that closed or merged, re-verify the facts that depend on it.
4. For near-duplicate text, keep one copy and link to it. Pairs that only share wording can stay.
5. For anything over 80% of budget, split it or move detail into a skill reference.
6. Check that each skill still triggers from a plain-language request and that the `AGENTS.md` load-on-demand table still matches common tasks.
7. Set `audited` in `taxonomy.yaml` to today, follow [validation](validation.md), and open one PR with the results.
