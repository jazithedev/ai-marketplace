---
name: commit
description: Use when committing changes to Git. Triggers when the user says "commit", "save my changes", "create a commit", uses /commit, or any variation of wanting to commit code to the repository. Also use this skill after completing a coding task when the user asks to commit the result. When changes are already staged, it commits them directly. When nothing is staged, it analyzes all tracked unstaged changes, decomposes them into logical groups if needed, and commits each group separately with user approval. This skill does not amend commits, push, or perform any other git operations beyond staging and committing.
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git branch:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*)
---

# Commit

Create well-formed conventional commit messages and commit changes after user approval. Supports two workflows depending on whether changes are already staged.

## Check for Previous Plan

Before analyzing changes, check the current conversation context for a previously planned but uncommitted group list (from a prior `/commit` invocation in the same conversation where only some groups were committed).

If a previous plan with remaining groups exists:

1. **Verify files still have uncommitted changes** — run `git diff --name-only` and `git diff --cached --name-only` to get the current set of modified files.
2. **Compare against the remaining groups' file lists** — if all files from the remaining groups still show uncommitted changes, skip full re-analysis and present those groups directly (jump to the presentation step of the appropriate path).
3. **Fall back to full re-analysis** if:
    - Any files from the remaining groups no longer have changes (e.g., reverted externally)
    - New files with changes appeared that weren't in the original plan
    - The user explicitly asks for a fresh analysis

This avoids redundant re-analysis when the user commits groups incrementally across multiple `/commit` invocations in the same conversation.

## Determine Path

Run `git diff --cached --stat` and `git diff --stat` to check for both staged and unstaged changes.

- **Staged changes only (no unstaged tracked changes) → Path A** (single commit of staged changes)
- **No staged changes → Path B** (analyze and decompose unstaged tracked changes)
- **Both staged and unstaged tracked changes → Path C** (analyze all changes together)

---

## Path A: Staged Changes Exist

The user has intentionally staged specific files. Respect that intent and commit only what's staged.

### A.1. Gather context

Run these commands in parallel:

- `git diff --cached` — the staged changes
- `git diff --cached --stat` — summary of files changed
- `git branch --show-current` — current branch name (for issue number)
### A.2. Extract the issue number

The branch name contains the issue/ticket number. Extract it:

- Branch `task/AM-4256-some-feature` → issue `#AM-4256`
- Branch `feat/PROJ-123-thing` → issue `#PROJ-123`
- Branch `fix/456-bug` → issue `#456`

Look for a Jira-style key first (`[A-Z]+-\d+`), then fall back to the first numeric segment. Prefix the result with `#`. If nothing is found, ask the user for the issue reference or omit the footer.

### A.3. Compose the commit message

