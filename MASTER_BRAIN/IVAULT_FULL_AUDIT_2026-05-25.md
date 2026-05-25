# IVAULT Full Audit — [ i ] Project

**Audit date:** 2026-05-25  
**Auditor:** Cursor agent (synthesis of global intake + targeted folder audits)  
**Archive root:** `~/Desktop/IVAULT` (~56 GB, ~628k files)  
**Canonical workspace:** `~/Desktop/IVAULT/i-project-rescue/i_project_migration_archive/`  
**Prior census:** 2026-05-21 (`GLOBAL_INTAKE/`)

---

## 1. Executive Summary

[ i ] is an **Attention Wallet and Media Marketplace** — users earn verified attention, creators earn verified engagement, advertisers buy verified consumption. The project has been developed extensively across **32 git repos**, **~580 ChatGPT threads**, **68 Claude threads**, **dozens of Lovable/Vite demos**, **Flutter eye-tracking runtimes**, and **hundreds of HTML prototypes**.

**The good news:** Most valuable knowledge is recoverable. A prior archaeology pass (May 2026) already indexed the archive, extracted 40 priority chat threads, and established a canonical workspace with a Loop 1 React MVP, promoted Flutter runtime, and classified MASTER_BRAIN.

**The gap:** ~46 GB is duplicate repos, reference libraries, and node_modules bloat. Critical economy rules and several strategy docs were on disk but not yet in MASTER_BRAIN — **promoted in this audit (2026-05-25)**.

**What to do next:** Resolve 6 currency blockers + 1 attention-session bypass (see §8), promote 4 code branches from DEMOS:REPOS, continue chat extraction (ranks 41–104), then implement from `app/` + `integrations/`.

---

## 2. What [ i ] Is (Product Constitution)

**Source of truth:** [`CANONICAL/i_SOURCE_OF_TRUTH.md`](CANONICAL/i_SOURCE_OF_TRUTH.md)

| Concept | Definition |
|---------|------------|
| **Core loop** | Watch → Verify → Reward → Wallet → Spend/Convert/Withdraw → Repeat |
| **Participants** | User (attention), Creator (audience), Advertiser (verified consumption) |
| **MVP currencies** | aCoins (attention), iCoins (cash-value), vCoins (utility), eCoins (engagement), oCoins (origin) |
| **Trust** | POPS multi-signal validation; proof packets; progressive trust ladder |
| **Verification** | Qualification not surveillance — dwell, interaction, optional eye-tracking |

**Extended economy law:** [`ECONOMY/i-app-economy-rules.md`](ECONOMY/i-app-economy-rules.md) — 26+ω coin taxonomy, i/v ledger separation, rCoin conversion hub. **Treat as immutable constraints for implementation** (reconcile naming conflicts with constitution before coding).

**Feature inventory:** [`CANONICAL/FEATURE_BIBLE.md`](CANONICAL/FEATURE_BIBLE.md) — full build checklist (Demo vs Production tracks).

---

## 3. Archive Map (56 GB Breakdown)

