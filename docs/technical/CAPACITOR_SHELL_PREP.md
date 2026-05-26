# Capacitor shell — Phase 5 prep

**Status:** Documented scaffold — not installed in `app/` yet  
**Goal:** Wrap canonical `app/` Vite build in Capacitor for iOS/Android WebView shell.

---

## Why defer full install

- Loop 1 spine works in browser + Flutter posts to same validator via SSE/deep links
- Capacitor adds native build toolchain (Xcode, Android SDK) without replacing mock gaze yet
- Cherry-pick web vision (`22cabd3`) only after shell decision is locked

---

## Promotion steps (when owner approves)

```bash
cd app
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "i Attention Wallet" com.iapp.wallet --web-dir dist
npm run build
npx cap add android
npx cap add ios
npx cap sync
```

`capacitor.config.ts` should point `server.url` at dev Vite during development:

```typescript
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.iapp.wallet',
  appName: 'i Attention Wallet',
  webDir: 'dist',
  server: {
    // Dev only — remove for production builds
    url: 'http://10.0.2.2:5173',
    cleartext: true,
  },
}

export default config
```

---

## Bridge strategy (with Flutter)

| Layer | Today (Phase 5) | Capacitor shell |
|-------|-------------------|-----------------|
| Proof submit | Flutter native → validator | Same |
| Wallet UI | React in browser / WebView | React in Capacitor WebView |
| Return path | `WALLET_APP_URL/?proofSession=` | Same deep link in WebView |
| Gaze signals | Mock in React; real in Flutter | Optional in-web MediaPipe promote |

See `docs/technical/REACT_FLUTTER_BRIDGE.md`.

---

## References

- `eye-earn-sparkle-archive/capacitor.config.ts`
- `docs/technical/VISION_UNIFIED_PIPELINE_BRANCH_AUDIT.md` § cherry-pick `22cabd3`
