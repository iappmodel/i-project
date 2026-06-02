# [ i ] Development Log

Chronological record of archaeology, promotion, and implementation work.  
**Newest entries first.** Add a dated section when significant work completes.

---

---

## 2026-06-02 — Lovable harvest branch (`feature/lovable-harvest`)

### Branch policy
- **`main`** — stable baseline (Loop 1 MVP, immersive glass, POP v2, investor explainers). No Lovable harvest merges until reviewed.
- **`feature/lovable-harvest`** — all Lovable feature-matching audit docs and harvested implementations land here first.
- **Read-only reference** — `~/Desktop/IVAULT/i-project-rescue/github-source-repos/eye-earn-sparkle-archive` (Lovable superset; do not mutate for harvest — copy/port into `app/` on the feature branch).

### Delivered
- **`MASTER_BRAIN/LOVABLE_HARVEST_AUDIT_2026-06-02.md`** — 24-domain match matrix (A/B/C/D), edge-fn delta (43 vs 9), 70-table migration map, UI cheatsheet, epics H1–H9.
- Cross-links in `WIRING_STATUS.md` knowledge map.

### Epic H1.1 started (2026-06-02)
- **`transfer-coins`** edge fn ported from `eye-earn-sparkle-archive` → `app/supabase/functions/transfer-coins/`
- **`app/src/services/transferCoins.ts`** — live invoke + demo fallback (10:1 vicoin↔icoin)
- **`ConvertScreen`** — wired to edge/demo; clearing gates; product mode hides `SourceEvidence`
- **`ImmersiveWalletSheet`** — Convert + Withdraw CTAs → `convert` / `withdraw-preview`
- **`applyTransferBalances`** on `demoContext`

### Epic H2 started (2026-06-02)
- **`get-personalized-feed`** + **`track-interaction`** edge fns ported
- **`feed.service.ts`**, **`useImmersiveFeed`**, **`useFeedInteraction`**
- **`ImmersiveFeedScreen`** — swipe ↑↓ next/prev clip, lane dots, live feed + demo fallback, view/like/share tracking

### Next
- H1.2 transaction history · H1.3 payout parity · H2.3 comments thread

---

## 2026-06-02 — Investor explainers: POP v2 status copy

### Delivered
- **POP explainer + print bundle + index** — roadmap-honest v2 shipped (`pop-v2-complete`, trust tiers, iOS, Supabase path).
- **Smoke** — `smoke_investor_print_bundle.sh` asserts v2 tag + `POP_V2_RELEASE` reference.

### Verification
```bash
./scripts/smoke_investor_explainers.sh
./scripts/open_investor_print_bundle.sh
```

---

## 2026-06-02 — POP v2 release tag (`pop-v2-complete`)

### Delivered
- **Ship gate** — `./scripts/smoke_pop_ship_gate.sh` PASS (Flutter, validator 22, backend 277, app vitest 15).
- **Release doc** — `docs/POP_V2_RELEASE.md`; MVP doc updated to point at v2 complete.

### Verification
```bash
./scripts/smoke_pop_ship_gate.sh
git tag pop-v2-complete   # on 3053a15+
```

---

## 2026-06-02 — POP v2 external/OS control hard gate

### Delivered
- **`external_os_control_policy.dart`** — blocks OS/deep-link/payment logical actions when `kEnableExternalOsControl` is false (default).
- **`blockedExternalOs`** gate + `PopActionExecutor.tryLogicalAction` for agent paths.
- **Docs** — `docs/POP_EXTERNAL_OS_CONTROL.md`; ship gate test.

### Verification
```bash
cd integrations/eye-tracking/flutter-runtime && flutter test test/external_os_control_policy_test.dart
```

---

## 2026-06-02 — POP v2 iOS vision_channel parity

### Delivered
- **iOS native stack** — `VisionProcessor.swift` + `VisionChannelHandler.swift` on `vision_channel` (JPEG + Y8, `calibrateHeadPose`).
- **MediaPipe** — `face_landmarker.task` in iOS bundle; `MediaPipeTasksVision` pod (~> 0.10.14).
- **Dart** — `calibrateHeadPose` enabled on iOS; contract test `pop_ios_vision_contract_test.dart`.
- **Docs** — `docs/POP_IOS_VISION_PARITY.md`; ship gate checks iOS native files.

### Verification
```bash
cd integrations/eye-tracking/flutter-runtime && flutter test test/pop_ios_vision_contract_test.dart
./scripts/smoke_pop_ship_gate.sh
# Device: cd ios && pod install && flutter run
```

---

## 2026-06-02 — POP v2 durable Supabase settlement primary

### Delivered
- **`POP_SETTLEMENT_PRIMARY=supabase`** — mandatory hold upsert on validate; failures surface as 500 (no silent skip).
- **`POP_SETTLEMENT_SKIP_LOCAL_JSON`** — optional in-memory hold store when Supabase is primary.
- **Health + validate** — `settlementPrimary` / `settlementStore` in responses.
- **Docs** — `docs/POP_DURABLE_SETTLEMENT.md`; row mapper for Supabase read path.

### Verification
```bash
cd integrations/pop-core/validator && npm test
```

---

## 2026-06-02 — POP v2 trust tiers (release delay + auto-settle gating)

### Delivered
- **Trust tier engine** — `t0_new` / `t1_established` / `t2_trusted` in `integrations/pop-core/backend/settlement/trust-tier.ts`.
- **Tiered `release_eligible_at`** — per-tier env delays; only `t2_trusted` eligible for `POP_SERVER_AUTO_SETTLE`.
- **Validator + Supabase** — `trust_tier_at_hold` on holds; wallet explainer shows tier copy.
- **Docs** — `docs/POP_TRUST_TIERS_V2.md`.

### Verification
```bash
cd integrations/pop-core/backend && npm test
cd integrations/pop-core/validator && npm test
```

---

## 2026-06-02 — POP Android MVP v1 (Stages 1–9 complete)

### Delivered
- **Stages 1–9** on `main`: replay harness → safety → gaze unify → server settlement → calibration → perf → UX → ship gate (`d7a6d0d`).
- **Ship gate** — `./scripts/smoke_pop_ship_gate.sh` (Flutter 277+ tests, pop-core validator/backend, app vitest, PP-000001 golden, privacy + RLS contracts).
- **Release** — `docs/POP_ANDROID_MVP_RELEASE.md`, git tag `pop-android-mvp-v1`.

