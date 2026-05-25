# DEMOS Promotion Report

**Date:** 2026-05-25  
**Scope:** P0 code promotion from `~/Desktop/IVAULT/DEMOS:REPOS` into `i-project-rescue/github-source-repos/`

---

## Summary

| # | Action | Source | Target | Status |
|---|--------|--------|--------|--------|
| 1 | Checkout `demo-investor` | `DEMOS:REPOS/eye-earn-sparkle` | `github-source-repos/eye-earn-sparkle` @ `5652c1a` | ✅ Done |
| 2 | Checkout `codex/investor-demo-mode-v2` | remote | `github-source-repos/eye-earn-sparkle-archive` @ `6391b06` | ✅ Done |
| 3 | Populate iview investor demo | `DEMOS:REPOS/iview/eye-earn-investor-demo` | `github-source-repos/iview/` | ✅ Done (rsync) |
| 4 | Pending-first wallet in Loop 1 app | `eye-earn-sparkle` walletStore pattern | `app/src/state/demoContext.tsx` | ✅ Done |
| 5 | Currency naming ADR | synthesis | `MASTER_BRAIN/DECISIONS/CURRENCY_NAMING_ADR.md` | ✅ Done |

---

## 1. eye-earn-sparkle `demo-investor`

**Branch tip:** `5652c1a` — Fix Wallet demo subtitle JSX

**Unique commits (8 ahead of main):**

```
e8bad99 WIP UI/navigation changes for demo
8288041 Add demo env template
e854695 Add demo runtime flags and reward engine
5963885 Add demo campaigns catalog
e412674 Add demo wallet store with ledger
db8f9ed Demo: issue variable promo rewards into wallet on completion
6f28fdf Demo: Wallet page reads balances and history from demo wallet store
5652c1a Fix Wallet demo subtitle JSX
```

**Key files for future cherry-pick into `app/`:**

- `src/state/walletStore.ts` — zustand persist, pending → settle
- `src/demo/rewardEngine.ts` — promo reward breakdown
- `src/pages/Wallet.tsx` — available/pending display

**Naming note:** Uses Vicoin/Icoin — map to vCoins/iCoins per ADR-001 at integration.

---

## 2. eye-earn-sparkle-archive `codex/investor-demo-mode-v2`

**Branch tip:** `6391b06` — Organize mockup videos

**5 commits ahead of rescue `codex/vision-unified-pipeline` tip:**

- Investor-ready demo mode flow
- Tobii WS gaze backend + bridge status
- Full fintech walkthrough UX (dual-demo strategy — keep separate from Loop 1 `app/`)

---

## 3. iview population

**Source:** `DEMOS:REPOS/iview/eye-earn-investor-demo/`  
**Target:** `github-source-repos/iview/` (was empty git shell)

Stripped investor demo with external deps removed — list-fallback DiscoveryMap, mocked Stripe/AI.

**Not pushed to GitHub** — local promotion only. Owner may commit/push when ready.

---

## 4. Loop 1 wallet alignment

`app/` now uses **pending-first iCoin credit** with 1.2s auto-settle (mirrors demo-investor UX).

Fields: `iCoins` (available), `iCoinsPending` (attestation queue).

---

## Deferred (P0 queue items not executed)

| Item | Reason |
|------|--------|
| Merge demo-investor into `app/` package.json deps (zustand) | Kept React context — no new deps |
| `eye-earn-vision-v2` sub-repo promotion | Next integration phase |
| Delete duplicate DEMOS folders | After owner confirms promotion |
| Firebase key rotation | Security — owner action |

---

## References

- `MASTER_BRAIN/PROMOTION_AND_DISCARD_QUEUE.md`
- `MASTER_BRAIN/IVAULT_FULL_AUDIT_2026-05-25.md`
- `MASTER_BRAIN/DECISIONS/CURRENCY_NAMING_ADR.md`
