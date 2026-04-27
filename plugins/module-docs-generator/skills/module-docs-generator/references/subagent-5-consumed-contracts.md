# Subagent 5: Consumed Contracts (INTEGRATIONS.md)

**Subagent 5 — Consumed Contracts (INTEGRATIONS.md).**

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

*(No separate `Returns` column: the upstream module publishes its full return in its own `CONTRACTS.md`, and the consumed-shape cell is the self-contained record of what this module actually reads from that return. Write `_None._` below the heading if we dispatch nothing to this module. Per-Consumer expansion when the same Message has multiple consumers — see Verification step 5 below.)*

#### Inbound communication *(internal modules — events published by this module that we subscribe to)*

| Event | Consumer | Consumed shape | Ordering / idempotency |
|---|---|---|---|
| `<EventClass>` *(or `<EventName>` + payload class if the bus uses string keys)* | `SubscriberClass` | `{ field: type, ... }` *(full consumed shape — see Consumed-shape cell rules)* | <dedup / ordering notes — one short phrase; narrative goes in Business semantics> |

*(Write `_None._` below the heading if this module publishes nothing we subscribe to. Attribution rule: see the Event subscribers source bullets above. Domain-event exclusion: see §Domain-event exclusion below.)*

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

The consumed-shape cell **IS a shape cell** (the Shape-cell rules above apply). Think of it as the slice of the upstream's return / response / callback payload that the named Consumer class actually reads, written as a raw type shape. In addition to the Shape-cell rules:

- **Self-contained.** A reader must understand which upstream data crosses into this module from this cell alone — without opening the upstream module's `CONTRACTS.md` (for internal) or the vendor's API documentation (for external). Write the shape out.
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

## Output Constraints (Tier B)

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
