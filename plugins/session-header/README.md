# Session Header

A mod (a hooks plugin, not a skill) that keeps the most important facts about a Claude Code session in view: a bordered panel above the prompt, set apart from the chat history.

```
╭──────────────────────────────────────────────────────────────────╮
│  ◆ scum-map   ⎇ feature/637-route-planner  ✚3 ↑1   ✦ sonnet   plan │
│ ctx ▰▰▰▰▱▱▱▱▱▱ 42%  84k/200k  $1.23  7 turns  ⏱ 1h35m  5h 23%      │
│ ◎ goal: build the route finder                                    │
╰──────────────────────────────────────────────────────────────────╯
```

## What it shows

- **Row 1, identity** — worktree (folder of the git checkout), branch (green when clean, yellow when there are uncommitted changes), changed files `✚n`, commits ahead `↑n` / behind `↓n` upstream, model, and permission mode coloured by mode (plan, accept-edits, auto, bypass, default)
- **Row 2, metrics** — context bar (yellow from 60%, red from 80%), tokens against the window, session cost, turns, session age, and the 5-hour / 7-day rate-limit windows when the plan reports them
- **Row 3, goal** — your first plain prompt, or whatever you set with `/goal <text>`; `/goal` alone clears the override

## Behaviour

- **Narrow terminals** — the branch shortens in the middle first, then optional metrics drop (rate limits, age, tokens, turns, cost); worktree, branch, model, mode and the context bar stay
- **Out of the way** — hidden while you type a slash command, so the command menu sits right above your prompt, and released again when a command runs or a prompt is sent
- **Plays with other mods** — draws beneath whatever other mods put in the band above the prompt (for example [clean-view](../clean-view)) instead of replacing it
- **Git data** refreshes at session start, on each prompt and when a turn finishes
- **Permission mode** is read from the footer's mode label; with no label it shows `default`

## Installation

```
/plugin install session-header@ai-marketplace
```

Choose the user scope to have it in every session. It is a terminal (`/plugin`) install.

## Development

```
claude plugin validate plugins/session-header
claude plugin test plugins/session-header
```
