# Lovable Harvest Audit — Feature Match vs [ i ] App

**Date:** 2026-06-02  
**Branch:** `feature/lovable-harvest` (all harvest work lands here; `main` stays stable)  
**Lovable source (read-only):** `~/Desktop/IVAULT/i-project-rescue/github-source-repos/eye-earn-sparkle-archive`  
**Target app:** `app/` in `i_project_migration_archive`  
**Visual law:** [`CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md`](CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md) — harvest logic, not neumorphic shell

---

## 1. Executive summary

| Metric | Lovable archive | Current `app/` |
|--------|-----------------|----------------|
| Router paths | 12 (+ Index sub-screens) | 18 demo screens (no React Router) |
| UI components | ~315 | ~immersive + gesture + elo subset |
| Edge functions | 43 | 9 (+ `_shared` helpers) |
| DB tables (migrations) | 70 | POP/wallet spine + minimal auth |
| Services | 33 | 4 |
| Hooks | 84 | ~20 active + vision-unified re-exports |

**Verdict:** Most Lovable **domain concepts** align with [ i ] product law (watch → verify → earn → wallet, tips, promos, gaze). The archive is a **superset** of `eye-earn-sparkle-v2` and `iview` (same lineage, more edge fns and tables). **~40%** of Lovable capabilities already have a partial or full match in the current app; **~45%** are harvestable with glass reskin; **~15%** should defer (admin-only, layout-editor risk, duplicate investor demo).

**Do not** copy: `AppShell` titlebar UX, neumorphic `NeuButton` chrome, card-list feed as default home, `SourceEvidence` footers.

---

## 2. Source resolution

| Clone | Remote | Edge fns | Components | Notes |
|-------|--------|----------|------------|-------|
| **eye-earn-sparkle-archive** | `iappmodel/eye-earn-sparkle-archive` | 43 | 315 | **Audit source** — newest (2026-03-11) |
| eye-earn-sparkle-v2 | `iappmodel/eye-earn-sparkle-v2` | 30 | 282 | Subset of archive |
| iview | `iappmodel/iview` | 30 | 282 | Subset of archive |

Lovable project URL `2f92381f-7141-498a-b964-501c3ef0337c` is not stamped in local READMEs (placeholder IDs). Treat **archive** as the canonical export of Lovable development.

---

## 3. Classification legend

| Tier | Meaning | Action |
|------|---------|--------|
| **A — Match** | Already wired or canonical in `app/`; keep | Document only; avoid duplicate ports |
| **B — Partial** | Logic/edge/tables exist in archive; UI stub or legacy shell in `app/` | Port backend + reskin to glass |
| **C — Missing (fit)** | Aligns with product law; not in `app/` | Harvest in phased epics |
| **D — Defer** | Admin, heavy optional, or conflicts immersive law | Park; link from roadmap |

**UI adaptation rule:** Every harvested surface uses `ImmersiveGlassSheet`, 5-tab dock, REWARD pill, OUT-PROFILE, gesture rail — never extend Picture 1 fintech dashboard as consumer default.

---

## 4. Feature matching matrix

### 4.1 Loop 1 — Watch · Verify · Earn · Wallet

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `validate-attention`, `issue-reward`, `attention_sessions`, `reward_sessions` | `validate-attention`, `issue-reward`, `attentionSession.ts`, Loop 1 screens | **A** | Keep `WatchVerifyScreen` → `VerificationResultScreen` → `RewardRevealScreen`; REWARD pill states |
| `PromotionDetails`, promo feeds, `usePromoEarnings` | `ImmersivePromoScreen`, `promoOffers.ts`, `beginImmersiveWatch` | **B** | Promo cards in glass sheet; tap → immersive watch (done); wire `submit-promotion-review` |
| `submit-promotion-review` | Not in `app/supabase/functions` | **C** | Post-watch review sheet → edge reward |
| `PerfectAttentionCelebration`, attention rings | `ImmersiveRewardBadge`, verification gates | **A/B** | Reuse celebration as toast + coin-drop on `RewardRevealScreen` |

