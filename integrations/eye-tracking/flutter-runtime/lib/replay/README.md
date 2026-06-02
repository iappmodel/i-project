# POP replay harness (Stage 1)

Deterministic headless replay of the POP control path:

`PopReplayFrame` → `GazePipeline` → zone → dwell → `PopActionExecutor`

## Usage

```dart
final result = PopReplayDriver(
  config: PopReplayConfig(measuredLeft: -0.4, measuredRight: 0.4),
).run(frames);

print(result.digest()); // golden milestone lines
```

Fixture builders live in `test/fixtures/pop_replay_fixtures.dart`.
Regression tests: `test/pop_replay_harness_test.dart`.

Update golden expectations intentionally when changing pipeline, dwell, or safety gates.
