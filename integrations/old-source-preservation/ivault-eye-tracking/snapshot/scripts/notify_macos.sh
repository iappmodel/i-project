#!/usr/bin/env bash
# Post a macOS Notification Center banner (local developer convenience only).
# Not wired to Cursor; run manually, e.g.:
#   flutter test && scripts/notify_macos.sh "flutter test OK"
set -euo pipefail
title="${NOTIFY_TITLE:-eye_tracking_app}"
msg="${1:-Done}"
# Escape double quotes for AppleScript
safe_msg="${msg//\"/\\\"}"
safe_title="${title//\"/\\\"}"
osascript -e "display notification \"$safe_msg\" with title \"$safe_title\""
