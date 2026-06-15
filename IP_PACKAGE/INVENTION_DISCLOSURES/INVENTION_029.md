# INVENTION_029 — Studio with POP Gate Template Binding

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Creator Tools
**Date:** 2026-06-15

## Problem Solved

Content creators who publish paid or promotional offers have no way to specify, preview, or validate the proof-of-presence (POP) verification requirements that will gate their offer's reward settlement before publishing. Verification requirements are typically set by platform operators after the fact, creating a disconnect between what creators promise and what the platform enforces. This leads to creator confusion, viewer frustration from unexpected verification steps, and advertiser distrust.

## Current Industry Approach

YouTube ad placement lets creators choose ad formats but not verification requirements. Instagram's branded content tools manage disclosure but not verification. Advertising platforms (Google Ads, Meta Business) let advertisers set targeting and budget but delegate all verification to the platform's opaque backend. No existing creator studio integrates attention verification gate configuration into the content publishing workflow, and no system simulates verification layers before publish.

## How [ i ] Solves It

The [ i ] Studio system binds POP gate templates to creator-published offers at publish time. When a creator prepares an offer in the Studio, the StudioPublishPanel presents the verification requirements that will gate the reward. The Studio verification engine (`studioVerificationEngine.ts`) simulates the full POPS (Proof of Presence Signal) layer stack before publish, allowing creators to understand exactly what viewers will experience. The `studioPOPS.ts` module implements challenge creation and evaluation for 10 POP methods: active_tap, hold_gesture, motion_presence, camera_presence_mock, audio_presence_mock, location_presence, qr_presence, nfc_presence, session_continuity, and device_attestation_mock. A context-aware selector (`selectRequiredPOPS`) automatically determines which POP methods to require based on reward amount, risk score, campaign fraud sensitivity, action type, viewer trust score, and campaign-specific requirements (QR, GPS). The creator sees these requirements before publishing and can adjust their offer parameters to change the verification profile.

## System Description

The Studio architecture has three main layers. The **publishing layer** (`StudioPublishPanel.tsx`, `studio-publish.ts`) manages the offer creation workflow: media selection, reward configuration, targeting, and the publish action. At publish time, the system invokes the verification gate binding: the offer's reward amount, category, and targeting parameters are passed to `selectRequiredPOPS` which returns the set of POP methods that will be required. These methods are stored as the offer's verification template. The **verification simulation layer** (`studioVerificationEngine.ts`, `studioVerificationEvents.ts`) allows creators to preview the viewer's verification experience before publishing. The engine runs each selected POP challenge through `createPOPSChallenge` to generate the challenge prompts and timing requirements, then through `evaluatePOPSChallenge` with simulated inputs to show pass/fail outcomes. Each challenge has a method-specific prompt (e.g., "Tap the highlighted control to confirm you are present," "Confirm you are within the campaign geofence"), a required-within-ms window, and a scoring function that evaluates completion time and action quality against thresholds. The **fraud gate layer** (`studioFraudEngine.ts`, `studioTrustImpact.ts`) integrates with the verification simulation to show creators how their offer's parameters affect fraud risk scoring and viewer trust requirements. The gate result type (`VerificationGateResult`) carries a gateType, status (passed/failed), score, threshold, message, and blocking flag. The `selectRequiredPOPS` logic follows escalation rules: high risk scores (≥75) or high fraud sensitivity require active_tap + session_continuity; medium risk (≥50) adds active_tap for high-reward offers; low risk with low rewards may require no POP challenges. Campaign-specific requirements (GPS, QR) override the risk-based selection. This entire system runs within the Studio shell, which includes additional components: StudioShell (overall layout), StudioToolRail (editing tools), StudioTimeline (media timeline), StudioPreview (content preview), StudioClipStrip (clip selection), StudioExportPanel (export options), StudioProofPanel (proof visualization), and StudioSessionPanel (session management).

## Technical Components

- `StudioPublishPanel.tsx` — Publish workflow with verification gate binding
- `studioVerificationEngine.ts` — Verification simulation engine for pre-publish preview
- `studioPOPS.ts` — POP challenge creation, evaluation, and context-aware method selection
- `studioVerificationTypes.ts` — POPSChallenge, POPSMethod, VerificationGateResult types
- `studioVerificationEvents.ts` — Verification event emission during simulation
- `studioFraudEngine.ts` — Fraud risk scoring for offer parameters
- `studioTrustImpact.ts` — Trust score impact analysis for offers
- `studioDisputeEngine.ts` — Dispute handling for post-publish verification failures
- `studioSettlementEngine.ts` — Settlement workflow for verified offers
- `studioRevealEngine.ts` — Content reveal mechanics for gated offers
- `StudioShell.tsx` — Overall Studio layout shell
- `StudioToolRail.tsx` — Editing tool selection rail
- `StudioTimeline.tsx` — Media timeline editor
- `StudioPreview.tsx` — Content preview panel
- `StudioProofPanel.tsx` — Proof visualization panel

## Data Flow

