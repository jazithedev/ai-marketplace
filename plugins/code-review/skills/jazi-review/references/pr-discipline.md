# PR Discipline Rules

## Single Reason for Change

Every pull request must have exactly **one reason for change**. Valid categories:

| Category       | Description                                      |
|----------------|--------------------------------------------------|
| **Feature**    | New user-facing functionality                    |
| **Bugfix**     | Fixing incorrect behavior                        |
| **Refactor**   | Restructuring without behavior change            |
| **Test**       | Adding or improving tests only                   |
| **Config**     | Build, CI, infra, or environment changes         |
| **Docs**       | Documentation only                               |
| **Dependency** | Upgrading or adding dependencies                 |

### Mixing Rules

- A PR must belong to **one** category above.
- **Feature + its unit tests** = OK (tests are part of the feature delivery).
- **Bugfix + refactor** = NOT OK (split into two PRs).
- **Feature + unrelated cleanup** = NOT OK.
- **Refactor + new feature enabled by refactor** = NOT OK (refactor first, feature second).

## Size Limits

| Threshold        | Lines Changed (additions + deletions) | Action                 |
|------------------|---------------------------------------|------------------------|
| Target           | ≤ 200                                 | Ideal size             |
| Acceptable       | ≤ 400                                 | OK with justification  |
| Must split       | > 400                                 | Split required         |

### Size Exception

Mechanically uniform changes may exceed limits if they are:
- Auto-generated code (migrations, schemas, lock files)
- Repetitive rename/find-replace across many files
- Moving files without modification

These must be **clearly labeled** in the PR description.

## No "While I Was Here" Rule

If you spot something unrelated that needs fixing while working on a PR:
1. **Do not** include it in the current PR.
2. Create a separate issue or PR for it.
3. Reference it in your PR description if relevant.

## No Mixing FE and BE in a Single PR

Frontend and backend changes belong in separate PRs. Mixed PRs mean backend developers approve frontend code (and vice versa) without proper domain expertise. This also makes rollbacks harder.

## Title & Description

- **Title**: Must describe the single purpose. Titles containing "and" that enumerate multiple goals are a red flag.
- **Title specificity**: The PR title must describe the actual change, not just copy the Jira ticket title. A ticket title like "Implement reporting feature" is not specific enough — describe what was done (e.g., "Add weekly report PDF generation for enterprise accounts").
- **Description**: Must explain **what** changed and **why**. Should not list multiple unrelated goals. An empty or one-word description is unacceptable.

## AI-Generated Code

- AI-generated code is held to the **same standards** as human-written code.
- The PR author is accountable for all code in the PR, regardless of its origin.
- "The AI wrote it" is not a valid excuse for discipline violations.
- Signs of unreviewed AI code (non-English comments, suspiciously boilerplate patterns) should be flagged.

## No Force-Push During Review

Once reviewers are assigned and actively reviewing, do not force-push the branch. Reviewers use the commit history to identify what changed since their last pass. Push additional commits instead.