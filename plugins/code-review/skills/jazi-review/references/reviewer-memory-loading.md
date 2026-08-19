# Reviewer Auto-Memory: Load & Write-Back

Claude Code's auto-memory system maintains reviewer-specific facts and feedback in `~/.claude/projects/<encoded_cwd>/memory/`. This reference describes:

1. **G5 — how to load** those entries and surface them to every Phase 2 agent.
2. **S3 — how to write back** entries when reviewer corrections imply a new rule.

The same file is used at the start (load) and the end (write-back) of a review session.

---

## Memory directory location

Encoding rule: replace every `/` in the absolute current working directory with `-`, then prepend `~/.claude/projects/`. Example: cwd `/home/jazi/www/tools` → memory dir `~/.claude/projects/-home-jazi-www-tools/memory/`.

The expected structure:

```
~/.claude/projects/<encoded_cwd>/memory/
├── MEMORY.md                  ← index, always present
├── feedback_<slug>.md          ← reviewer feedback rules
├── project_<slug>.md           ← current-state project facts (NOT used by the skill)
├── reference_<slug>.md         ← pointers to external systems (NOT used by the skill)
└── user_<slug>.md              ← reviewer profile facts
```

If `MEMORY.md` does not exist, the skill proceeds with an empty rule set and skips both G5 and S3.

---

## Memory entry format

Each memory file uses YAML frontmatter:

```markdown
---
name: <kebab-case-slug>
description: <one-line summary>
metadata:
  type: feedback | user | project | reference
---

<body — feedback/user types are review rules; project/reference are not>
```

For G5, the skill collects entries where `metadata.type ∈ {feedback, user}` only. `project` and `reference` types describe state, not rules — they don't influence findings.

---

## G5 — Load reviewer rules

### Step A — Read MEMORY.md

```bash
MEMORY_DIR="$HOME/.claude/projects/$(pwd | sed 's|/|-|g')/memory"
[ -f "$MEMORY_DIR/MEMORY.md" ] || { echo "No memory — skipping G5"; exit 0; }
cat "$MEMORY_DIR/MEMORY.md"
```

The index uses one line per memory in the form `- [Title](file.md) — one-line hook`. Parse out the `file.md` portion.

### Step B — Read each linked file

For each linked file, read its full content and extract:

- `name` from frontmatter
- `description` from frontmatter
- `metadata.type` from frontmatter
- the markdown body

### Step C — Filter

Keep only entries with `type ∈ {feedback, user}`.

### Step D — Pass to agents

When invoking each Phase 2 agent (in particular Agent 1 / project-rules, Agent 5 / code-documentation, Agent 8 / jazi-craftsmanship), include a `{reviewer_rules}` block in the prompt:

```
## Reviewer Memory Rules

The following rules come from the reviewer's saved auto-memory entries. Treat them as additional
project rules — each is a MUST-grade preference unless the body explicitly says otherwise.

If a rule's body asserts a CHECKABLE FACT about the codebase or its tooling — "these paths are
excluded from coverage", "the linter rejects this", "the team removes these", "X fails because Y" —
verify that claim before emitting a MUST, and report your measurement with the finding. A rule that
states only a preference ("use named parameters", "always add AAA comments") has nothing to verify;
apply it directly.

### Rule: <name>
<description>

<body>

---

### Rule: <name>
...
```

Agents should apply these rules **in addition** to the rules they normally check, and emit findings tagged with `pattern_kind: "memory"`. That tag exempts them from the G3 *prevalence* probe — a reviewer preference doesn't need majority adoption to be valid, since the reviewer may be introducing the convention deliberately.

**Exemption from prevalence is not exemption from being wrong.** Where a rule's body cites a codebase fact as its justification, that fact is falsifiable and gets checked — see `consolidation-rules.md` § Section C-bis (G9). A memory rule generalised from one incident often carries a reason that doesn't hold everywhere the rule is applied, and because memory findings bypass prevalence and are treated as MUST-grade, nothing else in the pipeline can catch it. Agents should emit the premise and its measurement in the finding:

