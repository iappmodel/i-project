# Trust System Knowledge Map

**Classification:** Mixed  
**Confidence:** Medium

## Canonical Intent (Constitution)

Trust determines: payout speed, earning limits, conversion rates, feature access, reputation. Difficult to gain, easy to lose.

## Implementation Layers

| Layer | Location | Authority | Classification |
|-------|----------|-----------|----------------|
| Safe Action Execution Engine | i-initial-structures → promoted source | Rule evaluator (19 types) | **Canonical candidate** for trust actions |
| Backend trust-fraud review | IVAULT API | Authoritative when wired | Canonical candidate |
| Trust impact rules (seed) | trust-impact-rules.ts | 2 rules, all freeze flags false | **Experimental** |
| Flutter trust_engine.dart | IVAULT checkpoint | CLIENT SIMULATION | Obsolete for payout |
| On-device governance/safety kernels | flutter-runtime Intent OS | UI action gates only | Canonical for **on-device UX**, not wallet |
| Evidence Vault v2 | Supabase migrations 204–209 | Admin custody | Canonical for **retention/legal** |

## Safe Action Rule Types (Sample)

`freeze_wallet`, `unfreeze_wallet`, `restrict_withdrawals`, `freeze_campaign`, `request_reverification`, compensation/repair actions.

**Gap:** Rules exist but trust-impact seeds don't auto-freeze; safe-action outcomes not wired to live wallet state in i-initial-structures.

## Fraud / Liveness (Non-Trust-Authority)

- Kotlin: fakeStaticGaze, fakeNoBlink, likelyFake — **signal flags**
- Web: livenessScore heuristic — **UI gate only**
- VSL: operator confidence bands — **not fraud enforcement**

**Sources:** I_INITIAL_STRUCTURES audit §6–7; EVIDENCE_VAULT audit §7; CURSOR_V1_KERNEL audit
