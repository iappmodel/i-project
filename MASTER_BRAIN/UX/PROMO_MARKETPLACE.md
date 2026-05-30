# Promo Marketplace — UX Canon (v1)

**Status:** Scaffold shipped  
**Pairs with:** [`IMMERSIVE_UI_DESIGN_LAW.md`](../CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md), `promo_dock_explainer.html`

---

## Role

**Promo tab** (dock pin icon) opens the sponsor brief marketplace — a glass list overlay on Picture 2 dark chrome. Users pick a brief → consent gate → watch-verify → earn.

| Zone | Owner |
|------|--------|
| Feed tab | Immersive media |
| Promo tab | Sponsor brief list (this surface) |
| Create tab | Studio (deferred) |

---

## v1 behavior

1. Tap Promo dock → `immersive-promo` screen (no AppShell titlebar).
2. Scrollable offer cards from `app/src/data/promoOffers.ts`.
3. Tap card → `beginImmersiveWatch(offer)` → consent → watch.
4. Map chip placeholder at bottom (“Map view coming soon”).

---

## Code map

| Path | Role |
|------|------|
| `app/src/screens/ImmersivePromoScreen.tsx` | Picture 2 promo list |
| `app/src/data/promoOffers.ts` | Demo briefs |
| `ImmersiveBottomNav` | Promo tab highlight |

---

## Deferred

- Live campaign API / geo map
- Filter by platform, reward tier
- Creator-side campaign builder sync