| Folder | Size | Role | Verdict |
|--------|------|------|---------|
| `SYSTEMS:APPS:REFFERENCES/` | 25 GB | OpenFace, MediaPipe, Flutter SDKs, third-party | **REFERENCE ONLY** — do not promote |
| `DEMOS:REPOS/` | 21 GB | Lovable/Vite/React, Flutter, MVP HTML | **MINE FOR PROMOTION** — heavy duplicates |
| `i-project-rescue/` | 4.8 GB | **Canonical workspace** + github-source-repos | **PRIMARY** |
| `iTrack/` | 1.6 GB | Dirty fork of eye_tracking_app | **PRESERVE, don't promote** |
| `IMAGES FOR UX:UI/` | 1.4 GB | Design reference images | Reference |
| `CHATGPT/` | 1.2 GB | OpenAI export (1,667 files) | Indexed; extract remaining P0 |
| `MOCKUPS/` | 734 MB | Design mockups | Reference |
| `RECENTLY DEVELOPED (MULTI)/` | 89 MB | Latest HTML prototypes | **Promoted** → `02_clickable_prototypes/recent_may2026/` |
| `CLAUDE/` | 22 MB | Claude export | Indexed; extract remaining P0 |
| `CONCEPTS/` | 31 MB | AI concept art | Reference |
| `MASTER_BRAIN/` (Desktop) | 1.5 MB | Strategy docs, PDFs | **Promoted** key MD files |
| `PAYMENT SYSTEM/` | 176 KB | Economy rules | **Promoted** → `MASTER_BRAIN/ECONOMY/` |
| `REMOTE CONTROL/` | 24 KB | Eye-tracking RC brief | **Promoted** → `ATTENTION_SYSTEM/` |
| `HTMLS/`, `SON OF A PITCH/` | ~1 MB | Static prototypes | Mostly already in archive |
| `99_ARCHIVE_DO_NOT_USE/` | 21 MB | Marked obsolete | Discard after spot-check |
| `i_project_migration_archive_OLD_DO_NOT_USE/` | 1.4 MB | Pre-integration HTML only | **Discard** — superseded |
| Empty stubs (`BODY`, `SOUL`, `HEART`, etc.) | 0 B | Placeholders | Ignore |

**Estimated safe reclaim after promotion:** 2.7–12 GB (duplicate Lovable clones, PWA zips, `i dev demo` scratch, node_modules in DEMOS copies).

---

## 4. Canonical Code Locations (Today)

| Domain | Canonical path | Status |
|--------|----------------|--------|
| **Workspace root** | `i-project-rescue/i_project_migration_archive/` | Git: `iappmodel/i-project` |
| **Loop 1 investor MVP** | `app/` — 13-screen Vite/React | Runnable: `cd app && npm run dev` |
| **MVP flow spec** | `docs/MVP_CANONICAL_FLOW.md` | 10-step decision map |
| **Native eye-tracking** | `integrations/eye-tracking/flutter-runtime/` | Android smoke-tested PASS |
| **Proof packet contract** | `integrations/pop-core/` + `docs/technical/PROOF_PACKET_SCHEMA_V0.md` | Schema canonical; emission not wired |
| **POPS backend reference** | `integrations/old-source-preservation/ivault-eye-tracking/snapshot/` | ~184 API files — reference |
| **Web vision (candidate)** | `github-source-repos/eye-earn-sparkle-archive` @ vision-unified-pipeline | Cherry-pick, not wholesale merge |
| **Clean evidence clones** | `github-source-repos/` (11 repos) | Read-only upstream mirrors |
| **Knowledge corpus** | `MASTER_BRAIN/` | This audit + classified memory |
| **HTML prototypes** | `02_clickable_prototypes/` … `07_currency_system/` + `recent_may2026/` | UX evidence |

### Dual-demo strategy (intentional)

| Demo | Purpose | Do not merge |
|------|---------|--------------|
| `app/` | Linear Loop 1 + consent + proof layer + creator economics | — |
| `eye-earn-sparkle-archive` investor-demo-mode-v2 | Full fintech walkthrough, pending wallet UX | Different architecture |

---

## 5. Feature Domains — What Exists

### 5.1 Core product (Loop 1)

- Feed, offer detail, watch-verify, verification result, reward reveal
- Wallet, convert, withdraw preview
- Consent camera gate, proof layer, creator economics, roadmap
- **Gap:** Mocked gaze; instant wallet credit in `demoContext.tsx` (conflicts with pending-first POPS pattern)

### 5.2 Economy & wallet

