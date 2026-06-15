# INVENTION_013 — Governance Kernel Safety Stack

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Intent OS
**Date:** 2026-06-15

## Problem Solved

Autonomous gaze-driven systems face a fundamental tension: they must be responsive enough for fluid hands-free control yet safe enough to prevent catastrophic unintended actions from involuntary eye movements, blinks, or momentary gaze drift. No single safety check can balance responsiveness against all threat vectors. A multi-layered safety stack with independent, composable kernels is needed where each layer addresses a distinct threat class, and the system categorically prevents financial/OS actions from gaze-only signals regardless of other factors.

## Current Industry Approach

Existing accessibility eye-tracking systems (Tobii, EyeTech, Irisbond) use a flat architecture: dwell timer → action. Some add a single confirmation dialog for "important" actions. None implement separate composable governance, safety, and high-risk kernels with independent evaluation criteria. Financial interfaces (banking apps) rely on touch/PIN confirmation but have no concept of gaze-triggered action governance. No system combines confidence thresholds, risk tiering, fixation state requirements, rate limiting, reversibility checking, twin-risk simulation, anomaly detection, and categorical gaze-only blocking in a unified but decomposed safety stack.

## How [ i ] Solves It

The [ i ] Governance Kernel Safety Stack comprises four independent, composable safety modules: (1) **GovernanceKernel** enforcing five independent checks—intent confidence >0.85 (configurable), risk ceilings tiered by action severity (0.35 low, 0.28 medium, 0.25 high), fixation state requirement, dwell progress >80%, rate limit >600ms, and reversibility requirement; (2) **SafetyKernel** performing final validation via twin-risk envelope (<0.5), sanity checks (all values finite), anomaly detection (impossible confidence+dwell combinations), and burst detection (<3 actions/second); (3) **HighRiskActionLane** categorically blocking gaze-only execution of financial/OS/destructive actions, requiring fresh gaze and explicit confirmation for high-risk types; (4) **ExternalOsControlPolicy** preventing any action that would escape the application sandbox unless the feature flag is enabled AND the action is not gaze-only AND explicit confirmation is granted. Critically, gaze-only paths can NEVER trigger financial or OS actions regardless of confidence.

## System Description

The **GovernanceKernel** is a `final class` with a single `approve(ActionContext)` method that evaluates five sub-checks in sequence: `_intentValid` compares `ctx.confidence` against `ctx.governanceMinConfidence` (defaults to 0.85); `_riskValid` computes an effective risk score using `effectiveActionRisk()` and compares against a tiered ceiling based on `getRisk(actionType)` returning Low (0.35), Medium (0.28), or High (0.25); `_userStateValid` requires fixation state and dwell progress >0.8; `_rateLimitValid` requires >600ms since last action; `_reversibilityValid` requires the action to be reversible. The **SafetyKernel** is a `final class` wrapping `ActionPipelineKernel` with a `finalGate(ActionContext)` method performing four checks: `_sanityChecks` (all numeric values finite), `_twinRiskEnvelope` (risk score <0.5), `_anomalyCheck` (reject if confidence <0.3 with dwell >0.9—an impossible natural combination), and `_burstDetection` (reject if >3 actions in last 1 second). The **HighRiskActionLane** `blocks(ActionContext)` returns true for gaze-only actions that are: not fresh for commit, require explicit confirmation, are in a legacy blocked-types list (scroll, longPress, closeZone), are high-risk tier without explicit confirmation, or trigger external/OS control. The **ExternalOsControlPolicy** enumerates specific logical action names (open_external, launch_app, send_money, withdraw, purchase, etc.) and evaluates a three-condition gate: feature flag enabled, not from gaze-only, and explicit confirmation granted.

## Technical Components

- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/governance_kernel.dart` — 5-check governance
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/safety_kernel.dart` — final safety gate
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/high_risk_action_lane.dart` — gaze-only blocking
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/external_os_control_policy.dart` — OS escape prevention
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/action_risk_policy.dart` — risk tier classification
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/risk_tier.dart` — Low/Medium/High enum
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/action_context.dart` — full action metadata
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/ui_action_type.dart` — action type enum
- `FixationState` enum from gaze_fixation.dart — fixation/saccade/smooth pursuit
- `effectiveActionRisk()` — combines action type risk with twin risk score
- `kExternalOsCapableActionNames` — enumerated list of sandbox-escaping actions
- `kEnableExternalOsControl` — production feature flag (default: off)

## Data Flow

1. Intent engine produces `ActionContext` with: confidence, riskScore, fixationState, dwellProgress, timeSinceLastActionMs, isReversible, fromGazeOnly, explicitConfirmationGranted, actionType, logicalActionName
2. **HighRiskActionLane** evaluates gaze-only constraints and explicit confirmation requirements
3. **ExternalOsControlPolicy** checks if action name is in the OS-capable set and evaluates three-condition gate
4. **GovernanceKernel** evaluates in order: confidence vs. threshold → risk vs. tiered ceiling → fixation+dwell → rate limit → reversibility
5. **SafetyKernel** performs final checks: sanity (finite values) → twin risk envelope → anomaly detection → burst detection
6. Each kernel returns a boolean; the execution kernel maps failures to specific gate identifiers
7. All decisions are audit-logged regardless of outcome

## User Flow

