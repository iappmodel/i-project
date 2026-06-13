# Marathon Morning Brief

**Status: MVP SLICE COMPLETE** — 17/17 nodes (smoke-green, demo fallbacks)

> **Not full harvest.** `GO marathon` shipped thin glass sheets (~1–3 sessions). Archive parity (e.g. 2k LOC pay sheet) = `GO marathon depth M9` / `M10` (~50–80h total if all nodes deepened).

## Waves shipped (MVP tier)

| Wave | Nodes | Highlights |
|------|-------|------------|
| 1 Promo | M1–M3 | Review sheet, verify-checkin edge, demo map |
| 2 Growth | M4–M6 | Achievements, spin, referrals, leaderboard |
| 3 Social | M7–M8 | Stories ring, messages sheet |
| 4 Merchant | M9–M10 | 8 checkout edges + types/mockResolver, Pay sheet |
| 5 Creator | M11–M12 | Create screen, studio timeline |
| 6 Polish | M13–M15 | Feed video layer, presenter blink, PR template |
| 7 Stretch | M16–M17 | Route builder, topic filter pills |

## Smokes (PASS)

```bash
cd app && npm run typecheck
./scripts/smoke_immersive_shell.sh
./scripts/smoke_immersive_promo.sh
./scripts/smoke_promo_checkin.sh
./scripts/smoke_merchant_pay.sh
./scripts/smoke_organism_spine.sh
./scripts/smoke_production_readiness.sh
```

## Next (owner-gated)

- `GO wire owner gates` · H6.3 AI · H7.3 OAuth · production cutover

## Uncommitted

Say **`commit marathon`** to ship.
