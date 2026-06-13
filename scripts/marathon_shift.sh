#!/usr/bin/env bash
# GO marathon prep — baseline smokes, init state, print GO command.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHIFT_DIR="$ROOT/.marathon-shift"
QUEUE="$ROOT/MASTER_BRAIN/marathon_queue.json"
STATE="$SHIFT_DIR/state.json"
STAMP="$(date +%Y%m%d-%H%M%S)"
LOG="$SHIFT_DIR/run-$STAMP.log"

mkdir -p "$SHIFT_DIR"

log() {
  echo "$*" | tee -a "$LOG"
}

init_state() {
  [[ -f "$QUEUE" ]] || { echo "FAIL: missing $QUEUE" >&2; exit 1; }
  python3 - "$QUEUE" "$STATE" <<'PY'
import json, sys
from datetime import datetime, timezone

queue_path, state_path = sys.argv[1], sys.argv[2]
with open(queue_path) as f:
    queue = json.load(f)

state = {
    "started_at": datetime.now(timezone.utc).isoformat(),
    "branch": queue.get("branch", "feature/lovable-harvest"),
    "serial_lane": [
        {"id": i["id"], "command": i["command"], "title": i.get("title", ""), "status": i.get("status", "pending")}
        for i in queue.get("serial_lane", [])
    ],
    "current": None,
    "completed_count": 0,
}
try:
    with open(state_path) as f:
        old = json.load(f)
    done = {x["id"]: x["status"] for x in old.get("serial_lane", []) if x.get("status") == "done"}
    for item in state["serial_lane"]:
        if item["id"] in done:
            item["status"] = "done"
    state["completed_count"] = sum(1 for x in state["serial_lane"] if x["status"] == "done")
    state["started_at"] = old.get("started_at", state["started_at"])
except FileNotFoundError:
    pass

with open(state_path, "w") as f:
    json.dump(state, f, indent=2)
PY
  ln -sf "$LOG" "$SHIFT_DIR/run-latest.log"
}

show_status() {
  echo "== Marathon shift status =="
  [[ -f "$STATE" ]] || { echo "No state — run ./scripts/marathon_shift.sh first"; exit 0; }
  python3 - "$STATE" "$QUEUE" <<'PY'
import json, sys
state = json.load(open(sys.argv[1]))
queue = json.load(open(sys.argv[2]))
print(f"Branch: {state.get('branch')}")
print(f"Started: {state.get('started_at')}")
print(f"Completed: {state.get('completed_count', 0)}/{len(state.get('serial_lane', []))}")
print(f"Current: {state.get('current')}")
print(f"Final smokes: {state.get('final_smokes', 'pending')}")
print("--- serial lane ---")
for item in state.get("serial_lane", []):
    print(f"  [{item.get('status', '?'):12}] {item.get('id')}: {item.get('title', '')}")
PY
}

run_baseline() {
  log "== Marathon baseline smokes =="
  cd "$ROOT/app" && npm run typecheck 2>&1 | tee -a "$LOG"
  "$ROOT/scripts/smoke_immersive_shell.sh" 2>&1 | tee -a "$LOG"
  log "PASS: baseline"
}

if [[ "${1:-}" == "--status" ]]; then
  show_status
  exit 0
fi

init_state
run_baseline
log ""
log "Marathon armed. In Cursor Agent chat send:"
log "  GO marathon"
log ""
log "Resume after context reset:"
log "  GO marathon resume"
log ""
log "State: $STATE"
log "Log:   $LOG"
