# Code Review

Multi-agent code review skill for Claude Code. Simulates JaziTheDev's (Krzysztof Trzos) review style, derived from over a thousand real PR reviews. The orchestrator coordinates parallel review agents, deduplicates findings, classifies them as **[Must]** / **[Optional]** / **[Question]**, and posts the result as inline GitHub review comments.

## What it checks

| Agent | Concern |
|---|---|
| Scope analysis | Single reason for change — does the PR do one thing? |
| Size analysis | Lines changed against discipline thresholds; suggested splits |
| Project rules | Compliance with `CLAUDE.md` / `AGENTS.md` in the repo |
| Bug & smell scan | Bugs, code smells, design issues |
| Historical context | What `git log` / `git blame` tell us about the touched code |
| Previous comments | Unaddressed feedback from earlier review rounds (PR mode only) |
| Code documentation | Comment quality, naming, doc fitness |
| Tactical DDD | Aggregates, value objects, invariants, policies |
| Strategic DDD | Bounded contexts, modules, context maps |
| Personal patterns | The 51 review patterns extracted from past reviews |

They all run concurrently in one wave, so a review takes as long as its slowest agent rather than the sum. An agent is left out only when it is certain to have nothing to read — the DDD pair on a diff with no application code, history on files that are new in this PR — and every omission is listed under **Review Scope** in the preview, because a skipped agent that nobody declared is indistinguishable from one that found nothing.

## Modes

- **PR mode** — `/code-review:code-review #123`, `/code-review:code-review 123`, or `/code-review:code-review https://github.com/org/repo/pull/123`. Fetches the PR via `gh`, reviews the diff, and posts inline comments — signed immediately when the verdict is a clean approval, otherwise left as a pending draft for you to submit.
- **Local mode** — `/code-review:code-review` (with no argument and no open PR for the branch). Reviews uncommitted local changes via `git diff HEAD`.
- **Auto-detect** — `/code-review:code-review` chooses the mode based on `git status` and whether an open PR exists for the current branch.

## Installation

Users of this marketplace can install via:

```
/plugin install code-review@ai-marketplace
```

## Usage

```
/code-review:code-review          # auto-detect: local changes or open PR for the branch
/code-review:code-review #123       # review a specific PR
/code-review:code-review 123        # same — bare PR number
/code-review:code-review <pr-url>   # review by URL
```

The skill also activates automatically when you say "review this PR", "code review", "check this pull request", or "review my changes".

> **Always use the namespaced form.** `/code-review` is a Claude Code **built-in** command, and it
> shadows any plugin skill of the same name — typing it runs the built-in single-pass reviewer, not
> this skill. Invoke this one as `/code-review:code-review`.

## Output

For every finding the skill produces:

- **Classification** — `[Must]` (blocks merge), `[Optional]` (suggestion), `[Question]` (asks the author for rationale). Every badge is bracketed and carries a single leading capital.
- **Certainty** — is the observation factually true of the code? Findings below 80 are filtered out. Scored separately from importance, so a definitely-present nitpick becomes an `[Optional]` instead of being dropped, and a serious-but-speculative hunch doesn't post as a `[Must]`
- **Materiality** — how much it matters, which is what drives the classification
- **File and line** — every inline-postable finding points at a real `file:line` **that this PR adds or modifies**; pre-existing violations are context, never an ask
- **Suggested fix** — present whenever there is something concrete to propose, which is nearly always for a `[Must]`
- **Why** — the full argument, folded into a collapsed `<details>` block so it costs nothing to skip. Included when it carries evidence the problem and the fix have not already given, and dropped when it would only repeat them

Findings are read against the PR head, fetched into a local ref, so reviews work on **stacked PRs** whose files don't exist on the branch you have checked out.

Reviewer preferences saved in Claude Code's auto-memory are applied as additional rules — but when such a rule justifies itself with a checkable claim about the codebase ("these paths are excluded from coverage", "the team removes these"), the skill verifies that claim first. If the codebase contradicts it, the finding drops to `[Optional]` with the measurement shown, and you're offered a correction to the rule instead of the same false `[Must]` on every future review.

A memory rule's **carve-out is permission, never a demand**. Most such rules are subtractive ("remove narrative PHPDoc, but keep array-shape annotations"), and the exception clause exempts code from the rule rather than creating a rule of its own — so the skill flags prose a PR *adds*, never prose a PR *deletes*. Relatedly, the skill never asks for documentation to be added or restored: absent documentation is not a finding, and a constraint worth stating is reported as something to express in code (a value object, a guard clause, a named argument, a named test) rather than in a paragraph.

In PR mode the review event is computed automatically: `REQUEST_CHANGES` if any `[Must]` or `[Question]` is present, otherwise `APPROVE`. That verdict also decides how the review lands on GitHub:

- **`APPROVE`** — posted for you straight away. A clean review has nothing for you to weigh, so there is nothing to confirm.
- **anything else** — created as a **pending draft**. The inline comments are attached but published to nobody; you read them on the PR's *Files changed* tab, edit or drop individual ones, and submit with the event you settle on.

Say so up front ("review it and post it") to publish immediately regardless, or ask to see it first ("show me before posting") to get the old `yes` / `no` / `edit` preview gate back.

## Requirements

- `gh` CLI authenticated against the target repo (PR mode)
- `git` available locally
- Repo with optional `CLAUDE.md` / `AGENTS.md` for project-rules checks
