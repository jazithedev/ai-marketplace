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
disciplines — a human-maintained catalogue. The skill **must not silently overwrite Part 4**;
on update runs it preserves the existing Part 4 verbatim and offers any newly detected
candidates as review suggestions. On brand-new files Part 4 is emitted with a banner signalling
that entries are candidates for human curation.

## Content Principles

### Business documentation (AGENTS.md)

`AGENTS.md` must survive code refactoring. It describes WHAT the module does and WHY decisions
were made — not HOW things are implemented.

**INCLUDE in AGENTS.md:**
- Business rules with concrete values (limits, timeouts, thresholds)
- Domain concepts and ubiquitous language specific to this module
- Actor capabilities and their access/authorization rules
- Architectural boundary rules specific to this module
- Inter-module and external service communication patterns (at summary level — detail lives in the contract files)

**EXCLUDE from AGENTS.md:**
- Class names, method names, file paths, or namespace references (e.g., `InsightRepository::save()`, `Domain/Entity/Insight.php`, `LocationInsightsGenerator`, `InsightsAccessChecker`) — **two narrow exceptions in Part 3: §Aggregates row labels use the aggregate's class name, and §Value Objects is a flat list of VO class names. Nowhere else.**
- Interface names (e.g., `BrightLocalBrainClientInterface`, `InsightsViewRepositoryInterface`) — **exception: a state-pattern interface (e.g., `InsightAvailabilityStateInterface`) may appear in Part 3 §Value Objects when its implementations are the actual VOs.**
- Command / Query / Integration Event class names — those belong in `CONTRACTS.md` / `INTEGRATIONS.md`, not here
- Code snippets or implementation examples
- Generic DDD observations true for any module (e.g., "Value Objects are immutable and validate at construction", "Repository interfaces live in Domain, implementations in Infrastructure", "Adapters only translate input to commands/queries" — these are universal, not module-specific)
- Rules already documented in the project root AGENTS.md — do not duplicate them
- Assessment verdicts, improvement suggestions, or anti-pattern observations
- Implementation patterns disguised as business rules (e.g., "Callback job committed before API call" is an implementation detail; the business rule is "Race condition prevention for async callbacks")
- Feature-flag keys (e.g., `LM_LOCATION_INSIGHTS_TOOL_ACCESS_ENABLED`), subscription capability enum values (e.g., `AI_INSIGHTS`), HTTP route paths (e.g., `/seo-tools/admin/location-dashboard/.../insights*`), and middleware / adapter / gateway class names — these are wire-level identifiers. The published form lives in `CONTRACTS.md` (endpoint paths + auth summary); the consumed form lives in `INTEGRATIONS.md` (the upstream module card that owns the flag or capability). AGENTS.md names the *role* (e.g., "Module Feature Flag", "Module Access Override", "AI Insights subscription capability"), never the token.

When documenting a domain rule, describe the BUSINESS constraint, not the code that enforces it:
- GOOD: "Max 2 insight generations per location per calendar month"
- BAD: "UsageLimitChecker validates against the monthly_usage_count column"
- GOOD: "A Module Access Override grants access without the AI Insights subscription capability"
- BAD: "`LM_LOCATION_INSIGHTS_FORCE_ENABLED` bypasses the `AI_INSIGHTS` subscription capability check"

### Actors vs Reactive Policies

An **Actor** initiates interaction with the system from outside: humans, crons, upstream modules calling us synchronously, external services calling back. They cross our boundary, so they have a **channel** (HTTP, CLI, queue, webhook) and an **authentication** story.

A **Reactive Policy** is an internal rule that reacts to events already inside our system. Its trigger is a domain or integration event — a signal that's part of what the system *does*, not a caller reaching in. Policies have no channel and no authentication because nobody is "calling" them.

**Concrete rules for AGENTS.md:**

- In-process event subscribers that react to events published by other modules, by ourselves, or by the framework-shared event bus are **policies, not actors**. Do **NOT** list them in Part 2's Actors table.
- A queue worker that processes an **external service's** async callbacks IS an actor (it's our inbound boundary for that service). An event subscriber sitting inside our process is NOT.
- The actor that triggered a policy's reaction is already captured elsewhere: upstream events come from a bounded context in the map; self-published events come from actors (Customer User, Cron, Callback Worker) driving state changes.

**Every reactive policy has two layers:**

| Layer | Content | Home |
|---|---|---|
| Business intent | "When X happens, we do Y so that Z" — a product-visible intent | Part 1 (Core Business Processes or Business Rules), **but only if the intent isn't already covered there** |
| Reactive mechanism | That we react via an in-process subscriber to a specific event | Part 3 (new **Reactive Policies** subsection) |

**Decision tree when you encounter a policy:**

1. Does it encode intent a product manager would recognise as a distinct process or rule? → Add that intent to Part 1.
2. Is it already implicit in an existing Part 1 process/rule (e.g., re-validating a payload already required by a Business Rule)? → No Part 1 addition.
3. Is it purely a UX/delivery concern (e.g., realtime push)? → No Part 1 addition.
4. Always document the reactive mechanism in Part 3, regardless of 1–3.

Good examples:

- **Auto-seed on report completion.** Business intent (Part 1): generation can be triggered by the customer OR auto-seeded by the system when source data completes. Mechanism (Part 3): we react to the upstream report-completed event and dispatch a pending-creation command.
- **Realtime availability push.** No Part 1 addition — it's a UX/delivery choice. Mechanism (Part 3): on our own availability-change event, push to the customer's live channel.
- **Post-completion structural validation.** The rule "AI responses must conform to a structure" is already a Business Rule in Part 1. No Part 1 addition. Mechanism (Part 3): defensive re-validation after completion that alerts on violations.

### Contract documentation (CONTRACTS.md / INTEGRATIONS.md)

