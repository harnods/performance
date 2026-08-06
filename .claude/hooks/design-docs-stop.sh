#!/usr/bin/env bash
# Stop hook — design-docs backstop.
# Fires at the end of a turn ONLY when a UI file (.vue under pages/ or
# components/) was just edited (mtime < 3 min) — i.e. during active UI work.
# Nudges once to confirm the design docs cover any new/changed pattern.
# Silent on non-UI turns and self-decaying; never traps the user in a loop.

input="$(cat)"

# Guard: if we're already continuing because of this stop hook, let it stop.
active="$(printf '%s' "$input" | jq -r '.stop_hook_active // false' 2>/dev/null)"
[ "$active" = "true" ] && exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

# UI source files touched in the last 3 minutes (proxy for "this turn").
changed="$(find pages components -type f -name '*.vue' -mmin -3 2>/dev/null | sort)"
[ -z "$changed" ] && exit 0

jq -n --arg files "$changed" '{
  decision: "block",
  reason: ("[design-docs backstop] UI files were just edited:\n" + $files +
    "\nBefore stopping, confirm every new or changed UI pattern is reflected in docs/patterns/*.md. If this introduced a pattern the docs do not yet cover (or contradicts one), update the matching doc now — or add a new pattern doc and link it in docs/README.md. If all patterns are already documented, you may stop.")
}'
exit 0
