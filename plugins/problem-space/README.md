# Problem Space

Two skills for understanding a problem before any implementation begins — what needs to be solved and why, never how.

| Skill | Command | Purpose |
|---|---|---|
| Problem Analyst | `/problem-space:problem-analyst` | Analyses the problem in depth: stakeholders, pain points, requirements, business rules, success criteria, assumptions and risks |
| User Story Writer | `/problem-space:user-story-writer` | Slices a problem or feature into the thinnest end-to-end user stories, each with acceptance criteria, prioritised and sequenced |

Use them in that order: analyse the problem first, then slice it into stories.

## Features

### Problem Analyst

- **Problem understanding** — uncovers the real underlying problem, pain points, objectives and constraints
- **Domain exploration** — stakeholders, current workflows, user journeys, edge cases and business rules
- **Requirements clarification** — functional and non-functional requirements, scope boundaries, assumptions to validate
- **Decomposition** — breaks the problem into problem areas, scenarios, processes and data needs
- **Risk analysis** — business, compliance, performance, security and resource risks

### User Story Writer

- **Elephant Carpaccio** — thinnest vertical slices that still deliver end-to-end value
- **INVEST stories** — independent, negotiable, valuable, estimable, small and testable
- **Structured stories** — "As a / I want / So that", acceptance criteria and a definition of done
- **Prioritised and sequenced** — by risk reduction, user value, dependencies and learning
- **Completeness check** — the set of stories covers the original problem without gaps or overlaps

Both skills deliberately refuse to suggest implementations, technologies or architecture, and steer back to the problem.

## Installation

Users of this marketplace can install via:

```
/plugin install problem-space@ai-marketplace
```

Or manually copy `skills/problem-analyst/` and `skills/user-story-writer/` to `~/.claude/skills/`.

## Source / Attribution

These skills were taken from Andrea Laforgia's public Claude Code agents collection.

- **Original author:** Andrea Laforgia ([@andrealaforgia](https://github.com/andrealaforgia))
- **Source:** https://github.com/andrealaforgia/claude-code-agents

See each skill's `references/source.md` for full provenance.
