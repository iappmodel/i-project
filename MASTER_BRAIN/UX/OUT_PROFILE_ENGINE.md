# OUT-PROFILE Engine — UX Canon (v1)

**Status:** Implementation started  
**Pairs with:** [`IMMERSIVE_UI_DESIGN_LAW.md`](../CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md), [`ELO_PRESENCE_LAYER.md`](ELO_PRESENCE_LAYER.md)

---

## Role

**OUT-PROFILE** is the creator identity chip (bottom-left on Picture 2). It is separate from **ELO** (center companion membrane).

| Zone | Owner |
|------|--------|
| Center | ELO — user companion |
| Bottom-left | OUT-PROFILE — creator on current media |

---

## v1 behavior

1. Render creator name, location, avatar on immersive feed.
2. Tap → if `sponsoredOfferId` set, route to consent → watch flow for that offer.
3. Else → flash “Creator feed (coming soon)”.

---

## Code map

| Path | Role |
|------|------|
| `app/src/lib/outProfileEngine.ts` | Creator model + tap action resolver |
| `app/src/components/immersive/OutProfileChip.tsx` | Glass chip UI |
| `app/src/data/immersiveFeedContext.ts` | Demo creator context |

---

## Deferred

- Live creator API / follow graph
- Promo marketplace tab (`PROMO_MARKETPLACE.md`)
- Cross-post to Loop 2 saved items
