---
name: hermes-tweet
description: >-
  Guide Hermes Agent X/Twitter workflows with Hermes Tweet. Use when the user asks to install
  Hermes Tweet, discover X/Twitter routes, read public posts or profiles, or prepare explicitly
  approved social actions through Hermes Agent and Xquik.
---

# Hermes Tweet

Hermes Tweet adds X/Twitter workflows to Hermes Agent. Use it for route discovery, public reads, and explicitly approved social actions.

## Workflow

1. Identify whether the user needs installation help, route discovery, public reads, or a write action.
2. If Hermes Tweet is not installed in the Hermes Agent environment, install it:

   ```bash
   uvx hermes-agent plugin install Xquik-dev/hermes-tweet
   ```

3. For read workflows, confirm `XQUIK_API_KEY` is configured in the local environment.
4. For write workflows, require explicit user approval before taking any action.
5. For write workflows, confirm `HERMES_TWEET_ENABLE_ACTIONS=true` is intentionally configured.
6. Use `tweet_explore` first to find the correct bundled route metadata.
7. Use `tweet_read` for public X/Twitter reads after credentials are configured.
8. Use `tweet_action` only after approval and action enablement are both present.
9. Keep credentials in the local environment. Do not place them in prompts, logs, generated files, or repository content.

## Source

Full package, tests, route metadata, and release notes live at `https://github.com/Xquik-dev/hermes-tweet`.