- 26+ω coin taxonomy (`i-app-economy-rules.md`)
- Alphabet currency interactive HTML (`07_currency_system/`)
- POPS wallet ledger in IVAULT snapshot + Supabase migrations in archive repo
- Static wallet UX in `04_wallet_payments/` (pending tab is key reference)
- **Gap:** Currency naming conflicts across chats (Vicoin/Icoin vs a/i/v/e/o)

### 5.3 Attention & eye-tracking

- Flutter runtime: MediaPipe, Intent OS, gaze pipeline, VSL types
- Remote control master brief (702 lines) — interaction + verification layers
- Web vision pipeline in sparkle-archive
- MediaPipe attention plugin (experimental, v2 repo)
- **Gap:** Proof packet emission not wired; session bypass blocker (CR-01)

### 5.4 Trust & POPS

- Six-layer multi-signal validation architecture
- Proof Packet Schema v0
- Trust ladder, fraud lock, governance kernel (Flutter snapshot)
- pop-core acceptance fixture PP-000001

### 5.5 Creator economy

- Campaign builder HTML, studio video editor prototypes
- Creator pitch pages, economics screen in `app/`
- Studio routing audit — web studio placement decisions

### 5.6 Investor / pitch

- Pitch HTML (`03_pitch_pages/`)
- Demo spec (`INVESTOR_DEMO/DEMO_SPEC.md`)
- Multiple investor-demo branches in eye-earn-sparkle lineage
- MVP HTML progression v1→v11 in DEMOS:REPOS

---

## 6. Classification Matrix

### PROMOTE (high value, not yet in canonical workspace)

| Item | Source | Action |
|------|--------|--------|
| `eye-earn-sparkle` branch `demo-investor` | DEMOS:REPOS | 8 wallet/investor commits not in rescue |
| `eye-earn-sparkle-archive` investor-demo-mode | DEMOS:REPOS | 5 commits ahead of rescue |
| `iview/eye-earn-investor-demo` | DEMOS:REPOS | Fill empty rescue shell |
| `eye-earn-vision-v2` sub-repo | sparkle-archive | Gaze/calibration pipeline |
| Chat extraction ranks 41–104 | CHATGPT/CLAUDE | Continue P0/P1 batches |
| Pending-first wallet UX pattern | archive demoState | Cherry-pick into `app/` after currency decision |

### KEEP / REFERENCE (valuable, don't delete)

| Item | Why |
|------|-----|
| `github-source-repos/*` | Clean evidence clones |
| `CHATGPT/`, `CLAUDE/` raw exports | Source for continued extraction |
| `i_app_notion_md_package`, MVP HTML v11 | Spec archives |
| `iTrack/` dirty worktree | Preserved at `old-source-preservation/itrack-dirty-worktree/` |
| `SYSTEMS:APPS:REFFERENCES/` | Third-party SDKs — reference only |
| Design images (`CONCEPTS/`, `IMAGES FOR UX:UI/`) | UX mood board |

### DUPLICATE (safe to archive/delete after promotion)

| Item | Duplicate of |
|------|--------------|
| `eye-earn-sparkle-1`, `i github/eye-earn-sparkle` | rescue main @ 9b99f03 |
| `eye-earn-sparkle-main` | rescue checkout |
| `up-next-queue-main 2` | rescue up-next-queue |
| `i-app-pwa*` (5 copies) | Same static export |
| `i dev demo/` (4.6 GB) | Scratch iterations + repeated zips |
| `08_raw_originals/` | Mirror of folders 02–07 |
| `i_project_migration_archive_OLD_DO_NOT_USE/` | Pre-integration subset |

### DISCARD (now)

| Item | Why |
|------|-----|
| Desktop `MASTERBRAIN/` | Empty stub |
| `i-app-broken/` | Broken sibling of i-app |
| Empty placeholder dirs | BODY, SOUL, HEART, MAGIC, PRIVATE |
| Firebase adminsdk JSON in DEMOS | **Rotate key immediately** |

---

## 7. Chat & Knowledge Recovery Status

