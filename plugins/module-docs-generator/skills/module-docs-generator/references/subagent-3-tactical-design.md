# Subagent 3: Tactical Design Assessment

**Subagent 3 — Tactical Design Assessment.** Tier A with the two class-name exceptions spelled out in the Tier A constraint (§Aggregates row labels and §Value Objects list).

Part 3 is **structural, not prose** — tables and lists that enumerate the module's tactical-DDD building blocks. No numbered prose rules. Rules about *how* aggregates are coded, how integrations are wrapped, how access control is implemented, etc., all belong in Part 4 (Subagent 6).

Emit exactly these subsections, in this order:

1. **Architectural Style** — one short paragraph. If the module's top-level layout matches the project-wide standard hexagonal layout (`Adapter/`, `Application/`, `Domain/`, `Infrastructure/`, `Resources/`, `Test/`) exactly, emit a one-sentence pointer at the root `AGENTS.md` §Project Structure and the phrase "No module-specific deviations from the project-wide structure." Only emit a full 2-level directory tree when the module deviates (adds an extra top-level directory, omits one, uses different names, or is not hexagonal). This section is always present.

2. **Aggregates** — a table with two columns, `Aggregate | Behaviors`. Scan `Domain/Entity/` (or the equivalent location of aggregate roots) and emit one row per aggregate root. `Aggregate` uses the class name verbatim — this is one of the two Tier A exceptions. `Behaviors` is a bulleted list (use `<ul><li>…</li></ul>` inline so the cell renders as a list) of **business-language named behaviours** — names a domain expert would recognise (e.g., "Create as pending", "Complete with recommendations", "Fail with reason"). Derive behaviours from the aggregate's public methods, emitted domain events, and state-machine transitions — but **rename them in business terms**; the Behaviors column is never a list of method signatures. Omit the section if the module has no aggregate roots.

3. **Value Objects** — a flat bulleted list of value-object class names, one per bullet. Scan `Domain/ValueObject/` (and any state-pattern folder such as `Domain/Service/**/State/`) for `final readonly class` declarations, enum types, and state-pattern interface implementations. Emit each as `` **`ClassName`** `` plus a short business-purpose fragment (a few words). This is the other Tier A exception — class names appear verbatim here. When a state-pattern interface has many implementations (e.g., an `InsightAvailabilityStateInterface` with 8 concrete states), emit the interface once followed by a parenthetical list of its implementations. Enum types may note their cases inline (e.g., `ReportStatus` (enum) — `NotCreated`, `InProgress`, `Completed`, `Failed`). Omit the section if the module has no VOs.

4. **Reactive Policies** — **only if the module has in-process event subscribers** (classes under `Application/EventListener/`, `Subscriber/`, or tagged `kernel.event_subscriber`) that are NOT external-callback receivers. Emit a table with three columns: `Policy | When | Then`. No intro paragraph, no closing note, no argumentation. One row per policy. `Policy` is a short business-language name. `When` is the business-language trigger — NOT the event class name (event class names belong in INTEGRATIONS.md). `Then` is the resulting reaction in one line. **Consolidate semantically equivalent policies** (e.g., two subscribers translating different upstream lifecycle events into the same availability-state refresh → ONE row). Omit the whole section if the module has no such policies.

**Do NOT emit** a Domain Model, Domain Layer, Module Boundaries, Layer Separation, Testing, or any other prose-rule subsection in Part 3. Rules about how aggregates are coded ("state mutations go through aggregate methods", "invalid transitions raise domain exceptions", "domain events collected on the aggregate"), how integrations are wrapped ("externals behind an ACL"), how access control lives ("permission checks in middlewares"), and test idioms all belong to Part 4 — Subagent 6 handles them. If you find yourself writing a numbered rule for Part 3, stop and ask: does this add a fact the Aggregates/Value Objects/Reactive Policies tables don't already convey? If no, drop it. If yes, it's probably a Part 4 Engineering Practice — route it to Subagent 6.

**Important: Also provide Subagent 3 with a summary of key root AGENTS.md rules** so it knows what to exclude. At minimum mention: CQRS for inter-module communication, repository interfaces in Domain / implementations in Infrastructure, adapters as thin translation layers, domain events in `Domain/Event/` and integration events in `Application/IntegrationEvent/`, AAA test pattern, fake repositories with single-array state, #[CoversClass] and #[Override] attributes, data providers for edge cases.

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
