---
title: Kernel — AutonomousExecutionKernel
tags: [eye-tracking, kernel, orchestration]
created: 2026-04-17
code: lib/core/intent_os/autonomous_execution_kernel.dart
---

# Kernel — `AutonomousExecutionKernel`

## Responsibility

**Single runtime entry** for autonomous side effects: ordered gates, optional audit sink, emergency stop.

## Gate order (`tryExecute`)

1. **`emergencyKillSwitch`** → `blockedEmergencyKillSwitch` (no `execute`)
2. **[[kernel-action-pipeline]]** — `evaluateSafety(prefilterInput)` → `blockedPrefilter` if deny
3. **[[kernel-governance]]** — `approve` → `blockedGovernance` if not approved
4. **[[kernel-safety]]** — `finalGate` → `blockedSafety` if deny
5. **`execute()`** callback — actual UI / zone / tap / highlight / preload

## Types

- **`AutonomousActionGateResult`** — `allowed`, `blockedEmergencyKillSwitch`, `blockedPrefilter`, `blockedGovernance`, `blockedSafety`, `blockedSandbox` (reserved / twin risk on context per code comments)
- **`KernelEvaluationInput`** — prefilter payload
- **`ActionContext`** — action type, confidence, etc.
- **`auditSink`** — optional telemetry; default `debugPrint` audit lines

## Related

- Input path: [[gaze-dart-pipeline]] → [[intent-os-overview]]
- Constituent kernels: [[kernel-action-pipeline]], [[kernel-governance]], [[kernel-safety]]
- Tests: `test/autonomous_execution_kernel_test.dart`
- Dashboard: [[00-MOC-eye-tracking-app]]

## Brainstorm

- [[audit log productization]]
- [[kill switch UX]] — hardware gesture? settings-only?