### 4.2 Gesture buttons · Tips · Offers

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `MorphingLikeButton`, `TipSheet`, `ButtonFunctionManager` | `useGestureButton`, `OfferReviewSheet`, `MediaActionRail`, `offerService.ts` | **A** | Locked rail: LIKE → MESSAGE → SHARE → CONTROLS |
| `tip-creator`, `tip_idempotency`, `tip_audit_log` | `tip-creator` edge, `tipCreator.ts`, `useOfferSession` | **A** | Heart hold-swipe → offer sheet (ic/v coins) |
| `send-coin-gift` | — | **C** | Share sheet → “Gift coins” glass flow |
| `CoinFlyAnimation`, `CoinSlideAnimation` | `HeartWaterfall` | **B** | Port fly animations as CSS-only overlays on rail |

### 4.3 Wallet · Coins · Convert · Payout

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `WalletScreen`, `useWallet`, `wallet_ledger`, `transactions` | `WalletScreen` (legacy), `ImmersiveWalletSheet`, POP `useLiveWalletSync` | **B** | Full balances in glass sheet; legacy dashboard presenter-only |
| `transfer-coins` (vicoin↔icoin) | `ConvertScreen` (demo) | **B** | Port edge + wire `ConvertScreen` behind wallet sheet CTA |
| `request-payout`, `payout_requests`, `payment_methods` | `request-payout`, `WithdrawPreviewScreen` | **B** | Withdraw as glass sheet from dock Wallet tab |
| `PayoutHistory`, `EarningGoals`, `EarningBreakdownChart` | — | **C** | Wallet sheet tabs: History / Goals (charts as minimal glass rows) |
| `daily_reward_caps`, `reward_idempotency` | Partial in `issue-reward` | **A** | Ensure parity when porting archive `issue-reward` diffs |

### 4.4 Merchant checkout · Pay

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `merchant-checkout-*` (8 edge fns), 5 checkout tables | `_shared/merchant_checkout.ts`, `features/merchantCheckout/` mock | **B** | `ImmersiveGlassSheet` checkout funnel; NFC/QR as icons not dashboard |
| `iapp_pay_screen` concepts (NFC, QR, pay link) | HTML simulator only | **C** | Wallet → Pay glass sheet (tap/QR/link) |
| `create-checkout`, `customer-portal`, `stripe-webhook`, `check-subscription` | Same names in `app/supabase/functions` | **A** | Profile/settings stripe CTA; tier multiplier in convert |

### 4.5 Feed · Content · Social graph

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `UnifiedContentFeed`, `get-personalized-feed`, `user_content` | `ImmersiveFeedScreen` (mock/media), `FeedScreen` legacy | **B** | Vertical reel + swipe lanes (simulator pattern); backend feed scoring |
| `track-interaction`, `content_likes`, `comments` | `useContentLike` (partial) | **B** | Like persists; comments → MESSAGE sheet thread |
| `useFollow`, `user_follows`, `friendsFeed` | — | **C** | OUT-PROFILE → Follow; Friends lane in swipe grid |
| `SavedVideosGallery`, `saved_content` | `SavedScreen` (localStorage) | **B** | Loop 2 vault; sync `saved_content` table |
| `ShareSheet`, deep links `/content/:id` | Share sheet in immersive sim | **B** | `ShareSheet` actions in glass share sheet |

### 4.6 Promotions · Map · Check-in

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `DiscoveryMap`, `get-nearby-promotions`, `get-mapbox-token` | — | **C** | Promo tab → map glass overlay (not default home) |
| `verify-checkin`, `promotion_checkins`, `CheckInStreak` | — | **C** | Promo card “Check in” → geo gate → streak pill on OUT-PROFILE |
| `promo_routes`, `RouteBuilder` | — | **C** | Promo tab sub-flow; route builder as sheet |
| `PromotionCategories`, `FavoriteLocations` | — | **C** | Filter chips on promo sheet |

### 4.7 Attention · Vision · Blink remote

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `useVisionEngine`, `useEyeTracking`, `EyeTrackingIndicator` | `vision-unified/` vendored; `VITE_VISION_ENGINE` | **B** | Timer line + verification gates consume samples |
| `BlinkRemoteControl`, `useBlinkRemoteControl`, `TargetOverlay` | `VisionBlinkRemoteLite`, `GestureComboMatcherHost` | **B** | CONTROLS long-press → builder (not full RC panel on feed) |
| `UnifiedVisionCalibrationWizard` | `calibration.service.ts` stub | **B** | Profile sheet → Calibrate (glass wizard steps) |
| `useGazeBackendBridge` (Tobii, etc.) | Archive-only | **D** | Dev/presenter; optional flag |
| `AttentionHeatmap`, `SlowBlinkTraining` | — | **D** | Settings / a11y only |

