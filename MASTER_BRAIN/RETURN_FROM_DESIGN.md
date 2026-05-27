# Return From Design — fast re-entry

**Updated:** 2026-05-27  
**Latest completed phases:** 11–17

## What changed while you were away
- Coin display naming normalized to `Icoin` style in user-facing app flows.
- Stripe local signed webhook smoke is now executable and passing.
- Capacitor prep now includes optional native checks and safer iOS behavior.
- Web vision flag scaffold (`VITE_VISION_ENGINE`) added with default-off behavior.
- Loop 2 save/return scaffold added (`saved` screen + localStorage).
- POP validator can now be packaged and smoke-tested via Docker.
- CI now builds and uploads production artifacts.

## First commands to run
```bash
cd ~/Desktop/IVAULT/i-project-rescue/i_project_migration_archive
./scripts/smoke_production_readiness.sh
./scripts/smoke_validator_docker.sh
./scripts/smoke_stripe_webhook.sh
```

## If a device is attached
```bash
./scripts/run_android_device_test.sh
./scripts/smoke_android_seal_postcheck.sh
```

## Remaining owner-gated items
- Vercel/Render production deployment credentials + domain/TLS
- Store signing and upload flow
- Optional investor MP4/Tobii policy changes
