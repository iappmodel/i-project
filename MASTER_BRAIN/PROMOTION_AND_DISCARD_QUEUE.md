# Promotion & Discard Queue

**Updated:** 2026-05-25  
**Owner action required** for items marked 🟡

Ordered action list — not yet executed unless noted.

---

## P0 — Promote code (high value, unique commits)

| # | Source | Target | Why | Status |
|---|--------|--------|-----|--------|
| 1 | `DEMOS:REPOS/eye-earn-sparkle` @ `demo-investor` | `github-source-repos/eye-earn-sparkle` | 8 wallet/investor commits not in rescue | ✅ Done 2026-05-25 |
| 2 | `DEMOS:REPOS/eye-earn-sparkle-archive` investor-demo commits | rescue archive repo | 5 commits ahead of rescue tip | ✅ Done 2026-05-25 |
| 3 | `DEMOS:REPOS/iview/eye-earn-investor-demo` | `github-source-repos/iview` | Rescue shell is empty | ✅ Done 2026-05-25 |
| 4 | `eye-earn-sparkle-archive/eye-earn-vision-v2` | `integrations/eye-tracking/vision-v2/` | Gaze/calibration pipeline | ✅ Done 2026-05-25 |
| 5 | Pending-first wallet UX from archive `demoState.ts` | `app/src/state/` | Aligns with POPS; ADR-001 applied | ✅ Done 2026-05-25 |

---

## P0 — Promote knowledge (docs)

| # | Source | Target | Status |
|---|--------|--------|--------|
| 6 | `PAYMENT SYSTEM/i-app-economy-rules.md` | `MASTER_BRAIN/ECONOMY/` | ✅ Done 2026-05-25 |
| 7 | Remote control master brief | `MASTER_BRAIN/ATTENTION_SYSTEM/` | ✅ Done 2026-05-25 |
| 8 | Feature bible, demo spec | `MASTER_BRAIN/CANONICAL/`, `INVESTOR_DEMO/` | ✅ Done 2026-05-25 |
| 9 | Recent HTML prototypes (May 2026) | `02_clickable_prototypes/recent_may2026/` | ✅ Done 2026-05-25 |
| 10 | Chat extraction ranks 41–104 | `CHAT_RECOVERY/EXTRACTED/` | 🔄 **90/104** (2026-05-26) |
| 11 | `i_app_notion_md_package/` (15 module MDs) | `MASTER_BRAIN/` domain folders | ⬜ Pending |
| 12 | MVP HTML v11 wallet hardened | `04_wallet_payments/` or PROTOTYPES | ⬜ Pending |

---

## P1 — Owner decisions 🟡

| # | Decision | Blocker IDs | Notes |
|---|----------|-------------|-------|
| D1 | Currency naming | CR-02–CR-06 | ✅ **ADR-001** — build a/i/v/e/o now |
| D2 | Demo + product IA | HI-01, HI-02 | ✅ **ADR-014** — `app/` + 4-tab |
| D3 | Session bypass | CR-01 | ✅ Fixed in demo paths |
| D4 | iCoin display in Loop 1 | CR-02, CR-03 | 🟡 Pending-first in `demoContext`; align labels |
| D5 | Merge proof-collector branch | MERGE-01 | 🟡 See [`INTEGRATION_READINESS_AUDIT_2026-05-25.md`](INTEGRATION_READINESS_AUDIT_2026-05-25.md) |

---

## P2 — Safe to discard (after P0 promotion verified)

| # | Path | Size (approx) | Prerequisite |
|---|------|---------------|--------------|
| X1 | `DEMOS:REPOS/eye-earn-sparkle-1` | 473 MB | After #1 merged |
| X2 | `DEMOS:REPOS/i github/` | 494 MB | After #1 merged |
| X3 | `DEMOS:REPOS/eye-earn-sparkle-main` | 635 MB | After rescue checkout verified |
| X4 | `DEMOS:REPOS/i-app-pwa*` (all) | ~1.2 GB | None |
| X5 | `DEMOS:REPOS/i dev demo/` | 4.6 GB | Manual spot-check first |
| X6 | `DEMOS:REPOS/i-app-broken/` | 1.5 GB | None |
| X7 | `i_project_migration_archive_OLD_DO_NOT_USE/` | 1.4 MB | None — superseded |
| X8 | Desktop `MASTERBRAIN/` (empty) | 12 KB | None |
| X9 | `DEMOS:REPOS/i---app-firebase-adminsdk-*.json` | 4 KB | ✅ Deleted 2026-05-25 — **rotate Firebase key** |

**Estimated reclaim:** 2.7 GB (minimum) → 12 GB (with i dev demo + node_modules cleanup)

---

## P3 — Keep on disk, do not import

| Path | Why |
|------|-----|
| `SYSTEMS:APPS:REFFERENCES/` (25 GB) | Third-party SDKs |
| `CHATGPT/` raw export | Extraction source; indexed |
| `CLAUDE/` raw export | Extraction source; indexed |
| `CONCEPTS/`, image folders | Visual reference |
| `iTrack/` dirty fork | Preserved in old-source-preservation |

---

## P4 — Implementation sequence (after decisions)

**Authoritative order:** [`INTEGRATION_READINESS_AUDIT_2026-05-25.md`](INTEGRATION_READINESS_AUDIT_2026-05-25.md) §9

1. Merge `reliability/wire-proof-collector-live-loop` → `main`
2. Promote archive Supabase wallet + `issue-reward` → `app/supabase/`
3. POPS validator stub + pending wallet production wiring
4. Device path: Seal Proof → API/log stub
5. Bridge flutter-runtime ↔ demo shell (Capacitor or WS)
6. Mark features in `FEATURE_BIBLE.md` as built

---

## How to mark progress

Edit Status column: ⬜ Pending → 🔄 In progress → ✅ Done  
Add dated note to [`DEVELOPMENT_LOG.md`](DEVELOPMENT_LOG.md)
