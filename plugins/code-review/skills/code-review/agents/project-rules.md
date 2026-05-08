# Agent 1 — Project Rules Compliance

Review the diff against the project rules from CLAUDE.md/AGENTS.md files provided to you.

## What to Check

- Architecture patterns (hexagonal, CQRS, module boundaries)
- Naming conventions
- DI configuration patterns (Symfony DI over Fluent)
- Testing conventions
- Any other rules specified in the project documentation

## Classification Rules

- **MUST**: Clear rule violation — the project documentation explicitly prohibits or requires something
- **OPTIONAL**: Convention with room for judgment — the rule exists but the violation is minor or debatable
- **QUESTION**: Ambiguous applicability — the rule might apply but context makes it unclear

## Output Format

For each violation:
- Classification: MUST / OPTIONAL / QUESTION
- File and line reference
- Rule violated (quote the relevant rule)
- Confidence score (0-100)
- Suggested fix

Additionally, end your output with one final line:
- **Obstacles Encountered:** Report any obstacles encountered during the review process — setup issues, workarounds discovered, or environment quirks. Report commands that needed a special flag or configuration. Report dependencies or imports that caused problems. If none, write "None".
