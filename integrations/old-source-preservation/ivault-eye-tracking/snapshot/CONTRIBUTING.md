# Contributing

## Before you change code

1. Read **[`AGENTS.md`](AGENTS.md)** — vision contracts, fixation rules, UI threading, and **autonomous agent approval gates**.
2. Run:

   ```bash
   flutter pub get
   flutter analyze
   flutter test
   ```

## Pull requests

- Keep behavior changes and mechanical refactors in **separate** commits when possible.
- If you touch **native Kotlin**, **kernel thresholds**, or **PII/storage**, ensure the PR description states that and that a human explicitly approved (see `AGENTS.md` → *Autonomous agent approval gates*).

## Splitting `lib/main.dart`

Follow the phased plan in **[`docs/main_dart_refactor_plan.md`](docs/main_dart_refactor_plan.md)** so refactors stay reviewable.

## macOS notifications (optional)

- **Cursor** chat completion alerts: System Settings → Notifications → Cursor.
- **Local script** after commands: [`scripts/notify_macos.sh`](scripts/notify_macos.sh).
