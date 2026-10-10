# Clean View

A mod (a hooks plugin, not a skill) that makes Claude Code feel calm for people who aren't technical. While Claude works, tool calls, file diffs and command output are hidden, and one checklist above the prompt shows the plan, what is happening now and how far along it is.

```
Build my landing page · 1m 12s                     [ ● Clean View: ON ]
✓ Read your brand notes            ■■■■■■■■■■  Done
▶ Build the pricing section        ■■■■■■□□□□  60%
○ Add the contact form             □□□□□□□□□□  Next
○ Polish the footer                □□□□□□□□□□  Up next
```

## Features

- **A card set apart from the chat** — a bordered box with a blank line above it, its colour following the state (cyan working, yellow needs you, red stuck, green done)
- **One checklist** — job name and time running, each step with a 10-cell meter; a sweep animation until a percent is reported
- **Plain states** — *Needs you* (permission prompts and questions), *Stuck* (denied permission, repeated failures, API errors in one calm sentence), *Paused* (a plan left unfinished with no question for you), *Stopped* (Esc), *All done* (shrinks to one line after 5 seconds)
- **Hidden technical rows** — tool calls, results, groups and the background-run hint; Claude's written replies stay visible
- **Two tools for Claude** — `plan_steps` lays out the steps up front, `report_progress` fills the meter; TodoWrite and TaskCreate lists also feed the checklist
- **Out of the way** — while you type a slash command the card steps aside so the command menu sits right above your prompt
- **On/off anywhere** — the button above the prompt or `/simple on|off`; remembered across restarts; starts on

## Installation

```
/plugin install clean-view@ai-marketplace
```

Choose the user scope to have it in every session. It is a terminal (`/plugin`) install.

## Usage

- Turn it off: click the button or type `/simple off`. Every hidden row comes back and only the button stays.
- Turn it on: click the button or type `/simple on`. `/simple` alone flips it.

## Things to know

- **It changes how Claude behaves while on.** It adds a section to the system prompt, and until Claude has called `plan_steps` (or TodoWrite / TaskCreate) every other tool call is denied, so each request costs one extra tool call. After 3 denials in one job the gate lets calls through, so it cannot deadlock. Subagents are never gated.
- **A small model call per job.** A Haiku call at the start of each job names it in 2 to 6 words.
- **Escape hatch:** `/simple off` removes the gate, the prompt section and the hiding.
- It is a mod: it needs a Claude Code build that supports mods.

## Development

```
claude plugin validate plugins/clean-view
claude plugin test plugins/clean-view
```
