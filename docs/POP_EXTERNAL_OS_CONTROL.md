# POP external / OS control (v2 hard gate)

Production POP sensing runs **in-app zone control only**. Actions that can leave the app (AccessibilityService, deep links, payments) are blocked unless explicitly enabled and confirmed.

## Product flag

| Flag | Default | Override |
|------|---------|----------|
| `kEnableExternalOsControl` | `false` | `--dart-define=POP_ENABLE_EXTERNAL_OS_CONTROL=true` (QA only) |

Defined in `integrations/eye-tracking/flutter-runtime/lib/core/pop/pop_runtime_config.dart`.

## Blocked logical actions (when flag off)

`open_external`, `launch_app`, `open_url`, `accessibility_*`, `send_money`, `withdraw`, `purchase`, `convert`, `tip`, `publish` — see `kExternalOsCapableActionNames` in `external_os_control_policy.dart`.

## Gate order

`AutonomousExecutionKernel.tryExecute`:

1. Emergency kill switch  
2. Prefilter  
3. **External/OS policy** → `blockedExternalOs`  
4. High-risk lane (gaze-only, financial-grade UI)  
5. Governance → Safety → execute  

Even with the flag **on**:

- Gaze-only paths **never** run external/OS actions.  
- Touch / agent paths require `explicitConfirmationGranted`.

## API

- `PopActionExecutor.tryLogicalAction` — agent JSON path with `logicalActionName`  
- `ActionContext.logicalActionName` — optional agent action id  

## Tests

```bash
cd integrations/eye-tracking/flutter-runtime
flutter test test/external_os_control_policy_test.dart
```

## Play / policy

Do not ship `POP_ENABLE_EXTERNAL_OS_CONTROL=true` to production without Accessibility + payments policy review (`docs/POP_ANDROID_MVP_RELEASE.md`).
