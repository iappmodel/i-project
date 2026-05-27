#!/usr/bin/env bash
# Verify a Seal Proof tap created a pending hold on the validator.
# Usage: ./scripts/smoke_android_seal_postcheck.sh [session_id] [local_user_ref]
set -euo pipefail

SESSION_ID="${1:-}"
USER_REF="${2:-demo-user-001}"
VALIDATOR="${POP_VALIDATOR_URL:-http://127.0.0.1:8787}"

if ! curl -sf "${VALIDATOR}/health" >/dev/null; then
  echo "SKIP: validator not running at $VALIDATOR" >&2
  exit 0
fi

echo "== Android Seal Proof postcheck =="
echo "user: $USER_REF"
[[ -n "$SESSION_ID" ]] && echo "session: $SESSION_ID"

HOLDS_JSON="$(curl -sf "${VALIDATOR}/v1/pending-holds?localUserRef=${USER_REF}")"

export HOLDS_JSON SESSION_ID
python3 <<'PY'
import json, os, sys

session_filter = os.environ.get("SESSION_ID") or ""
data = json.loads(os.environ["HOLDS_JSON"])
holds = data.get("holds") or []
pending = [h for h in holds if h.get("hold_status") == "pending"]

if session_filter:
    pending = [h for h in pending if h.get("session_id") == session_filter]
    if not pending:
        print(f"FAIL: no pending hold for session {session_filter}", file=sys.stderr)
        sys.exit(1)
else:
    if not pending:
        print("FAIL: no pending holds for user", file=sys.stderr)
        sys.exit(1)
    pending.sort(key=lambda h: h.get("created_at") or "", reverse=True)
    pending = pending[:1]

hold = pending[0]
print(
    f"PASS: pending hold session={hold.get('session_id')} "
    f"artifact={hold.get('artifact_id')} amount={hold.get('amount')}"
)
PY
