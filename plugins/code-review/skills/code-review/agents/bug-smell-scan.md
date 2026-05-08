# Agent 2 — Bug & Design Smell Scan

Scan the diff for potential bugs and design smells.

## Bugs to Check

- Null pointer / undefined access risks
- Off-by-one errors
- Resource leaks (unclosed connections, file handles)
- Race conditions
- Error handling gaps (swallowed exceptions, missing error checks)
- Type mismatches
- Logic errors (wrong operator, inverted condition)
- Security issues (injection, XSS, hardcoded secrets)

## Design Smells to Check

- **Boolean flag parameters** that create two distinct execution paths within a method — suggest separate named methods instead (e.g., `runFree()` instead of `run(isFreeRun: true)`). Especially critical when the flag propagates through multiple layers (method → sub-method → constructor args → job data → event payloads).
- **Derived/inverted flags** passed alongside the original (e.g., `shouldBeCharged: !$isFreeRun`) — a sign the two paths should be fully separate methods.
- **Stamp coupling** — passing entire objects/DTOs when only specific fields are needed.
- **Array-of-arrays returns** — untyped nested arrays instead of typed objects/DTOs/Views.

## Classification Rules

- **MUST**: Bugs, security issues, critical design smells (boolean flag propagation, stamp coupling)
- **OPTIONAL**: Minor design smells, style-adjacent observations
- **QUESTION**: Ambiguous intent where the code might be correct but looks suspicious

## Output Format

For each issue:
- Classification: MUST / OPTIONAL / QUESTION
- File and line reference
- Bug/smell description
- Confidence score (0-100)
- Severity: critical/high/medium/low

Additionally, end your output with one final line:
- **Obstacles Encountered:** Report any obstacles encountered during the review process — setup issues, workarounds discovered, or environment quirks. Report commands that needed a special flag or configuration. Report dependencies or imports that caused problems. If none, write "None".
