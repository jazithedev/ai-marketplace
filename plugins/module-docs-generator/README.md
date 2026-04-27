# Module Docs Generator

Generates a suite of AI-agent documentation files for a single module in a PHP modular monolith, capturing the module's domain, architectural boundaries, published contracts, and consumed integrations.

## What it produces

For the target module, the skill generates four files:

| File | Purpose |
|---|---|
| `AGENTS.md` | Problem domain, strategic design, tactical design, and engineering practices (4 parts). Parts 1–3 are code-derived; Part 4 is engineer-curated and preserved on regeneration. |
| `CLAUDE.md` | Pointer file that delegates to `AGENTS.md`. |
| `CONTRACTS.md` | The module's **published** surface — handled queries, emitted integration events, and HTTP endpoints exposed to other modules and external callers. |
| `INTEGRATIONS.md` | The module's **consumed** surface — dispatched commands/queries, called HTTP endpoints, subscribed events, expected data shapes, assumptions, and failure handling for upstream modules and external services. |

`CONTRACTS.md` and `INTEGRATIONS.md` are deliberately split: producers own what they publish; consumers own what they assume.

## Installation

Users of this marketplace can install via:

```
/plugin install module-docs-generator@ai-marketplace
```

## Usage

```
/module-docs-generator <ModuleName>
```

For example:

```
/module-docs-generator Payments
```

The skill also activates automatically when you ask Claude to "document a module", "create AGENTS.md", "generate module docs", or similar.

## Scope

Designed for PHP modular monoliths organised around Domain-Driven Design — bounded contexts, aggregates, value objects, integration events, and command/query buses. The generated documentation is business-focused (AGENTS.md describes WHAT and WHY, not HOW) so it survives implementation refactoring.
