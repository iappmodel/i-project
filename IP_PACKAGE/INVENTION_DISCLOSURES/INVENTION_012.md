# INVENTION_012 — Autonomous Execution Kernel with Ordered Gate Chain

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Intent OS
**Date:** 2026-06-15

## Problem Solved

Gaze-driven and intent-based interfaces must execute actions autonomously based on biometric signals (eye fixation, blink, dwell), but doing so without safety controls creates catastrophic risk—unintended purchases, data deletion, or OS-level actions triggered by involuntary eye movements. Existing accessibility systems either require explicit manual confirmation for every action (destroying the hands-free benefit) or lack the layered safety architecture needed for autonomous execution of consequential actions.

## Current Industry Approach

iOS Switch Control and Android Accessibility Services use simple dwell-to-tap with a single timeout threshold and no risk-tiered gating. Eye-tracking systems like Tobii Dynavox use dwell + confirmation dialogs for all actions equally. No existing system implements an ordered gate chain where multiple independent safety kernels evaluate an action in sequence, with early exit at any gate, and where the gate ordering itself is a deliberate safety architecture (emergency kill → prefilter → external/OS policy → high-risk lane → governance → safety → execute).

## How [ i ] Solves It

The [ i ] Autonomous Execution Kernel implements a strict ordered gate chain that evaluates every proposed action through six sequential safety gates before permitting execution. The gates are ordered from cheapest/most-critical to most-nuanced: (1) Emergency Kill Switch—a boolean that instantly blocks all execution; (2) Prefilter—the ActionPipelineKernel's fast system-level safety check; (3) External/OS Control Policy—blocks any action that would escape the app sandbox unless explicitly enabled and confirmed; (4) High-Risk Action Lane—blocks gaze-only execution of financial, destructive, or OS-level actions; (5) Governance Kernel—enforces confidence minimums, risk ceilings, fixation/dwell requirements, rate limits, and reversibility; (6) Safety Kernel—final twin-risk envelope, anomaly detection, and burst detection. Only if all six gates pass does the `execute()` callback fire. Every evaluation is audit-logged with action type, confidence, result, and blocking gate.

## System Description

The `AutonomousExecutionKernel` is a final (non-extensible) class that composes four sub-kernels: `ActionPipelineKernel` (prefilter), `GovernanceKernel`, `SafetyKernel`, and `HighRiskActionLane`. It also references the `ExternalOsControlPolicy` module. The `tryExecute()` method accepts a `KernelEvaluationInput` (for prefilter), an `ActionContext` (carrying confidence, risk score, fixation state, dwell progress, timing, reversibility, gaze-only flag, and explicit confirmation status), and an `execute` callback. It evaluates gates in strict order, returning a typed `AutonomousActionGateResult` enum indicating either `allowed` or the specific blocking gate. An `auditSink` function hook captures every decision for telemetry or testing. The `emergencyKillSwitch` boolean can be flipped at runtime to instantly disable all autonomous execution system-wide. The kernel is deterministic—same inputs always produce same gate result—enabling replay-based testing and forensic audit.

## Technical Components

- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/autonomous_execution_kernel.dart` — orchestrator
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/action_pipeline_kernel.dart` — prefilter gate
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/governance_kernel.dart` — governance gate
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/safety_kernel.dart` — safety final gate
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/high_risk_action_lane.dart` — high-risk lane
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/external_os_control_policy.dart` — OS escape policy
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/action_context.dart` — action metadata
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/kernel_evaluation_input.dart` — prefilter input
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/action_decision.dart` — allow/deny enum
- `AutonomousActionGateResult` enum — 7 possible outcomes with specific blocking gate identification
- Audit sink pattern — pluggable telemetry/test hook
- `pop_action_executor.dart` — unified commit path for approved actions

## Data Flow

1. Intent engine resolves a proposed action (type, confidence, context)
2. `ActionContext` constructed with confidence, risk score, fixation state, dwell progress, timing, reversibility
3. `KernelEvaluationInput` constructed for prefilter evaluation
4. `tryExecute()` called on `AutonomousExecutionKernel`
5. Gate 1: Emergency kill switch checked (boolean)
6. Gate 2: `ActionPipelineKernel.evaluateSafety()` prefilter evaluated
7. Gate 3: `evaluateExternalOsControl()` checks if action escapes app sandbox
8. Gate 4: `HighRiskActionLane.blocks()` checks gaze-only restrictions
9. Gate 5: `GovernanceKernel.approve()` checks confidence, risk, fixation, rate, reversibility
10. Gate 6: `SafetyKernel.finalGate()` checks twin risk envelope, anomaly, burst
11. If all pass: `execute()` callback fires; `AutonomousActionGateResult.allowed` returned
12. If any blocks: specific gate result returned; action NOT executed
13. Audit sink receives (actionType, confidence, result, blockedGate) regardless of outcome

## User Flow

The user gazes at a UI element. The intent engine detects fixation + dwell and proposes an action. The execution kernel evaluates the action through all gates in <1ms. If approved, the action executes immediately—the user perceives instant hands-free control. If blocked, the system either silently ignores (for low-risk exploratory gaze) or provides feedback indicating why the action was not executed (for high-confidence attempts blocked by governance). For high-risk actions, the user is prompted for explicit confirmation (touch, voice, or multi-gesture).

## Economic Flow

1. Autonomous execution enables the Watch → Verify → Reward loop without manual interaction
2. Safety gates prevent accidental spending of earned tokens (financial actions blocked from gaze-only)
3. Rate limiting (>600ms between actions) prevents rapid-fire token manipulation
4. Risk-tiered governance ensures only low-risk reversible actions execute autonomously
5. Emergency kill switch protects user funds if account compromise is detected
6. Audit trail enables dispute resolution for contested transactions

## Fraud Prevention

- Emergency kill switch provides instant system-wide halt capability
- Gaze-only paths NEVER trigger financial, OS-level, or irreversible actions
- Confidence minimum (>0.85) prevents low-quality signal exploitation
- Risk ceiling enforcement (tiered by action severity) blocks high-risk actions at lower thresholds
- Rate limiting (>600ms) prevents automated burst attacks
- Fixation + dwell requirement ensures human-speed interaction patterns
- Reversibility check blocks irreversible actions from autonomous path entirely
- Twin risk envelope (<0.5) uses digital twin simulation to detect anomalous patterns
- Anomaly detection flags impossible combinations (low confidence + high dwell)
- Burst detection blocks >3 actions per second
- External/OS control disabled by default in production
- Full audit trail with gate-level granularity enables forensic investigation

## Unique Elements

1. Strictly ordered gate chain architecture where six independent safety modules evaluate sequentially with early exit, and the ordering itself encodes a security priority hierarchy
2. Emergency kill switch as a zero-cost first gate that can instantly disable all autonomous execution without evaluating any downstream logic
3. Separation of External/OS Control Policy as a dedicated gate preventing app-escape actions from biometric triggers regardless of confidence
4. High-Risk Action Lane that categorically blocks gaze-only execution of financial and destructive actions, requiring multimodal confirmation
5. Governance Kernel combining five independent checks (confidence, risk ceiling, fixation/dwell, rate limit, reversibility) as a single atomic gate
6. Typed gate-result enum enabling precise identification of which specific safety layer blocked an action for audit and user feedback
7. Deterministic evaluation with pluggable audit sink enabling both production telemetry and replay-based testing from the same code path

## Potential Patent Claims

1. A method for autonomous action execution in a gaze-driven interface comprising: receiving a proposed action with associated confidence, risk score, and biometric context; evaluating the action through a strictly-ordered chain of independent safety gates; returning a typed result identifying the specific blocking gate if any gate rejects; and executing the action only if all gates in the ordered chain approve.

2. A system for safe autonomous execution of user interface actions from biometric signals comprising: an emergency kill switch gate; a prefilter gate evaluating system-level safety; an external/OS control policy gate preventing app-escape actions; a high-risk action lane blocking gaze-only execution of financial actions; a governance kernel enforcing confidence, risk, fixation, rate, and reversibility requirements; and a safety kernel performing final twin-risk envelope and anomaly checks; wherein gates are evaluated in a fixed order and execution requires unanimous approval.

3. A computer-implemented method for preventing unintended autonomous actions in an eye-tracking interface comprising: maintaining a kill switch boolean checked before any gate evaluation; categorically blocking actions that would escape the application sandbox from biometric-only triggers; requiring multimodal confirmation for actions classified as high-risk; enforcing a minimum inter-action interval to prevent burst attacks; and logging every gate evaluation with action type, confidence, result, and blocking gate for forensic audit.

4. An ordered gate chain architecture for autonomous interface control comprising: a plurality of independent safety evaluation modules arranged in a fixed sequence from lowest-cost to most-nuanced; a typed enumeration of possible blocking outcomes corresponding to each gate; a unified execution entry point that short-circuits on first rejection; and a deterministic evaluation guarantee enabling replay-based verification.

## Potential Competitors

- Apple iOS Switch Control — single dwell timer, no gate chain
- Android Accessibility Services — simple action dispatch without safety kernels
- Tobii Dynavox — confirmation dialogs, not autonomous gated execution
- Google Project Gameface — cursor control without autonomous action execution
- Nuance Dragon NaturallySpeaking — voice-only, no gaze+safety architecture
- Eyeware Beam — gaze tracking only, no action execution framework
- Irisbond — eye-tracking accessibility, simple trigger without layered safety

## Related Files

- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/autonomous_execution_kernel.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/action_pipeline_kernel.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/governance_kernel.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/safety_kernel.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/high_risk_action_lane.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/external_os_control_policy.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/action_context.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/kernel_evaluation_input.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/pop/pop_action_executor.dart`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 10 |
| Patentability | 9 |
| Business Value | 9 |
