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

| Plugin | Category | Description |
|---|---|---|
| [smart-commit](plugins/smart-commit) | Productivity | Intelligent git commits with Conventional Commits, automatic change decomposition, and interactive approval |
| [module-docs-generator](plugins/module-docs-generator) | Documentation | Generate AGENTS.md, CONTRACTS.md, and INTEGRATIONS.md for a module in a PHP modular monolith |
| [code-review](plugins/code-review) | Quality | Multi-agent PR review with discipline checks, DDD assessment, and inline GitHub review comments |
| [grill-me](plugins/grill-me) | Productivity | Relentlessly interviews you about a plan or design, one question at a time, until you reach shared understanding ([source](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md)) |
| [karpathy-guidelines](plugins/karpathy-guidelines) | Quality | Behavioral guidelines that reduce common LLM coding mistakes — simple, surgical, verifiable changes ([source](https://github.com/multica-ai/andrej-karpathy-skills/blob/main/skills/karpathy-guidelines/SKILL.md)) |
| [create-jira-ticket](plugins/create-jira-ticket) | Productivity | Turn a short brief into a well-structured Jira ticket — Context, Expected Result, GIVEN/WHEN/THEN criteria, and optional QA Notes / Implementation Plan expanders; previews before creating |
| [create-gitlab-work-item](plugins/create-gitlab-work-item) | Productivity | Turn a short brief into a well-structured GitLab work item (Issue, Incident, Task, or Test case) via the glab CLI — Context, Expected Result, GIVEN/WHEN/THEN criteria, and optional QA Notes / Implementation Plan as collapsible details; previews before creating |
| [hermes-tweet](plugins/hermes-tweet) | Research | Hermes Agent X/Twitter route discovery, public reads, and approval-gated social actions through Xquik |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for instructions on adding your own plugins.