### 4.8 ELO · AI companion

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `generate-reply` (chat AI) | `elo-reply` edge, `eloRuntimeEngine.ts`, `EloPresenceLayer` | **A** | Center membrane on immersive feed (canonical) |
| Lovable has no equivalent membrane | **Current wins** | **A** | Do not replace with Lovable chat patterns |

### 4.9 Studio · Create · AI media

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `pages/Studio.tsx`, `studio/*`, `analyze-video` | — (Create tab stub) | **C** | Dock **+** → Studio glass full-screen; timeline strip minimal |
| `generate-music`, `generate-sfx`, `generate-voiceover`, `generate-subtitles`, `generate-text-style` | — | **C** | Studio tool chips; call edges from create flow |
| `ContentUpload`, `pages/Create.tsx` | — | **C** | Create → Upload / Camera glass steps |
| `ai-content-analyzer`, `extract-media-metadata` | — | **C** | Post-upload tag suggestions sheet |
| `ScheduledPostingManager`, `BulkMediaImporter` | — | **D** | Creator tier; after core studio |

### 4.10 Gamification · Tasks · Referrals

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `DailySpinWheel`, `TaskCenter`, `AchievementCenter`, `Leaderboard` | — | **C** | Wallet or Profile sheet → “Rewards” hub (spin, tasks, badges) |
| `sync-user-tasks`, `update-task-progress`, `user_tasks`, `user_levels` | — | **C** | Edge port + XP bar under REWARD pill (optional) |
| `ReferralPanel`, `manage-referral` | — | **C** | Profile sheet → Refer friends (QR glass) |
| `ChallengesFeed`, `StreakBonuses` | — | **C** | Promo tab secondary lane |

### 4.11 Messaging · Stories · Live

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `MessagesScreen`, `ChatScreen`, `conversation.service` | MESSAGE button opens sheet (sim only) | **C** | Glass chat sheet → full thread route behind dock |
| `stories/*`, `live/*` | — | **C** | Stories ring on feed top (minimal); Go Live from Create |
| `generate-reply` for chat | `elo-reply` separate | **B** | Optional AI reply in chat sheet |

### 4.12 Social connect · Import

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `pages/SocialConnect.tsx`, `linked_social_accounts`, `imported_media` | HTML `iapp_connect_platforms` in simulator | **C** | Profile → Connect platforms glass list |
| `BulkMediaImporter`, `MediaLinkImporter` | — | **D** | Creator tools after connect |

### 4.13 Profile · KYC · Auth · Security

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `pages/ProfileByUsername.tsx`, `PublicProfile` | `ImmersiveProfileSheet`, `ProfileScreen` | **B** | IN-PROFILE tab → glass profile; legacy for presenter |
| `kyc-review`, `kyc_submissions`, `useKyc` | — | **C** | Withdraw gate → KYC glass wizard |
| `BiometricLoginButton`, `TwoFactorAuth` | — | **C** | Splash / settings; WebAuthn |
| `security.service`, `abuse_logs`, `device_fingerprints` | `security.service.ts` stub | **B** | Wire archive service + edge abuse checks on rewards |
| `export-user-data`, privacy tables | — | **D** | Settings compliance |

### 4.14 Subscriptions · Notifications

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `SubscriptionPlans`, `check-subscription` | Stripe edges in `app/` | **B** | Profile → Upgrade glass sheet |
| `NotificationCenter`, `send-notification-email` | — | **C** | Top-right bell glass sheet (no titlebar) |
| `PushNotificationSettings` | — | **D** | Capacitor phase |

### 4.15 IMoji · AR · Body scan

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `imoji/*`, `generate-imoji` | — | **D** | Create tab optional; heavy AI cost |
| `ARFiltersCamera`, `BodyScanning` | — | **D** | Not Loop 1; conflicts minimal glass |

### 4.16 Admin · Moderation

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `pages/Admin.tsx`, `admin/*`, `kyc-review`, `wallet-reconciliation` | — | **D** | Separate admin route; never consumer shell |
| `ContentReportFlow`, `moderation` | — | **D** | Report via share sheet long-press |

