# Flutter runtime promotion manifest

**Promotion date:** 2026-05-20  
**Operator:** Archive promotion (copy-only; no logic merge)

## Source

| Field | Value |
|-------|--------|
| **Candidate used** | `source-runtime-candidates/from-Desktop-IVAULT-DEMOS-REPOS-eye_tracking_app/` |
| **Original path** | `/Users/2023macbookpro/Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app` |
| **Method** | `rsync -a` (byte-preserving copy) |
| **Files copied** | 199 |

## Reversibility

To remove this promotion without touching recovery candidates:

```bash
rm -rf integrations/eye-tracking/flutter-runtime
```

Recovery originals remain under `integrations/eye-tracking/source-runtime-candidates/` unchanged.

## Deliberately not copied into this folder

- `from-Desktop-iTrack/` deltas (see `DELTA_NOTES.md`)
- `from-Desktop-IVAULT-DEMOS-REPOS-eye-earn-sparkle-demo-attention_mediapipe/` plugin tree
- `from-home-eye_tracking_app/` partial intent OS (subset already in base)

## Related docs

- [`README.md`](README.md) — runtime overview
- [`DELTA_NOTES.md`](DELTA_NOTES.md) — alternate candidates
- [`../../../docs/technical/FLUTTER_RUNTIME_PROMOTION_REPORT.md`](../../../docs/technical/FLUTTER_RUNTIME_PROMOTION_REPORT.md) — full report
