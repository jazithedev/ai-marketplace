#!/usr/bin/env sh
# Re-states the say-less budgets on every prompt. The session-start text fades in long
# sessions next to other skills' instructions; this short line keeps the budgets in view.
# Honours the same off switch as session-start.sh.

[ -f "${HOME}/.claude/say-less/off" ] && exit 0

echo "say-less is on: first line is the answer. Budgets include lists: answer 40 words, report 60, walkthrough 120, PR body 80, commit body 40, progress 12. Max 7 list items, 10 words each. Keep risks and next steps; put the rest behind \"N more: say if you want them\"."
