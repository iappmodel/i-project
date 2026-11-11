# POP V10 integration contract (proposal only)

**Status:** Draft — no automatic merge from `iappmodel/i-pop-lab`.
**Lab ref:** `gpt-pop-twin-independent` @ `f7a9d0bd522e0de77bfcd1f2f7fc59f713d33628`

See handoff README for safety rules. App uses `integrations/pop-core` as authority;
lab is compared via contract tests only.

## Verified app POP path (mock)

`finishRewardToWallet` → `buildDemoProofPacket` → `proofJsonPassesPrivacyGate` →
`lastProofPacket` + pending iCoins (simulated).

## Tests

- `cd app && npm test` (20 tests)
- `cd integrations/pop-core/backend && npm ci && npm test` (277 tests)

## Phases (owner approval required)

A. Schema diff lab vs `proof-packet-v0`
B. Validator URL flag + rollback
C. Reviewed Twin TypeScript interfaces only
D. Flutter remains primary packet producer

M5 remains HOLD.
