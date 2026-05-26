# React ↔ Flutter proof bridge

**Status:** SSE relay implemented (Phase 3) — Capacitor shell deferred  
**Goal:** Real gaze from `flutter-runtime` into `app/` watch-verify without duplicating POP logic.

---

## Architecture (current)

```mermaid
flowchart LR
  Flutter[flutter-runtime Seal Proof]
  Val[POP validator :8787]
  SSE[/v1/proof-events/stream]
  App[app/ React shell]

  Flutter -->|POST ProofPacketV0| Val
  App -->|EventSource| SSE
  Val --> SSE
  App -->|poll pending holds| Val
```

**Loop 1 web:** React still uses mock `buildDemoProofPacket()` for presenter fidelity.  
**Flutter:** Posts real packets to the same validator; app receives `proof-sealed` events and refreshes wallet.

---

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /v1/proof-packets/validate` | Submit proof (web or Flutter) |
| `GET /v1/proof-events/stream` | SSE stream of `proof-sealed` events |

Event shape:

```json
{
  "type": "proof-sealed",
  "sessionId": "sess_…",
  "localUserRef": "demo-user-001",
  "mode": "pending",
  "reviewStatus": "approved",
  "holdOutcome": "created",
  "timestamp": "2026-05-26T…",
  "source": "flutter"
}
```

---

## Env

| Surface | Variable |
|---------|----------|
| Flutter | `POP_VALIDATOR_URL` (dart-define) |
| React | `VITE_POP_VALIDATOR_URL` (EventSource uses same base) |

No separate `VITE_PROOF_WS_URL` — SSE shares validator origin.

---

## App integration

- `app/src/state/useProofEvents.ts` — EventSource subscriber
- Profile **Elo · companion** shows live `proof-events` status
- Wallet refreshes pending holds when external proof is sealed

---

## Deferred (Phase 4+)

1. **Capacitor shell** — embed Flutter module in WebView
2. **Deep link return** — `iapp://proof?session=…` from Flutter to wallet tab
3. **Replace mock gaze** in watch-verify when Flutter bridge is in-process

See `docs/technical/ANDROID_SEAL_PROOF_RUNBOOK.md` for device path today.
