# AI Marketplace

Community-driven collection of Claude Code plugins — skills, agents, and tools for software development workflows.

## Installation

### 1. Add the marketplace

```
/plugin marketplace add jazithedev/ai-marketplace
```

### 2. Browse available plugins

```
/plugin
```

### 3. Install a plugin

```
/plugin install <plugin-name>@ai-marketplace
```

## Available Plugins

### Maintained here

| Plugin | Category | Description |
|---|---|---|
| [smart-commit](plugins/smart-commit) | Productivity | Intelligent git commits with Conventional Commits, automatic change decomposition, and interactive approval |
| [module-docs-generator](plugins/module-docs-generator) | Documentation | Generate AGENTS.md, CONTRACTS.md, and INTEGRATIONS.md for a module in a PHP modular monolith |
| [code-review](plugins/code-review) | Quality | Multi-agent PR review with discipline checks, DDD assessment, and inline GitHub review comments (`/code-review:code-review`) |
| [grill-me](plugins/grill-me) | Productivity | Relentlessly interviews you about a plan or design, one question at a time, until you reach shared understanding ([source](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md)) |
| [karpathy-guidelines](plugins/karpathy-guidelines) | Quality | Behavioral guidelines that reduce common LLM coding mistakes — simple, surgical, verifiable changes ([source](https://github.com/multica-ai/andrej-karpathy-skills/blob/main/skills/karpathy-guidelines/SKILL.md)) |
| [create-jira-ticket](plugins/create-jira-ticket) | Productivity | Turn a short brief into a well-structured Jira ticket — Context, Expected Result, numbered full-sentence acceptance criteria, and optional QA Notes / Implementation Plan expanders; previews before creating |
| [create-gitlab-work-item](plugins/create-gitlab-work-item) | Productivity | Turn a short brief into a well-structured GitLab work item (Issue, Incident, Task, or Test case) via the glab CLI — Context, Expected Result, GIVEN/WHEN/THEN criteria, and optional QA Notes / Implementation Plan as collapsible details; previews before creating |
| [pull-request](plugins/pull-request) | Productivity | Create draft pull requests from the commits on your branch — a single PR or a stacked chain under a collective branch; GitHub and GitLab support, full plan preview before anything is created. Also lists the GitHub PRs awaiting your review (`/pull-request:to-review-list`) and boards the open PRs you authored with their review status (`/pull-request:my-prs-list`) |
| [clean-view](plugins/clean-view) | Productivity | A mod that hides tool calls, diffs and command output and shows one progress checklist above the prompt, for non-technical users; always on while installed |
| [session-header](plugins/session-header) | Productivity | A mod that keeps the session's essentials in a bordered panel above the prompt — worktree, branch, model, permission mode, context use, cost and goal; refresh the goal with `/header-goal` |
| [service-classifier](plugins/service-classifier) | Quality | Tell Application Services (CQRS handlers), Application Preconditions and Domain Services apart — classify a class or decide where new logic belongs, using the GLASS and FOE mnemonics; advice only, no edits |
| [problem-space](plugins/problem-space) | Productivity | Understand a problem before building it — `/problem-space:problem-analyst` analyses stakeholders, pain points, requirements, business rules, success criteria, assumptions and risks; `/problem-space:open-questions` turns that into a short list of the questions only people can answer; `/problem-space:user-story-writer` slices it into thin, INVEST-compliant user stories; none suggests solutions ([source](https://github.com/andrealaforgia/claude-code-agents)) |
| [say-less](plugins/say-less) | Productivity | An always-on tone of voice: everything Claude writes (replies, investigations, tickets, PRs, docs) stays short and plain for non-native readers, with no facts lost; switch with `/say-less:say-less off` or `on` |

### From external repositories

Listed here, but hosted and maintained in their own repositories.

| Plugin | Category | Description |
|---|---|---|
| [diagram-design](https://github.com/cathrynlavery/diagram-design) | Productivity | A skill that draws editorial diagrams — 44 types from architecture and flowcharts to Sankey and Gantt — as self-contained HTML + SVG ([source](https://github.com/cathrynlavery/diagram-design)) |
| [impeccable](https://github.com/pbakaus/impeccable) | Design | A skill with 24 design commands — `/impeccable polish`, `audit`, `critique` and more — plus curated anti-pattern detection for better frontend design ([source](https://github.com/pbakaus/impeccable)) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for instructions on adding your own plugins.
