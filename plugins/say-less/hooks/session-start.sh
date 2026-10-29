#!/usr/bin/env sh
# Loads the say-less voice into every session (startup, resume, /clear, compaction),
# so it applies without being invoked. SessionStart stdout becomes session context.
# `/say-less:say-less off` creates the flag file below to silence it.

[ -f "${HOME}/.claude/say-less/off" ] && exit 0

skill="${CLAUDE_PLUGIN_ROOT:-$(dirname "$0")/..}/skills/say-less/SKILL.md"
[ -f "$skill" ] || exit 0

echo "The say-less plugin is on. Write everything in this session in the voice below. Its reference files are in $(dirname "$skill")/references/."
echo
# Print the skill body without its YAML frontmatter.
awk 'NR == 1 && /^---$/ { fm = 1; next } fm && /^---$/ { fm = 0; next } !fm' "$skill"
