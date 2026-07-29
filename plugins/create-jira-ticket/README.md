# Create Jira Ticket

Turn a one- or two-sentence brief into a properly structured Jira ticket — and keep it that way. You describe the work; the skill drafts the full ticket against a standard template, previews it for your approval, and creates it. When the ticket later changes, the same skill updates it against the same standards, without quietly destroying the parts you weren't editing.

## Features

- **Standard template** — `Context`, `Expected Result`, and numbered, full-sentence acceptance criteria every time, plus bug-only `Data` / `Steps to Reproduce` / `Actual Result` sections
- **Acceptance criteria that QA can actually verify** — naming conventions, types and nullability, and internal structure are kept out of the criteria and pushed into the `Implementation Plan`, and a criterion never pre-commits the team to a decision nobody has taken yet
- **`Action Points` for what isn't settled** — a visible section for the questions another team has to answer before the work is buildable, retired as each one is answered
- **Optional expanders** — `QA Notes` (endpoints and CLI commands) and `Implementation Plan` render as collapsed expanders via ADF, keeping the ticket scannable
- **Site- and project-agnostic** — the Jira site, project, and board come from your saved preferences or a quick discovery step, never hard-coded
- **Remembers your preferences** — recalls your usual site and board across sessions and announces the default so you can override it
- **Audience-aware language** — keeps code-level technicals out of the PM-facing sections and formats any technical tokens as inline code
- **Preview before create** — always shows the full assembled ticket and waits for explicit approval before anything hits Jira
- **Safe updates** — re-reads the ticket immediately before writing so it can't revert someone else's edit, re-sends the complete description so expanders and links survive, previews the change as a diff, and comments to notify the assignee when a material change lands on a ticket already in a sprint
- **Label-safe** — only ever applies labels that already exist, so it never pollutes the shared label set

## Requirements

The [Atlassian MCP server](https://www.atlassian.com/platform/remote-mcp-server) must be connected — the skill uses it to discover sites, validate projects/labels, and create the ticket. If it isn't connected, the skill says so and stops rather than fabricating a ticket.

## Installation

Users of this marketplace can install via:

```
/plugin install create-jira-ticket@ai-marketplace
```

Or manually copy `skills/create-jira-ticket/` to `~/.claude/skills/create-jira-ticket/`.

## Usage

```
/create-jira-ticket
```

The skill also activates when you ask to create, raise, open, file, or log a Jira ticket / issue / task / bug / story — and offers itself proactively when you describe a bug or unit of work that clearly belongs in a ticket.

It activates for changes too: "update the ticket", "reword the ACs", "add an acceptance criterion to ABC-123", "these questions got answered, fold them into the tickets".
