---
name: module-docs-generator
description: >-
  Generate AGENTS.md, CONTRACTS.md, and INTEGRATIONS.md documentation files for a module in the
  PHP modular monolith. Use when the user wants to create or regenerate module-level AI agent
  documentation, or when they mention documenting a module, creating AGENTS.md, generating module
  docs, or writing domain documentation for a specific module. Also use when the user asks to
  document a new module's domain, business rules, architectural boundaries, published contracts
  (queries and integration events the module exposes, HTTP endpoints), consumed contracts
  (commands/queries this module dispatches to other modules, events it subscribes to), upstream
  dependencies, or integration points with other modules and external services.
argument-hint: <ModuleName> (e.g., Payments, Auth, Ct)
---

# Module Documentation Generator

Generate a suite of documentation files for a module in the PHP modular monolith. Together they
describe the module's domain, its architecture, what it publishes to other modules, and what it
consumes from them.

The target module is: `$ARGUMENTS`. If no module name was provided, ask the user which module
to document before proceeding.

## Purpose of Generated Files

Each module gets **four** files:

1. **AGENTS.md** — problem domain, strategic design, tactical design, engineering practices
   (four parts). Parts 1–3 are code-derived (regenerated from the codebase). Part 4 is
   engineer-curated (preserved on regeneration). Describes the module in business language only,
   with two narrow exceptions in Part 3 (Aggregates row labels and Value Objects list reference
   class names verbatim — see §Value Objects below).
2. **CLAUDE.md** — a pointer: `# All instructions and rules in AGENTS.md\n- @AGENTS.md`.
3. **CONTRACTS.md** — the **published** surface. What this module exposes to other modules and
   external callers: handled queries, emitted integration events, HTTP endpoints. This is the
   module's "Published Language" — a promise to consumers. Commands are intentionally excluded:
   they are the module's own internal orchestration (dispatched by this module's own HTTP / CLI /
   Worker adapters and event subscribers), not a contract other modules or external callers reach
   through. Cross-module command dispatches belong in `INTEGRATIONS.md` (outbound communication)
   on the callee's side, not here.
4. **INTEGRATIONS.md** — the **consumed** surface. What this module depends on from upstream
   modules and external services: dispatched commands/queries, called HTTP endpoints, subscribed
   events, the shape of data we consume from each upstream, assumptions, and failure handling. This is consumer-driven
   documentation — it captures **our** expectations even when upstreams don't publish contracts.

`CONTRACTS.md` and `INTEGRATIONS.md` are deliberately separate because their ownership and
change semantics are opposite: the producer owns what it publishes; the consumer owns what it
assumes.

### AGENTS.md structure (four parts)

1. **Problem Domain Analysis** — what business problem the module solves. *Code-derived.*
2. **Strategic Design Assessment** — how the module fits in the broader system. The "Capabilities
   and Rules" section lives here. *Code-derived.*
3. **Tactical Design Assessment** — the aggregates, value objects, and reactive policies that
   shape the domain model. Expressed *structurally* (tables + lists), not as prose rules.
   *Code-derived.*
4. **Engineering Practices** — engineer-curated catalogue of conventions applied in this
   module (aggregate coding, integration boundaries, access control, testing, etc.).
   *Engineer-managed — preserved on regeneration unless explicitly replaced.*

**Part-responsibility model.** Parts 1–3 describe the code as it is; they are safe to regenerate
on every run and any human edits to them will be overwritten. Part 4 is the team's highlighted
disciplines — a human-maintained catalogue. The skill **must not silently overwrite Part 4**.

- **Update mode** preserves the existing Part 4 verbatim and offers any newly detected candidates
  as review suggestions.
- **Regenerate-from-scratch mode** re-prompts the user about Part 4 specifically: if they decline
  Part 4 replacement, the existing Part 4 is preserved verbatim (same as update mode) and
  Subagent 6's output is presented separately as candidate additions; if they opt in, Subagent 6's
  output replaces Part 4 with the engineer-curation banner.
- **Brand-new files** emit Part 4 with the engineer-curation banner signalling that entries are
  candidates for human curation.

In every preserved-Part-4 case the candidate output is shown to the user after the file is
written as "candidate additions for your review" — never merged silently.

## Content Principles

Read [`references/content-principles.md`](references/content-principles.md) for the rules that govern what each generated file may and may not contain: business-language rules for `AGENTS.md` (with the two narrow class-name exceptions), the actors-vs-reactive-policies decision tree, and the wire-level identifier rules for `CONTRACTS.md` / `INTEGRATIONS.md` (including upstream naming and the long-name-plus-shortcut convention).

