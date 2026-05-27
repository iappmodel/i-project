# Android Seal Proof — device runbook

**Goal:** Flutter runtime seals Proof Packet v0 and POSTs to POP validator.

**Verified:** 2026-05-27 on Samsung SM A146U (USB + adb reverse).

---

## Prerequisites

1. Host running validator: `./scripts/dev_stack.sh` (or validator only on `:8787`)
2. Android device or emulator with USB debugging
3. Flutter SDK installed

---

## One-shot (physical USB device)

```bash
./scripts/run_android_device_test.sh
```

Auto-configures `adb reverse` for ports 8787 and 5173 — no WiFi/firewall setup needed.

---

## Emulator (AVD)

Host `localhost:8787` is reachable from Android emulator as **`10.0.2.2:8787`**.

```bash
./scripts/run_android_dev_loop.sh   # prints URLs for detected device
```

Or manually:

```bash
cd integrations/eye-tracking/flutter-runtime
flutter run \
  --dart-define=POP_VALIDATOR_URL=http://10.0.2.2:8787 \
  --dart-define=WALLET_APP_URL=http://10.0.2.2:5173
```

---

## Physical device (USB — recommended)

`adb reverse` maps device `127.0.0.1:8787` → Mac `:8787` (same for `:5173`).

```bash
adb reverse tcp:8787 tcp:8787
adb reverse tcp:5173 tcp:5173
cd integrations/eye-tracking/flutter-runtime
flutter run \
  --dart-define=POP_VALIDATOR_URL=http://127.0.0.1:8787 \
  --dart-define=WALLET_APP_URL=http://127.0.0.1:5173
```

Or use `./scripts/android_device_urls.sh` to print resolved URLs.

---

## Physical device (WiFi fallback)

Use your Mac's LAN IP if USB reverse is unavailable:

```bash
IP=$(ipconfig getifaddr en0)
flutter run \
  --dart-define=POP_VALIDATOR_URL=http://$IP:8787 \
  --dart-define=WALLET_APP_URL=http://$IP:5173
```

Requires Vite `host: true` in `app/vite.config.ts` and Mac firewall allowing inbound `:8787` / `:5173`.

---

## Test flow

1. Start a proof session (watch / tracking active)
2. Tap **Seal Proof** in debug UI
3. Watch logcat:

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
adb logcat -s flutter | grep -E 'PROOF_SEAL|PROOF_VALIDAT|WALLET_DEEP_LINK'
```

Expected sequence:

```
PROOF_SEAL_TAP
PROOF_SEALED: PP-LIVE-… session=…
PROOF_VALIDATED: session=… review=approved hold=… (created)
WALLET_DEEP_LINK: http://127.0.0.1:5173?proofSession=…
```

---

## Verify pending hold

```bash
./scripts/smoke_android_seal_postcheck.sh
# or with session id:
./scripts/smoke_android_seal_postcheck.sh sess_8f3c2a1b-4e5d-6a7b-8c9d-0e1f2a3b4c5d
```

Or Supabase Studio → `pop_pending_holds`.

---

## Prep smokes (no device required)

```bash
./scripts/smoke_android_env.sh
./scripts/smoke_flutter_seal_prep.sh
./scripts/run_android_dev_loop.sh
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `PROOF_SEAL_FAILED: no active proof session` | Start session before Seal Proof |
| `PROOF_VALIDATION_FAILED: No route to host` | Use USB + `adb reverse`, not LAN IP |
| `PROOF_VALIDATION_FAILED` (other) | Validator not running or wrong URL |
| HTTP connection refused on device | Run `./scripts/android_device_urls.sh` and match URLs |
| `INSTALL_FAILED_INSUFFICIENT_STORAGE` | Free space on device; script retries after uninstall |

See also: `MASTER_BRAIN/TRUST_SYSTEM/SEAL_PROOF.md`
