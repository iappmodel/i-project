# Independent POP V10 / main-app integration review — 2026-11-11

**Scope**: Cursor app branch at `5ade68e5b13b295cb123ee14a95f544f5a1582a3`. The safety patch is prepared on a separate review branch; it is **not** pushed onto Cursor's own development branch. No deployment, merge, financial migration, physical-device trial, or model evaluation has occurred.

## Confirmed issues in source
1. **P0 proof authority crossing**: `app/src/state/demoContext.tsx` builds `buildDemoProofPacket()` from synthetic attention scores and sends it through `submitProofPacket()` when a validator URL is configured. `app/src/lib/demoProofPacket.ts` synthesizes presence/perception/eligibility, a centered stable gaze window, a blink, interaction events and hardcoded confidences. The privacy-key filter is not an authenticity check. This violates the POP V10 boundary: local fictional sessions must never be passed off as server-authorizable proof. **Patch**: reject packets marked `web-demo@` or `sha256:demo-web-shell` before network submission, with a regression test. This is a defense in depth specific to the current producer; a full solution must replace demo submit with authenticated production evidence and server hard-denial.
2. **P1 demo pending auto-promotion**: `finishRewardMock()` credits `iCoins` and USD-valued `walletBalance` after 1.2 seconds without a review. **Patch**: remove the timer-driven pending-to-available conversion; keep the demo outcome explicitly pending.
3. **P1 legacy proof terminology**: `demoProofPacket.ts` maps inferred `acsScore` to rewardEligibility and creates invented blink/gaze events, making it easy to mistake the simulated session for actual proof. **Open**: formal separation of illustrative demo DTO from actual evidence contracts and removal of misleading labels.
4. **P1 settlement gating**: `popValidator.ts` exposes `settlePendingHold` and `settle-demo`; `WalletScreen.tsx` renders a Settle action for any pending hold, and `VITE_AUTO_SETTLE` can automate it. This requires a separate server-and-client fail-closed audit before production. **Not changed** in this patch; do not configure a live validator or production Supabase financial access for this app.
5. **P2 privacy gate**: `popPrivacyGate.ts` checks a finite list of forbidden key names, but `demoProofPacket.ts` still contains derived attention score, synthetic gaze history and literal `blinkEvents`. No proof of privacy or data minimization follows from passing a key-name filter.

## Verification limits
- GitHub source review establishes code-path defects, not demonstrated real transactions or live exploitability.
- Regression test added; **not yet executed** in a local app runner or CI by this review.
- M5 infrastructure complete, empirical M5 physical-device tests missing, rollout HOLD. Never infer performance from synthetic scores.

## Required next actions
1. Run `cd app && npm ci && npm test && npm run typecheck && npm run build` on the isolated review branch. Fix regressions without weakening the authority guard.
2. Audit `integrations/pop-core/backend` authority and ensure it independently rejects any mock/local/incomplete/legacy evidence even when front-end validation is bypassed.
3. Remove or separately gate `settlePendingHold` and any auto-settle path until verified nonredeemable integration review is approved.
4. Replace synthetic proof metadata with a clearly typed presentation-only object. Only send authentic authorized proof built from the approved production collector after M5 field gates and a dedicated settlement authorization review.
5. Run physical-device smoke/human trials using the existing M5 protocol on actual Android Chrome and iOS Safari. Preserve raw media locality, consent and no-attestation labelling.
