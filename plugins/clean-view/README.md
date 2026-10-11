# Clean View

A mod (a hooks plugin, not a skill) that makes Claude Code feel calm for people who aren't technical. While Claude works, tool calls, file diffs and command output are hidden, and one checklist above the prompt shows the plan, what is happening now and how far along it is.

```
Build my landing page · 1m 12s
✓ Read your brand notes            ■■■■■■■■■■  Done
▶ Build the pricing section        ■■■■■■□□□□  60%
○ Add the contact form             □□□□□□□□□□  Next
○ Polish the footer                □□□□□□□□□□  Up next
```

## Features

- **A card set apart from the chat** — a bordered box with a blank line above it, its colour following the state (cyan working, yellow needs you, red stuck, green done)
- **One checklist** — job name and time running, each step with a 10-cell meter; a sweep animation until a percent is reported
- **Plain states** — *Needs you* (permission prompts and questions), *Stuck* (denied permission, repeated failures, API errors in one calm sentence), *Paused* (a plan left unfinished with no question for you), *Stopped* (Esc), *All done* (the card stays until your next request)
- **Hidden technical rows** — tool calls, results, groups and the background-run hint; Claude's written replies stay visible
- **Two tools for Claude** — `plan_steps` lays out the steps up front, `report_progress` fills the meter; TodoWrite and TaskCreate lists also feed the checklist
- **Out of the way** — while you type a slash command the card steps aside so the command menu sits right above your prompt
- **Always on** — there is no switch and no minimize: while the mod is installed, Clean View is active. To turn it off, disable or uninstall the plugin

## Installation

```
/plugin install clean-view@ai-marketplace
```

Choose the user scope to have it in every session. It is a terminal (`/plugin`) install.

## Usage

Nothing to do: the card appears when you send a request. To stop using it, disable the plugin with `/plugin`.

## Things to know

- **It changes how Claude behaves while installed.** It adds a section to the system prompt, and until Claude has called `plan_steps` (or TodoWrite / TaskCreate) every other tool call is denied, so each request costs one extra tool call. After 3 denials in one job the gate lets calls through, so it cannot deadlock. Subagents are never gated.
- **A small model call per job.** A Haiku call at the start of each job names it in 2 to 6 words.
- **Escape hatch:** disabling the plugin removes the gate, the prompt section and the hiding.
- It is a mod: it needs a Claude Code build that supports mods.

## Development

```
claude plugin validate plugins/clean-view
claude plugin test plugins/clean-view
```