### Verification
```bash
./scripts/smoke_pop_ship_gate.sh
```

---

## 2026-05-30 — Investor print / PDF catalog bundle

### Delivered
- **Print bundle** — `investor_print_bundle.html` + `investor_print.css` (static catalog of all 18 walkthroughs; browser Print → Save as PDF).
- **Scripts** — `./scripts/open_investor_print_bundle.sh`, `./scripts/smoke_investor_print_bundle.sh`; wired into investor explainer smoke + index link.

### Verification
- `./scripts/smoke_investor_explainers.sh`

---

## 2026-05-30 — Presenter title slide (deck intro)

### Delivered
- **Title slide** — `investor_presenter_title.html` (5-scene intro: thesis, three loops, Picture 2 shell, 18-walkthrough series framing).
- **Presenter deck slide 1** — before Feed; smoke checks title file; deck now **19 slides** (intro + 18 walkthroughs).

### Verification
- `./scripts/smoke_investor_explainers.sh`

---

## 2026-05-30 — Boost triple-tap gesture explainer

### Delivered
- **Boost explainer** — `boost_triple_tap_explainer.html` (triple_tap → custom:boost; demo toast; vCoin/bCoin roadmap; completes heart preset quartet).
- **Presenter deck** — slide after Save; index Earn section 5 files; smoke **18** walkthroughs.
- **Simulator** — triple-tap boost resolution in `app_ui_simulator.html` (tap / double save / triple boost FSM).

### Verification
- `./scripts/smoke_investor_explainers.sh` · `./scripts/smoke_app_ui_simulator.sh`

---

## 2026-05-30 — Integrated app UI simulator

### Delivered
- **Touch simulator** — `app_ui_simulator.html`: responsive Picture 2 phone model where dock, rail, REWARD, Watch & Earn, ELO, share/message/controls, and gesture builder all resolve to visible state + interaction log.
- **Investor index** — recommended Loop 1 card + header link to simulator alongside 18-slide presenter deck.
- **Smoke** — `smoke_app_ui_simulator.sh` chained from investor explainer smoke; `open_app_ui_simulator.sh` for local demos.

### Verification
- `./scripts/smoke_app_ui_simulator.sh` · `./scripts/smoke_investor_explainers.sh`

---

## 2026-05-30 — Phase 43 gesture combo builder + import/export

### Delivered
- **GestureComboBuilderSheet** — create/edit multi-step combos (blinks + gestures), action picker, reorder.
- **Store** — `saveGestureCombo`, `exportGestureCombosJson`, `importGestureCombosJson`.
- **Blink Remote panel** — Create combo, Edit per row, Export/Import JSON toolbar.

### Verification
- `./scripts/smoke_blink_remote_lite.sh`

---

## 2026-05-30 — Phase 42 gesture combo matcher + Blink Remote lite panel

### Delivered
- **Combo store** — `gestureComboStore.ts` with default presets (double blink → like, triple → wallet, turn right → promo).
- **Global matcher** — `useGestureComboMatcher` + `GestureComboMatcherHost` on `remoteGestureTrigger` / `remoteBlinkPattern`.
- **Blink Remote lite** — tabbed panel in `VisionControlPanel`: combos CRUD, debug gaze log, runtime profile settings.
- **Navigation** — `promoFeed` combo routes to `immersive-promo`; typed `ProductTabId` / `DemoScreenId` in `executeLoop1Command`.
- **Smoke** — `smoke_blink_remote_lite.sh` in production readiness + `run_all_tests`.

### Verification
- `./scripts/smoke_blink_remote_lite.sh` · `./scripts/smoke_vision_prep.sh`

---

## 2026-05-30 — Save double-tap gesture explainer

### Delivered
- **Save explainer** — `save_double_tap_explainer.html` (double_tap → save on Like/Love preset; Loop 2 vault + iSAVE vision; roadmap-honest MVP toast vs localStorage scaffold).
- **Presenter deck** — slide after Like Tap; index Earn section; smoke **17** walkthroughs.

### Verification
- `./scripts/smoke_investor_explainers.sh`

---

## 2026-05-30 — ELO voice-out TTS

### Delivered
- **Speech out** — `eloSpeechOut.ts` + `useEloVoiceOut` opt-in browser TTS for panel replies; personality-tuned rate/pitch.
- **Panel toggle** — voice-out switch in `EloPresencePanel`; `stopEloSpeech` on session dismiss in `eloContext`.
- **Membrane sync** — TTS playback drives `pulseSpeech` halo during spoken replies.

### Verification
- `./scripts/smoke_elo_presence.sh`

---

## 2026-05-30 — Loop 1 spine capstone explainer

### Delivered
- **Loop 1 explainer** — `loop1_spine_explainer.html` (Watch → Verify → Reward → Wallet in one phone; ties feature series to MVP_CANONICAL_FLOW).
- **Presenter deck slide 2** — after Feed; index Loop 1 section; smoke **16** walkthroughs.

### Verification
- `./scripts/smoke_investor_explainers.sh`

---

## 2026-05-30 — Like tap explainer (heart preset tap path)

### Delivered
- **Like tap explainer** — `like_tap_explainer.html` (tap toggle, content_likes, tap vs Hold Love contrast).
- **Presenter deck + index** — slide 5 in deck; earn section now 3 files; smoke tracks **15** walkthroughs.

### Verification
- `./scripts/smoke_investor_explainers.sh`

---

## 2026-05-30 — Investor presenter deck (14-slide auto tour)

### Delivered
- **Presenter deck** — `investor_presenter_deck.html` embeds all 15 walkthroughs in story order with Prev/Next, auto-advance (~11–14s/slide), keyboard nav, fullscreen.
- **Index launch** — `investor_explainer_index.html` → “Launch presenter deck” button.
- **Open script** — `./scripts/open_investor_presenter.sh` for one-command local demo.
- **Smoke** — deck file presence + index href + all walkthrough filenames referenced in deck JS.

### Verification
- `./scripts/smoke_investor_explainers.sh` · `./scripts/open_investor_presenter.sh`

---

## 2026-05-30 — Picture 2 explainer suite complete + ELO foundation slot

