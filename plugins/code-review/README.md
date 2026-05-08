# Code Review

Multi-agent code review skill for Claude Code. Simulates JaziTheDev's (Krzysztof Trzos) review style, derived from over a thousand real PR reviews. The orchestrator coordinates parallel review agents, deduplicates findings, classifies them as **MUST** / **[Optional]** / **[Question]**, and posts the result as inline GitHub review comments.

## What it checks

| Phase | Agent | Concern |
|---|---|---|
| 1 | Scope analysis | Single reason for change — does the PR do one thing? |
| 1 | Size analysis | Lines changed against discipline thresholds; suggested splits |
| 2 | Project rules | Compliance with `CLAUDE.md` / `AGENTS.md` in the repo |
| 2 | Bug & smell scan | Bugs, code smells, design issues |
| 2 | Historical context | What `git log` / `git blame` tell us about the touched code |
| 2 | Previous comments | Unaddressed feedback from earlier review rounds (PR mode only) |
| 2 | Code documentation | Comment quality, naming, doc fitness |
| 2 | Tactical DDD | Aggregates, value objects, invariants, policies |
| 2 | Strategic DDD | Bounded contexts, modules, context maps |
| 2 | Personal patterns | The 51 review patterns extracted from past reviews |

## Modes

- **PR mode** — `/code-review #123`, `/code-review 123`, or `/code-review https://github.com/org/repo/pull/123`. Fetches the PR via `gh`, reviews the diff, and posts inline comments after your approval.
- **Local mode** — `/code-review` (with no argument and no open PR for the branch). Reviews uncommitted local changes via `git diff HEAD`.
- **Auto-detect** — `/code-review` chooses the mode based on `git status` and whether an open PR exists for the current branch.

## Installation

Users of this marketplace can install via:

```
/plugin install code-review@ai-marketplace
```

## Usage

```
/code-review            # auto-detect: local changes or open PR for the branch
/code-review #123       # review a specific PR
/code-review 123        # same — bare PR number
/code-review <pr-url>   # review by URL
```

The skill also activates automatically when you say "review this PR", "code review", "check this pull request", or "review my changes".

## Output

For every finding the skill produces:

- **Classification** — `MUST` (blocks merge), `[Optional]` (suggestion), `[Question]` (asks the author for rationale)
- **Confidence score** — findings below 80% are filtered out
- **File and line** — every inline-postable finding points at a real `file:line` in the diff
- **Why** and **Suggested fix** — required for every `MUST` finding

In PR mode, the skill previews the full review locally first and asks for explicit approval (`yes` / `no` / `edit`) before posting anything to GitHub. The review event is computed automatically: `REQUEST_CHANGES` if any `MUST` or `[Question]` is present, otherwise `APPROVE`.

## Requirements

- `gh` CLI authenticated against the target repo (PR mode)
- `git` available locally
- Repo with optional `CLAUDE.md` / `AGENTS.md` for project-rules checks
