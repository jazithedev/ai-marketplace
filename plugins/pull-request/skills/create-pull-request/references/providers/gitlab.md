# Provider: GitLab (`glab`)

Fully supported, including stacks. Terminology: *merge request* (MR) — use it when talking to
the user, even though the skill's documents say "PR" generically. Draft state is native
(`--draft` sets the `Draft:` title prefix).

| Operation | Command |
|---|---|
| `check-auth` | `glab auth status` |
| `get-default-branch` | `glab repo view --output json \| jq -r .default_branch` (fallback: `git symbolic-ref refs/remotes/origin/HEAD`) |
| `create-draft-pr` | `glab mr create --draft --source-branch <head> --target-branch <base> --title "<title>" --description "$(cat <<'EOF'`<br>`<body>`<br>`EOF`<br>`)" --yes` |
| `edit-pr-body` | `glab mr update <id-or-branch> --description "…"` (heredoc as above) |
| `list-prs` | `glab mr list --search "<TICKET>" --output json` |
| MR URL | printed by `glab mr create`; or `glab mr view <branch> --output json \| jq -r .web_url` |

Notes:

- Flags occasionally shift between `glab` versions — if a command errors, check
  `glab mr create --help` before improvising.
- Always pass descriptions via a quoted heredoc — never inline-escape markdown.
- **Auto-retarget (stack prerequisite):** when an MR's target branch is merged with
  "delete source branch" enabled, GitLab retargets dependent MRs onto the merged-into
  branch. That advances the chain, same as GitHub.
- Draft → ready is the user's action (`glab mr update <id> --ready`); this skill never does it.
