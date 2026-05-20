# Eye-tracking source-runtime candidates — copy manifest

**Copy date:** 2026-05-20  
**Operator:** Eye-tracking runtime recovery scan (automated)  
**Rules:** No deletes, no moves of originals, no overwrites of prior `integrations/eye-tracking/` imports.

## Provenance roots

| Prefix | Original absolute path |
|--------|------------------------|
| `from-Desktop-IVAULT-DEMOS-REPOS-eye_tracking_app/` | `/Users/2023macbookpro/Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app` |
| `from-Desktop-iTrack/` | `/Users/2023macbookpro/Desktop/iTrack` (ML assets + delta Dart files) |
| `from-Desktop-IVAULT-DEMOS-REPOS-eye-earn-sparkle-demo-attention_mediapipe/` | `/Users/2023macbookpro/Desktop/IVAULT/DEMOS:REPOS/eye-earn-sparkle-demo/attention_mediapipe` |
| `from-home-eye_tracking_app/` | `/Users/2023macbookpro/eye_tracking_app` (current home repo — intent OS only) |

Relative paths under each prefix mirror the original project layout (e.g. `lib/main.dart`, `android/app/src/main/java/.../VisionProcessor.kt`).

**Excluded from copy:** `node_modules`, `build`, `dist`, `.git`, caches, `DerivedData`, `.dart_tool`, `.gradle`, `.next`.

**Full file list:** see [`docs/technical/EYE_TRACKING_RUNTIME_RECOVERY_REPORT.md`](../../../docs/technical/EYE_TRACKING_RUNTIME_RECOVERY_REPORT.md).
