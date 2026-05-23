# @pop-core/backend

Standalone TypeScript package for the P.O.P.S authority stack promoted in PR2A.

## Pipeline

```
PopsSignalBatch → PopsScoringService → PopsDecisionService → PopsJudgment
```

ProofPacketV0 ingest and batch mapping are **deferred to PR2B**. This package accepts `PopsSignalBatch` only.

## Public API

| Export | Role |
|--------|------|
| `PopsSignalBatch`, core enums | Domain types |
| `POPS_PROOF_THRESHOLDS`, `POPS_DEFAULT_SCORING_WEIGHTS` | Scoring/decision constants |
| `PopsScoringService` | Batch-weighted confidence + fraud scoring |
| `PopsDecisionService` | Threshold-based eligibility decisions |
| `resolvePopsVersionBundle`, `bundleToJudgmentVersionFields` | Judgment version metadata for `toJudgment()` |

## Out of scope (PR2A)

- HTTP routes, DB, Supabase
- Wallet, settlement, trust mutation
- Privacy receipts, replay service
- ProofPacketV0 adapter

## Note on `PopsRewardDecision`

This package exports the **eligibility-layer** `PopsRewardDecision` from `types/pops-decisions.types.ts`. The preservation snapshot also defines a wallet-oriented reward decision type under `rewards/` — that layer is not promoted here.

## Commands

```bash
cd integrations/pop-core/backend
npm install
npm run typecheck
npm test
```

## Source

Selectively promoted from:

`integrations/old-source-preservation/ivault-eye-tracking/snapshot/services/api/src/pops/`

Preservation remains historical reference; do not bulk merge the 72-file tree.
