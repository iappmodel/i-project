# Device demo runbook (investor B1)

## Before the meeting

```bash
./scripts/dev_stack.sh
./scripts/smoke_investor_readiness.sh --product --spine
./scripts/run_investor_device_demo.sh
```

## Networking

- Phone cannot use `127.0.0.1:8787` for the validator.
- Run `./scripts/android_device_urls.sh` and set host LAN IP in Capacitor / env.
- Confirm health: `curl http://<HOST_IP>:8787/health`

## Gaze honesty

| Path | What investor sees |
|------|-------------------|
| WebView / browser | Labeled **mock gaze**; session-derived proof scores |
| Flutter Seal Proof (USB) | Real packet path → POP → wallet |

Scripts: `./scripts/run_android_device_test.sh` · `./scripts/smoke_android_seal_postcheck.sh`

## Rehearsed flow

1. Open app with `?investor=1` or investor banner visible
2. Immersive feed → Nike hero → Watch & earn
3. Consent → watch → verify → reward (pending-first copy if live)
4. Wallet: pending row → settle (auto if `VITE_AUTO_SETTLE=true`)

Fallback if stack down: `./scripts/open_investor_print_bundle.sh`
