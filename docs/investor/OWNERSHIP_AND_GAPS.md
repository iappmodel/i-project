# Ownership & known gaps

## Spine ownership (fill names)

| Layer | Owner (TBD) | Repo path |
|-------|---------------|-----------|
| Proof packet | | `app/src/lib/demoProofPacket.ts` · Flutter `proof/` |
| POP validator | | `integrations/pop-core/validator/` |
| Pending holds → ledger | | `app/supabase/` · `settle_pop_pending_hold` |
| App wallet UX | | `app/src/state/useLiveWalletSync.ts` |
| Payout / withdraw | | `app/src/services/payout.service.ts` |
| Archive promotion | | `eye-earn-sparkle-archive` → `app/` |

## Known gaps (disclose proactively)

| Gap | Status | Mitigation |
|-----|--------|------------|
| Cloud production cutover | Parallel track | `dev_stack.sh` local spine |
| `eye-earn-sparkle-archive` breadth | Not fully merged | Harvest on `feature/lovable-harvest` |
| Web gaze on device | Mock unless Flutter Seal Proof | `DEVICE_DEMO_RUNBOOK.md` |
| Phase C metrics | Template only | `PILOT_METRICS_TEMPLATE.csv` |
