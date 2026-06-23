# Create GitLab Work Item

Turn a one- or two-sentence brief into a properly structured GitLab work item — an Issue, Incident, Task, or Test case. You describe the work; the skill drafts the full work item against a standard template, previews it for your approval, and creates it through the `glab` CLI — so you never have to remember the template structure or which project to file to.

## Features

- **Native work-item types** — creates a real GitLab `Issue`, `Incident`, `Task`, or `Test case` (via `glab api`, which can set the type that `glab issue create` cannot)
- **Standard template** — `Context`, `Expected Result`, and `GIVEN/WHEN/THEN` acceptance criteria every time, plus Incident-only `Data` / `Steps to Reproduce` / `Actual Result` sections
- **Collapsible sections** — `QA Notes` (endpoints and CLI commands) and `Implementation Plan` render as collapsed `<details>` blocks, keeping the work item scannable
- **Repo-aware** — defaults to the current repo's GitLab project; falls back to a remembered project, then asks. Never hard-coded
- **Remembers your preferences** — recalls your fallback project across sessions and announces the default so you can override it
- **Audience-aware language** — keeps code-level technicals out of the PM-facing sections and formats any technical tokens as inline code
- **Preview before create** — always shows the full assembled work item and waits for explicit approval before anything hits GitLab
- **Label-safe** — only ever applies labels that already exist, so it never pollutes the shared label set
- **Optional fields done right** — optional epic (graceful Free-tier fallback), assignee (username resolved to id), and confidentiality toggle; no milestone, weight, or due date unless you ask

## Requirements

The [`glab` CLI](https://gitlab.com/gitlab-org/cli) must be installed and authenticated (`glab auth login`) — the skill uses it to resolve the project, validate labels, and create the work item. If `glab` isn't installed or authenticated, the skill says so and stops rather than fabricating a reference.

## Installation

Users of this marketplace can install via:

```
/plugin install create-gitlab-work-item@ai-marketplace
```

Or manually copy `skills/create-gitlab-work-item/` to `~/.claude/skills/create-gitlab-work-item/`.

## Usage

```
/create-gitlab-work-item
```

The skill also activates when you ask to create, raise, open, file, or log a GitLab work item / issue / ticket / incident / task / test case — and offers itself proactively when you describe a bug or unit of work that clearly belongs in a work item.
