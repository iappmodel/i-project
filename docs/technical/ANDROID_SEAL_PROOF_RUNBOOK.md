# Android Seal Proof — device runbook

**Goal:** Flutter runtime seals Proof Packet v0 and POSTs to POP validator.

---

## Prerequisites

1. Host running validator: `./scripts/dev_stack.sh` (or validator only on `:8787`)
2. Android device or emulator with USB debugging
3. Flutter SDK installed

---

## Emulator (AVD)

Host `localhost:8787` is reachable from Android emulator as **`10.0.2.2:8787`**.

```bash
cd integrations/eye-tracking/flutter-runtime
flutter run \
  --dart-define=POP_VALIDATOR_URL=http://10.0.2.2:8787 \
  --dart-define=WALLET_APP_URL=http://10.0.2.2:5173
```

After successful validation, logcat prints `WALLET_DEEP_LINK:` — open in emulator browser or run on host:

```bash
./scripts/open_wallet_deep_link.sh SESSION_ID
```

---

## Physical device (same WiFi as Mac)

Use your Mac's LAN IP instead of `10.0.2.2`:

```bash
IP=$(ipconfig getifaddr en0)
flutter run --dart-define=POP_VALIDATOR_URL=http://$IP:8787
```

Ensure Mac firewall allows inbound `:8787`.

---

## Test flow

1. Start a proof session (watch / tracking active)
2. Tap **Seal Proof** in debug UI
3. Watch logcat:

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
adb logcat -s flutter | grep -E 'PROOF_SEAL|PROOF_VALIDAT'
```

Expected sequence:

```
PROOF_SEAL_TAP
PROOF_SEALED: PP-LIVE-… session=…
PROOF_VALIDATED: session=… review=approved hold=…
```

---

## Verify pending hold

```bash
curl "http://127.0.0.1:8787/v1/pending-holds?localUserRef=demo-user-001"
```

Or Supabase Studio → `pop_pending_holds`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `PROOF_SEAL_FAILED: no active proof session` | Start session before Seal Proof |
| `PROOF_VALIDATION_FAILED` | Validator not running or wrong URL |
| HTTP connection refused on device | Use LAN IP, not `127.0.0.1` |

See also: `MASTER_BRAIN/TRUST_SYSTEM/SEAL_PROOF.md`
