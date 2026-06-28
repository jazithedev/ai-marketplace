# Hermes Tweet

Hermes Tweet guides Hermes Agent workflows for X/Twitter route discovery, public reads, and approval-gated social actions through Xquik.

## Features

- Search bundled route metadata before choosing a Hermes Tweet route
- Read public X/Twitter data after `XQUIK_API_KEY` is configured
- Require explicit approval before any write action
- Confirm `HERMES_TWEET_ENABLE_ACTIONS=true` before write actions
- Keep credentials in the local environment and out of prompts, logs, and generated files

## Requirements

Install the Hermes Agent plugin where Hermes runs:

```bash
uvx hermes-agent plugin install Xquik-dev/hermes-tweet
```

Set `XQUIK_API_KEY` for read workflows. Set `HERMES_TWEET_ENABLE_ACTIONS=true` only when write actions are intentionally enabled.

## Installation

Users of this marketplace can install via:

```bash
/plugin install hermes-tweet@ai-marketplace
```

Or manually copy `skills/hermes-tweet/` to `~/.claude/skills/hermes-tweet/`.

## Usage

Ask for Hermes Tweet when you need X/Twitter route discovery, public tweet reads, profile or post inspection, or an explicitly approved social action from Hermes Agent.