```
premise_check: { claim: "...", verdict: "holds" | "fails" | "unverifiable", measurement: "..." }
```

When the premise fails, the finding is downgraded to `[Optional]` rather than dropped — the preference may still stand even when its stated reason doesn't, and that call belongs to the reviewer.

---

## S3 — Write back correction patterns

After Step 8 (the review has been posted), the orchestrator compares the **local preview findings** with the **posted findings**. Differences imply the reviewer made a judgment call that's worth remembering.

### Signals worth saving

| Signal | Memory entry shape |
|--------|--------------------|
| Reviewer dropped a finding entirely | "Don't flag X" rule |
| Reviewer marked a Question as `r` (resolved with own answer) | "Policy on X is Y" rule |
| Reviewer downgraded MUST → Optional | "X is acceptable but not preferred" rule |
| Reviewer reworded a body substantially | Tone or terminology preference |
| **G9 premise verification failed** | **Correction to the existing memory — see below** |

### Correcting an existing memory after a failed premise (G9)

Every other signal in the table *adds* a rule. This one *repairs* one, and it's the highest-value write-back in the skill: an uncorrected false premise re-fires on every future review of that module, and each time it produces a MUST the reviewer has to override by hand.

Offer three concrete options rather than a yes/no, since "the premise is false" doesn't by itself say what the reviewer wants:

1. **Narrow** — keep the rule, restrict it to the cases where the premise does hold (usually the right answer; the original incident was real, the generalisation was too wide).
2. **Keep as-is** — the reviewer wants the preference enforced regardless of the stated reason. Then remove the false justification from the body and mark it as taste, so it stops being checked and stops being downgraded.
3. **Delete** — the rule was only ever a proxy for the premise, and without it there's nothing left.

Whichever is chosen, the rewritten body must record **the measurement and the date**, so a future session doesn't re-derive the same check:

```markdown
**Measured on PR #<N> (<YYYY-MM-DD>):** <verbatim config excerpt or prevalence count>
```

Then update the rule's `description` frontmatter and its `MEMORY.md` index line to match the narrowed scope — a stale one-line hook is what gets skimmed on the next run, so leaving it saying the old thing defeats the correction.

### Prompt the reviewer

For each candidate signal, ask:

> Save this as a feedback memory so future runs apply it automatically?
>   • **rule:** <generated rule statement>
>   • **why:** <derived from the correction>
>
> (yes / no / edit)

Default `no` — these memories shape future behaviour, so don't write opportunistically.

### Write-back file template

When the reviewer says yes (or yes-after-edit), write a new file under `$MEMORY_DIR/feedback_<slug>.md`:

```markdown
---
name: <slug>
description: <one-line summary>
metadata:
  type: feedback
---

<rule statement>

**Why:** <reviewer's reason, captured from the correction context — typically "this is the team's transaction policy" or "this convention is mixed in our codebase, not strict">

**How to apply:** <when this rule kicks in — e.g., "when reviewing Doctrine repository implementations" or "when reviewing test doubles">

Linked: [[<related-memory-slug>]] — if applicable.
```

After writing the file, append a line to `MEMORY.md`:

```markdown
- [<Title>](feedback_<slug>.md) — <one-line hook>
```

### Conflict handling

If a memory with the same `name` slug already exists, the reviewer can choose to:

- **Replace** — overwrite with the new content
- **Append** — keep both bodies, separated by `---`
- **Skip** — leave the existing one alone

Always show a diff between old and new before applying.

---

## Why filter to `feedback` + `user` types

- **`feedback`** entries are explicitly review-relevant: "always do X", "never suggest Y", "this is the team's policy on Z". These are the canonical review rules.
- **`user`** entries describe the reviewer's role and expertise. They help the skill calibrate explanation depth (don't over-explain to a senior engineer) but rarely yield concrete review rules. They're loaded for context, not as MUST-grade rules — agents should weight them lower.
- **`project`** entries are current-state facts ("merge freeze starts Thursday"). They change too fast to drive review decisions.
- **`reference`** entries are pointers to external systems. They're useful when an agent needs to look something up, but they aren't rules.
