# Finding Consolidation Rules

This file specifies how the orchestrator transforms the **raw findings list** emitted by Phase 2 agents into the **clean findings list** that goes into Step 7's local preview and Step 8's GitHub post.

The orchestrator runs these rules in order, on the in-memory findings list. There is no separate file or process — these are decision rules applied in Step 6 of `SKILL.md`.

---

## Run order (Step 6 sub-steps)

1. **Drop low-confidence** — remove every finding with `confidence < 80`.
2. **Default missing classifications** — MUST for critical/high severity, OPTIONAL for medium, QUESTION for low. No finding leaves Step 6 unclassified.
3. **Same-agent dedup** — within one agent's output, merge findings whose `(file, line)` AND `pattern_essence` match. Keep the more detailed body.
4. **Cross-agent dedup with disagreement handling** — see [Section A](#section-a--cross-agent-dedup-g7--g4) below.
5. **Pattern consolidation** — see [Section B](#section-b--pattern-consolidation-g1) below.
6. **Prevalence calibration** — see [Section C](#section-c--prevalence-calibration-g3) below.
7. **Match existing PR threads** — pre-existing logic in `SKILL.md` Step 6 sub-step 7. Unchanged.
8. **Match prior skill-authored reviews** — see [Section D](#section-d--prior-skill-review-suppression-g8) below.
9. **Collect positive observations + obstacles** — pre-existing logic. Unchanged.

---

## Section A — Cross-agent dedup (G7 + G4)

Two findings from different agents are considered the same finding when **all three** hold:

1. **Location match.** Either:
   - Same `file` AND `|line_a - line_b| ≤ 3`, OR
   - Same `file` AND both findings reference the same identifier (class, method, or attribute name extractable from the description).
2. **Topic match.** The descriptions normalised (lowercased, code-fence content stripped, punctuation removed) share a Jaccard similarity ≥ 0.5 on token bigrams. This is intentionally loose so that "X is missing #[Override]" and "method X has no #[Override] attribute" merge.
3. **Pattern match.** Both findings carry the same `pattern` field, OR neither has one (legacy).

When merged:

- Keep the longest `description` (most information).
- Keep the highest `confidence`.
- `agents` field = union of contributors.
- `agent_classifications` field = the per-agent classification each contributor emitted (used by G4 below).

### G4 — Classification disagreement

After merging, inspect `agent_classifications`:

- If all agents agree → use that classification.
- If agents disagree → pick the **weakest**: `QUESTION` beats `OPTIONAL` beats `MUST`. The reasoning: a Question means at least one agent thinks the rule's applicability is uncertain — that uncertainty should propagate to the reviewer.
- Annotate the finding with `disagreement: "Agent X: MUST 95%, Agent Y: Question 80% — downgraded to Question"`. This annotation is shown in the Step 7 local preview only (NOT posted to GitHub).

---

## Section B — Pattern consolidation (G1)

After cross-agent dedup, group remaining findings by `(pattern, classification)` tuple.

For any group with size ≥ 2:

1. **Anchor selection.** Pick the (lowest file path lexicographically, lowest line number) tuple as the inline-comment anchor.
2. **Merge.** Produce a single consolidated finding:
   - `description`: keep the original short description (without locations).
   - `body`: append a `Locations to fix:` bullet list of every `(file, line, identifier)` from the merged set.
   - `confidence`: maximum of contributors.
   - `agents`: union of contributors.
3. **Suggested-fix check.** If members of the group have **structurally different** `suggested_fix` shapes (different signatures, different return types, different surrounding context), **do NOT consolidate** — keep them as separate findings. Consolidation is only correct when the fix template is identical modulo identifier substitution. Example of valid consolidation: 8 methods all need a `#[\Override]` attribute prepended. Example of invalid consolidation: 3 methods all violate naming, but each needs a different rename.

### Why this exists

In production the same systemic issue (forgotten attribute, missing convention) often touches many methods/files. Emitting one inline comment per occurrence creates 8–10 separate review threads for what is logically one fix. The author has to read the same explanation 8 times. Consolidation puts it in one place with all locations listed.

---

## Section C — Prevalence calibration (G3)

For every finding whose `pattern_kind == "convention"` (the agent emitted "your code violates project pattern X"), the orchestrator runs a cheap codebase-prevalence probe before classifying as MUST.

### Probe algorithm

1. **Identify the structural sibling set.** From the finding's `file` path, derive a glob of structurally-similar files. Heuristics:
   - For a file at `src/Modules/<Mod>/Infrastructure/Repository/X.php` → glob `src/Modules/*/Infrastructure/Repository/*.php`.
   - For a file at `src/Modules/<Mod>/Domain/ValueObject/X.php` → glob `src/Modules/*/Domain/ValueObject/*.php`.
   - For a test file under `Test/Domain/Repository/` → glob `src/Modules/*/Test/**/*.php`.
   - When no obvious sibling glob, skip the probe — leave the finding at the agent's classification.
2. **Sample up to 10 files** from the glob via `ls` or `find`.
3. **Count adherence.** For each sample, grep for the pattern marker (the agent should provide a `pattern_marker` string — e.g., `#[\\Override]`, `// Arrange`, `final readonly`). `prevalence = matches / total_sampled`.

### Classification mapping

| Prevalence | New classification |
|------------|--------------------|
| ≥ 0.8 | Keep MUST (strong codebase convention) |
| 0.5 – 0.8 | Downgrade to `[Optional]` (mixed convention) |
| < 0.5 | **Drop the finding entirely** (not actually a convention) |

The downgrade/drop happens silently — the finding goes from MUST → Optional or disappears. The local preview shows the new classification only.

### When prevalence isn't applicable

- **Genuine bug findings** (Agent 2's "null pointer" / "race condition" / "security issue"): skip the probe. Confidence stays as the agent emitted it.
- **Project-rule violations from explicit AGENTS.md/CLAUDE.md rules** (Agent 1's "the AGENTS.md says X is required"): skip the probe. The rule is documented — it's MUST regardless of how widely it's followed today.
- **Reviewer-memory rules** (loaded via G5): skip the probe. Memory rules are explicit reviewer preferences and should not be diluted by codebase prevalence.

---

## Section D — Prior skill-review suppression (G8b)

The orchestrator can detect its own past reviews on the PR and avoid re-emitting findings whose underlying rule has already been raised — even when the new occurrence is on a different file.

> **Principle: match by rule, not by location.** Two comments raising the same rule on different files are one conversation, not two. Threads should accumulate evidence over the PR's lifecycle, not fragment by file.

### Detection

A review is "skill-authored" when its body **starts** with the marker line:

```
_This code review was made automatically by Krzysztof Trzos Code Review AI Skill._
```

(The marker is stable across all versions of the skill — see SKILL.md Step 8's top-level body template.)

### Input

`prior_skill_findings`, produced by `agents/previous-comments.md` in Step 4c. It has two collections:

- `prior_skill_findings.inline` — one entry per inline comment with `{comment_id, path, line, signature, classification, resolved}`
- `prior_skill_findings.general` — one entry per General Finding parsed from the body with `{review_id, signature, classification}`

Both collections use the same signature normalisation: lowercase, badge emoji stripped (`🔴 / 🟡 / 🔵`), leading classification token (`must / optional / question`) and surrounding punctuation stripped. The result is a topic key like `add // arrange / // act / // assert section comments to every test method`.

### Indexes

Build two indexes keyed by normalised signature:

- `inline_index: signature -> list of inline entries`
- `general_index: signature -> list of general entries`

### Action selection (four cases)

For each new candidate finding still in the working set after Step 6 sub-steps 1–7:

```
sig = normalise(candidate.signature)

if candidate.bucket == "inline":
    matches = inline_index.get(sig, [])
    unresolved = [m for m in matches if not m.resolved]
    same_file_unresolved = [m for m in unresolved if m.path == candidate.path]

    if same_file_unresolved:
        # Case 1 — same file, same rule, prior thread still open
        → Move to Existing Threads bucket: stance = "react", comment_id = same_file_unresolved[0].comment_id
    elif unresolved:
        # Case 2 — different file, same rule, prior thread still open
        → Move to Existing Threads bucket: stance = "reply", comment_id = unresolved[lowest].comment_id
          reply_body = cross-file rollup listing every new (file, line, locator) for this signature
    elif matches:
        # Case 3 — only resolved matches; the rule was addressed for prior locations, this is new ground
        → Keep as fresh inline finding
    else:
        # Case 5 — no match at all
        → Keep as fresh inline finding

elif candidate.bucket == "general":
    if sig in general_index:
        # Case 4 — same rule already in the prior review body; re-listing is noise
        → Drop the candidate entirely
    else:
        → Keep as a new General Finding
```

### Tie-breaking when multiple matches exist

For Case 2 (cross-file reply rollup), if `unresolved` has multiple entries on different files, pick the one with the **lowest** `comment_id` (the first prior comment chronologically). Rationale: rolling new locations into the oldest thread gives the longest-running conversation the full picture; the author has already engaged with whichever thread they care about.

### Classification escalation

When `candidate.classification` is **stricter** than the matched prior (e.g., the prior was `[Optional]`, the candidate is `MUST`):

- For Case 1 — promote to `stance = "reply"` with a body explaining the escalation, instead of a silent react.
- For Case 2 — same; the reply body should call out the escalation.
- For Cases 3 and 5 — already fresh, no change.
- For Case 4 — escalating a General Finding from `[Optional]` to `MUST` is rare; treat as Case 5 (keep fresh) and let the new posting carry the upgraded severity.

### Cross-file reply body template

```markdown
The same rule applies to additional locations in this PR:
- `<path>` — <short locator> (line <N>)
- `<path>` — <short locator> (line <N>)

Rolling into this thread instead of opening a parallel one.
```

No auto-generation notice on the reply (per SKILL.md — the notice lives only on top-level review bodies).

### Worked examples

| Case | Prior | Candidate | G8b action |
|------|-------|-----------|------------|
| 1 | Inline, unresolved, `FakeXTest.php:23`, sig `add aaa comments...` | Inline, `FakeXTest.php:23`, same sig | 👍 react on the prior |
| 2 | Inline, unresolved, `FakeXTest.php:23`, sig `add aaa comments...` | Inline, `EntityXTest.php:23`, same sig | Reply rollup on the prior |
| 3 | Inline, **resolved**, `FakeXTest.php:23`, sig `add aaa comments...` | Inline, `EntityXTest.php:23`, same sig | Fresh inline on `EntityXTest.php` |
| 4 | General Finding in prior body, sig `pr description mismatch` | General Finding, same sig | Drop entirely |
| 5 | No prior with this sig | Anything | Fresh, normal posting |

---

## Output shape after Step 6

After all consolidation passes, each finding in the cleaned list has the following shape (used by Step 7 preview and Step 8 posting):

```
{
  "classification": "MUST" | "OPTIONAL" | "QUESTION",
  "confidence": 80-100,
  "file": "<path>",
  "line": <int>,
  "description": "<short title>",
  "body": "<full body including any Locations-to-fix list>",
  "pattern": "<pattern name>",
  "pattern_kind": "bug" | "convention" | "design" | "project-rule" | "memory",
  "agents": ["bug-smell-scan", "jazi-craftsmanship", ...],
  "agent_classifications": {"bug-smell-scan": "MUST", "tactical-ddd": "QUESTION"},  // only when disagreement
  "consolidated_locations": [{"file": "...", "line": N, "identifier": "save()"}, ...],  // only after G1 merge
  "suggested_fix": "<code snippet>",
  "prior_review_comment_id": <int>,  // only if G8b matched a prior comment
  "stance": "react" | "reply" | "new",
  "reply_body": "<cross-file rollup text>"  // only when stance == "reply"
}
```
