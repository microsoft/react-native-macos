<!-- @format -->

# Changing the taxonomy

Load this when you add, split, merge, rename, deprecate, or retire a topic, or change a domain. Topic IDs are permanent addresses: other topics, routes, and skills link to them.

## Operations

| Operation      | Steps                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a topic    | Copy [the topic template](../assets/topic.template.md) into the domain folder. Use `status: draft` until every claim is verified.                          |
| Split a topic  | Keep the original ID on the part most links need. Give the new part a new ID, move its rules with new rule IDs, and add the old rule IDs to `retired_ids`. |
| Merge topics   | Keep one ID. Add `<old id>: <kept id>` to `redirects`, then delete the other file.                                                                         |
| Rename or move | Add `<old id>: <new id>` to `redirects`. Update every `requires`, `related`, and route that used the old ID.                                               |
| Deprecate      | Set `status: deprecated` and say what replaces it. The index stops listing it, and routes can't target it.                                                 |
| Retire         | Delete the file, and add its ID to `retired_ids` so nothing reuses it.                                                                                     |
| Add a domain   | Needs maintainer approval. Add it under `domains` with a one-line description.                                                                             |

After any operation, run `node .agents/knowledge/tools/knowledge.mts index --write`, then follow [validation](validation.md).

## Routes

Each entry in `routes` has `name`, `description`, `applyTo`, and `topics`. Write `applyTo` as a list of globs without braces; each glob must match at least one tracked file. Routes can target only active topics.

## Audit date

`audited` in `taxonomy.yaml` records the last full review. Update it only after you run the [audit](audit.md).