### 4.17 UI customization · Layout editor

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `PageLayoutEditor`, `UICustomizationContext`, `ButtonPresetManager` | `GestureButtonBuilderSheet`, `configStore` | **B** | **Only** gesture-button builder — do not port full page layout editor (breaks locked immersive zones) |
| `AdvancedThemeControls`, neumorphic presets | `design-system.css` | **D** | Presenter/dev themes only |

### 4.18 Demo · Investor

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `demo/GuidedInvestorTour`, `DemoScenarioSelector` | `06_feed_earning_loops/*`, `appMode presenter` | **A** | Keep repo explainers + `app_immersive.html`; do not merge Lovable demo shell |

### 4.19 Localization · Accessibility

| Lovable | Current `app/` | Tier | Glass adaptation |
|---------|----------------|------|------------------|
| `LocalizationContext` (5 langs) | — | **C** | Profile settings glass |
| `AccessibilityContext`, reduced motion | `AccessibilityContext` in `app/` | **B** | Align with `prefers-reduced-motion` on glass animations |

---

## 5. Edge function delta (43 vs 9)

### Already in `app/` (keep canonical; diff archive for bugfixes)

| Function | Notes |
|----------|-------|
| `issue-reward` | Compare caps/idempotency with archive |
| `validate-attention` | Archive may have richer gate list |
| `request-payout` | Align fee tiers |
| `tip-creator` | Archive has fuller abuse audit |
| `elo-reply` | **App-only** — keep |
| `create-checkout`, `customer-portal`, `stripe-webhook` | Tier mapping parity |

### Port to `app/` (priority order)

| P | Function | Enables |
|---|----------|---------|
| P0 | `transfer-coins` | Real convert |
| P0 | `track-interaction` | Feed analytics + likes |
| P1 | `get-personalized-feed` | Live immersive feed |
| P1 | `submit-promotion-review` | Promo completion rewards |
| P1 | `verify-checkin` | Geo promos |
| P1 | `get-nearby-promotions`, `get-mapbox-token` | Discovery map |
| P2 | `send-coin-gift` | Social gifting |
| P2 | `manage-referral` | Growth |
| P2 | `sync-user-tasks`, `update-task-progress` | Gamification |
| P2 | `merchant-checkout-*` (8) | In-person pay |
| P3 | `generate-*` (6 AI studio) | Create tab |
| P3 | `analyze-video`, `ai-content-analyzer`, `extract-media-metadata` | Studio/upload |
| P3 | `generate-imoji` | Optional create |
| P4 | `admin-users`, `kyc-review`, `wallet-reconciliation`, `track-interaction-health` | Admin only |
| P4 | `export-user-data`, `send-notification-email` | Compliance / email |

### Archive-only patterns to merge into existing

- `_shared` rate limit + idempotency helpers (archive may be superset)
- CORS allowlist patterns from archive `issue-reward` / `tip-creator`

---

## 6. Data model delta (70 tables)

### Required for P0–P1 harvest (migrate in order)

```
profiles (extend balances if needed)
wallet_ledger, transactions, reward_logs, daily_reward_caps, reward_idempotency
content_likes, content_interactions, interaction_event_nonces
user_content, promotions, promotion_claims, promotion_reviews
user_follows, saved_content
attention_sessions, reward_sessions (parity with archive)
tip_idempotency, tip_audit_log
```

### P2 gamification + growth

```
task_templates, user_tasks, user_levels, achievements, user_achievements
referrals, referral_codes
promotion_checkins, favorite_locations
coin_gifts
```

### P2 merchant checkout

```
merchant_checkout_preferences, merchant_checkout_sessions,
merchant_checkout_events, merchant_checkout_idempotency,
merchant_checkout_payments, merchant_checkout_tips
```

### P3 social + studio

```
conversations, conversation_participants, messages, message_reactions
linked_social_accounts, imported_media
comments, notifications, notification_preferences
```

### Defer (admin / heavy)

```
admin_actions, user_bans, content_flags, moderation_appeals,
live_streams, live_stream_comments, error_logs, feature_flags, app_versions
```

**RLS rule:** Copy archive policies per table; never client-write balances (economy law).

---

## 7. UI adaptation cheatsheet

