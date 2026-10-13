# Problem Analyst

A skill that analyses a problem in depth before any implementation begins — what needs to be solved and why, never how.

## Features

- **Problem understanding** — uncovers the real underlying problem, pain points, objectives and constraints
- **Domain exploration** — stakeholders, current workflows, user journeys, edge cases and business rules
- **Requirements clarification** — functional and non-functional requirements, scope boundaries, assumptions to validate
- **Decomposition** — breaks the problem into problem areas, scenarios, processes and data needs
- **Risk analysis** — business, compliance, performance, security and resource risks
- **No solutions** — deliberately refuses to suggest implementations, technologies or architecture, and steers back to the problem

## Installation

Users of this marketplace can install via:

```
/plugin install problem-analyst@ai-marketplace
```

Or manually copy `skills/problem-analyst/` to `~/.claude/skills/problem-analyst/`.

## Usage

Invoke `/problem-analyst:problem-analyst`, or describe a problem you want understood before building. The skill activates for new features with unclear scope, complex business requirements, or when you want to understand the problem space first.

The output is a structured analysis: problem statement, stakeholders, user needs, requirements, business rules, success criteria, assumptions and risks.

## Source / Attribution

This skill was taken from Andrea Laforgia's public Claude Code agents collection.

- **Original author:** Andrea Laforgia ([@andrealaforgia](https://github.com/andrealaforgia))
- **Source:** https://github.com/andrealaforgia/claude-code-agents

See [`skills/problem-analyst/references/source.md`](skills/problem-analyst/references/source.md) for full provenance.
