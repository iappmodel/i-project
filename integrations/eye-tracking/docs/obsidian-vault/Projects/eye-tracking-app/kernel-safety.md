---
title: Kernel — SafetyKernel
tags: [eye-tracking, kernel, safety]
created: 2026-04-17
code: lib/core/intent_os/safety_kernel.dart
---

# Kernel — `SafetyKernel`

## Responsibility

**Layer 1 safety facade** over [[kernel-action-pipeline]] plus **post-governance checks** on `ActionContext` before `execute`.

## API (`safety_kernel.dart`)

- **`validate(KernelEvaluationInput action) → bool`** — `true` when `ActionPipelineKernel.evaluateSafety(action) == allow` (same confidence / system gates as prefilter).
- **`finalGate(ActionContext ctx) → bool`** — all must pass:
  - **`_sanityChecks`** — `confidence`, `riskScore`, `userTrust` finite
  - **`_twinRiskEnvelope`** — `ctx.riskScore < 0.5` (UISandbox twin ceiling)
  - **`_anomalyCheck`** — reject `confidence < 0.3 && dwellProgress > 0.9`
  - **`_burstDetection`** — `recentActionsLast1s < 3`

## Note

Autonomous flow calls **`pipeline.evaluateSafety`** first, then governance, then **`safety.finalGate(ctx)`** — so prefilter and `validate()` overlap conceptually; **`finalGate`** is the rich context gate.

## Position in chain

Last kernel **before** the `execute` callback inside [[kernel-autonomous-execution]] (after [[kernel-governance]]).

## Related

- Orchestration: [[kernel-autonomous-execution]]
- Upstream: [[kernel-governance]]
- Complement: `ActionExecutor` / `decideAction` / `shouldConfirm` in `action_decision.dart` for high-risk + low-confidence **confirmation** UX
- Tests: `test/safety_kernel_test.dart`, `test/bypass_paths_test.dart`
- Dashboard: [[00-MOC-eye-tracking-app]]

## Brainstorm

- [[human-in-the-loop defaults]]
- [[safety UX when blocked]] — silent vs explainable denial
