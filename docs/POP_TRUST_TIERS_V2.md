# POP trust tiers (v2)

Server-side only — never set from the React client.

## Tiers

| Tier | Default release delay | Auto-settle (`POP_SERVER_AUTO_SETTLE`) |
|------|----------------------|----------------------------------------|
| `t0_new` | 3600s (1h) | No |
| `t1_established` | 900s (15m) | No |
| `t2_trusted` | 0s | Yes (after `release_eligible_at`) |

## Resolution (`resolveTrustTier`)

1. `POP_DEFAULT_TRUST_TIER` env
2. `POP_TRUST_T2_ALLOWLIST` / `POP_TRUST_T1_ALLOWLIST` (comma-separated `localUserRef`)
3. Default `t0_new`

## Env overrides

| Variable | Purpose |
|----------|---------|
| `POP_TRUST_T0_DELAY_SECONDS` | Release delay for new users |
| `POP_TRUST_T1_DELAY_SECONDS` | Release delay for established |
| `POP_TRUST_T2_DELAY_SECONDS` | Release delay for trusted (0 = immediate) |
| `POP_RELEASE_DELAY_SECONDS` | Legacy fallback for t0 when `POP_TRUST_T0_DELAY_SECONDS` unset |

Stored on each hold as `trust_tier_at_hold` in `pop_pending_holds`.

## Code

- `integrations/pop-core/backend/settlement/trust-tier.ts`
- Validator: `validate-handler.ts` → `computeReleaseEligibleAt(..., trustTier)`

## Verify

```bash
cd integrations/pop-core/backend && npm test
cd integrations/pop-core/validator && npm test
```
