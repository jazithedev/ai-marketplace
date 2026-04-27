# Quality Review Checklist for module-docs-generator

Before writing files, verify the assembled content against this checklist. Items here are
**cross-cutting post-assembly checks** — things a single subagent cannot self-verify because
they span subagent outputs or compare a generated file to the project root. Extraction-time
rules (shape-cell notation, upstream-namespace verification, event-dispatcher grep, etc.) live
in the per-subagent reference files (`references/subagent-N-*.md`); do not restate them here.

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
5. **Actor coverage**: All entry points that cross the module boundary (HTTP endpoints, CLI commands, crons, queue workers receiving external-service callbacks) are represented in Actors and Capabilities. **Reactive policies are NOT actors** (see `content-principles.md` §Actors vs Reactive Policies for the decision tree) — if "Report Lifecycle Subscriber", "Status Changed Subscriber", "Availability Broadcaster", "Validator", or similar event-subscriber roles appear in the Actors table, remove them and move their intent/mechanism into the appropriate places (Part 1 for business intent; Part 3 Reactive Policies for mechanism). Queue workers that receive **external** callbacks stay — only purely in-process subscribers leave the Actors list.
6. **Appropriate depth**: Small modules (no domain layer) → skip inapplicable sections rather
   than filling with generic content. Part 4 may legitimately be empty on a new module with no
   module-specific conventions beyond root `AGENTS.md` — in that case emit the `## Part 4:
   Engineering Practices` heading followed by `_None._` rather than omitting Part 4 entirely.
   The four-part skeleton must always be visible so readers know the skill "checked."