| Lovable pattern | Do not ship as-is | Ship as (Picture 2) |
|-----------------|-------------------|---------------------|
| `AppShell` + desktop titlebar | Yes | No shell header on product; full-bleed only |
| `BottomNavigation` dark 4-tab | Yes | `ImmersiveBottomNav` 5-tab white dock |
| `WalletScreen` grey cards | Yes | `ImmersiveWalletSheet` + mono amounts |
| `NeuButton` / neumorphic stack | Yes | `GestureButton` 40px glass circles |
| Modal `Dialog` centered | Partial | `ImmersiveGlassSheet` bottom sheet |
| Card-list `FeedScreen` | Yes | `ImmersiveFeedScreen` + video reel |
| `SourceEvidence` footer | Yes | Never on product |
| `CoinDisplay` dashboard grid | Yes | REWARD pill + wallet sheet rows |
| Map full-page | OK | Overlay from Promo tab, blurred media behind |
| Studio multi-panel desktop | OK | Single-phone Create flow, glass tool strip |

---

## 8. Prioritized harvest backlog

### Epic H0 — Audit & branch hygiene (this doc)

- [x] Branch `feature/lovable-harvest`
- [x] This audit
- [ ] PR checklist template in harvest PRs: glass screenshot + smoke + no `AppShell` on product routes

### Epic H1 — Wallet & money movement (2–3 weeks)

| # | Feature | Source (archive) | Target (app/) | Status |
|---|---------|------------------|---------------|--------|
| H1.1 | Vicoin↔Icoin convert | `transfer-coins`, `rewards.service` | `ConvertScreen` + `ImmersiveWalletSheet` | **Done** (2026-06-02) |
| H1.2 | Transaction history | `transactions`, `useTransactions` | Wallet sheet list |
| H1.3 | Payout methods | `request-payout`, `PayoutHistory` | `WithdrawPreviewScreen` glass |
| H1.4 | Issue-reward parity | `issue-reward` diff | `app/supabase/functions/issue-reward` |
| H1.5 | Security/abuse | `security.service`, `abuse_logs` | `security.service.ts` + reward edges |

### Epic H2 — Live feed & social (2–3 weeks)

| # | Feature | Source | Target | Status |
|---|---------|--------|--------|--------|
| H2.1 | Personalized feed | `get-personalized-feed`, `usePersonalizedFeed` | `ImmersiveFeedScreen` media queue | **Done** (2026-06-02) |
| H2.2 | Interaction tracking | `track-interaction`, `useFeedInteraction` | Like/share/save + rail counts | **Done** (2026-06-02) |
| H2.3 | Comments | `CommentsPanel`, `useComments` | MESSAGE sheet thread |
| H2.4 | Follow / OUT-PROFILE | `useFollow`, `PublicProfile` | `OutProfileChip` + profile sheet |
| H2.5 | Saved vault | `saved_content`, `SavedVideosGallery` | `SavedScreen` + Supabase |
| H2.6 | Promo review reward | `submit-promotion-review` | Post-watch sheet |

### Epic H3 — Promo & location (2 weeks)

| # | Feature | Source | Target |
|---|---------|--------|--------|
| H3.1 | Nearby promos | `get-nearby-promotions` | `ImmersivePromoScreen` |
| H3.2 | Check-in + streak | `verify-checkin`, `CheckInStreak` | Promo card + profile pill |
| H3.3 | Discovery map | `DiscoveryMap`, `get-mapbox-token` | Promo tab map sheet |
| H3.4 | Routes | `route.service`, `RouteBuilder` | Optional promo sub-flow |

### Epic H4 — Merchant pay & checkout (2 weeks)

| # | Feature | Source | Target |
|---|---------|--------|--------|
| H4.1 | Checkout edges (8) | `merchant-checkout-*` | `features/merchantCheckout/` |
| H4.2 | Pay sheet (NFC/QR/link) | `iapp_pay_screen` concepts | Wallet → Pay glass |
| H4.3 | Tip/gift polish | `send-coin-gift`, `TipSheet` | Share/gift sheet |

### Epic H5 — Gamification & growth (2 weeks)

| # | Feature | Source | Target |
|---|---------|--------|--------|
| H5.1 | Tasks + XP | `sync-user-tasks`, `update-task-progress`, `TaskCenter` | Profile/Rewards hub sheet |
| H5.2 | Achievements + spin | `AchievementCenter`, `DailySpinWheel` | Glass modals |
| H5.3 | Referrals | `manage-referral`, `ReferralPanel` | Profile sheet |
| H5.4 | Leaderboard | `Leaderboard` | Promo or profile tab |

