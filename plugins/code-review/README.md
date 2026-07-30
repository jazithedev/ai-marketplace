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
- **Certainty** — is the observation factually true of the code? Findings below 80 are filtered out. Scored separately from importance, so a definitely-present nitpick becomes an `[Optional]` instead of being dropped, and a serious-but-speculative hunch doesn't post as a `MUST`
- **Materiality** — how much it matters, which is what drives the classification
- **File and line** — every inline-postable finding points at a real `file:line` **that this PR adds or modifies**; pre-existing violations are context, never an ask
- **Why** and **Suggested fix** — required for every `MUST` finding

Findings are read against the PR head, fetched into a local ref, so reviews work on **stacked PRs** whose files don't exist on the branch you have checked out.

Reviewer preferences saved in Claude Code's auto-memory are applied as additional rules — but when such a rule justifies itself with a checkable claim about the codebase ("these paths are excluded from coverage", "the team removes these"), the skill verifies that claim first. If the codebase contradicts it, the finding drops to `[Optional]` with the measurement shown, and you're offered a correction to the rule instead of the same false `MUST` on every future review.

A memory rule's **carve-out is permission, never a demand**. Most such rules are subtractive ("remove narrative PHPDoc, but keep array-shape annotations"), and the exception clause exempts code from the rule rather than creating a rule of its own — so the skill flags prose a PR *adds*, never prose a PR *deletes*. Relatedly, the skill never asks for documentation to be added or restored: absent documentation is not a finding, and a constraint worth stating is reported as something to express in code (a value object, a guard clause, a named argument, a named test) rather than in a paragraph.

In PR mode, the skill previews the full review locally first and asks for explicit approval (`yes` / `no` / `edit`) before posting anything to GitHub. The review event is computed automatically: `REQUEST_CHANGES` if any `MUST` or `[Question]` is present, otherwise `APPROVE`.

## Requirements

- `gh` CLI authenticated against the target repo (PR mode)
- `git` available locally
- Repo with optional `CLAUDE.md` / `AGENTS.md` for project-rules checks