1. Creator enters Studio and creates a new offer (media + reward + targeting).
2. Creator sets reward amount, category, fraud sensitivity preference.
3. `selectRequiredPOPS` evaluates the offer context and returns required POP methods.
4. StudioVerificationGate displays the selected methods as a visual checklist.
5. Creator can preview each POP challenge via `createPOPSChallenge` (sees prompt, timing window).
6. Verification engine simulates the full challenge sequence with mock inputs.
7. Creator sees simulated pass/fail results and can adjust offer parameters to modify the verification profile.
8. On publish, the selected POP method template is permanently bound to the offer.
9. When a viewer encounters the offer, the runtime POP system enforces the bound template.
10. Verification results flow back through settlement, dispute, and trust impact systems.

## User Flow

A creator opens the Studio to publish a promotional offer for their local restaurant. They upload media, set a $1.50 reward, and configure a geofence radius. The Studio automatically selects "location_presence" and "session_continuity" as required POP methods because the campaign requires GPS. The verification preview shows: "Confirm you are within the campaign geofence (mock)" with a 20-second window, and "Keep this session active while value accrues" with a 120-second window. The creator can see that viewers will need to physically visit the location and maintain an active session to earn the reward. They adjust the reward to $2.00 — the verification requirements remain the same because they're GPS-driven, not risk-driven. They publish, and the POP template is locked to the offer. Every viewer who engages with this offer will face exactly these verification steps.

## Economic Flow

The POP gate template binding creates economic alignment between creators, viewers, and the platform. Creators set reward amounts knowing exactly what verification viewers must complete — higher rewards can demand more rigorous verification. Viewers see transparent requirements before committing attention. The platform ensures rewards only release upon verified completion of the creator-specified (and platform-validated) POP template. The context-aware POP selection (`selectRequiredPOPS`) acts as an automated underwriter: low-risk, low-reward offers may require no POP challenges (reducing friction), while high-value payouts require active verification (preventing fraud). Campaign budget accounts are only debited upon successful POP completion, protecting advertiser spend.

## Fraud Prevention

- POP templates are bound at publish time and cannot be modified after publication, preventing bait-and-switch verification downgrade.
- `selectRequiredPOPS` enforces minimum verification requirements based on risk score, reward amount, and fraud sensitivity — creators cannot publish high-reward offers with no verification.
- Each POP challenge has method-specific scoring thresholds (e.g., active_tap requires ≥0.65 quality within time window; hold_gesture requires 1.8-12 second duration).
- The fraud engine scores offer parameters at publish time, flagging high-risk configurations before they go live.
- Trust impact analysis shows creators how their verification choices affect viewer trust scores, incentivizing appropriate verification levels.
- Device attestation and location presence challenges use mock implementations during simulation but real verification at runtime.

## Unique Elements

1. Binding of proof-of-presence verification templates to content offers at publish time, creating immutable verification contracts between creators and viewers.
2. Pre-publish verification simulation that lets creators preview the exact POP challenge sequence their viewers will experience, including prompts, timing windows, and scoring thresholds.
3. Context-aware POP method selection (`selectRequiredPOPS`) that automatically determines verification requirements from offer parameters (reward amount, risk score, fraud sensitivity, action type, trust score, GPS/QR requirements).
4. Ten-method POP vocabulary (active_tap, hold_gesture, motion_presence, camera_presence_mock, audio_presence_mock, location_presence, qr_presence, nfc_presence, session_continuity, device_attestation_mock) with method-specific evaluation functions.
5. Integrated fraud/trust analysis at publish time, showing creators how their offer configuration affects the platform's fraud risk assessment and viewer trust requirements.

## Potential Patent Claims

1. A method for binding attention verification requirements to content offers comprising: receiving offer parameters including reward amount and targeting configuration; automatically selecting proof-of-presence verification methods based on a risk assessment of said parameters; simulating the selected verification sequence for creator preview; permanently binding the selected verification template to the offer at publish time; and enforcing the bound template when viewers engage with the offer.
2. A content creation system with integrated verification gate configuration comprising: a studio interface for composing content offers with reward parameters; a verification engine that simulates proof-of-presence challenges before publication; a context-aware method selector that determines verification requirements from offer risk profile; and a template binding mechanism that immutably associates verification requirements with published offers.
3. A method for context-aware selection of attention verification methods comprising: evaluating reward amount, risk score, campaign fraud sensitivity, action type, and viewer trust score; applying escalation rules to select from a vocabulary of verification methods; and overriding risk-based selection with campaign-specific requirements (geolocation, QR code) when present.
4. A system for pre-publish verification simulation comprising: generating proof-of-presence challenges with method-specific prompts and timing requirements; executing challenges against simulated user inputs; presenting pass/fail outcomes and scoring details to content creators; and enabling creators to adjust offer parameters to modify the resulting verification profile.

## Potential Competitors

- YouTube Studio (ad placement, no verification configuration)
- Meta Business Suite (branded content, no POP verification)
- Google Ads (campaign builder, no attention verification)
- Canva / CapCut (content creation, no verification integration)
- Shopify (merchant tools, no attention economy verification)

## Related Files

- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/src/screens/studio/verification/studioPOPS.ts`
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/src/screens/studio/verification/studioVerificationEngine.ts`
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/src/screens/studio/verification/studioVerificationTypes.ts`
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/src/components/studio/StudioPublishPanel.tsx`
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/src/screens/studio/verification/studioFraudEngine.ts`
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/src/screens/studio/verification/studioTrustImpact.ts`
- `MASTER_BRAIN/CREATOR_ECONOMY/`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 8 |
| Patentability | 9 |
| Business Value | 8 |
