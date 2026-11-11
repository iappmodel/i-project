# Cursor implementation audit (initial)

**Repo:** iappmodel/i-project @ handoff/cursor-app-2026-11-11  
**Evidence:** file inspection + app build gates (2026-11-11)

| Area | Status | Key paths |
|------|--------|-----------|
| Screen router + immersive feed | VERIFIED | `app/src/App.tsx`, `ImmersiveFeedScreen.tsx` |
| Loop 1 demo state machine | VERIFIED | `state/demoContext.tsx` |
| Consent / watch / verify screens | VERIFIED | `ConsentCameraGateScreen`, `WatchVerifyScreen` |
| Mock wallet + previews | MOCK | `WalletScreen`, `ConvertScreen` |
| Live settlement | PARTIAL / env-gated | `useLiveWalletSync`, `settlementConfig` |
| POP M5 / device validation | NOT IN APP | i-pop-lab reference only |
| Creator studio in React | NOT IMPLEMENTED | HTML in `05_creator_campaigns/` |
| Create tab (immersive) | MOCK | toast in `ImmersiveFeedScreen` |

Fixed: `exitPresenter` now uses `immersive-feed` (was legacy `feed`).