### Epic H6 — Create & studio (3–4 weeks)

| # | Feature | Source | Target |
|---|---------|--------|--------|
| H6.1 | Upload + create page | `Create.tsx`, `mediaUpload.service` | Dock **+** flow |
| H6.2 | Studio trim/timeline | `Studio.tsx`, `studio/*` | Glass studio screen |
| H6.3 | AI tools | `generate-*`, `aiMedia.service` | Studio tool chips |
| H6.4 | Video analyze | `analyze-video` | Post-upload suggestions |

### Epic H7 — Chat · stories · connect (3 weeks)

| # | Feature | Source | Target |
|---|---------|--------|--------|
| H7.1 | DM threads | `MessagesScreen`, `conversation.service` | MESSAGE rail → chat |
| H7.2 | Stories | `stories/*` | Feed top ring |
| H7.3 | Social connect | `SocialConnect.tsx` | Profile connect sheet |
| H7.4 | Live (optional) | `live/*` | Create → Go Live |

### Epic H8 — Vision hardening (1–2 weeks)

| # | Feature | Source | Target |
|---|---------|--------|--------|
| H8.1 | Calibration wizard | `UnifiedVisionCalibrationWizard` | Profile → Calibrate |
| H8.2 | Full blink remote | `BlinkRemoteControl` (optional) | Presenter flag only |
| H8.3 | Archive gaze backends | `useGazeBackendBridge` | Dev env only |

### Epic H9 — Compliance & admin (defer)

- Admin dashboard, KYC review UI, wallet reconciliation, GDPR export — separate `admin/` app or route guard `appMode !== 'product'`.

---

## 9. What stays on `main` unchanged

Until explicit merge review:

- Loop 1 POP spine + validator integration
- `ImmersiveFeedScreen` / gesture offer flow / ELO membrane
- Investor explainers + `app_immersive.html` simulator
- Stripe edge fns (owner keys gate)
- Presenter mode linear tour

---

## 10. Implementation rules (every harvest PR)

1. **Branch:** `feature/lovable-harvest` only.
2. **UI:** [`IMMERSIVE_UI_DESIGN_LAW.md`](CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md) compliance — screenshot in PR.
3. **Economy:** Amounts via edge functions only; idempotency + rate limits from archive `_shared`.
4. **Source:** Copy from `eye-earn-sparkle-archive`, adapt imports/paths; do not symlink whole repo.
5. **Smokes:** Extend `smoke_immersive_shell.sh` / domain smokes per epic.
6. **Conflicts:** If harvest touches currency naming (CR-02–CR-06), flag in `DUPLICATES_AND_CONFLICTS.md` before merge.

---

## 11. Cross-references

| Doc | Role |
|-----|------|
| [`WIRING_STATUS.md`](WIRING_STATUS.md) | What is wired today |
| [`CANONICAL/FEATURE_BIBLE.md`](CANONICAL/FEATURE_BIBLE.md) | Checkbox backlog |
| [`CANONICAL/i_SOURCE_OF_TRUTH.md`](CANONICAL/i_SOURCE_OF_TRUTH.md) | Product law |
| [`UX/USER_GESTURE_BUTTONS.md`](UX/USER_GESTURE_BUTTONS.md) | Gesture canon |
| [`IVAULT_FULL_AUDIT_2026-05-25.md`](IVAULT_FULL_AUDIT_2026-05-25.md) | Desktop archive map |
| [`DEVELOPMENT_LOG.md`](DEVELOPMENT_LOG.md) | Branch policy + session log |

---

## 12. Confidence

| Area | Confidence |
|------|------------|
| Archive inventory completeness | High (full file/edge/table scan) |
| Lovable URL ↔ archive mapping | Medium (ID not in README; lineage + superset logic) |
| Tier A/B/C assignments | High for Loop1/wallet/gesture; Medium for studio/live |
| Effort estimates | Low–medium (epics are relative sizing) |

**Next action:** Start **Epic H1** (wallet + `transfer-coins`) or **H2** (live feed) on `feature/lovable-harvest` per owner priority.