These files document the **wire-level surface** — the names other modules use to reach in, and
the names we use to reach out. A command or query class name is NOT an implementation detail
here; it is the identifier consumers put in their `use` statement. Paraphrasing it away ("the
query for fetching insights") defeats the file's purpose.

Rule of thumb: **if a symbol name is read by another module or by the wire format, it's a
contract identifier and must appear verbatim. If only this module's own developers read it,
it's implementation and must not appear.**

**Upstream identity in `INTEGRATIONS.md`** — name each upstream by its **role or internal abstraction**, never by the vendor / implementation identifier:
- ✅ `BrightLocalBrain` (the internal / domain name our code uses), `Alerting Service` (role — what it does for us), `Feature Flag Store` (role), `Email Provider` (role)
- ❌ `SeoBrain` (the external vendor's service identifier), `Sentry`, `LaunchDarkly`, `SendGrid`

The abstraction survives a vendor swap; the implementation identifier changes the day we migrate providers. This applies to the card header (`### <Upstream>`), the dependency-summary row, and the `Details` anchor link in AGENTS.md's Bounded Context Boundaries table. Vendor-specific implementation facts (SDK function names, service discovery string keys, proprietary header names) may appear inside `Transport` / `Consumer` / `Business semantics` cells **only where they describe how we talk to the upstream** — never as the upstream's identity.

Rule of thumb: the namespace your module uses under `Infrastructure/` is usually the right upstream name (`Infrastructure/BrightLocalBrain/` → `BrightLocalBrain`). If no internal abstraction exists, use the role (`Alerting Service`, `Feature Flag Store`, etc.).

**Long-name-plus-shortcut rule** — some upstreams have both a long domain name and a commonly-used short form (e.g. `Citation Tracker` → `CT`, `Local Search Grid` → `LSG`, `Reputation Manager` → `RM`). When both exist, give the long form on first mention as `Long Name (SHORT)`, then use the short form thereafter to keep the file scannable:

- **Dependency-summary row** (`Upstream` cell) — first mention for the reader → long form: `Citation Tracker (CT)`.
- **Card heading** (`### <Upstream>`) — short form: `### CT` (auto-slug `#ct`, so AGENTS.md anchor links stay short too).
- **Card Summary row** — may repeat the long form once if the abbreviation alone isn't self-evident: "CT supplies the Citation Tracker report and last-run timestamp…".
- **Prose inside the card** (Business semantics, Transport, Consumer names in cells) — short form: `CT`, `LSG`.
- **AGENTS.md Bounded Context Boundaries** `External Context` cell — long form first mention: `**Citation Tracker (CT)** (module)`; Details anchor uses the short slug: `INTEGRATIONS.md#ct`.

If a short form doesn't exist in the codebase (e.g. `Subscription`, `User`, `Location` — already short and unambiguous), there's nothing to abbreviate; use the same name everywhere. Invent a short form only when the module itself uses one (imports, directory names, enum cases like `ReportType::CT`). Do not coin abbreviations on the fly — readers won't recognise them.

**Allowed (and required) in CONTRACTS.md / INTEGRATIONS.md:**
- Command, Query, and Integration Event class names
- Public DTO / Response type names (e.g., `GetInsightsResponse`, `InsightDTO`)
- Field names with their scalar or value-object types (`customerId: int`, `status: InsightStatus`)
- Feature-flag keys and subscription capability enum values
- External HTTP paths and methods

**Still forbidden in CONTRACTS.md / INTEGRATIONS.md:**
- Handler class names (e.g., `GetInsightsQueryHandler`) — implementation
- Repository, Service, Gateway, Client class names — implementation
- File paths beyond `src/Modules/<ModuleName>/`
- Namespace references (`Modules\...`)
- PHP syntax tokens (`::`, `->`, `$`, `\`)
- Method bodies or code snippets

## Shared Subagent Output Constraints

There are two constraint tiers. Each subagent prompt MUST include the appropriate tier verbatim.
This prevents leakage at the source rather than relying solely on post-hoc quality review.

### Tier A — AGENTS.md subagents (Subagents 1, 2, 3, 6)

```
CRITICAL OUTPUT CONSTRAINTS — read these before writing ANY output:
1. NEVER output class names (e.g., InsightRepository, LocationInsightsGenerator, InsightsAccessChecker). TWO NARROW EXCEPTIONS, Subagent 3 ONLY: (a) Part 3 §Aggregates uses the aggregate entity's class name as each row's label; (b) Part 3 §Value Objects is a flat list of VO class names (and state-pattern interfaces whose implementations are VOs). NO other subagent (1, 2, 6) ever emits class names under any circumstance.
2. NEVER output interface names (e.g., BrightLocalBrainClientInterface, InsightsViewRepositoryInterface). EXCEPTION (Subagent 3 only, Part 3 §Value Objects only): a state-pattern interface whose implementations are VOs may be listed alongside them.
3. NEVER output Command / Query / Integration Event class names — those belong in CONTRACTS.md and INTEGRATIONS.md, not AGENTS.md
4. NEVER output method names (e.g., save(), markAsCompleted(), handle()). The Aggregates table's Behaviors column uses business-language named behaviours ("Create as pending", "Complete with recommendations"), NOT method signatures.
5. NEVER output file paths or directory paths beyond the top-level module directories (Adapter/, Application/, Domain/, Infrastructure/, Resources/, Test/)
6. NEVER output namespace references (e.g., Modules\LocalBrainInsights\Domain\Entity)
7. NEVER output code snippets, PHP syntax (::, ->, $, \), or implementation examples
8. Describe everything in BUSINESS language. If you find yourself naming a PHP class, stop and rephrase as a business concept — unless you are Subagent 3 writing §Aggregates row labels or §Value Objects entries.
9. When listing bounded contexts, only include DIRECT dependencies (modules/services this module calls), not transitive/indirect ones.
10. NEVER output feature-flag keys (e.g., LM_LOCATION_INSIGHTS_TOOL_ACCESS_ENABLED), subscription capability enum values (e.g., AI_INSIGHTS), HTTP route paths (e.g., /seo-tools/admin/...), or middleware / adapter / gateway class names. Describe each by its business role ("Module Feature Flag", "Module Access Override", "AI Insights subscription capability", "location-scoped insight screens"). The verbatim tokens belong in CONTRACTS.md (endpoint + auth summary) and INTEGRATIONS.md (upstream FeatureFlags / Subscription cards).
```

### Tier B — Contract subagents (Subagents 4, 5)

```
CRITICAL OUTPUT CONSTRAINTS — read these before writing ANY output:
1. Command, Query, and Integration Event class names ARE the contract identifiers — output them verbatim. Do NOT paraphrase "GetInsightsQuery" as "the insights query".
2. Public DTO / Response type names ARE contract identifiers — output them verbatim with their field lists.
3. Field names and their scalar or value-object types MUST appear (e.g., `customerId: int`, `status: InsightStatus`).
4. Feature-flag keys, subscription capability enum values, and external HTTP paths/methods MUST appear verbatim.
5. NEVER output handler class names (e.g., GetInsightsQueryHandler) — those are implementation, not contract.
6. NEVER output repository, service, gateway, or client class names — **except** the single class named in the Consumer column of the **Outbound communication** / **Inbound communication** tables (internal and external cards) and the `## Self-subscribed integration events` table in `INTEGRATIONS.md`. That class is the anchor developers follow to locate translation logic and is integral to the integration contract. No other cell ever names a service / gateway / adapter / checker class.
7. NEVER output file paths beyond `src/Modules/<ModuleName>/`, namespaces (Modules\...), or PHP syntax tokens (::, ->, $, \).
8. NEVER output method bodies or code snippets.
9. Every section header and every message name should be anchor-friendly (plain ASCII, no special chars beyond hyphen/underscore).
10. `INTEGRATIONS.md` upstream identity must be a role or internal abstraction, never a vendor / implementation identifier. Name the card `BrightLocalBrain` (not `SeoBrain`), `Alerting Service` (not `Sentry`), `Feature Flag Store` (not `LaunchDarkly`). Implementation-specific facts (SDK function names like `Sentry\captureException`, service discovery string keys like `'SeoBrain'`) may appear inside `Transport` / `Business semantics` cells only where they describe how we talk to the upstream — never as the card header, the dependency-summary row, or the AGENTS.md cross-reference anchor.
11. **Class-name manifest (mandatory).** You MUST produce — alongside your markdown output — a `CLASS-NAME MANIFEST` block that lists every class name appearing in your markdown, with the absolute file path where each class is declared and the line number of its `class`/`interface`/`enum` keyword. Format each entry as a single line: `ClassName — /absolute/path/to/File.php:L<line>`. A class is any backticked PascalCase token inside a table cell, list item, heading, or prose sentence — Message class names, Consumer/Receiver class names, Response/DTO/View types, payload wrappers, Event class names, and every expansion level of a DTO tree. Before writing a class name anywhere, run `grep -rn "^class ClassName\|^final class ClassName\|^readonly class ClassName\|^final readonly class ClassName\|^interface ClassName\|^enum ClassName\|^abstract class ClassName" /home/jazi/www/tools/src/` (or similar, covering class / final / readonly / abstract / interface / enum declarations) and confirm the class exists at the exact name. If a class cannot be located, DO NOT invent or paraphrase a plausible-looking name — say `<ClassName unresolved — please verify>` in the markdown and flag the row for review rather than shipping a fabrication. The manifest is a verification receipt; the skill's assembly step re-greps every backticked PascalCase token against it.
```

## Workflow

### Step 0: Locate and Scan the Module

Find the module at `src/Modules/<ModuleName>/`. If it doesn't exist, tell the user and stop.

Check if the module already has an `AGENTS.md`. If so, ask the user: regenerate from scratch, or
update the existing one? Repeat the question for `CONTRACTS.md` and `INTEGRATIONS.md` only if
the answer is "update" — regeneration replaces all four files together.

**Part 4 preservation rule.** `AGENTS.md` Part 4 (Engineering Practices) is engineer-curated —
it captures the team's highlighted conventions for this module. Regardless of whether the user
chose "regenerate from scratch" or "update":

- **Update mode:** read the existing `## Part 4: Engineering Practices` section verbatim and
  preserve it. Subagent 6 still runs but its output is offered as "candidate additions for your
  review" after the file is written — never merged into Part 4 automatically.
- **Regenerate-from-scratch mode:** if the module already has a Part 4, still read it and
  confirm with the user one more time before discarding it (Part 4 may reflect months of
  curation). If the user confirms, Subagent 6's output becomes the new Part 4, prefixed with
  the engineer-curation banner (see Subagent 6 brief). If the user changes their mind, preserve
  the existing Part 4 as in update mode.
- **New file (no existing AGENTS.md):** Subagent 6's output becomes the initial Part 4, prefixed
  with the engineer-curation banner.

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

**Subagent 1 — Problem Domain Analysis (Part 1 of AGENTS.md).** Tier A.
Apply the /problem-analyst approach. Analyze the module's domain layer (entities, value objects,
domain services, domain events), application layer (commands, queries, application services),
adapters (HTTP actions, CLI commands, workers), AND event subscribers (reactive policies) to extract:
- Problem statement: what business problem does this module solve? (2-3 sentences)
- Core business processes: **3-5 key workflows** (consolidate related sub-workflows into one process rather than splitting every step into its own process). For each process, emit three things in this order: a bolded name, a **mandatory text-based visualisation**, and 2-3 key characteristics as bullets. Every process gets a visualisation — not just lifecycles — because a diagram is the fastest way for a reader to grasp the shape of the process. Match the diagram form to what the process actually is:
  - **Lifecycle / state machine** (entity moves through named states) → state-transition arrows, e.g. `Pending → Queued → In Progress → Completed/Failed`.
  - **Decision chain / access control** (ordered checks, first match wins) → top-down branching with yes/no labels, e.g.
    ```
    SysAdmin? ─yes→ Granted
      │ no
      ▼
    Feature flag on? ─no→ Denied
      │ yes
      ...
    ```
  - **Prerequisite pipeline / multi-step evaluation** (a chain of gating questions that collectively decide readiness) → vertical pipeline of checks with explicit fall-out states, e.g. `Eligible? ──no→ Not eligible` on each line.
  - **Scheduled sweep / cron job** (periodic batch action) → vertical sequence from tick → find → action, e.g. `Cron tick ▼ Find stale items ▼ Force-fail each ▼ Customer may retry`.
  - **Counter / windowed state** (running tally against a window) → a boxed window with the events that increment it; show both the boundary and the transitions.
  - **Workflow with multiple triggers** → converging arrows into a shared lifecycle (see the `User Request / Auto-Seed → Pending → ...` pattern).
  Use the same ASCII style as other diagrams already in the file: `→`, `▼`, `│`, plain boxes — no Mermaid, no Markdown tables inside the diagram. Keep each visualisation to roughly 1–8 lines. If a process genuinely resists visualisation, that is usually a sign the process is the wrong abstraction (two processes, or a business rule masquerading as a process) — re-shape it rather than skipping the diagram. **When a reactive policy (event subscriber) encodes product-visible intent** (e.g., the system auto-triggers a flow when something external happens), surface that intent here — either as an additional trigger on an existing process (`User Request OR Auto-Seed → ...`) or, if distinct enough, as its own process. The reactive mechanism itself (which event, which subscriber) stays out of Part 1 — that belongs to Part 3.
- Business rules and constraints: a table with Rule and Description columns, including concrete values. **Only genuine business rules** — constraints a product manager would recognize. Exclude implementation patterns (e.g., "callback committed before API call" is implementation; "only one active generation per location" is a business rule). Policy-derived rules (e.g., "auto-seed on X if Y") belong here when they describe a product-visible constraint. Aim for 5-10 rules.

  **Access-control rules are Business Rules.** If the module has a feature-flag gate, a subscription-capability gate, an evaluation/access-override escape hatch, or a sysadmin bypass that **decides whether a customer may invoke a capability at all**, each such gate is a product-manager-visible constraint and must appear in the Business Rules table — named by its role (e.g., "Module Feature Flag", "Module Access Override", "AI Insights Subscription Capability"), never by flag-key or enum-value. The same gates also appear in Part 2 § Shared HTTP Access Rules as the decision *policy* (order of checks). Do **not** pick one or the other — the rule belongs in Part 1 (what the customer must have) and the policy belongs in Part 2 (how the checks are sequenced). A capabilities-and-rules section that documents the gates without any Part 1 row is missing product-visible constraints.

**Subagent 2 — Strategic Design Assessment (Part 2 + Capabilities of AGENTS.md).** Tier A.
Apply the /ddd-architect approach. Analyze the module to extract:
- Domain classification (Core/Supporting/Generic) with 1-2 sentence rationale
- Bounded context boundaries: table of **direct** external contexts (modules/services this module calls directly) with relationship pattern, coupling level, and a `Details` column linking into `INTEGRATIONS.md` anchors (one anchor per row, slug from the context name, e.g. `INTEGRATIONS.md#subscription`). Do NOT include transitive/indirect dependencies.
- Ubiquitous language: table of domain terms with module-specific meanings
- Actors: table of actors that **cross the module boundary** — HTTP users, CLI operators, cron, and queue workers that receive **external-service callbacks** — with channel and authentication. **EXCLUDE internal event subscribers / reactive policies.** An in-process subscriber that listens to domain or integration events (from this module, another module, or a framework-shared event bus) does not initiate interaction from outside the system — its trigger is a signal already inside the system. Such subscribers are documented in Part 3 under **Reactive Policies** (handled by Subagent 3), NOT here. Rule of thumb: if the would-be actor has no channel and no authentication because "nobody is calling it", it's a policy. The actor that originally caused the state change is already captured elsewhere (upstream module in the bounded-context map; self-dispatched from an actor already in the Actors table). **The Actors section contains the table only — do NOT emit explanatory notes, caveats, or pointers to Part 3 below the table.** The table plus the overall doc structure are self-explanatory; the exclusion of policies is a design decision, not something to annotate inline.
- Capabilities and Rules (subsection of Part 2): for each actor (must match the Actors table exactly), list what the actor can do and which business rules apply. Derive capabilities by analyzing CQRS commands, queries, HTTP adapters (actions), and console commands within the module — but describe capabilities as **business actions** (e.g., "Generate insights for a location", "View report history"), never as technical dispatches (e.g., "dispatches GenerateInsightCommand"). Specific command, query, or action names are fragile implementation details here — they belong in `CONTRACTS.md`, not `AGENTS.md`. Group shared access rules first, then per-actor capability tables. Do NOT emit capability subsections for event subscribers — those go to Subagent 3's Reactive Policies section. The `Shared HTTP Access Rules` subsection (and any access-rule content anywhere in AGENTS.md) describes the **decision policy** in domain vocabulary only — the order of checks, what a sysadmin is, what "Module Feature Flag" means, what "Module Access Override" means, what an "AI Insights subscription capability" means. It must not name the underlying feature-flag keys, capability enum values, HTTP route paths, or middleware classes; those are wire-level identifiers and live in `CONTRACTS.md` (endpoint auth summaries) and `INTEGRATIONS.md` (FeatureFlags / Subscription upstream cards). The same rule applies to the Business Rules table in Part 1 and to any Core Business Process diagram — the access-control diagram uses role names, never the enum value.

**Subagent 3 — Tactical Design Assessment (Part 3 of AGENTS.md).** Tier A with the two class-name exceptions spelled out in the Tier A constraint (§Aggregates row labels and §Value Objects list).

Part 3 is **structural, not prose** — tables and lists that enumerate the module's tactical-DDD building blocks. No numbered prose rules. Rules about *how* aggregates are coded, how integrations are wrapped, how access control is implemented, etc., all belong in Part 4 (Subagent 6).

Emit exactly these subsections, in this order:

1. **Architectural Style** — one short paragraph. If the module's top-level layout matches the project-wide standard hexagonal layout (`Adapter/`, `Application/`, `Domain/`, `Infrastructure/`, `Resources/`, `Test/`) exactly, emit a one-sentence pointer at the root `AGENTS.md` §Project Structure and the phrase "No module-specific deviations from the project-wide structure." Only emit a full 2-level directory tree when the module deviates (adds an extra top-level directory, omits one, uses different names, or is not hexagonal). This section is always present.

2. **Aggregates** — a table with two columns, `Aggregate | Behaviors`. Scan `Domain/Entity/` (or the equivalent location of aggregate roots) and emit one row per aggregate root. `Aggregate` uses the class name verbatim — this is one of the two Tier A exceptions. `Behaviors` is a bulleted list (use `<ul><li>…</li></ul>` inline so the cell renders as a list) of **business-language named behaviours** — names a domain expert would recognise (e.g., "Create as pending", "Complete with recommendations", "Fail with reason"). Derive behaviours from the aggregate's public methods, emitted domain events, and state-machine transitions — but **rename them in business terms**; the Behaviors column is never a list of method signatures. Omit the section if the module has no aggregate roots.

3. **Value Objects** — a flat bulleted list of value-object class names, one per bullet. Scan `Domain/ValueObject/` (and any state-pattern folder such as `Domain/Service/**/State/`) for `final readonly class` declarations, enum types, and state-pattern interface implementations. Emit each as `` **`ClassName`** `` plus a short business-purpose fragment (a few words). This is the other Tier A exception — class names appear verbatim here. When a state-pattern interface has many implementations (e.g., an `InsightAvailabilityStateInterface` with 8 concrete states), emit the interface once followed by a parenthetical list of its implementations. Enum types may note their cases inline (e.g., `ReportStatus` (enum) — `NotCreated`, `InProgress`, `Completed`, `Failed`). Omit the section if the module has no VOs.

4. **Reactive Policies** — **only if the module has in-process event subscribers** (classes under `Application/EventListener/`, `Subscriber/`, or tagged `kernel.event_subscriber`) that are NOT external-callback receivers. Emit a table with three columns: `Policy | When | Then`. No intro paragraph, no closing note, no argumentation. One row per policy. `Policy` is a short business-language name. `When` is the business-language trigger — NOT the event class name (event class names belong in INTEGRATIONS.md). `Then` is the resulting reaction in one line. **Consolidate semantically equivalent policies** (e.g., two subscribers translating different upstream lifecycle events into the same availability-state refresh → ONE row). Omit the whole section if the module has no such policies.

**Do NOT emit** a Domain Model, Domain Layer, Module Boundaries, Layer Separation, Testing, or any other prose-rule subsection in Part 3. Rules about how aggregates are coded ("state mutations go through aggregate methods", "invalid transitions raise domain exceptions", "domain events collected on the aggregate"), how integrations are wrapped ("externals behind an ACL"), how access control lives ("permission checks in middlewares"), and test idioms all belong to Part 4 — Subagent 6 handles them. If you find yourself writing a numbered rule for Part 3, stop and ask: does this add a fact the Aggregates/Value Objects/Reactive Policies tables don't already convey? If no, drop it. If yes, it's probably a Part 4 Engineering Practice — route it to Subagent 6.

**Important: Also provide Subagent 3 with a summary of key root AGENTS.md rules** so it knows what to exclude. At minimum mention: CQRS for inter-module communication, repository interfaces in Domain / implementations in Infrastructure, adapters as thin translation layers, domain events in `Domain/Event/` and integration events in `Application/IntegrationEvent/`, AAA test pattern, fake repositories with single-array state, #[CoversClass] and #[Override] attributes, data providers for edge cases.

**Subagent 6 — Engineering Practices (Part 4 of AGENTS.md).** Tier A — no class-name exceptions apply here (those are Subagent 3's alone).

Part 4 is **engineer-curated**, not machine-authoritative. Subagent 6's job is to **propose candidates** a team might want to codify — not to assert rules the code "must" follow. Every candidate rule should survive the test: "Would a new contributor to this module benefit from knowing this *and* is it something the engineers have deliberately chosen, not a generic DDD/PHP convention?" Ship fewer, sharper candidates over a long noisy list.

Scan the module's code for detectable conventions and emit the following `###` subsections — each optional, each omitted if empty:

- **Aggregate Conventions** — module-specific patterns for coding aggregates: do state mutations go through named methods (not direct field access)? Are invalid transitions signalled by domain exceptions? Are domain events collected on the aggregate during transitions? Numbered rules, business-language phrasing, no class names.
- **Integration Boundaries** — module-specific patterns for crossing context boundaries: ACL wrapping for externals, identifier-only modelling of foreign references, etc. Describe the convention, not the specific vendor.
- **Access Control** — where access logic lives in this module (middleware / query handler / application service). Describe the placement pattern; do not prescribe business rules, those are Part 2.
- **Layer Separation** — read/write-model separation or other module-specific layering rules that are NOT in root `AGENTS.md`.
- **Temporal & Serialization** — UTC discipline, encoding conventions, anything mechanical about data shape that's module-specific.
- **Testing** — module-specific testing idioms that **add to or differ from** root `AGENTS.md` (e.g., if root says "stubs over mocks" and this module mandates "fakers over stubs", that's a module addition worth recording).

Framing rules for the output:
- Every subsection header must be one of the six names above — no custom section names. This keeps the file scannable across modules.
- Numbered rules, one sentence each where possible. Two sentences max.
- No class names, method names, file paths, or namespace references anywhere in Part 4.
- Do not emit generic DDD truisms ("domain layer is framework-agnostic"). Do not emit rules that duplicate root `AGENTS.md`.
- Emit candidates as **detections**, not prescriptions. When assembling the file, the output is prefixed with an "engineer-curated candidates — please review" banner (see Step 2 merge rules). An engineer decides which candidates become codified conventions.

Provide Subagent 6 with the same root-AGENTS.md exclusion summary given to Subagent 3. Additionally tell it: "Prefer to omit a subsection rather than invent weak content. A module that genuinely has no module-specific engineering conventions beyond root AGENTS.md ends up with a nearly-empty Part 4 — that is a valid outcome, not a defect."

**Subagent 4 — Published Contracts (CONTRACTS.md).** Tier B.
Scan the module's public surface. For each category below, extract every entry found and emit
the structured output described. Use "_None._" under headings that have no entries.

Directories to scan:
- `Application/Query/` — top-level Query classes (ignore `*Handler`). For each: class name, public fields with types, return type. If the return type is a DTO/Response class, expand its public fields and types. Include a 1-line business purpose.
- `Application/IntegrationEvent/` (and any integration-event folder) — each integration event. Extract: class name, public fields with types, the domain condition that triggers emission (read the emitter code), and delivery semantics if distinguishable (sync vs async, retries, idempotency).
- `Adapter/Http/` — HTTP routes exposed. For each: method + path (from route config or action attributes), visible auth/middleware, request body shape (from the action's input mapping), response shape.

**DTO recursion — expand every reachable type to its leaves.** When a query's return type, a response DTO's field, or an HTTP endpoint's response shape contains another class/DTO/View type, **recurse**: list that inner type with its own fields one level below. Continue until every reachable type is either a scalar (`int`, `string`, `bool`, `float`), an array of scalars, a nullable scalar, or a shared value object already documented elsewhere (in which case reference it by name without re-expanding). Do **not** stop at the first level — consumers read CONTRACTS.md to know the exact shape they will receive; leaving `InsightDTO`, `BusinessAnalysisDTO`, `LocationDto`, `Pagination`, etc. as leaf references hides that shape. A good rule of thumb: if a human reader would have to open the class to know the field list, the expansion is incomplete. Emit the expansion as a sub-bullet chain under the top-level `Returns:` line, one class per indented bullet. When a DTO is reused across multiple queries, expand it the first time and cross-reference (`see <QueryName> above`) on subsequent mentions.

**HTTP endpoint Auth phrasing.** The Auth row summarises the middleware chain and required authentication. Prefer natural-language descriptions over raw PHP attribute tokens: "Login required; active subscription required; location access control; insights-access check" reads better than `Requires::LOGIN; SubscriptionRequires::ACTIVE_SUBSCRIPTION; LocationAccessControl; CheckInsightsAccess`. Middleware class names may appear in the Auth row when they carry information the natural-language summary cannot convey (e.g., a rate-limiter or lock middleware whose name is the clearest identifier), but never dump the raw attribute list verbatim.

**HTTP endpoint path-prefix intro paragraph.** When the module has path-based middleware exemptions — routes under one path prefix carry a middleware chain while routes under another prefix are exempted — emit a 2–3 sentence introductory paragraph directly under the `## HTTP endpoints exposed` heading that names the prefixes and summarises which chain each inherits. This is the reader's navigation aid: they should know before reading any endpoint entry which bucket it belongs to. If all endpoints share the same middleware chain, omit the paragraph.

Output format (markdown, exactly this structure):

```
## Queries handled

### <QueryName>
- Fields: `<field: type>`, ...
- Returns: `<ResponseType>` with `{ field: type, ... }`
- Purpose: <1 line>
- Consistency: <only if non-default>

## Integration events emitted

### <EventName>
- Fields: `<field: type>`, ...
- Emitted when: <business condition>
- Delivery: <sync/async, idempotency, ordering if relevant>

## HTTP endpoints exposed

### <METHOD /path>
- Purpose: <1 line>
- Auth: <middleware summary>
- Request body: `{ field: type, ... }`
- Response: `{ field: type, ... }` (or status-only)
```

**Subagent 5 — Consumed Contracts (INTEGRATIONS.md).** Tier B.

**Upstream naming (applies to every card, dependency-summary row, and cross-reference anchor).** Name each upstream by its **role or internal abstraction**, never by the external vendor's service identifier. The default is the namespace your module already uses under `Infrastructure/` (e.g., `Infrastructure/BrightLocalBrain/` → `BrightLocalBrain`; the vendor's own service name `SeoBrain` is an implementation detail that never appears as the card header). When no internal abstraction exists, use the role the upstream plays for us: `Alerting Service` (not `Sentry`), `Feature Flag Store` (not `LaunchDarkly`), `Email Provider` (not `SendGrid`). Vendor-specific implementation facts — SDK function names (`Sentry\captureException`), service discovery string keys (`'SeoBrain'`), proprietary header names — may appear inside `Transport` / `Business semantics` cells **only where they describe how we talk to the upstream**; they must never surface as the upstream's identity. A framework-shared event-names class or event-dispatcher channel (e.g. `Includes\Event\CommonReportEvents`, `Contracts\Event\…`) is **never an upstream** — it is transport. Always resolve it to the module(s) that dispatch instances of those events and attribute inbound rows to those publishing modules.

Scan for everything the module calls out to. Use these sources:
- `Infrastructure/**` and `Application/**` for `commandBus` / `queryBus` dispatches. Trace the dispatched class to its namespace — anything under `Modules\<Other>\...` is an inter-module dependency. Record: external message class name, fields we pass, return type we rely on, and the business role the call plays in THIS module.
- `Infrastructure/Gateway/`, `Infrastructure/External/`, and any vendor-named subfolder (e.g. `Infrastructure/BrightLocalBrain/`) for external HTTP clients. Extract: vendor/service name, transport (HTTP, queue, DB view), addressing (service discovery? fixed URL?), outbound endpoints called (method + path), request shape, response shape. Note timeout and retry configuration if visible.
- Event subscribers (classes tagged `kernel.event_subscriber`, or under `EventListener/` / `Subscriber/` folders). Split them by publisher:
  - **Events published by another module inside the monolith** → attach as rows under that module's card **Inbound communication** table in `## Internal module dependencies`. Identify event name + subscriber (Consumer) class + consumed payload shape + what this module does in response. One row per event.
  - **Framework-shared event-names classes are transport, not a publisher.** When the subscribed event is dispatched via a shared vocabulary class — string constants under `Includes\Event\…` (e.g. `CommonReportEvents`), payload classes under `Contracts\Event\…`, or any non-module-owned namespace used as a Symfony EventDispatcher event name — do a codebase-wide search for the constant / event class to find the actual dispatcher call sites, determine which modules publish it, and attribute **one inbound row per (event, publisher) pair**. If two modules both publish the same event (e.g. both Ct and Lsg dispatch `CommonReportEvents::ON_REPORT_COMPLETED`), the event appears on **both** cards' Inbound tables; narrate that fact in each card's Business semantics bullets (self-contained, per the rule on standalone cards). Mention the shared class in the publisher's `Transport` cell (e.g., `Symfony EventDispatcher (inbound — CommonReportEvents::ON_REPORT_COMPLETED / …)`), not in a card of its own. **Never create a synthetic "event bus" / "CommonReportEvents" / "framework events" / "shared reporting" upstream card** — the shared class is plumbing, and a card for it double-counts dependencies the publishing-module cards already carry.
  - **Events published by this module and re-consumed by this module** (self-subscriptions on integration events) → attach as rows in `## Self-subscribed integration events`.
  - **External services never appear** in either section. Every fact about an external service (including its async inbound callbacks, regardless of how they reach us) lives solely in that service's card under `## External service dependencies`, in its `Inbound communication` table.

**Verification steps — run these while extracting, not only at the end.** The divergences most commonly seen in earlier runs all come from skipping one of these checks:

1. **Upstream-namespace check for every Outbound row.** Before writing `| <MessageClass> | ... |` under any upstream's `Outbound communication`, open the message class file and read its `namespace`. If the namespace starts with `Modules\<ThisModule>\…` the message is this module's own command and must never appear in any upstream card — not even on the card of the module whose event triggered the dispatch. Typical trap: an event subscriber reacts to `Modules\Ct\…` events by dispatching `Modules\<ThisModule>\Application\Command\…` — that command is intra-module orchestration, not a Ct dependency.
2. **Event-dispatcher codebase grep for every inbound event.** For each `CommonReportEvents::*` constant or event class name the module subscribes to, run `grep -rn "<EventConstant>\|<EventClass>" src/Modules/` to locate the actual `->dispatch(...)` call sites. Attribute inbound rows only to the modules that appear as dispatchers. Never attribute an event to a module just because the subscriber is also interested in other events that module publishes — each event has its own publisher set. When two or more modules dispatch the same event, the row appears on each publisher's card (duplicated).
3. **External-inbound Receiver discovery.** List every `Adapter/Worker/*.php` and every webhook-style HTTP action (under `Adapter/Http/`, or actions whose handler dispatches a status-change/callback command). Each must land on exactly one external service's card under `Inbound communication`. Trace the dispatched command to identify the owning service (e.g. `ProcessGenerateInsightsChangeStatusCommand` → BrightLocalBrain status callback → row under BrightLocalBrain's external `Inbound communication`). A module with a status-processing worker but no external `Inbound communication` row anywhere in the file is a contradiction — one of the two is wrong.
4. **Dispatcher discovery before writing `_None._` in any Outbound table.** Before writing `_None._` under any upstream's `Outbound communication`, run a codebase-wide grep against **this module's source** to enumerate every bus dispatch whose target namespace starts with `Modules\<Upstream>\…`. Suggested greps (run each):
   - `grep -rn "commandBus->handle\|commandBus->dispatch\|queryBus->handle\|queryBus->query" src/Modules/<ThisModule>/` — list every dispatch call site in the module.
   - For each hit, open the referenced class and read its namespace; if it starts with `Modules\<Upstream>\…`, that upstream has at least one Outbound row and `_None._` is wrong.
   - Also check `FeatureFlagChecker`, `FeatureAllowanceInterface` implementations, and any other non-bus service calls the module makes into another module — these are still outbound communication even when they bypass the bus.
   `_None._` is only valid when **no** dispatch or non-bus service call in the module's source resolves to a class under the upstream's namespace. A card that reports `_None._` without evidence from this grep is a defect.
5. **Per-Consumer row expansion for hub queries.** When the same Message class is dispatched by **N distinct Consumer classes** within the module (N > 1), emit **N rows** in the upstream's `Outbound communication` table — one row per `(Message, Consumer, Consumed shape)` triple. Do **not** collapse multiple consumers into a single row, even when the Message class and the Fields are identical across call sites, because the Consumed shape usually differs per consumer (one consumer reads name/address, another reads only `customerId()`, a third reads `status`). The per-consumer breakdown is the whole point of the Consumer column — it tells the reader which class owns the translation of which slice. Discover distinct consumers by grepping the module for every dispatch site of the Message class (`grep -rn "new <MessageClass>" src/Modules/<ThisModule>/` and then opening the surrounding class), and emit one row per distinct surrounding class. The same rule applies to Receiver classes in external inbound tables when two Receivers process callbacks of the same shape (rare but possible).

**Domain-event exclusion — apply at classification time.** For every event-class key in an `Application/EventListener/*.php` `getSubscribedEvents()` return value, classify it before deciding where the row goes:

- Lives under `Modules\<ThisModule>\Domain\Event\…` → **domain event**, internal machinery. Does not appear in `INTEGRATIONS.md` at all — not on upstream cards, not in `Self-subscribed integration events`. If a subscriber translates a domain event into an integration event, that's intra-module plumbing that belongs to AGENTS.md Part 3 (Reactive Policies) not to the contract files.
- Lives under `Modules\<ThisModule>\Application\IntegrationEvent\…` or `Modules\<ThisModule>\Application\Event\…IntegrationEvent` → **self-published integration event**. Goes in `Self-subscribed integration events` only if our own class subscribes.
- Lives under `Modules\<OtherModule>\…` and is itself published by that module → **external integration event**. Goes on that module's card `Inbound communication`.
- Lives under `Includes\Event\…` / `Contracts\Event\…` (a framework-shared vocabulary) → **transport, not an upstream**. Resolve publisher(s) via codebase grep (see step 2 above) and attribute one row per (event, publisher) pair on the publishing module(s)' cards.

A `Self-subscribed integration events` table with more than ~3 rows is a red flag — it usually means domain events have been mis-classified as integration events. Re-check every row against the bullets above.

For each upstream entry, also infer and record:
- **Consumer class** — the short class name (no namespace, no file path) of the class that performs the translation. Typically an adapter / gateway / service / checker / event subscriber under `Infrastructure/` or `Application/` that dispatches the query (or calls the external client, or subscribes to the event) and wraps the payload into our domain types. Pick the class closest to the boundary — if a raw DTO is returned by a handler and then wrapped elsewhere, name the wrapper. For inbound events (internal and external, plus self-subscribed integration events), the Consumer is the subscriber class. This is the only place implementation class names appear in the contract files.
- **Consumed shape** — the fields / methods / paths from the upstream's return / response / callback / event payload that the named Consumer class actually reads, expressed as a raw type shape in the **same notation used in the `Fields` / `Request` cells** (`{ field: type, ... }`, `method(): type`, `Foo[]`, string-literal unions, `?` suffix for optional keys). Include `| null` / `| false` **only when** the named Consumer class handles those cases — verify by reading the Consumer class's own source for null/false branches. This column is **self-contained**: the `Consumed shape` is the sole record of what crosses the boundary, for internal-module `Outbound communication` tables (where upstream's full return lives in its own `CONTRACTS.md`), internal-module `Inbound communication` tables (where the publishing module's full event payload lives in its `CONTRACTS.md`), `## Self-subscribed integration events`, and external `Outbound communication` / `Inbound communication` tables (where the vendor's own documentation is the authority on the full contract). The cell answers "what data crosses into our module?" — nothing about what the Consumer produces, nothing about the domain types it wraps the result in, nothing about reductions (e.g. `value > 0`). Produced types and interpretation belong in **Business semantics** (and the Consumer's own return type is visible from its source code); do not restate them here.
- **Retries** — our retry policy for this call (e.g. `Up to 3 attempts, one per resolved address`). If we do not retry, use `-`.
- **Caching** — caching on our side (e.g. `60s TTL`, `request-scope only`). If we do not cache, use `-`.
- **Receiver** *(Inbound communication only)* — the short class name of the adapter where the external callback lands on our side: an HTTP controller, queue worker, or webhook action (typically under `Adapter/Http/` or `Adapter/Worker/`). Annotate the kind in parens so the reader knows how to interpret it: `LocationInsightsStatus` (queue worker), `SeoBrainWebhookAction` (HTTP POST), etc. This complements `Consumer`: the Receiver is the entry point, the Consumer is the class that translates the payload into our domain.
- **Used by** — the business areas within this module that depend on this upstream. Do **not** emit as a separate paragraph; fold it into the `Coupling` cell of the `Dependency summary` table as a parenthetical `(used by: A, B, C)`. The surface-count summary stays before the parenthetical; the usage-site list lives inside it.

Provide the subagent with the module's existing Part 2 "Bounded Context Boundaries" table (if
one is already present in `AGENTS.md`) so its output stays consistent. The set of contexts in
`INTEGRATIONS.md` must be a **superset-or-equal** of that table — if an outbound call isn't in
the table, surface that as a discrepancy in the output.

Output format. **Use tables wherever the data is structured — reserve prose only for business
semantics.** Nested bullet lists are banned: they produce a wall of text that is hard to scan
when a module has many upstreams. Separate per-upstream cards with a `---` horizontal rule.

First, emit a **dependency summary** — one row per upstream, covering both internal and
external in a single table so the reader can grasp the module's dependency footprint in one
glance:

```
## Dependency summary

**Coupling** quantifies how many distinct surfaces (queries, commands, events, HTTP endpoints, async callbacks) we consume from each upstream, and across how many Consumer classes. High coupling means many tightly-bound touch-points — a change in the upstream is likely to ripple; low coupling means one or two well-isolated calls. This is a *count*-based, not a *failure-severity*-based heuristic — it answers "how much of us does this upstream touch" rather than "how bad is it if this upstream breaks".

| Upstream | Type | Transport | Coupling |
|---|---|---|---|
| <name> | Internal / External | <QueryBus sync / HTTP / queue / ...> | <tier> — <surface-count summary> (used by <business area>, <business area>) |
```

**Coupling tiers — assign based on how many surfaces (queries + events + commands + endpoints + callbacks) and how many distinct Consumer classes touch this upstream:**

- **High** — 6+ surfaces, OR 3+ distinct Consumer classes, OR a single query is read by 3+ different Consumer classes (which is itself evidence of deep reach).
- **Medium** — 3-5 surfaces, OR 2 Consumer classes on multiple surfaces.
- **Low** — 1-2 surfaces with a single Consumer class.

The `Coupling` cell is formatted as `<tier> — <surface-count summary> (used by <area>, <area>)`. Example: `High — 11 surfaces: 6 queries read by 5 consumers + 1 integration event (used by availability-state loader, HTTP read endpoints, overview preview repository)`. The tier word is the first word before the em-dash; the count summary is quantitative and auditable (someone should be able to recount by grepping the module).

**Row ordering — apply this sort before emitting the table.** The table is what a reader uses
to grasp the module's dependency footprint at a glance, so the ordering must help them scan
from most-coupled to least-coupled and group the same kind of thing together. Sort by these keys
in order, highest priority first:

1. **Coupling** — `High` → `Medium` → `Low`. The tier adjective is the first word of the `Coupling` cell (before the em-dash). Readers expect the most entangled upstreams at the top; never let a `Low` row sit above a `Medium` one. Stick to these three tiers — do not introduce `Critical` / `Minor` / `Good` etc.; the heuristic is count-based and three tiers are enough.
2. **Type** — `Internal` before `External` within the same coupling tier. This mirrors the
   document's own section order (`## Internal module dependencies` before
   `## External service dependencies`), so a reader's eye tracks the same grouping in the
   summary as in the detail cards below.
3. **Name** — alphabetical ascending (case-insensitive) within the same coupling + type
   tier. This is a stable tie-breaker; nothing in the module's design privileges one upstream
   over another at the same tier, so alphabetical is the least-surprising default.

Then one **card** per upstream under `## Internal module dependencies` and
`## External service dependencies`. Each card follows this exact template:

```
### <Upstream short name>

| Attribute | Value |
|---|---|
| Summary | <1-sentence role this upstream plays for us. First sentence of the first card may expand the short name: "Citation Tracker (CT) supplies…".> |
| Type | Internal module _or_ External service |
| Transport | <QueryBus sync / CommandBus async / HTTP / queue / ...> via <addressing> |
| Coupling | <tier> — <surface-count summary + short qualitative note> |

*(The `Summary` row is always the first row of the attribute table — never emitted as a stand-alone `**Summary:**` paragraph. Keep it to one sentence; longer context belongs in **Business semantics**.)*

*(The `Coupling` row uses the same `<tier> — <count> (used by …)` format as the Dependency-summary table. Keep the two in sync; if the card's Outbound / Inbound tables change, recount and adjust both.)*

#### Outbound communication *(internal modules — messages we dispatch)*

| Message | Fields | Consumer | Consumed shape | Retries | Caching |
|---|---|---|---|---|---|
| `<MessageClass>` | `field: type, field: type` | `TranslatorClass` | `{ field: type, ... } \| null` *(full consumed shape — see Consumed-shape cell rules)* | `-` *or* `<retry policy>` | `-` *or* `<TTL / scope>` |

*(Name the Consumer per row — each message may translate a different slice of the upstream's surface.
Writing a single shared sentence loses that precision. No separate `Returns` column: the upstream module publishes its full return in its own `CONTRACTS.md`, and the consumed-shape cell is the self-contained record of what this module actually reads from that return. Write `_None._` below the heading if we dispatch nothing to this module.)*

#### Inbound communication *(internal modules — events published by this module that we subscribe to)*

| Event | Consumer | Consumed shape | Ordering / idempotency |
|---|---|---|---|
| `<EventClass>` *(or `<EventName>` + payload class if the bus uses string keys)* | `SubscriberClass` | `{ field: type, ... }` *(full consumed shape — see Consumed-shape cell rules)* | <dedup / ordering notes — one short phrase; narrative goes in Business semantics> |

*(Attach each event to the card of the module that **publishes** it — not the module that receives it. A reader opening the upstream's card should see every way that upstream reaches us. Write `_None._` below the heading if this module publishes nothing we subscribe to. Domain events that never leave this module (internal `Domain/Event/*` classes dispatched and consumed inside this module's own event listeners) are not integration contracts and do not appear anywhere in this file.)*

#### Outbound communication *(external services only)*

| Method | Path | Purpose | Request | Consumer | Consumed shape | Retries | Caching |
|---|---|---|---|---|---|---|---|
| <METHOD> | `/path/...` | <1 line> | `{ field: type, ... }` | `TranslatorClass` | `{ field: type, ... }` *(full consumed shape — see Consumed-shape cell rules)* | `-` *or* `<retry policy>` | `-` *or* `<TTL / scope>` |

#### Inbound communication *(external services only, if any)*

*(Keep the heading bare — no parenthetical like `(async, received by a dedicated queue worker)`, `(HTTP POST webhook)`, etc. Transport details belong in the upstream's Attribute-table `Transport` row; anything else belongs in a `Business semantics` bullet. The heading itself stays clean so section skimming isn't bogged down with metadata.)*

| Receiver | Idempotency | Consumer | Consumed shape | Retries | Caching |
|---|---|---|---|---|---|
| `ReceiverClass` *(HTTP controller / queue worker / webhook action — annotate the kind in parens)* | <dedup strategy> | `TranslatorClass` | `{ field: type, ... }` *(full consumed shape — see Consumed-shape cell rules)* | `-` *or* `<retry policy>` | `-` *or* `<TTL / scope>` |

*(No separate `Response` column on outbound or `Payload` column on inbound: the `Consumed shape` cell is the sole record of what crosses the boundary. What the external returns but we do not read is out of scope for this doc — anyone who needs the full external contract should consult the vendor's own documentation. This treats external integrations symmetrically with internal ones: the consumed-shape cell carries the shape, nothing else.)*

**Which block applies — internal vs external card:**

- An **internal module** card carries **Outbound communication** (Messages we dispatch) + **Inbound communication** (events published by this module that we subscribe to). Both subsections are always present; use `_None._` under the one that's empty.
- An **external service** card carries **Outbound communication** (HTTP/queue calls we make) + **Inbound communication** (callbacks / webhooks that reach our Receiver). Same `_None._` rule.
- Never mix the two schemas on one card — an internal card never has `Method` / `Path` rows, an external card never has `Event` rows.

**Retries / Caching cell rules:**

- The `Retries` cell names our retry policy for this call (e.g. `Up to 3 attempts, one per resolved address`). If we do not retry, write `-`. Do not write `None` / `none` — the placeholder is `-`.
- The `Caching` cell names caching on our side (e.g. `60s TTL`, `request-scope only`). If nothing is cached, write `-`.
- Keep the cells terse. Anything beyond a short phrase belongs in **Business semantics** bullets.

**Shape-cell rules — apply to every Fields / Request / Consumed shape cell:**

- **Raw type notation only.** No prose, no inline comments, no trailing "where …" clauses, no "exposes / has predicates / contains" phrasing. The cell should read as a type signature, nothing else.
- Use TypeScript-ish union / option / literal notation: `{ field: type, ... }`, `T \| null`, `T \| false`, `'a' \| 'b' \| 'c'` for known string enums, `Foo[]` for collections, `?` suffix on optional keys.
- Method-shaped accessors stay as `name(): type` inside the object literal (e.g. `{ is_ok(): bool }`) — don't paraphrase into prose.
- **Elide irrelevant fields with `...`.** When the returned/inbound type exposes far more than this integration uses (e.g. a `UserInterface` with many methods, we only call one), show only the fields/methods the Consumer actually reads and mark the rest with `...`: e.g. `{ ..., is_sysadmin(): bool }`. That tells the reader "this type has more, but the rest is out of scope for this integration." Reserve `...` for meaningful elision — don't use it when the shape is small enough to list in full.
- If there's genuinely useful context that doesn't fit type notation (what a field means, a constraint on the value we always pass, why a field exists), move it to **Business semantics** bullets or to the **Purpose** column. Never use it to annotate a shape cell.
- If a shape is genuinely too large for a cell, put `see below` in the cell and put a fenced code block with the full type immediately after the table. The full type in the code block still follows the same raw-notation rule — no prose mixed in.

**Consumed-shape cell rules — apply to every consumed-shape cell (internal Outbound-communication, internal Inbound-communication, Self-subscribed integration events, external Outbound-communication, external Inbound-communication):**

The consumed-shape cell **IS a shape cell** (the Shape-cell rules above apply). Think of it as the slice of the upstream's return / response / callback payload that the named Consumer class actually reads, written as a raw type shape. It carries the consumed shape and nothing else:

- **Self-contained.** A reader must understand which upstream data crosses into this module from this cell alone — without opening the upstream module's `CONTRACTS.md` (for internal) or the vendor's API documentation (for external). Write the shape out.
- **Same notation as Fields / Request.** `{ field: type, ... }`, `parent: { child: type }`, `method(): type`, `Foo[]`, `?` on optional keys, string-literal unions, `T \| null`, `T \| false`.
- **Include `\| null` / `\| false` iff the Consumer handles them.** Verify by reading the Consumer class's source for explicit null/false branches (`if ($x === null) return …`, `if ($x === false) …`, `?->`, null-coalescing). If the class does not branch on null/false, do not add the union member — doing so invents handling that isn't there.
- **Forms (examples, not an exhaustive list):**
  - `{ f1: t1, f2: t2 }` — several fields / methods are read; list exactly those.
  - `{ parent: { child: type } \| null }` — a nested read with null-handling; preserve the navigation chain so the reader sees what the Consumer reaches into.
  - `{ method(): type }` — a single method accessor is called (use method form only when the upstream exposes the datum via a method; use property form when it's a property).
  - `bool`, `int`, `string` — the upstream returns a scalar directly; name the scalar type.
- **Forbidden — do not produce any of these:**
  - Target-type wrappers (`LocationId { locationId: int }`, `UtcTimestamp { reportRun.completedAt: DateTimeInterface }`, `CustomerId { customerId: int }`, `AvailabilityState { … }`, `Insight { … }`, `SeoBrainTaskStatus { … }`, any `PascalCaseName { … }` form). The domain type the Consumer *produces* is visible in the Consumer class's own return type and belongs in **Business semantics** if it matters; it does not belong in this cell.
  - Reduction expressions (`value > 0`, `count > 0`, etc.). If the upstream returns `{ value: int }` and the Consumer reduces it to a bool via `value > 0`, the cell still names `{ value: int }` — the reduction lives in the Consumer's code and (if it carries business meaning) in the **Business semantics** bullets.
  - Arrow notation (`→`, `=>`), prose, trailing clauses, or any `identity` shorthand. The old `identity` keyword is retired — always write the shape out so the cell stays self-contained and consistent across internal and external tables (neither carries an adjacent upstream-contract column).
- **Unused fields are implicit.** Anything not named in the cell is not read. Do not annotate omissions ("we ignore …") — silence is the signal. If most of a large upstream type is unused, use `...` elision (e.g. `{ ..., is_sysadmin(): bool }`) — same convention as the other shape cells.

*(The Consumer is named per-row in every table — internal Outbound-communication, internal Inbound-communication, Self-subscribed integration events, external Outbound-communication, external Inbound-communication —
so each boundary-crossing call records exactly what it translates. Do not add a standalone
"consumed shape" paragraph; that would duplicate or generalise away the per-call detail.)*

#### Business semantics

- <value or status → our domain state, one bullet per mapping>

*(Each bullet must be **self-contained within this upstream's section** — do not refer to other upstreams ("same as the Ct pair", "see SeoBrain above", "like the Lsg section"). A reader jumping straight to this card should understand the mapping without scrolling back to another card. If two upstreams genuinely share the same semantic shape, repeat the full wording; duplication is the smaller cost than forcing the reader to cross-reference.)*

---
```

**`## Self-subscribed integration events`** is the **last** section of `INTEGRATIONS.md`, after `## External service dependencies`. This section lists integration events that this module **both publishes and re-consumes itself** (e.g., availability-changed fan-out, post-completion validation). These are intra-module lifecycle loops that don't fit under any upstream card — they have no upstream, so they're placed at the bottom as an appendix after the real upstream sections.

**Scope of this section is self-only.** Events published by *other* modules inside the monolith belong under that module's card in `## Internal module dependencies` → **Inbound communication**. External services **never** appear here — not as `<VendorName> (external)`, not as "async callbacks from X", not in any form. Facts about external services (including their async inbound callbacks, webhooks, and any other ingress paths) live only inside that service's card under `## External service dependencies`, specifically in its `Inbound communication` table. This keeps each external service self-contained in one place instead of scattered across sections.

The section is a single table for the whole module (no per-event cards; events are usually lighter than calls):

```
## Self-subscribed integration events

Integration events this module publishes and re-consumes itself. Events received from other modules live under that module's **Inbound communication** section; external services live under `## External service dependencies`.

| Event | Consumer | Consumed shape | We do | Ordering / idempotency |
|---|---|---|---|---|
| `<SelfEventClass>` | `SubscriberClass` | `{ field: type, ... }` *(full consumed shape — see Consumed-shape cell rules)* | <business action> | <expectations> |
```

Under any heading with no entries write `_None._` instead of removing the heading.

### Step 2: Merge, Curate, and Rewrite

This is an **active editing step**, not passive concatenation. Collect results from all six
subagents, then:

1. **Scrub AGENTS.md content (from Subagents 1–3, 6) for any code references** that slipped through.
   Scan for `::`, `->`, `.php`, `\\`, `$`, and any PascalCase words that look like class or
   message names. Rewrite those sentences in business language. (Message class names belong in
   the contract files, not here.) **Two narrow exceptions apply** — the Aggregates row labels
   and the Value Objects list in Part 3 legitimately contain class names. Every other
   PascalCase hit is a defect.
2. **Deduplicate against root AGENTS.md**: Remove any rule that merely restates a project-wide
   convention.
3. **Remove generic DDD truisms**: If a statement would be true for ANY hexagonal-architecture
   module, cut it.
4. **Consolidate verbosity**: If a subagent produced overly detailed explanations, tighten to
   concise statements. Prefer a crisp numbered rule over a paragraph.
5. **Verify actor consistency**: Actors in the Capabilities section must exactly match the
   Actors table.
6. **Enforce the Part 3 / Part 4 boundary.** Part 3 is **structural** (tables + lists); Part 4
   is **engineer-curated numbered rules**. If a Subagent-3 output contains numbered prose rules
   (a "Domain Model", "Module Boundaries", "Layer Separation", or "Testing" subsection with
   numbered bullets), that content belongs to Part 4 — route the rules to the appropriate Part 4
   subsection before assembling. If a Subagent-6 output contains an aggregate / VO catalogue or
   a reactive-policy table, that content belongs to Part 3 — route it there. Typical confusions:
   "Aggregate Conventions" rules (state-via-methods, invalid-transition exceptions, events on
   aggregate) are Part 4; the aggregate itself (class name + behaviours) is Part 3.
7. **Part 4 preservation.** If the module already had an `AGENTS.md` and the user chose update
   mode (or chose regenerate-from-scratch but declined to replace Part 4 when re-prompted),
   substitute Subagent 6's output with the existing Part 4 content verbatim. Subagent 6's
   output is then presented to the user as "candidate additions for your review" alongside the
   written file — never merged silently.
8. **Check cross-references.** Before finalising `AGENTS.md` Part 2, confirm the Bounded
   Context Boundaries table's `Details` column points into anchors that actually exist in the
   assembled `INTEGRATIONS.md`. Anchor slugs use lowercase-hyphenated service names.
9. **Check contract-file coverage.** Every upstream in the Bounded Context Boundaries table
   must have a section in `INTEGRATIONS.md`. Every query and integration event under
   `Application/` must have an entry in `CONTRACTS.md` (commands are this module's own
   internal orchestration and are deliberately out of scope for the published contract).
   Discrepancies indicate a subagent missed something — re-run or fill in manually.
10. **Scrub contract files for implementation names.** Search the assembled `CONTRACTS.md` and
    `INTEGRATIONS.md` for handler / repository / service / gateway / client class names,
    namespaces, and PHP syntax tokens. Rewrite or remove. Message class names MUST remain.

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
<from Subagent 1 — 3-5 processes. Each process entry has three elements, in this order:
bolded name, text-based visualisation (ASCII arrows/boxes matched to process type —
lifecycle / decision chain / prerequisite pipeline / scheduled sweep / counter window),
and 2-3 key characteristic bullets. A process with no visualisation is a defect; do not
ship the file until every process has one.>

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
<from Subagent 2 — table only, no surrounding prose or footnotes.
The heading, the table, then blank line. Do not emit a "Note:" block pointing to Part 3
or explaining why subscribers are excluded — that exclusion is a design decision, not
a doc artefact.>

### Capabilities and Rules
<from Subagent 2 — shared rules first, then per-actor capability tables.
Actors here MUST match the Actors table in Part 2.
Capabilities describe business actions, NOT technical command/query names.
Use #### for sub-headers (e.g., #### Shared HTTP Access Rules, #### Customer User).>

## Part 3: Tactical Design Assessment

### Architectural Style
<from Subagent 3 — one paragraph. If the module matches the project-wide standard hexagonal
layout, emit a one-sentence pointer at root `AGENTS.md` §Project Structure plus "No
module-specific deviations from the project-wide structure." Only emit a full 2-level
directory tree when the module deviates. Always present.>

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
<from Subagent 3 — table only, three columns: Policy | When | Then.
No intro paragraph, no notes, no why-it-matters column. One row per policy.
Consolidate semantically equivalent subscribers into a single row.
Do NOT name event classes, subscriber classes, or dispatched commands — those live in INTEGRATIONS.md.
Omit the entire section if the module has no such policies.>

## Part 4: Engineering Practices

<If a new file OR the user opted into regenerating Part 4: emit this banner immediately after
the `## Part 4: Engineering Practices` header:

*Part 4 is engineer-curated. The entries below are candidates detected from the codebase —
review, edit, add, or remove as your team sees fit. Subsequent regenerations of this file
preserve Part 4 verbatim unless you explicitly opt into replacing it.*

If updating an existing file: do NOT regenerate Part 4 — preserve the existing Part 4 content
verbatim (including any banner the engineer left in place or removed).>

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

### Step 3: Quality Review

Before writing files, verify the assembled content against this checklist:

1. **No code references in AGENTS.md** (with two narrow Part 3 exceptions): Search for `::`, `->`,
   `.php`, `\\`, `$` in the content. Also scan for PascalCase words that look like class or message
   names (e.g., `InsightRepository`, `GetInsightsQuery`). Rewrite in business language. Message
   names belong in `CONTRACTS.md` / `INTEGRATIONS.md`, not in `AGENTS.md`.
   **Two legitimate Part 3 exceptions** — confirm the class names you find are inside one of
   these two places and nowhere else: (a) `### Aggregates` table row labels (one aggregate class
   name per row); (b) `### Value Objects` bulleted list (one VO class name per bullet, plus
   optional state-pattern interface + its implementations). Any class name outside those two
   subsections is a defect — rewrite in business language.
1a. **Part 3 is structural, not prose**: Part 3 has exactly these subsections: Architectural Style,
    Aggregates (optional), Value Objects (optional), Reactive Policies (optional). No other
    headings. No numbered prose rules anywhere in Part 3. If a Subagent-3 output emitted a
    "Domain Model", "Domain Layer", "Module Boundaries", "Layer Separation", or "Testing"
    subsection with numbered bullets, route those rules to Part 4 (Aggregate Conventions,
    Integration Boundaries, Access Control, Layer Separation, Testing respectively) and drop
    the heading from Part 3.
1b. **Part 4 engineer-curation banner**: On a new file or on explicit Part 4 replacement, the
    engineer-curation banner immediately follows the `## Part 4: Engineering Practices` heading.
    On update-mode runs that preserve Part 4, the banner is NOT injected — the existing Part 4
    content (including whatever banner state the engineer left) is carried over verbatim.
2. **No root AGENTS.md duplication**: Compare each numbered rule against the root AGENTS.md.
   Remove any that merely restate project-wide rules. Common duplicates to watch for:
   - "All inter-module communication goes through CQRS buses"
   - "Repository interfaces in Domain, implementations in Infrastructure"
   - "Adapters are thin translation layers with no business logic"
   - "Use AAA pattern in tests"
   - "Fake repositories use single-array state"
   - "#[CoversClass] and #[Override] attributes"
3. **No generic DDD truisms**: Remove statements that would be true for ANY module. Common
   truisms to watch for:
   - "Value objects are immutable and validate at construction"
   - "Domain layer is framework-agnostic"
   - "Domain events are collected in entities"
   - "Dependency inversion: domain defines contracts, infrastructure fulfils them"
4. **Concrete business values**: Every rule mentioning a limit, timeout, or threshold must have
   the actual value from the code.
5. **Actor coverage**: All entry points that cross the module boundary (HTTP endpoints, CLI commands, crons, queue workers receiving external-service callbacks) are represented in Actors and Capabilities. **Reactive policies are NOT actors** — if "Report Lifecycle Subscriber", "Status Changed Subscriber", "Availability Broadcaster", "Validator", or similar event-subscriber roles appear in the Actors table, remove them and move their intent/mechanism into the appropriate places (Part 1 for business intent; Part 3 Reactive Policies for mechanism). Queue workers that receive **external** callbacks stay — only purely in-process subscribers leave the Actors list.
6. **Reactive Policies coverage**: If the module has any in-process event subscribers beyond external-callback receivers, Part 3 contains a `### Reactive Policies` subsection. Each policy documented there describes a business-language trigger + action + "why it matters", without naming event classes, subscriber classes, or dispatched commands. Semantically equivalent subscribers (e.g., two subscribers that both translate upstream lifecycle events into availability refreshes) are consolidated into ONE policy.
7. **Policy-derived business intent lands in Part 1 when product-visible**: For every reactive policy, check whether it encodes intent a product manager would recognise as a distinct process or rule. If yes, that intent appears in Part 1 (as a new trigger on an existing Core Business Process, a new process, or a new Business Rule), AND the Part 3 policy entry references Part 1 parenthetically instead of restating. If the intent is already covered by an existing Part 1 entry, or is purely a UX/delivery concern, no Part 1 addition is needed.
8. **Appropriate depth**: Small modules (no domain layer) → skip inapplicable sections rather
   than filling with generic content. Part 4 may legitimately be empty on a new module with no
   module-specific conventions beyond root `AGENTS.md` — in that case emit the `## Part 4:
   Engineering Practices` heading followed by `_None._` rather than omitting Part 4 entirely.
   The four-part skeleton must always be visible so readers know the skill "checked."
9. **Conciseness**: No section should have more content than necessary. If a numbered rule
   takes more than 2 sentences, tighten it.
10. **Contract-file coverage**: Every row in Part 2's Bounded Context Boundaries table has a
   corresponding section in `INTEGRATIONS.md`. Every query and integration event found under
   `Application/` has a corresponding entry in `CONTRACTS.md` (commands are deliberately
   excluded — they are internal orchestration, not a published contract; cross-module command
   dispatches belong in the callee's `INTEGRATIONS.md` outbound communication). Every
   `Details` link in the Bounded Context Boundaries table resolves to a real anchor in
   `INTEGRATIONS.md`.
11. **No implementation names in contract files**: Handler, repository, service, gateway, and
   client class names do not appear in `CONTRACTS.md` or `INTEGRATIONS.md` — only message /
   event / DTO / public Response-type names.
12. **Retries and Caching populated**: Every row in every message / endpoint / callback table has a `Retries` and `Caching` cell filled in. Use `-` explicitly when we neither retry nor cache — an empty cell is a gap in the contract, `-` is a deliberate "nothing here."
13. **Dates filled**: `*Last verified against code: YYYY-MM-DD*` in `AGENTS.md`,
    `CONTRACTS.md`, and `INTEGRATIONS.md` uses the actual run date, not a placeholder.
14. **Consumed-shape cells are clean**: In every `INTEGRATIONS.md` table that has a consumed-shape column (internal Outbound-communication, internal Inbound-communication, Self-subscribed integration events, external Outbound-communication, external Inbound-communication), each cell is a raw shape only. Reject any cell that:
    - Begins with a PascalCase target-type wrapper (`LocationId {`, `UtcTimestamp {`, `CustomerId {`, `AvailabilityState {`, `Insight {`, `SeoBrainTaskStatus {`, or any other `PascalCaseName {`). The domain type the Consumer produces does not belong here — only the consumed upstream shape does.
    - Contains a reduction expression (`value > 0`, `count > 0`, etc.), arrow notation (`→`, `=>`), prose, or the retired `identity` shorthand.
    - Carries `\| null` / `\| false` for a case the named Consumer class does not actually handle — every nullability union must correspond to a real null/false branch in the Consumer source.
    Rewrite or regenerate until every cell is a self-contained shape that matches the notation used in the other shape cells.
15. **No upstream-contract column anywhere**: The `Consumed shape` cell is the sole record of what crosses the boundary. Reject any table that reintroduces `Returns` (internal outbound), `Response` (external outbound), `Payload` (inbound), or `Source` (legacy flat-event-subscriptions column) — those leaks come from older templates. The canonical schemas are:
    - Internal **Outbound communication**: `| Message | Fields | Consumer | Consumed shape | Retries | Caching |`
    - Internal **Inbound communication**: `| Event | Consumer | Consumed shape | Ordering / idempotency |`
    - `## Self-subscribed integration events`: `| Event | Consumer | Consumed shape | We do | Ordering / idempotency |`
    - External **Outbound communication**: `| Method | Path | Purpose | Request | Consumer | Consumed shape | Retries | Caching |`
    - External **Inbound communication**: `| Receiver | Idempotency | Consumer | Consumed shape | Retries | Caching |`
16. **Business-semantics bullets are self-contained**: No bullet may refer to another upstream's section ("same as the Ct pair", "see SeoBrain above", "like Lsg", "as in the previous card"). Each card stands alone. If you spot such a shorthand, inline the full wording in place — duplication across cards is the smaller cost than forcing a reader to cross-reference.
17. **Internal cards have both subsections**: Every card under `## Internal module dependencies` contains both an **Outbound communication** subsection and an **Inbound communication** subsection. Empty ones use `_None._`; missing ones are a formatting bug. External cards likewise carry both Outbound and Inbound subsections (the latter with `_None._` when the vendor never calls back).
18. **Inbound rows attach to the publisher's card**: Every cross-module event subscription is placed under the card of the module that **publishes** the event, not the module that receives it. A reader opening an upstream's card must see every path by which that upstream reaches us (queries + events). Self-published integration events the module re-consumes go in `## Self-subscribed integration events`. Module-internal domain events (classes under this module's own `Domain/Event/`) are neither published nor consumed across module boundaries and do not appear in this file at all.
19. **External services appear in exactly one section**: Every fact about an external service (HTTP calls, async callbacks, webhook ingress, queue deliveries, their idempotency keys, their retry policies, anything) lives under that service's card in `## External service dependencies` and nowhere else. Reject any row in an internal card's **Inbound communication** table or in `## Self-subscribed integration events` whose subject is a vendor / external service, or that uses `(external)` annotation. Such a row is a duplication of information already present in the service's `Inbound communication` table; delete it, don't merge it.
20. **Every Core Business Process has a visualisation**: Scan Part 1 of `AGENTS.md` — each process entry must contain a text-based diagram (ASCII arrows / boxes / tree / sequence) sitting between the bolded process name and the key-characteristic bullets. A process with only prose or only bullets is a defect. The diagram shape must fit the process type: state-transition arrows for lifecycles, yes/no branching for decision chains / access control, a vertical prerequisite pipeline with explicit fall-out states for multi-step evaluations, a cron-tick → find → action sequence for scheduled sweeps, a window-plus-increments box for counters. If a subagent returned a process with no diagram, synthesise one from its description before writing the file — do not ship a process entry without it. Consistency matters: readers expect every process to be scannable at a glance, not some.
21. **No wire-level access identifiers in `AGENTS.md`**: scan the file for ALL_CAPS_WITH_UNDERSCORES tokens (feature-flag keys, capability enum values), `/`-prefixed HTTP path fragments (`/seo-tools/...`, `/api/...`, `/admin/...`), and middleware / adapter / gateway class names. Every hit is a defect — rewrite in business language using role names ("Module Feature Flag", "Module Access Override", "AI Insights subscription capability", "location-scoped insight screens", etc.). If a reader needs the identifier, they follow the Bounded Context Boundaries `Details` link into `INTEGRATIONS.md` (for flags / capabilities) or open `CONTRACTS.md § HTTP endpoints exposed` (for routes). This rule applies to every section of `AGENTS.md` — Part 1 Business Rules, Part 1 Core Business Process diagrams, Part 2 Capabilities and Rules (including `Shared HTTP Access Rules`), Part 2 Actor table, and Part 3 architectural rules.
22. **No synthetic "event bus" / "shared events" upstream cards**: scan `INTEGRATIONS.md` for card headings (`###`) or dependency-summary rows whose name is a framework-shared event vocabulary rather than a module — e.g. "Report event bus", "CommonReportEvents", "Framework events", "Shared reporting", "Event dispatcher", "Event bus", any `### <…> bus` pattern. Also scan the AGENTS.md Bounded Context Boundaries table for the same pattern (rows like "Reporting (shared report lifecycle)"). Every hit is a defect. To remediate: (a) delete the card / row; (b) find the actual dispatcher modules with a codebase-wide search for the event constant / event class; (c) relocate each event as one Inbound-communication row on every publishing module's card (duplicate the row if an event has multiple publishers); (d) mention the shared class in each publisher's `Transport` cell and, where helpful, in a `Business semantics` bullet. The shared class is plumbing — never its own upstream, never its own BCB row.
23. **`Dependency summary` rows are sorted Coupling → Type → Name**: read every row's first-word tier from the `Coupling` cell and verify the sequence runs `High` → `Medium` → `Low` with no tier-inversion anywhere (a `Low` row above a `Medium` row is a defect, even if both belong to the same upstream family). Only these three tiers are valid — reject `Critical` / `Minor` / `Good` / any other word as the first token of a `Coupling` cell. Inside each coupling tier, `Internal` rows come before `External` rows — this matches the document's own section order (`## Internal module dependencies` above `## External service dependencies`), so the reader's eye tracks the same grouping in summary and detail. Inside each coupling + type tier, sort alphabetically (case-insensitive) by upstream name. Re-sort the table before writing the file — the three keys are applied in order and are non-negotiable.
24. **Coupling tier matches the count**: for each Dependency-summary row and each card's `Coupling` attribute, the tier word must match the actual surface count. `High` = 6+ surfaces OR 3+ Consumer classes OR a single query read by 3+ consumers; `Medium` = 3-5 surfaces; `Low` = 1-2 surfaces. Count each of: outbound query/command row, inbound event row, external HTTP endpoint row, external inbound Receiver row. If a reader cannot recount the tier from the card's own tables, the count summary or the tier is wrong — fix whichever is off.
25. **Upstream-namespace verification on Outbound rows**: every row under an upstream's `Outbound communication` table must name a message class whose namespace starts with `Modules\<UpstreamName>\…` (or `Shared\…` / `Contracts\…` when the upstream genuinely owns a shared contract). A row whose message class lives under `Modules\<ThisModule>\…` is this module's own internal command and belongs nowhere in any upstream card — drop it. When in doubt, open the message class file and read its namespace before including the row.
26. **Event-dispatcher grep verification**: for every inbound event (internal card or Self-subscribed section), run a codebase-wide grep for the event constant or event class (e.g. `grep -rn "CommonReportEvents::ON_REPORT_CANCELLED"` under `src/Modules/`). Attribute the row only to modules where the grep surfaces an actual `->dispatch(…)` call site. Do NOT copy-paste a subscriber's full subscribed-events list across every candidate publisher — each module publishes a specific subset. One row per (event, publisher) pair, no fabrication. If a module subscribes to an event but no module dispatches it, flag the subscription as dead code in the output rather than inventing a publisher.
27. **External inbound Receivers discovered, not inferred**: enumerate `Adapter/Worker/*.php` and any webhook-style HTTP action (classes under `Adapter/Http/` whose name suggests a callback — `*Callback*`, `*Webhook*`, `*Status*` for status updates — or whose handler dispatches a status-change command). For each, trace the command it dispatches to identify the external service whose async callback it services. Add one row under that service's external `Inbound communication` table. An external-service card with no `Inbound communication` table (or with `_None._`) must be defensible by the absence of any such worker/webhook — do not silently drop real callback paths.
28. **Domain events never appear in this file**: scan `Application/EventListener/*.php` `getSubscribedEvents()` return values. For each event-class key, classify it:
    - Lives under `<ThisModule>\Domain\Event\…` → **domain event**, internal machinery. Never appears in `INTEGRATIONS.md` (not on upstream cards, not in `Self-subscribed integration events`).
    - Lives under `<ThisModule>\Application\IntegrationEvent\…` or `<ThisModule>\Application\Event\…IntegrationEvent` → **self-published integration event**, goes in `Self-subscribed integration events` only if the subscriber is our own class.
    - Lives under `Modules\<OtherModule>\…` (and is not a domain event of that module) → **external integration event**, goes in that module's card `Inbound communication`.
    A Self-subscribed-events table with more than ~2-3 rows is a red flag — it usually means domain events have been mis-classified as integration events. Re-check every row.
29. **No literal `|` inside any table cell**: scan every markdown table row for a `|` character that would be interpreted as a column boundary. Inside cell text, rewrite such pipes as an em-dash, `/`, or HTML entity `&#124;`. A stray pipe corrupts the table silently — readers see a shifted row, not an error — so catch it before writing.
30. **Class-name manifest cross-check (blocking)**: for `CONTRACTS.md` and `INTEGRATIONS.md`, extract every backticked PascalCase token and re-grep the codebase (`grep -rn "^class <Token>\|^final class <Token>\|^readonly class <Token>\|^final readonly class <Token>\|^interface <Token>\|^enum <Token>\|^abstract class <Token>" src/`). Every token must resolve to an actual declaration. A token that does not resolve is a fabrication — replace it with the correct class name (verify by reading the subagent's manifest), mark it `<Unresolved — please verify>` if the correct name cannot be determined, or delete the row if the class genuinely does not exist. Fabrication-style tokens (plausible paraphrases of real names — e.g. `IsFeatureEnabledForCustomerQuery` when the actual class is `IsFeatureFlagEnabledQuery`; `GetUserQuery` when the actual class is `GetSingleUserQuery`; `GetCustomerCapabilityValueQuery` when the actual class is `GetCapabilityByCustomerIdQuery`) are the most common defect — they look right and slip past a casual skim, so re-grepping is mandatory, not advisory. Do not ship the files until every backticked PascalCase token resolves.
31. **No `_None._` in Outbound communication without dispatcher-grep evidence**: for every `_None._` under any upstream's Outbound communication table (internal or external card), confirm that the module performs no dispatch whose target class lives under the upstream's namespace. Re-run the greps suggested in Subagent 5's verification step 4 — `commandBus->handle`, `queryBus->handle`, `queryBus->query`, `FeatureFlagChecker` calls, `FeatureAllowanceInterface` implementations. A non-bus service call into an upstream (e.g. a direct service method on an upstream's public service class) still counts as outbound communication and must be rowed. If any such call exists, replace `_None._` with the real row(s). A `_None._` is only valid when the grep legitimately returns zero matches for that upstream.
32. **Per-Consumer row expansion verified**: for every upstream's Outbound communication table, confirm that when the same Message class appears in multiple dispatch call sites across distinct Consumer classes, each consumer has its own row. A `Location` or similarly hub-style upstream whose card has one `GetLocationQuery` row and a single Consumer is almost always a defect — the table has collapsed multiple consumer sites into one. Re-grep `grep -rn "new <MessageClass>" src/Modules/<ThisModule>/` for each suspect Message class; if more than one distinct surrounding class dispatches it, emit one row per class, each with its own Consumed-shape slice.
33. **DTO recursion to leaves in CONTRACTS.md**: scan `CONTRACTS.md` for any `Returns:` line that names a class/DTO/View type but does not expand it inline or below. Every such named type must be expanded at least once in the file — either at its first mention, or cross-referenced to an earlier expansion with `see <earlier location>`. A CONTRACTS section that leaves `InsightDTO`, `BusinessAnalysisDTO`, `LocationDto`, `Pagination`, or any other non-scalar type unexpanded is incomplete — consumers cannot read the wire shape without opening source.
34. **Reactive Policies consolidation test**: read every `Then` column in Part 3 § Reactive Policies. Any two rows whose `Then` columns describe the same reaction are the same policy — consolidate into one row with a disjunctive `When`. Examples to watch for: "Availability sync on upstream change" + "Auto-seed pending insight" where both ultimately refresh availability and trigger auto-seed on completion → one row; two rows that both "push to connected clients" with different `When` triggers → one row. The skill's Subagent 3 brief prescribes consolidation but it is easy to miss — re-check every pair.
35. **Coupling count cross-consistency (blocking)**: for each upstream, the coupling count in AGENTS.md Part 2 § Bounded Context Boundaries, the coupling count in INTEGRATIONS.md's Dependency-summary row, and the coupling count in the upstream's card Attribute table (`Coupling | <tier> — <count>`) must match. Compute the count once from the card's actual Outbound + Inbound rows, then propagate to the other two places. If AGENTS Part 2 says `5 surfaces` but INTEGRATIONS's CT card has 5 inbound events and 2 outbound queries (total 7), the AGENTS count is stale — fix it. A divergence between the three is evidence that one of the earlier subagents counted from incomplete information (typically before outbound queries were discovered).
36. **Cross-reference breadcrumb checklist**: before writing files, confirm the following navigation breadcrumbs are present (each is one sentence or phrase; don't skip any — they are the glue that holds the three-file doc set together):
    - AGENTS.md Part 2 § Shared HTTP Access Rules ends with a sentence naming where wire-level identifiers live (e.g. "The underlying feature-flag keys, capability enum values, route paths, and middleware class names live in `CONTRACTS.md` and `INTEGRATIONS.md`.").
    - AGENTS.md Part 2 § Bounded Context Boundaries has a leading sentence pointing to `CONTRACTS.md` (for published surface) and `INTEGRATIONS.md` (for consumed surface).
    - AGENTS.md Part 3 § Value Objects' `LocationId` / `UserId` bullet (or equivalent upstream-reference VOs) cross-references Part 4 § Integration Boundaries for the identifier-only-modelling rule.
    - CONTRACTS.md § HTTP endpoints exposed has a 2–3 sentence intro paragraph naming the route prefixes and their middleware chains **if** the module has path-based middleware exemptions. (Omit only when every endpoint shares the same chain.)
    - INTEGRATIONS.md opening sentence points back to `AGENTS.md` (for the module's business description) and `CONTRACTS.md` (for the module's published surface).

### Step 4: Write Files

Write the following four files under `src/Modules/<ModuleName>/`:

1. `AGENTS.md` — assembled Part 1 / Part 2 / Part 3 / Part 4 content. Part 4 is either the
   existing file's Part 4 preserved verbatim (update mode, or regenerate mode where the user
   declined Part 4 replacement) or Subagent 6's candidate output with the engineer-curation
   banner (new file, or regenerate mode where the user opted in to Part 4 replacement). In the
   preserved-Part-4 case, also present Subagent 6's candidate output to the user after the file
   is written as "candidate additions for your review" — never merge silently.
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
