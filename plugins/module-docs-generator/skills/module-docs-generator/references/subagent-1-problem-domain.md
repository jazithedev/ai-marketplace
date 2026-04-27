# Subagent 1: Problem Domain Analysis

**Subagent 1 — Problem Domain Analysis.**
Apply the /problem-analyst approach. Analyze the module's domain layer (entities, value objects, domain services, domain events), application layer (commands, queries, application services),
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

## Output Constraints (Tier A)

```
CRITICAL OUTPUT CONSTRAINTS — read these before writing ANY output:
1. NEVER output class names. TWO NARROW EXCEPTIONS, Subagent 3 ONLY: (a) Part 3 §Aggregates uses the aggregate entity's class name as each row's label; (b) Part 3 §Value Objects is a flat list of VO class names (and state-pattern interfaces whose implementations are VOs). NO other subagent (1, 2, 6) ever emits class names under any circumstance.
2. NEVER output interface names. EXCEPTION (Subagent 3 only, Part 3 §Value Objects only): a state-pattern interface whose implementations are VOs may be listed alongside them.
3. NEVER output Command / Query / Integration Event class names — those belong in CONTRACTS.md and INTEGRATIONS.md, not AGENTS.md
4. NEVER output method names. The Aggregates table's Behaviors column uses business-language named behaviours ("Create as pending", "Complete with recommendations"), NOT method signatures.
5. NEVER output file paths or directory paths beyond the top-level module directories (Adapter/, Application/, Domain/, Infrastructure/, Resources/, Test/)
6. NEVER output namespace references
7. NEVER output code snippets, PHP syntax (::, ->, $, \), or implementation examples
8. Describe everything in BUSINESS language. If you find yourself naming a PHP class, stop and rephrase as a business concept — unless you are Subagent 3 writing §Aggregates row labels or §Value Objects entries.
9. When listing bounded contexts, only include DIRECT dependencies (modules/services this module calls), not transitive/indirect ones.
10. NEVER output feature-flag keys (e.g., LM_ACCESS_ENABLED), enum values (e.g., AI_INSIGHTS), HTTP route paths (e.g., /admin/...), or middleware / adapter / gateway class names. Describe each by its business role ("Module Feature Flag", "Module Access Override", etc.). The verbatim tokens belong in CONTRACTS.md (endpoint + auth summary) and INTEGRATIONS.md (upstream FeatureFlags / Subscription cards).
```
