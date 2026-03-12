# Smart Commit

Intelligent git commit skill for Claude Code that creates well-formed Conventional Commit messages with automatic change decomposition.

## Features

- **Conventional Commits** format with type, scope, description, body, and footers
- **Automatic issue extraction** from branch names (Jira keys, numeric IDs)
- **Change decomposition** — analyzes unstaged changes and groups them by logical purpose
- **Size-aware splitting** — large changesets are split along hexagonal architecture layers
- **Interactive approval** — presents each commit message in a visual frame for review
- **Stub handling** — temporary stubs bridge dependency gaps between split commits
- **Hunk-level splitting** — separates unrelated changes within the same file
- **Hook failure recovery** — helps fix pre-commit hook failures without amending

## Three Workflows

| Scenario | Behavior |
|---|---|
| **Staged changes only** | Commits exactly what's staged with a composed message |
| **Nothing staged** | Analyzes all tracked changes, decomposes into groups, commits sequentially |
| **Both staged and unstaged** | Treats all changes as one pool, decomposes by purpose |

## Installation

Users of this marketplace can install via:

```
/plugin install smart-commit@ai-marketplace
```

Or manually copy `skills/commit/` to `~/.claude/skills/commit/`.

## Usage

```
/commit
```

The skill also activates automatically when you say "commit", "save my changes", or "create a commit".
