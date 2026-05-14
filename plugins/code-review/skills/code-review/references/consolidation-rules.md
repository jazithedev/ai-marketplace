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

## Section D — Prior skill-review suppression (G8)

The orchestrator can detect its own past reviews on the PR and avoid re-emitting identical findings.

### Detection

A review is "skill-authored" when its body **starts** with the marker line:

```
_This code review was made automatically by Krzysztof Trzos Code Review AI Skill._
```

(The marker is stable across all versions of the skill — see SKILL.md Step 8's top-level body template.)

### Algorithm

1. In Step 4, fetch all PR reviews via `gh api repos/{owner}/{repo}/pulls/{pr}/reviews --paginate --jq '.[] | select(.body | startswith("_This code review was made automatically by Krzysztof Trzos Code Review AI Skill._")) | {id, body}'`.
2. For each skill-authored review, fetch its inline comments via `gh api repos/{owner}/{repo}/pulls/{pr}/comments --paginate --jq '.[] | select(.pull_request_review_id == <review_id>) | {id, path, line, body}'`.
3. From each inline body, extract the **finding signature**:
   - The first non-empty line — typically `**🔴 MUST** — <title>` or `**🟡 [Optional]** — <title>` or `**🔵 [Question]** — <title>`.
   - Normalise (lowercase, strip whitespace, strip badge emoji) for matching.
4. Build the `prior_signatures` set, mapping `signature → {comment_id, path, line}`.

### Suppression rules

In Section A (cross-agent dedup), after merging:

- Compute the candidate finding's signature using the same extraction.
- If it matches a `prior_signatures` entry:
  - **Move the finding to the "Existing Threads" bucket** with `stance = "react"` and `comment_id = <prior comment id>`. This causes Step 8 to post a 👍 reaction on the prior comment instead of a new inline comment.
  - The reasoning: re-posting the same finding creates noise and clutters the PR conversation. A reaction is a low-cost re-acknowledgement.

Exception: if the candidate finding's classification is **stricter** than the prior (e.g., the prior was `[Optional]`, the new is `MUST`), keep it as a fresh finding — the severity escalated, the author needs to see it again.

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
  "prior_review_comment_id": <int>,  // only if G8 matched a prior comment
  "stance": "react" | "reply" | "new"
}
```
