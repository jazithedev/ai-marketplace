# Pull Request

Create properly formatted **draft** pull requests from the commits on the current branch. One
reviewable commit → one PR. Several reviewable commits (e.g. produced by
`/smart-commit:commit`) → a **stacked chain** of child PRs under a collective branch, so
reviewers read small slices while the feature lands on the base branch in one atomic merge.

## Features

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
  mismatch
- **Template-driven bodies** — Responsibility / Side effects / Additional comments, filled
  from the actual diff and commit messages
- **Safe by default** — every PR is a draft; never force-pushes, amends, reorders commits, or
  touches your working branch

## Requirements

- GitHub: authenticated [`gh` CLI](https://cli.github.com/) (`gh auth login`)
- GitLab: authenticated [`glab` CLI](https://gitlab.com/gitlab-org/cli) (`glab auth login`)
- Other providers work in degraded mode (git-side setup + web links), single-PR shape only

## Installation

Users of this marketplace can install via:

```
/plugin install pull-request@ai-marketplace
```

Or manually copy `skills/create-pull-request/` to `~/.claude/skills/create-pull-request/`.

## Usage

```
/create-pull-request [base-branch]
```

The base branch is auto-detected when omitted. The skill also activates when you ask to
create, open, raise, or publish a pull request / merge request.

### Stacked flow in short

1. Commit your branch in logical units (ideally with `/smart-commit:commit`).
2. Run `/create-pull-request` — approve the proposed stack. Child PRs are created as drafts;
   the collective branch starts empty, so its PR does not exist yet.
3. Review and merge child 1 into the collective (delete its branch — that auto-retargets
   child 2).
4. Re-run `/create-pull-request` — resume mode opens the collective PR and backfills links.
5. Keep merging children down the chain; finally merge the collective into the base branch.
