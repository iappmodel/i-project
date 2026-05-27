# Capacitor shell — Phase 6

**Status:** Packages installed · native platforms on demand  
**Goal:** Wrap canonical `app/` Vite build in Capacitor for iOS/Android WebView shell.

---

## Quick start

```bash
cd app
npm run cap:sync                    # build + sync web assets

# First time — generates app/android + app/ios (gitignored):
../scripts/setup_capacitor_shell.sh --add
# iOS add auto-skips if xcodebuild is unavailable
```

---

## Dev with live Vite (emulator)

```bash
./scripts/dev_stack.sh
cd app
CAPACITOR_SERVER_URL=http://10.0.2.2:5173 npx cap run android
```

---

## Config

- **`app/capacitor.config.ts`** — `com.iapp.attentionwallet` / webDir `dist`
- Native dirs **`app/android/`**, **`app/ios/`** — generated locally, not committed

---

## Bridge strategy (with Flutter)

| Layer | Browser | Capacitor WebView |
|-------|---------|-------------------|
| Wallet UI | React Vite | Same build in WebView |
| Proof submit | Web mock + Flutter native | Flutter → validator |
| Return path | `?proofSession=` deep link | Same |

See `docs/technical/REACT_FLUTTER_BRIDGE.md`.

---

## References

- `scripts/setup_capacitor_shell.sh`
- `scripts/smoke_capacitor_prep.sh`
- `scripts/smoke_capacitor_native_prep.sh`
- `eye-earn-sparkle-archive/capacitor.config.ts`