7. **Contract-file coverage**: Every row in Part 2's Bounded Context Boundaries table has a
   corresponding section in `INTEGRATIONS.md`. Every query and integration event found under
   `Application/` has a corresponding entry in `CONTRACTS.md` (commands are deliberately
   excluded — they are internal orchestration, not a published contract; cross-module command
   dispatches belong in the callee's `INTEGRATIONS.md` outbound communication). Every
   `Details` link in the Bounded Context Boundaries table resolves to a real anchor in
   `INTEGRATIONS.md`.
8. **Retries and Caching populated**: Every row in every message / endpoint / callback table has a `Retries` and `Caching` cell filled in. Use `-` explicitly when we neither retry nor cache — an empty cell is a gap in the contract, `-` is a deliberate "nothing here."
9. **Dates filled**: `*Last verified against code: YYYY-MM-DD*` in `AGENTS.md`,
   `CONTRACTS.md`, and `INTEGRATIONS.md` uses the actual run date, not a placeholder.
10. **Every Core Business Process has a visualisation**: Scan Part 1 of `AGENTS.md` — each process entry must contain a text-based diagram (ASCII arrows / boxes / tree / sequence) sitting between the bolded process name and the key-characteristic bullets. A process with only prose or only bullets is a defect. The diagram shape must fit the process type (state-transition arrows for lifecycles, yes/no branching for decision chains, vertical prerequisite pipeline for multi-step evaluations, cron-tick → find → action sequence for scheduled sweeps, window-plus-increments box for counters — see `subagent-1-problem-domain.md` for the full menu). If a subagent returned a process with no diagram, synthesise one from its description before writing the file — do not ship a process entry without it. Consistency matters: readers expect every process to be scannable at a glance, not some.
11. **No wire-level access identifiers in `AGENTS.md`**: scan the file for ALL_CAPS_WITH_UNDERSCORES tokens (feature-flag keys, capability enum values), `/`-prefixed HTTP path fragments (`/seo-tools/...`, `/api/...`, `/admin/...`), and middleware / adapter / gateway class names. Every hit is a defect — rewrite in business language using role names ("Module Feature Flag", "Module Access Override", "AI Insights subscription capability", "location-scoped insight screens", etc.). If a reader needs the identifier, they follow the Bounded Context Boundaries `Details` link into `INTEGRATIONS.md` (for flags / capabilities) or open `CONTRACTS.md § HTTP endpoints exposed` (for routes). This rule applies to every section of `AGENTS.md` — Part 1 Business Rules, Part 1 Core Business Process diagrams, Part 2 Capabilities and Rules (including `Shared HTTP Access Rules`), Part 2 Actor table, and Part 3 architectural rules.
12. **`Dependency summary` rows are sorted Coupling → Type → Name**: read every row's first-word tier from the `Coupling` cell and verify the sequence runs `High` → `Medium` → `Low` with no tier-inversion anywhere (a `Low` row above a `Medium` row is a defect, even if both belong to the same upstream family). Only these three tiers are valid — reject `Critical` / `Minor` / `Good` / any other word as the first token of a `Coupling` cell. Inside each coupling tier, `Internal` rows come before `External` rows — this matches the document's own section order (`## Internal module dependencies` above `## External service dependencies`), so the reader's eye tracks the same grouping in summary and detail. Inside each coupling + type tier, sort alphabetically (case-insensitive) by upstream name. Re-sort the table before writing the file — the three keys are applied in order and are non-negotiable.
13. **Coupling tier matches the count**: for each Dependency-summary row and each card's `Coupling` attribute, the tier word must match the actual surface count. `High` = 6+ surfaces OR 3+ Consumer classes OR a single query read by 3+ consumers; `Medium` = 3-5 surfaces; `Low` = 1-2 surfaces. Count each of: outbound query/command row, inbound event row, external HTTP endpoint row, external inbound Receiver row. If a reader cannot recount the tier from the card's own tables, the count summary or the tier is wrong — fix whichever is off.
14. **No literal `|` inside any table cell**: scan every markdown table row for a `|` character that would be interpreted as a column boundary. Inside cell text, rewrite such pipes as an em-dash, `/`, or HTML entity `&#124;`. A stray pipe corrupts the table silently — readers see a shifted row, not an error — so catch it before writing.
15. **Class-name manifest cross-check (blocking)**: for `CONTRACTS.md` and `INTEGRATIONS.md`, extract every backticked PascalCase token and re-grep the codebase (`grep -rn "^class <Token>\|^final class <Token>\|^readonly class <Token>\|^final readonly class <Token>\|^interface <Token>\|^enum <Token>\|^abstract class <Token>" src/`). Every token must resolve to an actual declaration. A token that does not resolve is a fabrication — replace it with the correct class name (verify by reading the subagent's manifest), mark it `<Unresolved — please verify>` if the correct name cannot be determined, or delete the row if the class genuinely does not exist. Fabrication-style tokens (plausible paraphrases of real names — e.g. `IsFeatureEnabledForCustomerQuery` when the actual class is `IsFeatureFlagEnabledQuery`; `GetUserQuery` when the actual class is `GetSingleUserQuery`; `GetCustomerCapabilityValueQuery` when the actual class is `GetCapabilityByCustomerIdQuery`) are the most common defect — they look right and slip past a casual skim, so re-grepping is mandatory, not advisory. Do not ship the files until every backticked PascalCase token resolves.
16. **DTO recursion to leaves in CONTRACTS.md**: scan `CONTRACTS.md` for any `Returns:` line that names a class/DTO/View type but does not expand it inline or below. Every such named type must be expanded at least once in the file — either at its first mention, or cross-referenced to an earlier expansion with `see <earlier location>`. A CONTRACTS section that leaves `InsightDTO`, `BusinessAnalysisDTO`, `LocationDto`, `Pagination`, or any other non-scalar type unexpanded is incomplete — consumers cannot read the wire shape without opening source.
17. **Reactive Policies consolidation test**: read every `Then` column in Part 3 § Reactive Policies. Any two rows whose `Then` columns describe the same reaction are the same policy — consolidate into one row with a disjunctive `When`. Examples to watch for: "Availability sync on upstream change" + "Auto-seed pending insight" where both ultimately refresh availability and trigger auto-seed on completion → one row; two rows that both "push to connected clients" with different `When` triggers → one row. The skill's Subagent 3 brief prescribes consolidation but it is easy to miss — re-check every pair.
18. **Coupling count cross-consistency (blocking)**: for each upstream, the coupling count in AGENTS.md Part 2 § Bounded Context Boundaries, the coupling count in INTEGRATIONS.md's Dependency-summary row, and the coupling count in the upstream's card Attribute table (`Coupling | <tier> — <count>`) must match. Compute the count once from the card's actual Outbound + Inbound rows, then propagate to the other two places. If AGENTS Part 2 says `5 surfaces` but INTEGRATIONS's CT card has 5 inbound events and 2 outbound queries (total 7), the AGENTS count is stale — fix it. A divergence between the three is evidence that one of the earlier subagents counted from incomplete information (typically before outbound queries were discovered).
19. **Cross-reference breadcrumb checklist**: before writing files, confirm the following navigation breadcrumbs are present (each is one sentence or phrase; don't skip any — they are the glue that holds the three-file doc set together):
    - AGENTS.md Part 2 § Shared HTTP Access Rules ends with a sentence naming where wire-level identifiers live (e.g. "The underlying feature-flag keys, capability enum values, route paths, and middleware class names live in `CONTRACTS.md` and `INTEGRATIONS.md`.").
    - AGENTS.md Part 2 § Bounded Context Boundaries has a leading sentence pointing to `CONTRACTS.md` (for published surface) and `INTEGRATIONS.md` (for consumed surface).
    - AGENTS.md Part 3 § Value Objects' `LocationId` / `UserId` bullet (or equivalent upstream-reference VOs) cross-references Part 4 § Integration Boundaries for the identifier-only-modelling rule.
    - CONTRACTS.md § HTTP endpoints exposed has a 2–3 sentence intro paragraph naming the route prefixes and their middleware chains **if** the module has path-based middleware exemptions. (Omit only when every endpoint shares the same chain.)
    - INTEGRATIONS.md opening sentence points back to `AGENTS.md` (for the module's business description) and `CONTRACTS.md` (for the module's published surface).
