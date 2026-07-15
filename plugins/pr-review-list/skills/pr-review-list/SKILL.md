---
name: pr-review-list
description: List the GitHub pull requests awaiting your code review for a repository and team. Use when the user asks "what PRs do I need to review", "my review queue", "PRs waiting on me", "/pr-review-list", or wants a triaged list of review-requested PRs — including ones a teammate already reviewed (which GitHub hides from request filters). Resolves the repo from the working directory (or one the user names) and the team(s) from per-repository memory.
---

# pr-review-list

Produce a focused, deterministic list of PRs the user still needs to review.

## Inputs this skill resolves

1. **Repository** — if the user named one (e.g. `owner/repo`), use it (`--repo`).
   Otherwise the script defaults to the current working directory's repo.
2. **Teams** — the in-scope and out-of-scope team slugs for this repo. These live in
   **AI memory**, not in any file.

## Procedure

1. Determine the repo's org: the owner of `--repo` if given, else run
   `gh repo view --json nameWithOwner -q .nameWithOwner` in the session cwd.
2. **Recall teams from memory.** Look for a memory describing this repo/org's review
   teams (include + exclude team slugs). If none exists, ask the user:
   > "Which team slug(s) define your review scope for `<org>`? And are you on any other
   > teams whose review requests should be excluded?"
   After a successful run, offer to save this as a `project` memory (e.g.
   `pr-review-teams-<org>`) so future runs are silent — record the include and exclude
   slugs and the org they apply to.
3. **Run the script:**
   ```bash
   python3 "$CLAUDE_PLUGIN_ROOT/skills/pr-review-list/scripts/pr_review_list.py" \
     [--repo <owner/repo>] --team <slug> [--team <slug> …] \
     [--exclude-team <slug> …] [--attention|--full-board] \
     [--include-drafts] [--include-closed]
   ```
   (`$CLAUDE_PLUGIN_ROOT` is provided by the plugin runtime.)
4. **Render** the script's markdown table verbatim in your reply, then add **one**
   short human summary line highlighting what actually needs attention (e.g. which is
   genuinely current vs stale). Keep it to a single line — the table carries the detail.
5. If the script prints "Nothing to review", say so plainly instead of an empty table.

## Flags to offer

- default → not-yet-acted PRs only.
- `--attention` → also PRs you commented on where the author has since replied.
- `--full-board` → every matched PR with a status column.
- `--include-drafts`, `--include-closed` → widen the set.

## Notes

- The script is read-only. It never posts, approves, or comments.
- It requires `gh` installed and authenticated (`gh auth status`).
- Team review-requests appear by team *name*; the script fetches each team's name from its
  slug, so you always pass **slugs**.
