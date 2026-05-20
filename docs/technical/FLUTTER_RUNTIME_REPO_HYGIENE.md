# Flutter runtime repository hygiene

**Date:** 2026-05-20  
**Scope:** `integrations/eye-tracking/flutter-runtime/`

---

## Why generated artifacts were removed

The promoted eye-tracking Flutter runtime was copied from a working developer machine after `flutter pub get` and `flutter test` had already run locally. That workflow produced **cache and build outputs** that should never live in git:

| Path | Role |
|------|------|
| `.dart_tool/` | Package graph, plugin registrant, SDK metadata from `flutter pub get` |
| `build/` | Unit-test asset bundles, compiled test cache, native asset stubs from `flutter test` |
| `.flutter-plugins-dependencies` | Plugin lockfile emitted by the Flutter tool |

These paths are **machine- and SDK-specific**, change on every toolchain upgrade, and inflate diffs without carrying product source. They were accidentally included in the promotion commit; this cleanup removes them from version control and adds a local `.gitignore` so they are not re-committed.

**Source-runtime-candidates** under `integrations/eye-tracking/source-runtime-candidates/` were not modified.

---

## What remains tracked

The runtime in git is **source and project configuration only**, including:

| Category | Examples |
|----------|----------|
| Dart application | `lib/`, `core/`, `test/` |
| Android project | `android/` (Gradle, Kotlin, manifests, launcher assets) |
| ML assets | `android/app/src/main/assets/face_landmarker.task`, `selfie_segmenter.tflite` |
| Package manifest | `pubspec.yaml`, **`pubspec.lock`** (app lockfile; kept tracked) |
| Promotion docs | `README.md`, `DELTA_NOTES.md`, `PROMOTION_MANIFEST.md` |

**Not tracked after hygiene:** `.dart_tool/`, `build/`, `.flutter-plugins`, `.flutter-plugins-dependencies`, `.packages`, `android/.gradle/`, and standard iOS/macOS ephemeral paths (listed in `flutter-runtime/.gitignore`).

---

## How to regenerate artifacts locally

From the repository root:

```bash
cd integrations/eye-tracking/flutter-runtime
flutter pub get    # recreates .dart_tool/, .flutter-plugins*, plugin registrant inputs
flutter test       # recreates build/ test caches and unit_test_assets as needed
```

For Android device smoke:

```bash
flutter devices
flutter run -d <device_id>
```

Regenerated files stay on disk only; git ignores them via `integrations/eye-tracking/flutter-runtime/.gitignore`.

---

## Verification before cleanup

After promotion, **`flutter test` reported 185 passing tests** on the host that validated the copy. This hygiene pass does **not** re-run tests; it only untracks generated directories. Re-run `flutter pub get` and `flutter test` after clone or SDK upgrade to confirm the tree on your machine.

See also: [`FLUTTER_RUNTIME_PROMOTION_REPORT.md`](FLUTTER_RUNTIME_PROMOTION_REPORT.md), [`integrations/eye-tracking/flutter-runtime/README.md`](../../integrations/eye-tracking/flutter-runtime/README.md).
