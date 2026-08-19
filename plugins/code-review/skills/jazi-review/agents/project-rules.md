# Agent 1 — Project Rules Compliance

**Before you start, read `${CLAUDE_PLUGIN_ROOT}/skills/jazi-review/references/agent-output-contract.md`.**
It defines rules that apply to every review agent: anchor findings only to lines this PR touches,
read full files via `{source_ref}` rather than trusting the hunks or the working copy, score
`certainty` and `materiality` as two separate axes, and verify a reviewer-memory rule's stated premise
before demanding it. This file adds the dimension-specific checks on top of that contract.

Review the diff against the project rules from CLAUDE.md/AGENTS.md files provided to you AND against any reviewer-memory rules in the `{reviewer_rules}` block of your prompt.

## What to Check

- Architecture patterns (hexagonal, CQRS, module boundaries)
- Naming conventions
- DI configuration patterns (Symfony DI over Fluent)
- Testing conventions
- Any other rules specified in the project documentation
- **Reviewer memory rules** (when present in `{reviewer_rules}`): treat each `type: feedback` memory entry as a MUST-grade rule; treat `type: user` entries as context that informs explanation depth but not as MUST rules.

## Rules NOT to flag by default

- **Test doubles don't need to match the interface they substitute.** A faker that exposes test-only public helpers (e.g., `seed()`, `all()`, `addForTest()` not present on the production interface) is **not** a violation. Some projects enforce strict test-double parity; do not assume yours does. Only flag this when `{reviewer_rules}` explicitly contains a memory entry like `test_double_matches_interface = on`.

## Classification Rules

- **MUST**: Clear rule violation — the project documentation explicitly prohibits or requires something
- **OPTIONAL**: Convention with room for judgment — the rule exists but the violation is minor or debatable
- **QUESTION**: Ambiguous applicability — the rule might apply but context makes it unclear

## Output Format

For each violation:
- Classification: MUST / OPTIONAL / QUESTION
- File and line reference
- Rule violated (quote the relevant rule)
- `pattern`: a short stable name for the rule (e.g., `aaa-test-comments`, `hexagonal-layering`)
- `pattern_kind`: `project-rule` when sourced from AGENTS.md/CLAUDE.md, `memory` when sourced from `{reviewer_rules}`
- `pattern_marker`: a grep-able string the orchestrator can use to probe codebase prevalence (only for `pattern_kind: project-rule`; can be omitted for `pattern_kind: memory`)
- `certainty` (0-100) — is the observation factually true of the code? Not how much it matters.
- `materiality` — `high` (MUST) / `medium` (Optional) / `low` (Question). See the output contract.
- Suggested fix

Additionally, end your output with one final line:
- **Obstacles Encountered:** Report any obstacles encountered during the review process — setup issues, workarounds discovered, or environment quirks. Report commands that needed a special flag or configuration. Report dependencies or imports that caused problems. If none, write "None".