## Workflow

### Step 0: Locate and Scan the Module

Find the module at `src/Modules/<ModuleName>/`. If it doesn't exist, tell the user and stop.

Check if the module already has an `AGENTS.md`. If so, ask the user: regenerate from scratch, or
update the existing one? Repeat the question for `CONTRACTS.md` and `INTEGRATIONS.md` only if
the answer is "update" — regeneration replaces all four files together.

**Header metadata preservation rule.** The `AGENTS.md` top-of-file table carries human-curated
values — `Ownership` (team/domain) and `Product Page` (external link) — that the skill cannot
derive from code. Regardless of whether the user chose "regenerate from scratch" or "update":

- If the existing `AGENTS.md` has non-`TBD` values for `Ownership` or `Product Page`, carry them
  forward verbatim. Only the `Last verified against code: YYYY-MM-DD` line is refreshed to the
  current run date.
- The `Module classification` line is code-derived (by Subagent 2's Domain Classification verdict)
  and may change on regeneration; do not preserve it blindly.
- If the user explicitly asks to change Ownership or Product Page, accept the new values — but
  never silently overwrite with `TBD` when a real value is already present.

Read the project root `AGENTS.md` to understand which rules are already documented project-wide
— you must not duplicate these in the per-module `AGENTS.md`.

### Step 1: Parallel Analysis

Spawn **6 Explore subagents in parallel** (Subagents 1–3 produce AGENTS.md Parts 1–3 from the
code, Subagent 6 produces Part 4 candidates, Subagents 4–5 produce CONTRACTS.md and
INTEGRATIONS.md). Provide each subagent with the module path, the appropriate constraint tier
(A or B), and clear instructions on what to extract.

Each per-subagent reference file below is a **paste-ready prompt**: read the file, then send its contents (substituting the module path) as that subagent's prompt. Do not paste more than one file into any single subagent — each file already contains the full brief and the relevant output-constraint tier inline.

| Subagent | Role                                                                      | Prompt file                                                                                        |
|----------|---------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| 1        | Problem Domain Analysis (Part 1 of `AGENTS.md`)                           | [`references/subagent-1-problem-domain.md`](references/subagent-1-problem-domain.md)               |
| 2        | Strategic Design Assessment (Part 2 + Capabilities)                       | [`references/subagent-2-strategic-design.md`](references/subagent-2-strategic-design.md)           |
| 3        | Tactical Design Assessment (Part 3 — aggregates, value objects, policies) | [`references/subagent-3-tactical-design.md`](references/subagent-3-tactical-design.md)             |
| 4        | Published Contracts (`CONTRACTS.md`)                                      | [`references/subagent-4-published-contracts.md`](references/subagent-4-published-contracts.md)     |
| 5        | Consumed Contracts (`INTEGRATIONS.md`)                                    | [`references/subagent-5-consumed-contracts.md`](references/subagent-5-consumed-contracts.md)       |
| 6        | Engineering Practices (Part 4 of `AGENTS.md`)                             | [`references/subagent-6-engineering-practices.md`](references/subagent-6-engineering-practices.md) |

### Step 2: Merge, Curate, and Rewrite

This is an **active editing step**, not passive concatenation. Collect results from all six
subagents and:

1. **Route misclassified content across the Part 3 / Part 4 boundary.** Part 3 is **structural**
   (tables + lists of aggregates, VOs, reactive policies); Part 4 is **engineer-curated numbered
   rules**. If a Subagent-3 output contains numbered prose rules (a "Domain Model", "Module
   Boundaries", "Layer Separation", or "Testing" subsection with numbered bullets), that content
   belongs to Part 4 — route to the appropriate subsection before assembling. If a Subagent-6
   output contains an aggregate / VO catalogue or a reactive-policy table, route it back to
   Part 3. Typical confusions: "Aggregate Conventions" rules (state-via-methods, invalid-
   transition exceptions, events on aggregate) are Part 4; the aggregate itself (class name +
   behaviours) is Part 3.
2. **Apply the Part 4 preservation rule** documented in §AGENTS.md structure (Part-responsibility
   model). In update mode, substitute Subagent 6's output with the existing Part 4 content
   verbatim, and present Subagent 6's output to the user separately as "candidate additions for
   your review" — never merged silently.

Then run every check in [`references/quality-checklist.md`](references/quality-checklist.md)
against the assembled output. Defects surfaced by the checklist are fixed in this same pass —
the checklist is the verification spec, not a separate later step. The classification rules used
during routing live in [`references/content-principles.md`](references/content-principles.md)
(§Business documentation, §Actors vs Reactive Policies).

Assemble `AGENTS.md` in this order:

```markdown
# <Module Display Name>

| Item                      | Value                                              |
|---------------------------|----------------------------------------------------|
| **Ownership**             | <team or domain — ask user if unknown, else "TBD"> |
| **Product Page**          | <link if known, else "TBD">                        |
| **Module classification** | <Core Domain / Supporting Subdomain / Generic Subdomain> |

*Last verified against code: <YYYY-MM-DD, the current run date>*

## Part 1: Problem Domain Analysis

### Problem Statement
<from Subagent 1 — 2-3 sentences>

### Core Business Processes
<from Subagent 1 — 3-5 processes; each process has bolded name + text-based visualisation +
2-3 key-characteristic bullets (see subagent-1 for the visualisation menu and the no-diagram-
is-a-defect rule).>

### Business Rules & Constraints
<from Subagent 1 — table format, 5-10 business rules with concrete values>

## Part 2: Strategic Design Assessment

### Domain Classification: <type>
<from Subagent 2 — 1-2 sentence rationale>

### Bounded Context Boundaries
See `CONTRACTS.md` for what this module publishes and `INTEGRATIONS.md` for what it consumes —
the table below is a map; full shapes live in those files.

<from Subagent 2 — table with columns: Context, Relationship, Coupling, Details.
Details column links into `INTEGRATIONS.md#<anchor>`.>

### Ubiquitous Language
<from Subagent 2 — table format>

### Actors
<from Subagent 2 — table only (no surrounding prose, no footnotes pointing to Part 3 — the
exclusion of subscribers is a design decision, not a doc artefact).>

### Capabilities and Rules
<from Subagent 2 — shared rules first, then per-actor capability tables.
Actors here MUST match the Actors table in Part 2.
Capabilities describe business actions, NOT technical command/query names.
Use #### for sub-headers (e.g., #### Shared HTTP Access Rules, #### Customer User).>

## Part 3: Tactical Design Assessment

### Architectural Style
<from Subagent 3 — one paragraph; always present (subagent-3 details the deviations-only rule).>

### Aggregates
<from Subagent 3 — table with columns `Aggregate | Behaviors`. Aggregate column uses the class
name verbatim (Tier A exception). Behaviors column is a bulleted list (inline `<ul><li>…</li></ul>`)
of business-language named behaviours derived from public methods / emitted events / state
transitions. Omit section if the module has no aggregate roots.>

### Value Objects
<from Subagent 3 — flat bulleted list. One bullet per VO class name, each as `` **`ClassName`** ``
plus a short business-purpose fragment. State-pattern interfaces are followed by a
parenthetical list of their implementations. Enum types may note their cases inline
(e.g., `ReportStatus` (enum) — `NotCreated`, `InProgress`, `Completed`, `Failed`). Omit section
if the module has no VOs. This section is the second Tier A exception for class names.>

### Reactive Policies *(only if the module has in-process event subscribers beyond external-callback receivers)*
<from Subagent 3 — three-column table `Policy | When | Then`; subagent-3 covers consolidation
and the no-class-names rule. Omit the entire section if the module has no such policies.>

## Part 4: Engineering Practices

<When emitting a fresh Part 4 (per §AGENTS.md structure, Part-responsibility model): emit this
banner immediately after the `## Part 4: Engineering Practices` header:

*Part 4 is engineer-curated. The entries below are candidates detected from the codebase —
review, edit, add, or remove as your team sees fit. Subsequent regenerations of this file
preserve Part 4 verbatim unless you explicitly opt into replacing it.*

When preserving Part 4: carry it over verbatim, including any banner state the engineer left.>

### Aggregate Conventions *(omit if empty)*
<from Subagent 6 — numbered rules about aggregate coding (state-via-methods, invalid-transition
handling, domain-event collection, etc.). Business-language only; no class names.>

### Integration Boundaries *(omit if empty)*
<from Subagent 6 — numbered rules about crossing context boundaries (ACL for externals,
identifier-only foreign refs, etc.).>

### Access Control *(omit if empty)*
<from Subagent 6 — numbered rules about where access-control logic lives (middleware / query /
application service). Describe the placement pattern; do not prescribe business rules (Part 2).>

### Layer Separation *(omit if empty)*
<from Subagent 6 — numbered rules about read/write-model separation or module-specific layering.>

### Temporal & Serialization *(omit if empty)*
<from Subagent 6 — numbered rules about UTC, encoding conventions, etc.>

### Testing *(omit if empty)*
<from Subagent 6 — numbered rules that add to or differ from root `AGENTS.md`.>

<If all six subsections above are empty, still emit the `## Part 4: Engineering Practices`
heading followed by `_None._` — readers always see the four-part structure.>
```

Assemble `CONTRACTS.md`:

```markdown
# <Module Display Name> — Published Contracts

*Last verified against code: <YYYY-MM-DD, the current run date>*

This document lists every message contract this module exposes to other modules and external
callers. Consumers should treat these as stable; breaking changes require coordination. For the
module's business description, see `AGENTS.md`. For what this module consumes from other
modules, see `INTEGRATIONS.md`.

<Subagent 4 output — Queries handled / Integration events emitted / HTTP endpoints exposed.
Include "_None._" under any empty heading rather than removing the heading.>

## Versioning & Compatibility

Additive changes are safe (new optional fields, new events, new endpoints). Breaking changes —
removing fields, renaming messages, tightening validation — require announcement to consumers
and a migration plan. When in doubt, introduce a new versioned message rather than mutating
an existing one.
```

Assemble `INTEGRATIONS.md`:

```markdown
# <Module Display Name> — Upstream Dependencies

*Last verified against code: <YYYY-MM-DD, the current run date>*

This document captures what this module consumes from other modules and external services, the
shape of the data exchange, our assumptions, and our failure strategy. Upstreams may not
publish equivalent contracts — these are consumer-side expectations, maintained by this
module. If an upstream later publishes its own `CONTRACTS.md`, the corresponding section here
shrinks to a pointer plus our Consumer class, assumptions, and failure handling.

<Subagent 5 output, in this order:
- `## Dependency summary` — one-row-per-upstream table (internal + external together).
- `## Internal module dependencies` — one card per upstream, each with **Outbound communication** (messages we dispatch) and **Inbound communication** (events this upstream publishes that we subscribe to). Both subsections are always present; use `_None._` under the one that's empty. Cards separated by `---`.
- `## External service dependencies` — one card per upstream, each with **Outbound communication** (HTTP / queue calls we make) and **Inbound communication** (callbacks / webhooks we receive). Cards separated by `---`.
- `## Self-subscribed integration events` — single table listing integration events this module publishes and re-consumes itself (placed last as an appendix-style section — these are intra-module lifecycle loops, not upstream dependencies). Scope is self-only — cross-module events belong in the Inbound communication of their publisher's card.

Tables are the default format; prose is only used for Business semantics (short bullets).
Nested bullet lists are not used. Include `_None._` under any empty heading rather than
removing the heading.>
```

### Step 3: Final Gate Before Write

The checklist run in Step 2 is the substantive review. This step is the explicit go/no-go: scan
the assembled `AGENTS.md`, `CONTRACTS.md`, and `INTEGRATIONS.md` against
[`references/quality-checklist.md`](references/quality-checklist.md) one final time and confirm
every blocking item passes. Items 1, 11, 15, and 18 in the checklist are blocking — a single
unresolved defect there means the files are not safe to write.

### Step 4: Write Files

Write the following four files under `src/Modules/<ModuleName>/`:

1. `AGENTS.md` — assembled Part 1 / Part 2 / Part 3 / Part 4 content. Apply the Part-
   responsibility model documented in §AGENTS.md structure (above) to decide whether Part 4 is
   preserved or replaced.
2. `CLAUDE.md` — exactly:
   ```
   # All instructions and rules in AGENTS.md
   - @AGENTS.md
   ```
3. `CONTRACTS.md` — assembled published-surface content. If the module has no published
   surface at all (no queries, integration events, or HTTP endpoints — rare), still write the
   file with each section heading followed by "_None._" and the Versioning section. The
   file's presence signals "we checked."
4. `INTEGRATIONS.md` — assembled consumed-surface content. Same rule: if the module has no
   upstream dependencies, write the file with each section heading followed by "_None._".
   Do not skip file creation.

Present all four generated files to the user for review. Ask if any sections need
adjustment, particularly:
- Ownership and Product Page values
- Business rules accuracy
- Missing capabilities or actors
- Missing or incorrect contract entries in `CONTRACTS.md`
- Missing upstreams, wrong assumptions, or unclear consumed-shape cells in `INTEGRATIONS.md`
