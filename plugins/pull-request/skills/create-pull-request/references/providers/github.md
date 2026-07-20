# Provider: GitHub (`gh`)

Fully supported, including stacks. Terminology: *pull request*, native draft state.

| Operation | Command |
|---|---|
| `check-auth` | `gh auth status` |
| `get-default-branch` | `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` |
| `create-draft-pr` | `gh pr create --draft --base <base> --head <head> --title "<title>" --body "$(cat <<'EOF'`<br>`<body>`<br>`EOF`<br>`)"` |
| `edit-pr-body` | `gh pr edit <number-or-url> --body "…"` (heredoc as above) |
| `list-prs` | `gh pr list --search "<TICKET>" --state open --json number,title,isDraft,baseRefName,headRefName,url` |
| PR URL | printed by `gh pr create`; or `gh pr view <head> --json url -q .url` |

Notes:

- Always pass PR bodies via a quoted heredoc — never inline-escape markdown.
- `gh pr edit` can fail with a GraphQL "Projects (classic) is being deprecated" error on some
  gh versions. Fall back to REST: write the body to a temp file, then
  `gh api -X PATCH repos/<owner>/<repo>/pulls/<number> -F body=@<file>`.
- **Auto-retarget (stack prerequisite):** when a PR's base branch is merged and then deleted,
  GitHub automatically retargets dependent PRs onto the merged-into branch. Merging a child
  with "delete branch" enabled is what advances the chain.
- Draft → ready is the reviewer's/user's action (`gh pr ready`); this skill never does it.
