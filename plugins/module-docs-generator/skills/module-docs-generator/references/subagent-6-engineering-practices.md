# Subagent 6: Engineering Practices

**Subagent 6 — Engineering Practices.**

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
- Emit candidates as **detections**, not prescriptions. When assembling the file, the output is prefixed with an "engineer-curated candidates — please review" banner (see SKILL.md § Step 2). An engineer decides which candidates become codified conventions.

Provide Subagent 6 with the same root-AGENTS.md exclusion summary given to Subagent 3. Additionally tell it: "Prefer to omit a subsection rather than invent weak content. A module that genuinely has no module-specific engineering conventions beyond root AGENTS.md ends up with a nearly-empty Part 4 — that is a valid outcome, not a defect."
