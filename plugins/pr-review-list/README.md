# pr-review-list

List the GitHub pull requests awaiting **your** code review for a repository and team —
deterministic triage that:

- catches PRs a **teammate already reviewed** (GitHub drops the team from the requested
  reviewers, hiding them from naive filters);
- drops **other-team request pollution** (`review-requested:<you>` expands to every team
  you're on);
- flags `stale`, `draft`, `teammate-approved`, and `changes-requested` PRs.

## Usage

```
/pr-review-list
```

Runs against the current working directory's repository (or one you name). Your review
team slugs are remembered per repository in AI memory — the skill asks once, then recalls
them silently.

## Requirements

- `gh` CLI, authenticated (`gh auth login`).
- Python 3.10+.

## Options

| Flag | Effect |
|------|--------|
| _(default)_ | PRs you have not yet acted on. |
| `--attention` | Also PRs you commented on where the author has replied. |
| `--full-board` | Every matched PR with a status column. |
| `--include-drafts` / `--include-closed` | Widen the set. |
| `--repo OWNER/NAME` | Target a specific repo. |

Read-only: never posts, approves, or comments.