### Delivered
- **POP investor explainer** — `pop_feature_investor_explainer.html` (6-scene loop + pipeline strip; attention → pending → wallet).
- **Shell zone explainers** — `out_profile_explainer.html` (creator chip), `timer_line_explainer.html` (session progress line).
- **ELO foundation slot** — `elo-reply` Supabase edge function + `eloReply.ts` client; `useEloPanelVoice` mic input; panel uses `resolveEloReplyAsync` with local runtime fallback.
- **Smoke** — `smoke_investor_explainers.sh` tracks index + **14** walkthroughs with href integrity; `smoke_elo_presence.sh` asserts edge function + panel voice.

### Verification
- `./scripts/smoke_investor_explainers.sh` · `./scripts/smoke_elo_presence.sh` · `./scripts/smoke_pop_finish.sh`

---

## 2026-05-30 — Phase 42 Blink Remote panel (combos + matcher)

### Delivered
- **Gesture combos** — `gestureComboStore.ts` with localStorage presets; tabbed `VisionBlinkRemoteLite` (combos · debug · settings).
- **Runtime matcher** — `useGestureComboMatcher` + `GestureComboMatcherHost` listens for blink/gesture sequences and fires Loop 1 commands.
- **Routing fix** — `promoFeed` vision command opens `immersive-promo`.

### Verification
- `./scripts/smoke_blink_remote_lite.sh`

---

## 2026-05-30 — Phase 41 immersive promo marketplace + ELO speech energy

### Delivered
- **Promo tab** — `ImmersivePromoScreen` with sponsor brief list, map placeholder, `beginImmersiveWatch` on card tap; canon `PROMO_MARKETPLACE.md`.
- **Routing** — `immersive-promo` screen; AppShell titlebar hidden; feed Promo dock navigates to marketplace.
- **ELO speech energy** — `pulseSpeech` in context; membrane glow on panel/wake voice; `--elo-speech-energy` CSS.

### Verification
- `./scripts/smoke_immersive_promo.sh` · `./scripts/smoke_elo_presence.sh`

---

## 2026-05-30 — ELO runtime engine + explainer index

### Delivered
- **ELO runtime** — `eloRuntimeEngine` + `eloDoctrine` POP safety rails + `eloPersonalization`; sculptural glass eye sockets in `EloFaceMembrane`; `visualForms` picker in onboarding.
- **Explainer index** — `investor_explainer_index.html` maps Picture 2 shell zones and links all walkthroughs; smoke asserts index link integrity.

### Verification
- `./scripts/smoke_elo_presence.sh` · `./scripts/smoke_investor_explainers.sh`

---

## 2026-05-30 — ELO session scope + complete dock explainer series

### Delivered
- **ELO session scope** — `EloSessionScope` dismisses evoke on route leave; `eloReplyService` contextual panel replies; `elo-manifest-enter` rail animation; smoke asserts `dismissSession`, `composeEloReply`, `EloSessionScope` in `App.tsx`.
- **IN-PROFILE explainer** — `profile_dock_explainer.html` (identity, trust, vision settings entry).
- **FEED explainer** — `feed_dock_explainer.html` completes 5-tab dock investor walkthrough set.
- **CI** — `smoke_investor_explainers.sh` in production readiness (11 HTML files).

### Verification
- `./scripts/smoke_investor_explainers.sh` · `./scripts/smoke_elo_presence.sh`

---

## 2026-05-30 — ELO presence membrane + investor explainer series

### Delivered
- **ELO membrane** — `useEloFaceMirror` smoothed POP landmark paths; richer idle contours; glass ghost strokes; auto `openPanel()` after voice evoke (`SESSION_PANEL_DELAY_MS`); `sessionOpenings` greeting copy.
- **Investor explainers** — HTML walkthroughs in `06_feed_earning_loops/`: REWARD, CONTROLS, SHARE, MESSAGE, Hold/Love, ELO presence, all five dock tabs.
- **Regression smokes** — `smoke_pop_finish.sh` (15 Flutter tests in CI); hardened `smoke_elo_presence.sh`; new `smoke_investor_explainers.sh`.

### Verification
- `./scripts/smoke_elo_presence.sh` · `./scripts/smoke_pop_finish.sh` · `./scripts/smoke_organism_spine.sh`

---

## 2026-05-30 — POP finish plan merged (PR #2)

### Delivered
- **Flutter runtime (stages 0–5)** — `PopActionExecutor` routes all zone commits through Governance → Safety; calibrated `resolveZoneFromGaze`; stale-frame cancellation; Y-plane transport; release-only full landmarks; unified blink FSM path.
- **Watch/Earn (stage 6)** — `attentionSession` samples → real `acsScore` in proof packets; `pops_sessions` migration; session-derived `demoProofPacket`.
- **UX (stage 7)** — lost-face banners (Flutter + web), wallet pending-holds copy.
- **Tests (stage 8)** — `pop_finish_plan_test`, `pop_action_executor_test`, updated `bypass_paths_test` (9+ Flutter tests pass).
- **Production flags (stage 9)** — `popFeatureFlags.ts`, `POP_PRIVACY_BOUNDARIES.md`.
- **CI** — Supabase ledger smoke gated on Docker **and** `supabase` CLI (fixes false CI failure on GitHub Actions).

