# User Gesture Buttons — UX Canon

**Status:** Production-complete on immersive feed (`app/`)  
**Visual law:** `MASTER_BRAIN/CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md` (Picture 2 — glass rail, full-bleed media)  
**Supersedes:** FEATURE_BIBLE “double-tap to like” as a fixed global behavior — gestures are configurable per button.

---

## North star

Every overlay control on the watch surface is **user-composable**: tap, multi-tap, hold tiers, and four-way swipe map to actions. Presets ship defaults; power users rebind everything.

---

## Gesture triggers

| Trigger | Default (Like/Love preset) |
|---------|----------------------------|
| `tap` | Like (no wallet) |
| `double_tap` | Save |
| `triple_tap` | Boost (demo stub) |
| `hold_arm` | Enter offer mode (≥500ms) |
| `hold_deep` | Accelerated ramp (≥3000ms while armed) |
| `swipe_up` | Tip vicoin (ramp while held) |
| `swipe_down` | Tip icoin (ramp while held) |
| `swipe_left` | Unassigned |
| `swipe_right` | Unassigned |

---

## Offer lifecycle

1. **Draft** — ramp counter while dragging in a direction  
2. **Review** — REWARD pill + `OfferReviewSheet` (presets 5/13/49, slider, Send/Cancel)  
3. **Validating** — spinner on pill  
4. **Settled** — highlight, fade  

All coin debits via Edge Functions (`tip-creator`) when `walletBackend === 'live'` — demo uses `sendTipDemo` (no silent icoin success).

---

## Separation of modes

- **Runtime gestures** (0.5s arm on heart) ≠ **builder mode** (1s hold on CONTROLS → `GestureButtonBuilderSheet`; per-button settings via context menu).

---

## Code map

| Path | Role |
|------|------|
| `app/src/lib/gestureButtons/` | Types, presets, config store, ramp |
| `app/src/hooks/useGestureButton.ts` | Gesture FSM (deep-hold ref, balance clamp, scroll lock) |
| `app/src/hooks/useOfferSession.ts` | Offer orchestration |
| `app/src/hooks/useContentLike.ts` | `content_likes` when live + auth |
| `app/src/services/tipCreator.ts` | `tip-creator` edge fn client |
| `app/src/components/gestureButtons/` | Button, rail, waterfall, pill, settings, builder, offer sheet |
| `app/src/screens/ImmersiveFeedScreen.tsx` | Full-bleed shell |
| `app/src/styles/gesture-buttons.css` | Glass + cross-arm visuals |
| `scripts/smoke_gesture_buttons.sh` | Scaffold + manual checklist |

---

## References

- Lovable: `eye-earn-sparkle` `MorphingLikeButton`, `LongPressButtonWrapper` (patterns only; not final UX)  
- Visual: `assets/like-love-cross-gestures-mockup.png`  
- Investor walkthroughs: `06_feed_earning_loops/like_tap_explainer.html`, `save_double_tap_explainer.html`, `boost_triple_tap_explainer.html`, `love_hold_creator_offer_explainer.html`  
- Economy: `MASTER_BRAIN/ECONOMY/i-app-economy-rules.md` — i/v separate ledgers  

---

## Smoke checklist

Run `./scripts/smoke_gesture_buttons.sh`, then on `immersive-feed`:

1. Tap heart → like toggles; count updates (local or `content_likes` live).  
2. Double-tap heart → save toast / Loop 2 vault path.  
3. Triple-tap heart → boost demo stub (MVP toast).  
4. Hold 500ms → cross; swipe up (v) / down (i) → ramp; release → review sheet.  
5. Send → validating → settled (demo toast or `tip-creator`).  
6. Long-press CONTROLS 1s → builder; bindings persist in localStorage.  
7. Rail pointer capture — feed does not scroll while gesturing.

## REWARD pill states

| Status | UI |
|--------|-----|
| idle | `50ic` mono top-right |
| review | mint glow, tap opens sheet |
| validating | “Validating…” |
| settled | fade out |

## Next (out of scope for button slice)

- Out-Profile engine (`OUT_PROFILE_ENGINE.md` — TBD)  
- Promo marketplace (`PROMO_MARKETPLACE.md` — TBD)  
