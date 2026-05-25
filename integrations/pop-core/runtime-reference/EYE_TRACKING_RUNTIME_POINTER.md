# Eye-tracking runtime reference

**Authority:** `integrations/eye-tracking/flutter-runtime/` (package `eye_tracking_app`)

PR1 adds proof emission under `lib/proof/`:

- `proof_session_context.dart`
- `proof_session_collector.dart`
- `proof_packet_builder.dart`
- `proof_packet_emitter.dart`

Signal generation (camera, VSL, gaze) remains in the promoted runtime — not bulk-merged from preservation snapshot.