### Canon
- Merge commit `0cf219f` on `main` · branch `pop/finish-plan-implementation` · [PR #2](https://github.com/iappmodel/i-project/pull/2)
- Deletion manifest: `integrations/eye-tracking/flutter-runtime/POP_FINISH_DELETION_MANIFEST.md`

### Owner decisions still open
- Partial vs full reward policy (POPS vs economy rules)
- iOS native backend: inlined Kotlin vs `attention_mediapipe` plugin
- Scoring location: Edge Function vs standalone validator

---

## 2026-05-27 — Gesture button system production complete

### Delivered
- **Engine** — `useGestureButton` hardened: deep-hold ramp ref, wallet balance clamp, pointer cancel, builder vs 500ms arm split on CONTROLS.
- **Offers** — `offerService`, `useOfferSession`, glass `OfferReviewSheet`; immersive feed no longer uses `window.prompt`.
- **Tips** — `tip-creator` edge function in `app/supabase/functions/` + `tipCreator.ts` (idempotency key; demo fallback).
- **Likes** — `useContentLike` → `content_likes` when live backend + auth.
- **Builder** — `GestureButtonBuilderSheet`, `ButtonPresetGallery`, `layoutStore`, extended presets (`enabled`, `builderHoldMs`).
- **Polish** — Picture 2 CSS pass, photo background fallback, vision `like`/`comment`/`share` events, `watch-verify` in immersive shell list.
- **Verification** — `npm run build` + `typecheck`; `scripts/smoke_gesture_buttons.sh`.

### Canon
- `MASTER_BRAIN/UX/USER_GESTURE_BUTTONS.md` — gesture matrix + REWARD states + smoke checklist.

---

## 2026-05-28 — Phases 34–40: vision proof bridge + immersive shell completion

### Delivered
- **Phase 34** — `visionProofBridge.ts` attaches web-vision metrics to `demoProofPacket` as hints only; `VisionSourceBadge` on Earn/Watch; ADR + `smoke_vision_proof_bridge.sh`.
- **Phase 35** — Glass wallet/profile overlays from immersive feed (`ImmersiveGlassSheet`, `ImmersiveWalletSheet`, `ImmersiveProfileSheet`).
- **Phase 36** — `VisionBlinkRemoteLite` debug gaze panel in `VisionControlPanel` (dependency-safe; no Tobii/voice).
- **Phase 37** — `OUT_PROFILE_ENGINE.md` + `outProfileEngine.ts`; tappable `OutProfileChip` → sponsored watch flow.
- **Phase 38** — `beginImmersiveWatch` routes immersive → consent gate → watch-verify; vision-aware consent copy.
- **Phase 39** — Canon sync: FEATURE_BIBLE, ORGANISM_STATUS, WIRING_STATUS.
- **Phase 40** — `PRODUCTION_CUTOVER_CHECKLIST.md` (owner-gated deploy prep).

### Verification
- `npm run typecheck` · `./scripts/smoke_vision_proof_bridge.sh` · `./scripts/smoke_immersive_shell.sh` · wired in `run_all_tests.sh`.

---

## 2026-05-28 — ELO evoke flow hardening (opt-in voice wake)

### Delivered
- **Opt-in voice wake** — `useEloWakeWord` only listens after `armVoice()` (Enable voice / Evoke ELO tap).
- **Evoke UX** — flash confirmation, membrane only when `evoked`, improved prompt hints and CSS.
- **Smokes** — `smoke_elo_presence.sh` asserts evoke prompt + armed wake; wired into `run_all_tests.sh`.

---

## 2026-05-28 — Phase 33 unified vision control panel complete

### Delivered
- **VisionControlPanel** — consolidated calibration, runtime settings, preset picker, and target editor into one expandable operator surface on Profile behind `VITE_VISION_ENGINE`.
- **Profile simplification** — replaced scattered vision cards with a single entry point while preserving all existing capabilities.
- **Smoke alignment** — vision smoke now asserts unified panel wiring (`VisionControlPanel.tsx`) rather than fragmented component checks.

### Deferred Phase 34+
- Full archive-level `BlinkRemoteControl` feature parity (voice/tobii/tutorial overlays) after dependency-safe adaptation.

---

## 2026-05-27 — Phase 32 target editor controls complete

### Delivered
- **VisionTargetEditor** — added in Profile behind `VITE_VISION_ENGINE` with per-target editing for label, command, trigger, enable/disable, position (x/y), and size.
- **Runtime integration** — editor writes through `useScreenTargets` so `TargetOverlay` updates instantly with no separate sync path.
- **Smoke hardening** — `smoke_vision_prep.sh` now asserts `VisionTargetEditor` mount.

### Deferred Phase 33+
- Full archive `BlinkRemoteControl` panel (advanced calibration + builder UX).

---

## 2026-05-27 — Phase 31 vision bundle chunk split complete

### Delivered
- **Vite manual chunks** — split `@mediapipe`, `@supabase`, React vendor, and generic vendor bundles in `app/vite.config.ts`.
- **Build outcome** — removed the `>500 kB` main chunk warning in `smoke_vision_prep.sh`; largest chunks now ship as separate ~178–204 kB assets.

### Deferred Phase 32+
- Full archive `BlinkRemoteControl` panel + drag-and-drop `TargetEditor`.

---

## 2026-05-27 — Phase 30 quick gaze calibration wizard complete

### Delivered
- **VisionCalibrationWizard** — 3-step ready/track/verify flow on Profile (camera starts when wizard opens); saves affine + residual fit to `app_remote_control_calibration`.
- **calibrationFit + residualModel** — promoted poly2 residual compensation from archive; emits `calibrationMode` to suspend `TargetOverlay` during capture.
- **VisionCalibrationHost** — Profile entry with quality readout and recalibrate action behind `VITE_VISION_ENGINE`.

### Deferred Phase 31+
- Full archive `BlinkRemoteControl` panel + drag-and-drop `TargetEditor`.
- Vision bundle code-split for >500 kB main chunk.

---

## 2026-05-27 — Phase 29 Profile vision operator controls complete

### Delivered
- **Remote settings card** — Profile exposes mirror/invert, gaze reach, dwell, blink timeout, and vision backend; persists via `saveRemoteControlSettings` + `remoteControlSettingsChanged`.
- **Target preset picker** — apply Quick Actions / Navigation / Minimal / Power User layouts without full `TargetEditor`.
- **Proof deep link** — already wired (`useDeepLinkProofSession` → wallet + flash); Seal Proof logcat monitor previously captured `PROOF_SEALED` → `WALLET_DEEP_LINK`.

### Deferred Phase 30+
- Full `BlinkRemoteControl` panel + `UnifiedVisionCalibrationWizard`.
- Drag-and-drop `TargetEditor`.

---

## 2026-05-27 — Phase 28 TargetOverlay gaze-dwell UI complete

### Delivered
- **TargetOverlay promotion** — wired vendored overlay with Loop 1 CSS (`vision-target-overlay.css`), accessibility/haptic stubs, and `remoteGazePosition` broadcast from `useWebVisionEngine` + `VisionContext`.
- **VisionTargetOverlay** — global mount in `App.tsx`; gaze cursor + dwell rings; `onTargetAction` runs Loop 1 commands (replaces headless-only bridge from Phase 27).
- **Stubs** — `lib/utils.ts`, `useHapticFeedback`, `AccessibilityProvider`, `useBlinkRemoteControl` settings loader bridge.

### Deferred Phase 29+
- Full `BlinkRemoteControl` settings panel + calibration wizard.
- `TargetEditor` UI for custom target placement.

---

## 2026-05-27 — Phase 27 screen-target action mapping complete

### Delivered
- **useScreenTargets promotion** — vendored hook + minimal `useGestureCombos` types; bridges at `hooks/useScreenTargets.ts` and `hooks/useGestureCombos.ts`.
- **Action executor** — `visionScreenTargets.ts` seeds navigation preset on first run, listens for `remoteGestureTrigger` / `remoteBlinkPattern`, dispatches `screenTargetAction`, and runs Loop 1 tab/wallet/save commands.
- **Global bridge** — `VisionScreenTargetBridge` mounted in `App.tsx` (no `TargetOverlay` UI).
- **HUD** — Feed + Profile show target count / last action when `VITE_VISION_ENGINE=1`.

### Deferred Phase 28+
- Promote `TargetOverlay` gaze-dwell UI (requires accessibility/haptic stubs).
- Gaze-position hit testing (`remoteGazePosition`) for `gazeActivated` / `gazeAndBlink` triggers.

---

## 2026-05-27 — Phase 26 remote gesture dispatch slice complete

### Delivered
- **Gesture bridge hook** — added `visionGestureBridge.ts` to emit `remoteGestureTrigger` / `remoteBlinkPattern` without shipping blink-remote UI.
- **Earn + Watch wiring** — hand/command/blink gestures now dispatch on flagged vision paths (`enableHandTracking` on Earn engine).
- **Profile listener** — passive `useRemoteGestureListener` surfaces latest gesture event for operator debugging.
- **Smoke hardening** — vision prep smoke now asserts gesture bridge files and Watch wiring.

### Deferred Phase 27+
- Promote blink-remote target registration (`useScreenTargets`) for actionable UI control.
- Add manual chunk split for vision bundle size warnings.

---

## 2026-05-27 — Phase 25 remote-control runtime settings promotion complete

### Delivered
- **Active runtime tuning** — `useWebVisionEngine` now consumes `remoteControlSettings` for mirror/invert axes, gaze reach, blink timeout, and backend selection.
- **Live settings sync** — vision runtime refreshes when `remoteControlSettingsChanged` is emitted.
- **Scope control** — kept calibration and blink-remote UI deferred while still promoting operator tuning knobs into the running vision stack.

### Deferred Phase 26+
- Promote selected `useBlinkRemoteControl` gesture dispatch into Loop 1 without shipping full settings surface.
- Add chunking strategy for >500 kB app bundle warnings.

---

## 2026-05-27 — Phase 24 shared vision context mount complete

### Delivered
- **Provider mount** — wrapped app shell with `VisionStreamProvider` + `VisionProvider` in `App.tsx`.
- **Context bridges** — promoted `contexts/VisionContext.tsx` and added `contexts/VisionStreamContext.tsx` as re-exports to the unified context layer.
- **Type/runtime fixes** — aligned `vision-unified/contexts/VisionContext.tsx` refs for `useVisionEngine` and skin-tone fallback calls.

### Deferred Phase 25+
- Promote selected `useBlinkRemoteControl` runtime behaviors without importing full calibration UI surface.
- Tune chunk split for enlarged vision bundle now that shared context is mounted.

---

## 2026-05-27 — Phase 23 eye-tracking bridge + Watch screen activation complete

### Delivered
- **Archive alias bridge** — added `hooks/`, `constants/`, `contexts/`, `services/`, and `integrations/supabase` shims so `useEyeTracking` resolves in Loop 1.
- **Attention stack** — promoted `attentionScoring`, `attention`, `attentionPass`, full `skinToneFallback`, and `eyeTracking.worker`.
- **Watch integration** — `WatchVerifyScreen` uses `useWebEyeTracking` behind `VITE_VISION_ENGINE` for live attention ring + HUD status.
- **Remote control settings** — extracted `remoteControlSettings.ts` to decouple eye-tracking from full blink-remote-control UI.

### Deferred Phase 24+
- Promote `useBlinkRemoteControl` UI shell and calibration wizard into product tabs.

---

## 2026-05-27 — Phase 22 vision worker signal fusion pass complete

### Delivered
- **Worker signal math** — upgraded `visionSample.worker.ts` from static placeholder outputs to real face-box, EAR, blink, wink, gaze smoothing, and head pose derivation.
- **Config parity** — worker now consumes runtime blink/gaze config payloads posted by `useVisionEngine`.
- **State handling** — added worker-side reset + baseline tracking to keep blink/liveness behavior stable between sessions.

### Deferred Phase 23+
- Bridge `useEyeTracking` / `useBlinkRemoteControl` archive aliases and missing modules before activating those hooks in app screens.
- Validate worker outputs against recorded device traces for threshold tuning.

---

## 2026-05-27 — Phase 21 first active vision slice complete

### Delivered
- **Active non-UI slice** — wired `vision-unified/hooks/useVisionEngine.ts` into `EarnScreen` behind `VITE_VISION_ENGINE`.
- **Compile bridge expansion** — extended `visionCalibration/profile.ts` runtime preset fields required by the unified hook.
- **Worker path unblocked** — added `vision-unified/workers/visionSample.worker.ts` so Vite can build the hooked slice.
- **Smoke hardening** — `smoke_vision_prep.sh` now asserts active hook/worker wiring.

### Deferred Phase 22+
- Improve worker math from placeholder output to full fused gaze/EAR calculations.
- Promote additional non-UI slices (`useEyeTracking`, blink remote control) after integration checks.

---

## 2026-05-27 — Phase 20 autonomous bridge pass complete

### Delivered
- **Import bridge layer** — enabled `@/*` aliases in app TS + Vite config.
- **Runtime deps** — installed MediaPipe packages needed by unified vision engine.
- **Shared utilities** — added `logger.ts` and `skinToneFallback.ts` stubs for archive compatibility.
- **Smoke hardening** — vision prep smoke now verifies dependency bridge files.

### Deferred Phase 21+
- Convert selected `vision-unified` modules from excluded state into active compile set.
- Replace stubbed utilities with production-grade scoring/security implementations.

---

## 2026-05-27 — Phases 18–19 autonomous bundle complete

### Delivered
- **Audited vision vendoring** — `22cabd3` subset copied into `app/src/vision-unified`.
- **Deterministic recovery script** — `cherry_pick_vision_unified_22cabd3.sh`.
- **Compile-safe bridge** — `vision-unified` guarded from TS compile while retained in-repo.
- **Vision core adapter** — added local `visionCalibration/profile.ts` + `residualModel.ts` and runtime helper usage.

### Deferred Phase 20+
- Bridge archive-only deps (`@/` aliases, UI libs, services) to fully compile `vision-unified`.
- Decide if/when to activate full unified wizard UX in product screens.

---

## 2026-05-27 — Phases 11–17 autonomous bundle complete

### Delivered
- **Economy label hardening** — user-facing coin labels normalized to `Icoin` pattern in app flows.
- **Stripe local E2E** — signed webhook smoke added (`smoke_stripe_webhook_signed.sh`) and passing.
- **Capacitor hardening** — native prep smoke + safer iOS add behavior when Xcode is absent.
- **Web vision prep** — `VITE_VISION_ENGINE` scaffold + `smoke_vision_prep.sh` with default-off behavior.
- **Loop 2 scaffold** — `saved` screen + localStorage save/return flow from Feed teaser.
- **Validator packaging** — Dockerfile + `smoke_validator_docker.sh` passing.
- **CI + artifacts** — build artifact script and CI upload of `.artifacts/*`.

### Deferred Phase 18+
- Vercel/Render deploy cutover (owner credentials/domain/TLS)
- Capacitor store signing/upload
- MP4 investor assets + Tobii policy (deferred by choice)

---

## 2026-05-27 — Phase 10 autonomous queue complete

### Delivered
- **Production runbook** — `docs/technical/PRODUCTION_DEPLOY_RUNBOOK.md`
- **Pre-deploy smoke** — `smoke_production_readiness.sh` (builds + organism spine + Stripe skip)
- **Device wallet return** — `open_wallet_on_device.sh` (adb deep link)
- **CI** — consolidated on production readiness smoke

### Deferred Phase 11
- Stripe live keys, MediaPipe `22cabd3`, Capacitor store build

---

## 2026-05-27 — Phase 9 autonomous queue complete

### Delivered
- **Android E2E verified** — Seal Proof → validator → pending hold → `WALLET_DEEP_LINK` (USB reverse)
- **Device scripts** — `android_device_urls.sh`, `run_android_device_test.sh`, `smoke_android_seal_postcheck.sh`
- **Dev loop** — `run_android_dev_loop.sh` auto-detects emulator vs USB vs LAN
- **Vite LAN** — `host: true` for physical device WiFi fallback
- **Runbook** — `ANDROID_SEAL_PROOF_RUNBOOK.md` updated

### Deferred Phase 10
- Automated tap without human, production deploy, Stripe live keys

---

## 2026-05-26 — Phase 8 autonomous queue complete

### Delivered
- **ORGANISM_STATUS.md** — one-page synthesis + owner gates
- **Spine smoke** — `smoke_organism_spine.sh` (local + Supabase when Docker up)
- **Stripe wiring** — `enable_stripe_live_env.sh`, `smoke_stripe_env.sh`, dev_stack hook
- **UX** — Elo on Wallet, consent bridge copy

### Deferred Phase 9
- Device tap automation, production deploy

---

## 2026-05-26 — Phase 7 autonomous queue complete

### Delivered
- **Elo** — `EloCompanionCard` with last seal + wallet jump
- **Android** — `smoke_android_env.sh`, `run_android_dev_loop.sh`
- **Index** — `PHASE_QUEUE_INDEX.md` (phases 1–7)
- **Stripe** — Pro checkout button on Profile when live mode env set
- **Proof layer** — Capacitor + Android status cards

### Deferred Phase 8
- Automated device E2E, Stripe owner keys deploy

---

## 2026-05-26 — Phase 6 autonomous queue complete

### Delivered
- **Capacitor** — `@capacitor/*` installed, `capacitor.config.ts`, `cap:sync` scripts
- **Setup** — `setup_capacitor_shell.sh --add` for android/ios (gitignored)
- **UX** — Feed/Profile native shell + proof bridge badges
- **Smokes** — `smoke_capacitor_prep.sh` in CI + `run_all_tests.sh`
- **Secrets template** — `.env.local.stack.example`

### Deferred Phase 7
- Native SDK builds on CI, Android device tap, Stripe deploy

---

## 2026-05-26 — Phase 5 autonomous queue complete

### Delivered
- **Flutter return path** — `WalletDeepLink` + `WALLET_APP_URL` → logcat `WALLET_DEEP_LINK`
- **Bridge UX** — Earn + WatchVerify show live proof-events status
- **Stripe client** — `stripeCheckout.ts` for subscription checkout when keys live
- **Smokes** — `smoke_flutter_seal_prep.sh`, `open_wallet_deep_link.sh`
- **Capacitor** — prep doc (install deferred)

### Deferred Phase 6
- Capacitor `cap init`, Android device tap, Stripe deploy

---

## 2026-05-26 — Phase 4 autonomous queue complete

### Delivered
- **Deep links** — `?proofSession=` opens wallet with flash banner
- **Wallet UX** — proof flash on seal; auto-nav on Flutter proof; Elo status strip
- **SSE filter** — `localUserRef` query param on proof-events stream
- **Stripe UX** — readiness banner on withdraw; `deploy_stripe_functions_local.sh`
- **Smokes** — `smoke_full_loop.sh` chains wallet + proof-events

### Deferred Phase 5
- Capacitor shell, Android device tap, Stripe live deploy

---

## 2026-05-26 — Phase 3 autonomous queue complete

### Delivered
- **Proof-events SSE** — validator broadcasts `proof-sealed`; React `useProofEvents` + Elo live status
- **Stripe scaffold** — `promote_stripe_functions.sh`, `smoke_stripe_webhook.sh` (skip without keys)
- **CI / smokes** — `smoke_proof_events.sh` in CI + `run_all_tests.sh`
- **Roadmap** — spine phases aligned with migration queue

### Deferred Phase 4
- Capacitor in-process bridge, Stripe edge deploy, Android device tap

---

## 2026-05-26 — Phase 2 autonomous queue complete

### Delivered
- **P0 chat 104/104** — batches 10–11 (ranks 91–104)
- **Supabase Auth** — `@supabase/supabase-js`, auto demo sign-in, settle uses session user id
- **Elo** — Profile companion card (entity teaser, ADR-013)
- **Docs** — `REACT_FLUTTER_BRIDGE.md`, `STRIPE_PHASE2.md`, `smoke_auth_demo.sh`
- **`dev_stack.sh`** — appends `VITE_SUPABASE_URL` + anon key to `.env.local`

### Deferred Phase 3
- Capacitor/WebSocket React↔Flutter bridge
- Stripe edge function promotion (owner keys)
- Android Seal Proof device tap

---

## 2026-05-26 — Autonomous queue (30 steps) complete

### Delivered
- **CORS** on POP validator — fixes browser wallet "Failed to fetch"
- **`scripts/dev_stack.sh`** — one-command Supabase + validator + app
- **Wallet UX** — reconnect messaging, `VITE_AUTO_SETTLE`, reward sealing spinner
- **Docs** — `RUNBOOK_LOCAL.md`, `WIRING_STATUS.md`, `ANDROID_SEAL_PROOF_RUNBOOK.md`
- **CI** — `.github/workflows/ci.yml` + `run_all_tests.sh` + smoke scripts
- **Chat** — P0 batches 08–09 (90/104 extracted)
- **MASTER_BRAIN** — post-P1 audit §14, SEAL_PROOF wire status updates

### Smokes
- `./scripts/smoke_pop_wallet_loop.sh` — PASS
- `./scripts/smoke_pop_wallet_loop_supabase.sh` — PASS (prior session)

### Next (device)
- Flutter Seal Proof on Android per runbook

---

## 2026-05-25 — P1 Supabase settlement wire

### Delivered
- **`20260525220000_pop_pending_holds.sql`** — `pop_pending_holds` table + `settle_pop_pending_hold` RPC → `wallet_ledger`
- **Validator** — upserts holds when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set
- **`POST /v1/pending-holds/:sessionId/settle`** — releases hold to ledger (idempotent)
- **`GET /v1/pending-holds/:sessionId`** — read hold status
- Promotion script preserves `*pop_*.sql` migrations on re-promote

### Next
1. `./scripts/start_local_stack.sh --reset` once Docker engine is running
2. Real Supabase Auth sign-in (replace demo UUID)

---

## 2026-05-25 — Docker / Supabase local stack prep

### Delivered
- **`app/supabase/seed.sql`** — demo user `00000000-0000-4000-8000-000000000001`
- **`scripts/start_local_stack.sh`** — start Supabase + print validator/app env
- **`scripts/smoke_pop_wallet_loop_supabase.sh`** — ledger settle smoke (needs Docker engine)

### Blocker observed
Docker Desktop UI open but CLI could not reach daemon — restart Docker Desktop until `docker info` works.

---

## 2026-05-25 — Wallet settle UX + demo auth config

### Delivered
- **`VITE_DEMO_USER_ID`** — optional UUID for Supabase ledger settle
- **Wallet Settle button** on each pending POP hold (local-json or Supabase auto-detect via `/health`)
- **`settlePopHold(sessionId)`** in demo context — no manual curl

---

## 2026-05-25 — E2E smoke + local-json settlement (no Docker)

### Delivered
- **Local-json fallback** — validator lists/settles holds from JSON files when Supabase unavailable
- **`POST /v1/pending-holds/:sessionId/settle-demo`** — dev settle without UUID
- **`scripts/smoke_pop_wallet_loop.sh`** — automated smoke (7 validator tests + validate → list → settle → PASS)
- Smoke verified on this machine (Docker not installed; Supabase local blocked)

### Run smoke
```bash
./scripts/smoke_pop_wallet_loop.sh
```

### Run app live wallet (no Docker)
```bash
cd integrations/pop-core/validator && npm start
cd app && echo 'VITE_POP_VALIDATOR_URL=http://127.0.0.1:8787' > .env.local && npm run dev
```

---

## 2026-05-25 — P1b app wallet ↔ POP pending holds

### Delivered
- **`VITE_POP_VALIDATOR_URL`** — live wallet mode polls `GET /v1/pending-holds?localUserRef=demo-user-001`
- **Loop 1** `finishRewardToWallet` POSTs demo proof packet to validator when live
- **WalletScreen** — live banner, pending hold cards, refresh control
- **Validator** — list holds endpoint for demo user ref

---

## 2026-05-25 — P0 wiring slice (validator + Supabase promote)

### Delivered
- **`integrations/pop-core/validator/`** — HTTP stub `POST /v1/proof-packets/validate` (pending + full modes); tests pass
- **`app/supabase/`** — 103 migrations + `issue-reward`, `validate-attention`, `_shared` from sparkle-archive
- **`scripts/promote_supabase_financial_core.sh`** — repeatable promotion
- **flutter-runtime** — `ProofValidatorBridge` POSTs sealed packets when `POP_VALIDATOR_URL` is set

### Next
1. Merge feature branch → `main`
2. Wire validator pending holds → Supabase ledger (P1)

---

## 2026-05-25 — Phase 2 integration readiness audit

### Delivered
- **`INTEGRATION_READINESS_AUDIT_2026-05-25.md`** — built vs wired vs designed; 30/60/90 day alive definition; ordered build queue
- Runtime verification: `app/` ✅ · flutter-runtime **211 tests** ✅ · vision-v2 ✅ (after npm install)
- Repo sweep: all 11 `iappmodel` repos cloned; feature branch 19 commits ahead of main

### Next engineering (P0)
1. Merge `reliability/wire-proof-collector-live-loop` → `main`
2. ~~Promote archive Supabase financial core~~ ✅
3. ~~POPS validator stub~~ ✅ — Supabase settlement wire remains P1

---

## 2026-05-25 — 4-tab product shell (ADR-014)

### Implemented
- **BottomNav:** Feed · Earn · Wallet · Profile
- **EarnScreen** — Loop 1 entry under Earn tab
- **ProfileScreen** — trust mock, vision categories (MOD-01 deferred), presenter toggle
- **Dual mode:** `product` (tabs) vs `presenter` (linear pitch)
- `npm run typecheck` + `npm run build` — clean

### Run
```bash
cd app && npm run dev
```

---

## 2026-05-25 — Owner decision session + ENTITIES map

### Owner confirmed
| ID | Decision |
|----|----------|
| ENT-01 | **Elo entity** — same product as ELO UI mock (ADR-013) |
| ENT-05 | **Elo and iAM separate** — sibling entities, not merged |
| CR-02–06 | **Build Tier 1 a/i/v/e/o as-is** — 26+ω deferred; concepts can change later (ADR-001) |
| HI-01/02 | **Delegated** — ADR-014: `app/` linear pitch + 4-tab product law |
| MOD-01 | **Deferred** — roadmap module list not defined yet |

### Agent completed
- ENTITIES / SYSTEMS / RELATIONSHIPS map (22 files)
- Desktop chat extraction: 189 threads, 292 attachments
- ADRs: `ENTITY_ADR.md`, `DEMO_IA_ADR.md`, currency ADR owner-confirmed

### Next build (per ADR-014)
- Add 4-tab `BottomNav` to `app/` (Loop 1 under **Earn** tab)
- Keep linear presenter mode for investor pitch
- RoadmapScreen: vision categories only until MOD-01

---

## 2026-05-25 — Batch 07 + sparkle CR-01 + security

### Completed
- Chat batch 07 (ranks 61–70) — **70/104 P0**
- sparkle-archive CR-01: `Index.tsx` requires `attentionSessionId`; `MediaCard` no longer passes eligible without backend validation
- Deleted exposed Firebase adminsdk JSON from `DEMOS:REPOS/` — **rotate key in Firebase console**
- Loop 1 app dev server started (`app/`)

---

## 2026-05-25 — CR-01 fix + vision-v2 + chat batch 06

**Agent:** Cursor

### Completed
- **CR-01:** Attention session gating in `app/src/state/attentionSession.ts` — no consent session → no collect/redeem
- **vision-v2** promoted to `integrations/eye-tracking/vision-v2/` (providers, calibration, remote control)
- **Chat batch 06:** ranks 51–60 (60/104 P0 total)

### Next
- Chat batch 07 (61–70)
- Wire vision-v2 providers into proof layer (future)
- Harden sparkle-archive dual reward paths (MediaCard vs PromoVideosFeed)

---

## 2026-05-25 — P0 promotion + batch 05 + wallet alignment

**Agent:** Cursor  
**Scope:** Execute PROMOTION_AND_DISCARD_QUEUE P0 items

### Completed
- Fetched `demo-investor` branch in `github-source-repos/eye-earn-sparkle` (@ 5652c1a)
- Fetched `codex/investor-demo-mode-v2` in `github-source-repos/eye-earn-sparkle-archive` (@ 6391b06)
- Populated `github-source-repos/iview/` from DEMOS investor demo (rsync)
- **ADR-001:** `DECISIONS/CURRENCY_NAMING_ADR.md` — MVP a/i/v/e/o + deferred 26+ω
- **Chat batch 05:** ranks 41–50 extracted (50/104 P0 total)
- **Loop 1 wallet:** pending-first iCoin flow in `app/` (mirrors demo-investor)
- Report: `docs/technical/DEMOS_PROMOTION_REPORT_2026-05-25.md`

### Next
- Chat batch 06 (ranks 51–60)
- Cherry-pick reward engine from demo-investor if needed
- Owner: confirm ADR-001; rotate Firebase key in DEMOS
- CR-01 session bypass fix (still blocked)

---

## 2026-05-25 — IVAULT full audit + critical doc promotion

**Agent:** Cursor  
**Scope:** Entire `~/Desktop/IVAULT` (~56 GB) synthesis

### Completed
- Full audit document: [`IVAULT_FULL_AUDIT_2026-05-25.md`](IVAULT_FULL_AUDIT_2026-05-25.md)
- Promotion queue: [`PROMOTION_AND_DISCARD_QUEUE.md`](PROMOTION_AND_DISCARD_QUEUE.md)
- Cursor project rule: [`.cursor/rules/i-project.mdc`](../.cursor/rules/i-project.mdc)
- **Promoted to MASTER_BRAIN:**
  - `PAYMENT SYSTEM/i-app-economy-rules.md` → `ECONOMY/i-app-economy-rules.md`
  - `REMOTE CONTROL/...master_brief.md` → `ATTENTION_SYSTEM/REMOTE_CONTROL_MASTER_BRIEF.md`
  - `MASTER_BRAIN/i-app-feature-bible.md` → `CANONICAL/FEATURE_BIBLE.md`
  - `MASTER_BRAIN/i-app-demo-spec.md` → `INVESTOR_DEMO/DEMO_SPEC.md`
  - Design guide + dev guide → `01_strategy_docs/`
- **Promoted prototypes:** 7 HTML files → `02_clickable_prototypes/recent_may2026/`

### Key findings
- Canonical workspace confirmed: `i-project-rescue/i_project_migration_archive/`
- ~46 GB is reference libs + duplicate demos (not product code)
- Highest-value unpromoted code: `eye-earn-sparkle` `demo-investor` branch, archive investor-demo commits, iview investor demo
- 6 currency blockers + 1 attention-session bypass still block final canonicalization
- Chat extraction: 40/104 P0 threads done

### Next
- Owner decisions on CR-01 through CR-06 (see DUPLICATES_AND_CONFLICTS.md)
- Promote demo-investor wallet branch
- Chat extraction batch 05 (ranks 41–50)

---

## 2026-05-22 — P0 chat extraction batch 4

**Scope:** Chat ranks 31–40

- Extracted 10 conversations to `CHAT_RECOVERY/EXTRACTED/conversations/`
- Updated `P0_BATCH_04_SUMMARY.md`, conflicts register, canonical candidates
- Synthesis: `P0_BATCHES_01_04_SYNTHESIS.md` (40 threads total)

---

## 2026-05-21 — Global intake census + MASTER_BRAIN v1.0

**Scope:** Migration archive archaeology + IVAULT desktop census

### Completed
- `MASTER_BRAIN/` corpus created (102 files)
- `scripts/ivault_global_intake.py` — 80,959 file census TSV
- `scripts/chat_export_triage.py` — 648 conversations scored
- 31 technical branch audits in `docs/technical/`
- Loop 1 React MVP in `app/` (13 screens)
- Flutter runtime promoted to `integrations/eye-tracking/flutter-runtime/`
- pop-core proof contract scaffold

### Artifacts
- `GLOBAL_INTAKE/IVAULT_GLOBAL_INVENTORY.md`
- `CANONICAL/i_SOURCE_OF_TRUTH.md`
- `REPOSITORY_MAP.md`, `KNOWLEDGE_GRAPH.md`, `DUPLICATES_AND_CONFLICTS.md`

---

## Template — add new entries above this line

```markdown
## YYYY-MM-DD — Short title

**Agent / human:**  
**Scope:**

### Completed
-

### Decisions
-

### Blockers
-

### Next
-
```
