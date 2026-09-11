---
name: my-prs-list
description: Show a status board of the open pull requests you authored, with their review state, checks, merge state and stack topology. Use when the user asks "what's the status of my PRs", "my open PRs", "which of my PRs are approved", "who hasn't reviewed my PRs yet", "my PR board", "/pull-request:my-prs-list", or wants to see PRs they created rather than ones awaiting their review. Covers every repository by default; groups stacked PR chains under their parent.
---

# my-prs-list

Produce a status board of every open PR the user authored. This is the counterpart to
`to-review-list`: that one answers "what must I review", this one answers "where do my
own PRs stand".

It is a **board, not a queue** — it reports state and never ranks the rows or tells the
user what to do next.

## Inputs this skill resolves

None. `author:@me` is self-scoping, so a bare run is complete. There are no team slugs,
no memory to recall, and nothing to configure.

## Procedure

1. **Run the script:**
   ```bash
   python3 "$CLAUDE_PLUGIN_ROOT/skills/my-prs-list/scripts/my_prs_list.py" \
     [--repo <owner/repo>] [--org <slug> …] [--json]
   ```
   (`$CLAUDE_PLUGIN_ROOT` is provided by the plugin runtime.)
2. **Render** the script's markdown verbatim in your reply — one table per repository,
   preceded by its heading, plus the closing count line.
3. Add **one** short factual line after the board pointing at what the numbers already
   say (e.g. which chain is blocked on a conflict, which PR nobody has been asked to
   review). One line only; the board carries the detail. Do not re-rank the rows or
   invent a to-do list.
4. If the script prints "No open pull requests authored by you", say so plainly instead
   of rendering an empty table.

## Reading the board

| Column | Meaning |
|---|---|
| `Date` | When the PR was opened. |
| `PR` | Linked PR number. |
| `Title` | PR title. `└` indentation means the PR is stacked on the row above it; `_(draft)_` marks a draft. |
| `Base` | The base branch for a root PR, or `↑ #N` when the base is another of your open PRs. |
| `Review` | GitHub's review decision plus who produced it, or who has been asked (`nobody asked` when no reviewer is assigned). |
| `Waiting` | Days since the PR last saw activity. |
| `Checks` | Check rollup. `(stale)` means the result predates a merge conflict, so it is a leftover rather than a verdict. |
| `Merge` | Mergeability: `clean`, `behind`, `blocked`, `unstable`, `CONFLICTS`. |

Rows are grouped per repository, then by ticket key — but a group label appears only when
it groups something (a multi-PR ticket or a stack). A `┄ branch _(no open PR)_` row is the
base branch of a stack whose own PR is not open, e.g. a collective branch that has not been
raised yet; its chain hangs underneath it.

## Flags

| Flag | Effect |
|------|--------|
| _(default)_ | Every open PR you authored, in every repository you have access to. Drafts included. |
| `--repo OWNER/NAME` | Only this repository. |
| `--org SLUG` | Only this organisation. Repeatable. |
| `--json` | Structured output: a flat PR list carrying `parent`, `depth` and `ticket` instead of a rendered tree. |

There is deliberately no flag to widen the board to merged or closed PRs, and none to
filter it down to "blocked" rows — the board is always exactly your open PRs.

## Notes

- The script is read-only. It never pushes, merges, comments or requests review.
- It requires `gh` installed and authenticated (`gh auth status`).
- One GraphQL search call fetches every field, so cost does not grow with the number of
  PRs. GitHub computes merge state lazily, so the script re-queries while any row still
  reads `UNKNOWN` (up to three attempts, ~1s apart) — a cold run therefore takes a few
  seconds and a warm one is near-instant.
- A conflicting PR never receives new check runs, which is why `Checks` is marked
  `(stale)` next to `CONFLICTS` rather than reported as a pass.
