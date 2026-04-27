# Subagent 4: Published Contracts (CONTRACTS.md)

**Subagent 4 — Published Contracts (CONTRACTS.md).**
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