For routine low-risk actions (tapping a UI element in-app), the user gazes and dwells—all gates pass in <1ms and the action executes instantly. For medium-risk actions (closing a zone, scrolling), the system requires confirmed intent beyond simple gaze. For high-risk actions (sending money, purchasing), the system categorically requires explicit multimodal confirmation (touch + gaze, or voice + gaze) regardless of confidence level. The user perceives: easy stuff works effortlessly, important stuff requires deliberate confirmation, and dangerous stuff is impossible to trigger accidentally.

## Economic Flow

1. Low-risk reward collection (claiming earned aCOIN) flows through governance at reduced thresholds
2. Medium-risk marketplace browsing is gated by standard governance (>0.85 confidence)
3. High-risk financial actions (spend, convert, withdraw) are categorically blocked from autonomous gaze-only execution
4. Rate limiting prevents rapid-fire micro-transactions that could drain wallets
5. Reversibility requirement ensures autonomous actions can be undone if errors occur
6. Twin risk score feeds from digital twin simulation, adding behavioral context to every decision

## Fraud Prevention

- Categorical ban on gaze-only financial/OS actions eliminates the primary attack vector
- Confidence floor (>0.85) rejects low-quality or synthetic signals
- Risk ceiling tiering means higher-severity actions face stricter risk budgets
- Fixation + dwell requirement ensures human-speed deliberate focus
- Rate limit (>600ms) prevents scripted burst attacks
- Reversibility requirement limits blast radius of any single error
- Twin risk envelope (<0.5) uses behavioral modeling to detect anomalous patterns
- Anomaly detection catches impossible signal combinations (low confidence + high dwell = synthetic)
- Burst detection (< 3/second) catches automated attack tools
- Sanity checks (finite values) prevent NaN/infinity injection attacks
- External OS control disabled by default in production
- Explicit confirmation required for all sandbox-escaping actions even when flag is enabled
- Enumerated action name list prevents novel action types from bypassing OS policy

## Unique Elements

1. Five independent governance sub-checks (confidence, risk ceiling, fixation/dwell, rate limit, reversibility) composed as an atomic gate that requires ALL to pass
2. Tiered risk ceilings (0.35/0.28/0.25) that become stricter as action severity increases, rather than a single threshold
3. Categorical prohibition of gaze-only execution for financial and OS-level actions, enforced independently of confidence level
4. Twin-risk envelope as a safety check that uses digital twin behavioral simulation to bound acceptable risk
5. Anomaly detection heuristic that identifies impossible natural combinations (low confidence + high dwell) as indicators of synthetic attack
6. Three-layer external/OS control gate: feature flag AND not-gaze-only AND explicit confirmation, all required
7. Composable kernel architecture where each safety module (Governance, Safety, HighRisk, External) can be independently tested, replaced, or tightened without affecting others
8. Rate limit of >600ms specifically calibrated to human saccade + fixation + decision timing

## Potential Patent Claims

1. A governance system for autonomous gaze-driven interfaces comprising: a confidence threshold gate comparing measured intent confidence against a configurable minimum; a tiered risk ceiling gate applying stricter risk budgets to higher-severity action categories; a user state gate requiring both fixation and minimum dwell progress; a rate limit gate enforcing minimum inter-action intervals; and a reversibility gate permitting only undoable actions on the autonomous path.

2. A method for preventing unintended financial actions in an eye-tracking interface comprising: categorically blocking all actions classified as financial or operating-system-level from execution paths where the triggering signal originates from gaze-only biometric input; requiring multimodal explicit confirmation for said actions regardless of gaze confidence level; and maintaining an enumerated list of action names that constitute sandbox-escaping operations.

3. A safety kernel for autonomous interface control comprising: a twin-risk envelope check comparing a digital twin behavioral risk score against a fixed ceiling; an anomaly detection heuristic that rejects actions exhibiting impossible natural signal combinations; a burst detection check limiting maximum actions per time window; and sanity validation ensuring all numeric inputs are finite and within expected ranges.

4. A composable safety stack for gaze-driven autonomous execution comprising: a plurality of independent safety kernel modules each evaluating a distinct threat class; an ordered evaluation sequence from most-critical to most-nuanced; a categorical prohibition layer that blocks gaze-only execution of enumerated high-consequence action types; and an audit mechanism recording the specific blocking kernel for every rejected action.

5. A method for calibrating safety thresholds in an autonomous gaze interface comprising: assigning each action type to a risk tier; computing an effective risk score combining the action's inherent tier with a real-time behavioral twin risk assessment; comparing the effective risk against a tier-specific ceiling; and requiring that the gaze fixation state has been maintained with dwell progress exceeding 80% and at least 600 milliseconds have elapsed since the previous autonomous action.

## Potential Competitors

- Tobii Dynavox — flat dwell+confirm, no layered governance
- Apple AssistiveTouch/Switch Control — simple trigger without safety stack
- Google Project Gameface — cursor control without action governance
- Microsoft Eye Control — basic dwell, no risk tiering
- EyeTech Digital Systems — dwell + button grid, no safety kernels
- Nuance/Microsoft Copilot — AI action execution without biometric safety gates
- Banking apps (various) — PIN/biometric auth but no gaze-governance integration

## Related Files

- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/governance_kernel.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/safety_kernel.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/high_risk_action_lane.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/external_os_control_policy.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/action_risk_policy.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/risk_tier.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/action_context.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/ui_action_type.dart`
- `integrations/eye-tracking/flutter-runtime/lib/gaze_fixation.dart`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 10 |
| Patentability | 9 |
| Business Value | 9 |
