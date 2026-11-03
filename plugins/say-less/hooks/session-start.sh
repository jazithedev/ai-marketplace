#!/usr/bin/env sh
# Loads the say-less voice into every session (startup, resume, /clear, compaction),
# so it applies without being invoked. SessionStart stdout becomes session context.
# `/say-less:say-less off` creates the flag file below to silence it.

[ -f "${HOME}/.claude/say-less/off" ] && exit 0

skill="${CLAUDE_PLUGIN_ROOT:-$(dirname "$0")/..}/skills/say-less/SKILL.md"
[ -f "$skill" ] || exit 0

references="$(dirname "$skill")/references"

echo "The say-less plugin is on. Write everything in this session in the voice below. Its examples are in ${references}/examples.md."
echo
# Print the skill body without its YAML frontmatter.
awk 'NR == 1 && /^---$/ { fm = 1; next } fm && /^---$/ { fm = 0; next } !fm' "$skill"
# The banned list is loaded too: rules that need a file read get missed mid-task.
if [ -f "${references}/banned.md" ]; then
  echo
  cat "${references}/banned.md"
fi
