# P0 Chat Extraction — Batch 01 Summary

**Extracted:** 2026-05-21  
**Scope:** Top 10 P0 conversations from `CHAT_RECOVERY_PRIORITY_QUEUE.md` (Claude only)  
**Output directory:** `MASTER_BRAIN/CHAT_RECOVERY/EXTRACTED/conversations/`

---

## Batch Overview

| # | Title | Score | Messages | Extraction file |
|---|-------|------:|---------:|-----------------|
| 1 | Complete app feature breakdown and specifications | 237 | 144 | `001_complete_app_feature_breakdown.md` |
| 2 | Building investor demo screens | 201 | 4 | `002_building_investor_demo_screens.md` |
| 3 | Camera-based gaze tracking with attention scoring | 181 | 15 | `003_camera_based_gaze_tracking.md` |
| 4 | Multi-platform format pros and cons | 175 | 9 | `004_multi_platform_format_pros_cons.md` |
| 5 | Continuing a previous conversation | 173 | 8 | `005_continuing_previous_conversation.md` |
| 6 | Vite React TypeScript Tailwind project shell | 169 | 45 | `006_vite_react_typescript_tailwind_shell.md` |
| 7 | Expanding iapp currency ecosystem with alphabetic coin types | 159 | 65 | `007_expanding_currency_ecosystem.md` |
| 8 | Continuing development with mockup assets | 157 | 2 | `008_development_with_mockup_assets.md` |
| 9 | Attention wallet and media marketplace product brief | 147 | 5 | `009_attention_wallet_media_marketplace_brief.md` |
| 10 | Dual-model AI workflow for app development | 141 | 40 | `010_dual_model_ai_workflow.md` |

**Raw source (all 10):**  
`/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json`

**Export limitation:** Claude export omits many artifact/code blocks ("This block is not supported on your current device yet"). Extractions rely on surviving prose summaries and owner-authored prompts.

---

## Strongest Recovered Systems

### 1. Product Constitution Alignment (Conv 009)
The March 14 product brief is the **closest chat artifact to `i_SOURCE_OF_TRUTH.md`**: attention wallet positioning, three loops, progressive trust, selective eye-tracking, MVP/non-MVP boundaries, 4-state wallet model.

### 2. Alphabet Economy + rcoins Hub (Conv 007)
Most detailed economic design in the corpus: 26 letter-coins, tiered reveal, rcoins clearing pool, conversion rates, creator/brand simulators, payment rails (NFC/QR/pay-link), zero-cut tips.

### 3. Investor Demo Narrative (Convs 002, 003, 005, 006)
Convergent **9-step presenter flow**: Splash → Feed → Watch → Wallet → Earn → Wheel → Economy → Creator Split → Trust → Free explore. Includes 5-gate verification overlay, 60/30/10 visualization, dual-currency wallet.

### 4. Design System Evolution (Conv 003)
Explicit pivot from **fintech-dashboard** to **content-first glass + light neumorphic settings**. Two visual modes, 7-property button customizer, 1/4/8/16 tile feed, draggable floating controls.

### 5. Cross-Platform Strategy (Conv 004)
"Platform for all platforms" pros/cons, native creator vs importer distinction, quality engagement score (not followers), creator/user pitch frameworks.

### 6. Master Feature Taxonomy (Conv 001)
15-section / 4-layer breakdown (CORE, UX, ECONOMY, TECH) plus dual-track DEMO/PRODUCTION and five MD foundation files.

### 7. Dev Workflow (Convs 001, 010)
Sonnet/Haiku split, Master Control File, phased HTML demo build, MD-files-as-shared-brain, rejection of Lovable iView fork.

---

## Cross-Batch Themes