| Artifact | Count | Status |
|----------|------:|--------|
| OpenAI threads ranked | ~580 | Indexed |
| Claude threads ranked | 68 | Indexed |
| P0 threads extracted | **40 / 104** | Batches 01–04 complete |
| P0 synthesis | 4 batch summaries | In `CHAT_RECOVERY/EXTRACTED/` |
| Strategy docs promoted | 6 files | This audit |
| Economy rules | 1 file | **New** in MASTER_BRAIN |

**Regenerate indexes:** `python3 scripts/ivault_global_intake.py` and `python3 scripts/chat_export_triage.py`

---

## 8. Blockers Before Final Canonicalization

From [`DUPLICATES_AND_CONFLICTS.md`](DUPLICATES_AND_CONFLICTS.md):

| ID | Blocker | Owner decision needed |
|----|---------|----------------------|
| CR-01 | Attention session bypass — reward without valid session | Fix before any reward canon |
| CR-02–CR-06 | Currency naming & semantics (iCoin, vCoin, rCoin, uCoin) | Reconcile SoT vs economy-rules vs chat era |
| HI-01 | 6+ demo architectures | Pick canonical demo lineage |
| HI-02 | 4-tab product IA vs multi-screen demos | Align product navigation |

---

## 9. Recommended Phases

### Phase A — Owner decisions (1 session)
1. Confirm currency naming: constitution (a/i/v/e/o) vs full 26+ω taxonomy
2. Pick canonical demo: `app/` Loop 1 vs archive fintech vs merged
3. Resolve attention session bypass policy

### Phase B — Promotion (1–2 weeks)
1. Merge `demo-investor` wallet branch into rescue
2. Fill iview / investor-demo shells
3. Extract chat batches 05–08 (ranks 41–80)
4. Wire pending wallet UX into `app/` (after Phase A)

### Phase C — Implementation (ongoing)
1. Proof packet emission (pop-core PR sequence)
2. Replace mocked gaze with flutter-runtime bridge or web vision
3. Backend: POPS API + Supabase from archive patterns
4. Feature bible checklist — mark `[x]` as built

### Phase D — Cleanup (after promotion)
1. Delete duplicate DEMOS folders (~2.7 GB minimum)
2. Move `SYSTEMS:APPS:REFFERENCES/` to external drive if needed
3. Archive raw CHATGPT export to cold storage (keep index in repo)

---

## 10. Where to Start Every Session

1. [`CANONICAL/i_SOURCE_OF_TRUTH.md`](CANONICAL/i_SOURCE_OF_TRUTH.md) — product law
2. [`ECONOMY/i-app-economy-rules.md`](ECONOMY/i-app-economy-rules.md) — economy law (if implementing wallet/currency)
3. [`CANONICAL/FEATURE_BIBLE.md`](CANONICAL/FEATURE_BIBLE.md) — build state
4. [`DEVELOPMENT_LOG.md`](DEVELOPMENT_LOG.md) — what happened recently
5. [`PROMOTION_AND_DISCARD_QUEUE.md`](PROMOTION_AND_DISCARD_QUEUE.md) — next actions
6. [`REPOSITORY_MAP.md`](REPOSITORY_MAP.md) — where evidence lives

---

## 11. Audit Confidence

| Area | Confidence | Notes |
|------|------------|-------|
| Archive size & folder map | **High** | Verified 2026-05-25 |
| Canonical code locations | **High** | Cross-checked with 31 technical audits |
| DEMOS:REPOS git state | **High** | Subagent audit + rescue comparison |
| Chat extraction completeness | **Medium** | 40/104 P0 — remainder unknown |
| PDF product bibles | **Low** | Placeholder PDFs on Desktop; MD guide promoted |
| Owner intent on blockers | **Pending** | Requires your decisions |

**This audit does not replace owner decisions.** It organizes 56 GB into actionable promote/keep/discard buckets so every future chat starts from the same map.
