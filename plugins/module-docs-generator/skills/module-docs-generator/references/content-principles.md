# Content Principles for module-docs-generator

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
- Class names, method names, file paths, or namespace references (e.g., `ArticleRepository::save()`, `Entity/Article.php`, `LocationInsightsGenerator`) — **two narrow exceptions in Part 3: §Aggregates row labels use the aggregate's class name, and §Value Objects is a flat list of VO class names. Nowhere else.**
- Interface names (e.g., `CompanyBrainClientInterface`, `ArticleViewRepositoryInterface`) — **exception: a state-pattern interface may appear in Part 3 §Value Objects when its implementations are the actual VOs.**
- Command / Query / Integration Event class names — those belong in `CONTRACTS.md` / `INTEGRATIONS.md`, not here
- Code snippets or implementation examples
- Generic DDD observations true for any module (e.g., "Value Objects are immutable and validate at construction", "Repository interfaces live in Domain, implementations in Infrastructure", "Adapters only translate input to commands/queries" — these are universal, not module-specific)
- Rules already documented in the project root AGENTS.md — do not duplicate them
- Assessment verdicts, improvement suggestions, or anti-pattern observations
- Implementation patterns disguised as business rules (e.g., "Callback job committed before API call" is an implementation detail; the business rule is "Race condition prevention for async callbacks")
- Feature-flag keys (e.g., `LM_ACCESS_ENABLED`), subscription capability enum values (e.g., `AI_INSIGHTS`), HTTP route paths (e.g., `/seo-tools/admin/dashboard/.../insights*`), and middleware / adapter / gateway class names — these are wire-level identifiers. The published form lives in `CONTRACTS.md` (endpoint paths + auth summary); the consumed form lives in `INTEGRATIONS.md` (the upstream module card that owns the flag or capability). AGENTS.md names the *role* (e.g., "Module Feature Flag", "Module Access Override", "AI Insights subscription capability"), never the token.

When documenting a domain rule, describe the BUSINESS constraint, not the code that enforces it:
- GOOD: "Max 2 insight generations per location per calendar month"
- BAD: "UsageLimitChecker validates against the monthly_usage_count column"
- GOOD: "A Module Access Override grants access without the AI Insights subscription capability"
- BAD: "`LM_FORCE_ENABLED` bypasses the `AI_INSIGHTS` subscription capability check"

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
- ✅ `AiBrain` (the internal / domain name our code uses), `Alerting Service` (role — what it does for us), `Feature Flag Store` (role), `Email Provider` (role)
- ❌ `PickMyBrain` (the external vendor's service identifier), `Sentry`, `LaunchDarkly`, `SendGrid`

The abstraction survives a vendor swap; the implementation identifier changes the day we migrate providers. This applies to the card header (`### <Upstream>`), the dependency-summary row, and the `Details` anchor link in AGENTS.md's Bounded Context Boundaries table. Vendor-specific implementation facts (SDK function names, service discovery string keys, proprietary header names) may appear inside `Transport` / `Consumer` / `Business semantics` cells **only where they describe how we talk to the upstream** — never as the upstream's identity.

Rule of thumb: the namespace your module uses under `Infrastructure/` is usually the right upstream name (`Infrastructure/AiBrain/` → `AiBrain`). If no internal abstraction exists, use the role (`Alerting Service`, `Feature Flag Store`, etc.).

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