Follow the Conventional Commits format described in the [Commit Message Format](#commit-message-format) section below.

### A.4. Present for approval

Present the full commit message inside a box-drawing frame (see [Commit Message Presentation](#commit-message-presentation)) and ask for confirmation. Wait for explicit approval before committing.

### A.5. Execute the commit

Once approved, commit using a heredoc:

```bash
git commit -m "$(cat <<'EOF'
<the approved message>
EOF
)"
```

After the commit succeeds, show the resulting commit hash with `git log --oneline -1`.

---

## Path C: Both Staged and Unstaged Changes — Analyze All Together

Both staged and unstaged tracked changes exist. Treat them as a single combined pool and decompose into logical groups. The fact that some files were pre-staged does not give them special treatment — grouping is based purely on logical purpose.

### C.1. Gather context

Run in parallel:

- `git diff --cached` — staged diff content
- `git diff --cached --name-only` — staged file list
- `git diff` — unstaged diff content
- `git diff --name-only` — unstaged tracked file list
- `git branch --show-current` — for issue number extraction
- `git status --short` — to detect untracked files

If untracked files exist, mention them once: "Note: N untracked file(s) were excluded from analysis." Do not include untracked files in any analysis or staging.

### C.2. Extract the issue number

Same as Path A — parse branch name for the first numeric segment.

### C.3. Analyze and decompose

Combine all changes (staged + unstaged) into a single pool. Apply the same decomposition logic as Path B (B.3) — group by purpose, check size, split if needed. Mark each group's files with their current git state (staged vs unstaged) so the execution step knows what to do.

### C.4. Present the plan

Same format as Path B (B.4), including file count and line stats per group, the option to commit only specific groups with automatic re-staging of remaining groups' files. Additionally, annotate each group to indicate which files are currently staged vs unstaged, so the user understands the staging area will be adjusted.

### C.5. Execute commits sequentially

**Critical: reset the staging area before each group.** Because some files may already be staged from a previous group or from the user's original staging, always start each group with a clean slate:

1. **Clear the staging area** — `git reset HEAD` (soft reset, unstages everything without losing changes)
2. **Stage only this group's files** — `git add <file1> <file2> ...`
3. **Present the full commit message** inside a box-drawing frame for final approval
4. **Commit** using heredoc pattern
5. **Verify** — `git log --oneline -1`
6. **Report** — show commit hash, move to next group

If the user chooses to commit only specific groups (e.g., "commit Group 2 for now"), still clear the staging area first so that files from other groups don't leak into the commit.

For stub handling and hunk-level splitting, follow the same rules as Path B (B.5).

**Hook failure handling:** Same as Path B — report failure, help fix, re-stage, create a new commit (never amend).

### C.5a. Re-stage remaining files after partial execution

Same as Path B (B.5a) — after committing fewer than all groups, collect file lists from uncommitted groups, re-stage them with `git add`, and confirm to the user.

### C.6. Summary

Same as Path B (B.6), including the partial commit summary format when not all groups are committed.

---

## Path B: Nothing Staged — Analyze and Decompose

The user invoked `/commit` but hasn't staged anything. Analyze all tracked unstaged changes and propose how to commit them.

### B.1. Gather context

Run in parallel:

- `git diff --name-only` — unstaged tracked file list
- `git diff` — full unstaged diff content
- `git branch --show-current` — for issue number extraction
- `git status --short` — to detect untracked files

If no tracked changes exist either → tell the user there are no changes and stop.

If untracked files exist, mention them once: "Note: N untracked file(s) were excluded from analysis." Do not include untracked files in any analysis or staging.

### B.2. Extract the issue number

Same as Path A — parse branch name for the first numeric segment.

### B.3. Analyze and decompose

Read the diffs and determine whether all unstaged tracked changes serve a single logical purpose or multiple distinct purposes.

#### Three-pass decomposition

**Pass 1 — By purpose:** Separate changes that serve different logical goals into distinct groups. A bug fix and a new feature are always separate commits. Unrelated style/cleanup changes get their own group when they are not trivially small relative to the main change.

Watch for **"introduce vs. consume"** — a common pattern where changes look like one purpose but are actually two sequential steps. If the changeset both (a) adds a new capability to a contract/interface and its implementations, and (b) uses that capability in a higher layer, those are distinct purposes: "enrich the domain model" and "use the enriched model." The enrichment is independently reviewable and mergeable; the consumer depends on it, not vice versa. Treat them as separate groups even when they serve the same feature.

**Pass 2 — By size:** Evaluate each group's diff size.

| Size          | Action                                                             |
|---------------|--------------------------------------------------------------------|
| ≤200 lines    | Target. Keep as one commit.                                        |
| 201–400 lines | Split if a clean boundary exists; justify keeping together if not. |
| >400 lines    | Must split — see exception below for uniform changes.              |

**Soft file-count limit:** Aim for ~10 files per commit. When a group exceeds this, look for a clean split boundary. Waive the limit when files are tightly coupled and splitting would break CI (e.g., a required parameter change that touches the command, its handler, and all callers).

**Pass 3 — CI safety:** After grouping, validate that each commit can pass CI independently (static analysis, type checks, tests). When a split would break CI, resolve it using one of these strategies (in order of preference):

1. **Introduce without consuming.** The preferred approach. In commit N, add the new class/method/parameter AND update all call sites to pass it — but don't use it internally yet. In commit N+1, implement the logic that consumes it. This preserves the clean split while keeping CI green. Examples:
    - New parameter: commit N adds the parameter to the constructor and all callers pass a value. Commit N+1 wires the parameter into the method's internal logic.
    - New class/service: commit N creates the class and registers it in DI. Commit N+1 injects and uses it.
    - New method: commit N adds the method. Commit N+1 calls it from the higher layer.

2. **Merge groups.** When "introduce without consuming" isn't practical (e.g., the split boundary doesn't allow it, or the groups are small enough that merging stays within file/line limits), merge the dependent groups into one commit.

The goal is: every commit in the sequence must pass CI on its own. Never leave a commit where a required parameter has no callers, a type reference is unresolved, or a test fails.

#### Exception: mechanically uniform changes

The >400-line split rule does **not** apply when every file in the group receives the same structural transformation — a single repetitive operation applied uniformly across the codebase.

**Valid examples:**
- File or namespace moves/renames (IDE refactoring)
- Global method or variable renames
- Formatter/linter fixes applied project-wide
- Replacing a deprecated constant, annotation, or import everywhere
- Codemod-driven replacements (e.g., upgrading an API call pattern)

**Requirements to qualify:**
- The transformation was performed by a dedicated tool (IDE refactoring, script, codemod, formatter) — not manual edits that happen to look similar
- The commit message clearly describes the change as a single uniform operation (e.g., `refactor(shared): rename MapId::getValue to MapId::toString`)
- The diff is structurally repetitive — reviewing one instance is sufficient to verify correctness of all instances

When these conditions are met, the entire change stays in **one commit** regardless of line count.

#### How to split large single-purpose groups

Follow the hexagonal architecture's dependency direction. Each sub-commit builds on the previous:

1. **Domain layer first** — value objects, entities, domain services, domain events, contracts/interfaces
2. **Application layer next** — command/query handlers, application services
3. **Infrastructure layer** — repositories, external service adapters
4. **Presentation/Frontend** — controllers, resolvers, React components, GraphQL types

Tests go with the layer they test.

#### Decoupling with stubs at connection points

When a size-driven split creates a dependency gap between commits, temporary stubs bridge the gap:

- **Deliver contracts before implementations.** An interface can be committed before its implementation exists.
- **Use temporary stubs/TODOs.** At connection points, insert a stub or `// @TODO: To be implemented` comment. The next commit removes the stub and wires in the real code.
- **Think in PR pipelines.** Each commit maps to a PR. Commit N can leave a TODO that commit N+1 resolves.

**No file modification without user approval.** The decomposition plan must detail exactly what stubs will be inserted and where. The user must explicitly approve the plan before any source file is touched.

**Stubs are transient.** After the full commit sequence completes, no stubs remain — the final commit restores all real code.

#### When NOT to split — the pragmatism rule

Do not split for the sake of architectural purity:

- A contract interface + its concrete implementation (e.g., a repository interface and its Doctrine adapter) totaling 100 lines → **one commit** — these are two halves of the same thing
- A domain entity + its application service + a test totaling 180 lines → **one commit**
- A full feature touching all layers totaling 600 lines → **split required**

However, do split when the domain change is independently meaningful even if small:

- An interface enrichment (new property/method across an interface + all its implementations) + a higher-layer consumer using it → **two commits** — the enrichment stands on its own and the consumer is a dependent step

#### Hunk-level splitting within files

When a single file contains changes of different categories (e.g., domain logic + unrelated style fixes), the analysis separates them. A file may contribute changes to multiple commit groups.

When this happens: temporarily revert the unrelated changes in the file (keeping only the changes for the current group), stage the file, commit, then restore all changes for subsequent groups. This uses the same stub/restore mechanism.

#### Grouping heuristics

- Group by logical purpose first — what problem does this set of changes solve?
- Detect "introduce vs. consume" patterns — when a changeset enriches a domain contract (new property, method, or capability on an interface + all implementations) and a higher layer consumes it, split into a domain-enrichment group and a consumer group
- Then check size — split large groups along layer boundaries following dependency direction
- Separate unrelated style/cleanup changes from functional changes, even within the same file
- **Tests must always ship with the production code they cover** — never commit tests as a separate group. Group test files with the production code layer they test
- Separate config/infrastructure changes (Docker, CI, devops) from application code when independently meaningful
- Group dependency/lock file changes with the commit that caused them
- Separate documentation only when it doesn't document a code change in the same set

#### No "while I was here" mixing

Unrelated improvements, style fixes, or minor cleanups must not be bundled into a feature or bugfix commit unless they are trivially small relative to the main change.

### B.4. Present the plan

**Single group:** Present the commit message inside a box-drawing frame (see [Commit Message Presentation](#commit-message-presentation)) along with the file list. Ask to proceed.

**Multiple groups:** Present a numbered plan where each group shows file count, line stats (from `git diff --stat` for the group's files), and commit message inside a box-drawing frame:

```
I've identified N logical groups in your changes:

Group 1 (2 files, +142 lines):
╔════════════════════════════════════════════════════════╗
║  feature(map): add polygon validation service          ║
╚════════════════════════════════════════════════════════╝
  Files:
    - src/Module/Map/Domain/Service/PolygonValidator.php
    - tests/Module/Map/Domain/Service/PolygonValidatorTest.php

Group 2 (1 file, +12 -8 lines):
╔════════════════════════════════════════════════════════╗
║  fix(websocket): correct heartbeat interval            ║
╚════════════════════════════════════════════════════════╝
  Files:
    - src/Module/Websocket/Infrastructure/Server.php

Group 3 (2 files, +3 -1 lines):
╔════════════════════════════════════════════════════════╗
║  chore(docker): update PHP base image tag              ║
╚════════════════════════════════════════════════════════╝
  Files:
    - devops/images/settings
    - .gitlab-ci.yml

Options: approve as-is, merge groups, move files between groups,
change a commit message, commit only specific groups (remaining
groups' files will be re-staged automatically), or drop a group
(leaves files uncommitted).
```

**Stats format:** Use `git diff --stat -- <files>` for each group to get line counts. Show as `(N files, +A -D lines)` for new+deleted, or `(N files, +A ~M -D lines)` when modifications are present. For new-only files, `(N files, +A lines)` suffices.

If any group requires stubs, detail exactly what stubs will be inserted and where.

Wait for explicit user approval before proceeding.

### B.5. Execute commits sequentially

**For single-group plans (no stubs needed):**

1. **Ensure a clean staging area** — run `git diff --cached --stat` to check for pre-existing staged changes. If any files are staged that do not belong to this group, run `git reset HEAD` first to unstage everything. This prevents unrelated staged files from leaking into the commit.
2. Stage the group's files — `git add <file1> <file2> ...`
3. Present the full commit message inside a box-drawing frame (see [Commit Message Presentation](#commit-message-presentation)) for final approval
4. Commit using heredoc pattern
5. Verify — `git log --oneline -1`

**For multi-group plans requiring stubs:**

For each group in order:

1. **Insert stubs if needed** — If this group's files have connection points to code in later groups, replace those connection points with temporary stubs/TODOs. Show exactly what was changed.
2. **Ensure a clean staging area** — run `git reset HEAD` to unstage everything, so only this group's files end up in the commit.
3. **Stage only this group's files** — `git add <file1> <file2> ...`
4. **Present the full commit message** inside a box-drawing frame (see [Commit Message Presentation](#commit-message-presentation)) for final approval (user may tweak wording)
5. **Commit** using heredoc pattern
6. **Verify** — `git log --oneline -1`
7. **Restore real code** — Remove stubs inserted in step 1, restoring the original code for subsequent groups
8. **Report** — show commit hash, move to next group

The final group in the sequence should have no stubs remaining — all real code is committed.

**For multi-group plans with hunk-level splitting:**

When a file contributes changes to multiple groups, for each group:

1. Save the current file state
2. Revert changes not belonging to this group (keep only this group's hunks)
3. Stage the file
4. Commit
5. Restore the full file state for subsequent groups

**Hook failure handling:** Report which group (N of M) failed, help fix the issue, re-stage the same files, create a **new** commit (never amend), then continue with remaining groups.

### B.5a. Re-stage remaining files after partial execution

After committing fewer than all groups (user chose to commit only specific groups, or stopped mid-sequence):

1. **Collect file lists** from all uncommitted groups
2. **Re-stage those files** — `git add <file1> <file2> ...` for every file in the remaining groups
3. **Confirm to the user** which groups' files were re-staged and how many files total, e.g.: "Re-staged 5 files from Groups 2 and 3. Run `/commit` again to continue."

This ensures the user doesn't lose their staging state and can resume committing the remaining groups without manually re-staging.

### B.6. Summary

**All groups committed:** Show a complete summary:

```
All commits complete:
  abc1234 feature(map): add polygon validation service
  def5678 fix(websocket): correct heartbeat interval
  ghi9012 chore(docker): update PHP base image tag
```

**Partial commit (some groups remaining):** Show committed groups with hashes, then list remaining groups with their planned messages and files:

```
Committed:
  abc1234 feature(map): add polygon validation service

Remaining (files re-staged):
  Group 2: fix(websocket): correct heartbeat interval
    - src/Module/Websocket/Infrastructure/Server.php
  Group 3: chore(docker): update PHP base image tag
    - devops/images/settings
    - .gitlab-ci.yml

Run /commit again to continue with the remaining groups.
```

---

## Commit Message Presentation

When presenting a proposed commit message for user approval, **always** wrap it in a Unicode box-drawing frame. This creates a clear visual boundary in the terminal.

**Template:**

```
╔══════════════════════════════════════════════════╗
║  fix(map): correct polygon z-index calculation   ║
║                                                  ║
║  The polygon overlay was rendering behind        ║
║  markers due to incorrect z-index assignment     ║
║  during layer initialization.                    ║
║                                                  ║
║  Refs: #AM-342                                    ║
╚══════════════════════════════════════════════════╝
```

**Rules:**
- Top border: `╔` + `═` repeated + `╗`
- Side borders: `║` on each side
- Bottom border: `╚` + `═` repeated + `╝`
- 2-space inner padding on both sides of each content line
- Box width adapts to the longest line in the message (longest line + 4 padding + 2 border chars)
- Empty lines in the message become `║` + spaces + `║`

**Display-only wrapping:** The box-drawing frame may wrap long body lines to fit a reasonable display width. These visual line breaks are for presentation only. When passing the message to `git commit`, use the **unwrapped** text — each paragraph in the body should be a single continuous line. Only preserve intentional line breaks (blank lines between paragraphs, footer separation).

---

## Commit Message Format

Compose commit messages using **two sources**:

1. **General structure and rules** — read [`references/conventional-commits.md`](references/conventional-commits.md) for the Conventional Commits message structure, subject/body/footer rules, and breaking change syntax.

2. **Project-specific types, scopes, and examples** — read the project's `CONTRIBUTING.md` at the repository root for allowed commit types, scope conventions, and example messages.

If the project has no `CONTRIBUTING.md`, fall back to standard Conventional Commits types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`.

If changes span multiple scopes, use the most dominant one. If truly cross-cutting, omit the scope.

---

## Rules

- **Never** add `Co-Authored-By` lines for any AI model (Claude, GPT, etc.)
- **Never** amend previous commits
- **Never** force push or push at all
- **Never** use `--no-verify` to skip hooks
- **Never** include untracked files in analysis or staging (Path B)
- **Never** modify source files (insert stubs, revert hunks) without explicit user approval of the decomposition plan first (Path B)
- **Always** wait for user approval before executing any commit
- **Always** wait for user approval of the decomposition plan before staging or modifying anything (Path B)
- **Always** wait for user approval before each individual commit in a multi-commit sequence (Path B)
- **Always** ensure no stubs remain after the final commit — all real code must be restored (Path B)
- **Never** insert artificial line breaks into commit message body text — the box-drawing frame wraps lines for display, but the actual `git commit` message must use one continuous line per paragraph (git and hosting tools handle wrapping)
- **Always** use `:<space>` separator in footer tokens (e.g., `Refs: #AM-1234`, not `Refs #AM-1234`)
- If a pre-commit hook fails, report the failure and help fix the issue, then create a **new** commit (never amend)
