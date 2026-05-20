---
title: Kernel — GovernanceKernel
tags: [eye-tracking, kernel, governance]
created: 2026-04-17
code: lib/core/intent_os/governance_kernel.dart
---

# Kernel — `GovernanceKernel`

## Responsibility

**Policy / governance** approval after the pipeline prefilter passes: caps, approvals, and rules that sit between raw safety thresholds and the final safety gate.

## API

- **`approve(ActionContext ctx) → bool`** — used in `AutonomousExecutionKernel.tryExecute` as `if (!governance.approve(ctx))` → `blockedGovernance`. See `lib/core/intent_os/governance_kernel.dart` in the repo for rules.

## Position in chain

Invoked from [[kernel-autonomous-execution]] **after** [[kernel-action-pipeline]] and **before** [[kernel-safety]].

## Related

- Previous: [[kernel-action-pipeline]]
- Next: [[kernel-safety]]
- Tests: `test/governance_kernel_test.dart`
- Dashboard: [[00-MOC-eye-tracking-app]]

## Brainstorm

- [[policy as data]] — YAML vs code for non-engineers?
- [[multi-tenant governance]] — if profiles differ by user type