| Theme | Threads | Notes |
|-------|---------|-------|
| Dual currency display | 002, 003, 007, 009, 010 | Vicoin/Icoin vs iCoins/vCoins naming drift |
| 60/30/10 revenue | 002, 004, 005, 007 | Consistent across demo and strategy |
| Instant demo credit vs pending wallet | 002, 005, 006 | Conflicts with POPS/production narrative |
| Single HTML vs Vite scaffold | 005, 006, 010 | Parallel demo lineages — not reconciled |
| 26-coin vs 5-coin MVP | 001, 005, 007 | Alphabet system is expansion layer |
| Eye-tracking | 003, 009 | Web TF.js+MediaPipe for demo; selective use in product brief |

---

## Reusable Concepts (Promote-Worthy)

1. **Progressive trust ladder** — signup → phone on claim → ID on withdraw → tax at threshold (conv 009)
2. **rcoins clearing hub** — all earn types → pool → spend outputs (conv 007)
3. **9-step investor presenter + free explore** (convs 002, 003, 005)
4. **Two visual modes** — content/glass vs settings/neumorphic (conv 003)
5. **Native creator vs importer** economic distinction (conv 004)
6. **5-gate verification labels** — Device/Dwell/Gaze/Complete/Fraud (conv 002)
7. **DEMO/PRODUCTION track separation** (convs 001, 008, 010)
8. **Immersive feed interaction model** — minimal persistent anchors, tap-reveal (conv 007)

---

## Obsolete / Duplicate Concepts

| Concept | Status |
|---------|--------|
| Dark fintech dashboard as primary visual | Superseded by design system v2 (conv 003) |
| Tab bar as primary nav in latest demo | Superseded by floating glass buttons (conv 003) |
| Rebuilding single HTML repeatedly | Acknowledged inefficient vs Vite scaffold (conv 005) |
| Lovable "iView" codebase | Rejected (conv 010) |
| User-facing compound coin names (`afcoins`) | Rejected (conv 007) |
| Full neumorphism everywhere | Scoped to settings only per brief + v2 (conv 009, 003) |

---

## Evidence Gaps After Batch 01

| Gap | Priority |
|-----|----------|
| Actual 15-section breakdown body (artifact missing from export) | High |
| Location of 5 MD files: design-system, economy-rules, feature-bible, demo-spec, lessons | High |
| `HANDOFF.md` and `i-app-design-system-v2.md` from conv 003 | High |
| Eight `iapp_*.html` payment/wallet artifacts from conv 007 | Medium |
| A–Z → canonical 5-coin mapping (owner decision) | Critical |
| Legal framework for cross-platform content import | Medium |
| Which deployed demo URL matches latest intended build | Medium |
| Flutter mockup assets at `iapp flutter/assets` | Medium |

---

## Remaining P0 Work

**94 P0 conversations remain** after this batch (104 total P0 − 10 extracted).

**Next batch candidates (ranks 11–20):**
11. Application development masterplan and stages  
12. Removing the streak bar feature  
13. Using multiple skills and repos together in Claude  
14. UX/UI Strategy Separation (OpenAI)  
15. Eye-tracking attention interface for verified engagement  
16. Complete fintech app artifact with wallet interface  
17. Eye-tracking system audit and integration review  
18. UX/UI design principles  
19. Clarification needed (owner review flagged)  
20. vCoin Development Guide (OpenAI)

---

## Canonicalization Readiness

**Not ready.**

P0 chat extraction batch 1 completed; **further P0/P1 extraction still required before final canonicalization.**

Blockers:
- 94 P0 threads not yet extracted
- 39 P1 threads not extracted
- Coin naming reconciliation unresolved (Vicoin/Icoin vs a/i/v/e/o; 26-coin vs 5-coin)
- Competing demo implementations not merged
- OpenAI P0 economy threads not cross-reconciled with Claude batch

---

## Related Artifacts

- `P0_BATCH_01_CANONICAL_CANDIDATES.md`
- `P0_BATCH_01_CONFLICTS_AND_DUPLICATES.md`
- `P0_BATCH_01_EXTRACTION_LOG.tsv`
