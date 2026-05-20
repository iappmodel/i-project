---
title: Kernel — ActionPipelineKernel
tags: [eye-tracking, kernel, safety]
created: 2026-04-17
code: lib/core/intent_os/action_pipeline_kernel.dart
---

# Kernel — `ActionPipelineKernel`

## Responsibility

**Layer 1 safety (prefilter):** system gates + **confidence floor**. No simulation / fixation logic here.

## API

- **`evaluateSafety(KernelEvaluationInput input) → ActionDecision`**
  - If `decideAutonomousAction(input.system) == deny` → **deny**
  - Else `autonomy = input.autonomyLevel.clamped(0, 1)`
  - **`effectiveThreshold = 0.85 * (0.5 + 0.5 * autonomy)`**
  - If `input.confidence < effectiveThreshold` → **deny**
  - Else **allow**

## Position in chain

Invoked from [[kernel-autonomous-execution]] as **step 2** (after emergency kill switch), labeled prefilter gate `ActionPipelineKernel`.

## Related

- Orchestration: [[kernel-autonomous-execution]]
- Next gate: [[kernel-governance]]
- Types: `KernelEvaluationInput`, `ActionDecision`, `decideAutonomousAction` (`action_decision.dart`)
- Dashboard: [[00-MOC-eye-tracking-app]]

## Brainstorm

- [[tiered autonomy by surface]] — is 0.85 the right base for all action types?
- [[confidence calibration]] — map model output to user-trusted scale
