# Pull Request

Two skills for the pull-request side of your workflow:

- `/pull-request:create-pull-request` — create draft PRs from the commits on your branch.
- `/pull-request:to-review-list` — list the GitHub PRs awaiting **your** code review.

## Create pull request

Create properly formatted **draft** pull requests from the commits on the current branch. One
reviewable commit → one PR. Several reviewable commits (e.g. produced by
`/smart-commit:commit`) → a **stacked chain** of child PRs under a collective branch, so
reviewers read small slices while the feature lands on the base branch in one atomic merge.

### Features

- **PR plan preview** — proposes shape (single vs. stack), commit grouping, branch names, and
  titles; you can merge groups, rename, or downgrade before anything touches the remote. One
  confirmation gate, fully automated after it
- **Stacked PRs** — collective branch + chained child PRs, children merged one by one with
  provider auto-retargeting advancing the chain; strict original commit order keeps
  cherry-picks conflict-free
- **Resume mode** — re-run the skill after the first child merges: it opens the collective PR
  and backfills its URL into every child; re-running is the happy path, never an error
- **Provider-agnostic** — GitHub (`gh`) and GitLab (`glab`) fully supported; other providers
  get the full git-side setup plus pre-filled web-creation links
- **Convention-aware** — resolves branch/title conventions from your repo's `CONTRIBUTING.md`,
  remembers them per repository, and falls back to a sane default; warns (never aborts) on
  mismatch. A PR template the repo mandates — `.github/pull_request_template.md`, or a
  template section in `CONTRIBUTING.md` — overrides the plugin's own, and recent merged PRs
  are read too, since a repo's written template and its habits drift
- **Template-driven bodies** — Responsibility / Side effects / Additional comments, filled
  from the actual diff and commit messages. A body carries only what the diff cannot show: no
  check-run results the pipeline already reports, and no inventory of what changed — or of
  what didn't
- **Safe by default** — every PR is a draft; never force-pushes, amends, reorders commits, or
  touches your working branch

### Requirements

- GitHub: authenticated [`gh` CLI](https://cli.github.com/) (`gh auth login`)
- GitLab: authenticated [`glab` CLI](https://gitlab.com/gitlab-org/cli) (`glab auth login`)
- Other providers work in degraded mode (git-side setup + web links), single-PR shape only

### Usage

```
/pull-request:create-pull-request [base-branch]
```

The base branch is auto-detected when omitted. The skill also activates when you ask to
create, open, raise, or publish a pull request / merge request.

#### Stacked flow in short

1. Commit your branch in logical units (ideally with `/smart-commit:commit`).
2. Run `/pull-request:create-pull-request` — approve the proposed stack. Child PRs are created
   as drafts; the collective branch starts empty, so its PR does not exist yet.
3. Review and merge child 1 into the collective (delete its branch — that auto-retargets
   child 2).
4. Re-run `/pull-request:create-pull-request` — resume mode opens the collective PR and
   backfills links.
5. Keep merging children down the chain; finally merge the collective into the base branch.

## To-review list

List the GitHub pull requests awaiting **your** code review for a repository and team —
deterministic triage that:

- catches PRs a **teammate already reviewed** (GitHub drops the team from the requested
  reviewers, hiding them from naive filters);
- drops **other-team request pollution** (`review-requested:<you>` expands to every team
  you're on);
- catches PRs the author **re-requested** from you after you reviewed (GitHub never
  clears your old `CHANGES_REQUESTED`/`APPROVED` state, so a re-request is the only
  signal the ball is back with you);
- flags `stale`, `draft`, `re-requested`, `teammate-approved`, and `changes-requested` PRs.

### Requirements

- `gh` CLI, authenticated (`gh auth login`).
- Python 3.10+.

### Usage

```
/pull-request:to-review-list
```

Runs against the current working directory's repository (or one you name). Your review
team slugs are remembered per repository in AI memory — the skill asks once, then recalls
them silently.

| Flag | Effect |
|------|--------|
| _(default)_ | PRs you have not yet acted on, plus ones re-requested from you since your last review. |
| `--attention` | Also PRs you commented on where the author has replied. |
| `--full-board` | Every matched PR with a status column. |
| `--include-drafts` / `--include-closed` | Widen the set. |
| `--repo OWNER/NAME` | Target a specific repo. |

Read-only: never posts, approves, or comments.

## My PRs list

A status board of the open pull requests **you** authored — the counterpart to the
to-review list. It reports state and never ranks the rows:

- covers **every repository** you have access to by default, grouped per repo (`--repo` /
  `--org` narrow it);
- groups **stacked chains** under their parent, indented in merge order, including a
  placeholder row for a base branch whose own PR is not open yet (an unraised collective
  branch);
- shows the **review decision** with who gave it or who is still being waited on, so a
  push that dismissed an approval reads as `review-required`, not `approved`;
- marks checks `(stale)` next to `CONFLICTS`, because a conflicting PR never receives new
  check runs and its green tick is a leftover.

### Requirements

- `gh` CLI, authenticated (`gh auth login`).
- Python 3.10+.

### Usage

```
/pull-request:my-prs-list
```

No configuration and nothing to remember — `author:@me` is self-scoping.

| Flag | Effect |
|------|--------|
| _(default)_ | Every open PR you authored, in every repository, drafts included. |
| `--repo OWNER/NAME` | Only this repository. |
| `--org SLUG` | Only this organisation (repeatable). |
| `--json` | Flat PR list carrying `parent`, `depth` and `ticket`. |

One GraphQL call fetches the whole board, re-queried while GitHub still reports merge
state as `UNKNOWN`. Read-only: never pushes, merges, comments, or requests review.

## Installation

Users of this marketplace can install via:

```
/plugin install pull-request@ai-marketplace
```

Or manually copy `skills/create-pull-request/`, `skills/to-review-list/` and/or
`skills/my-prs-list/` to `~/.claude/skills/`.
