# CANONICAL_CANDIDATES

**Generated:** 2026-05-21  
**Updated:** 2026-05-22 (P0 chat batches 01–04 synthesis)  
**Purpose:** What should become canonical — with evidence, confidence, and competing alternatives

**Synthesis:** [`CHAT_RECOVERY/EXTRACTED/P0_BATCHES_01_04_SYNTHESIS.md`](CHAT_RECOVERY/EXTRACTED/P0_BATCHES_01_04_SYNTHESIS.md) — **40 P0 conversations consolidated; nothing promoted.**

**Legend:**  
- **Confidence:** High / Medium / Low  
- **Status:** Declared / Audit-backed / Gap / **Chat-candidate (blocked)**

---

## Tier 0 — Declared Canonical (Non-Negotiable)

| Item | Location | Confidence | Notes |
|------|----------|------------|-------|
| [ i ] Source of Truth | MASTER_BRAIN/CANONICAL/i_SOURCE_OF_TRUTH.md | **High** | Owner-declared constitution |
| Core Loop definition | CANONICAL/CORE_LOOP.md | **High** | Derived from constitution |
| Three Participants | CANONICAL/THREE_PARTICIPANTS.md | **High** | Derived from constitution |
| Revenue 60/30/10 | CANONICAL/REVENUE_MODEL.md | **High** | Intent canonical; app/ screen is best evidence |

---

## Tier 0.5 — P0 Chat Extraction Candidates (Batches 01–04)

**Source:** 40 P0 conversations (ranks 1–40) — see `CHAT_RECOVERY/EXTRACTED/conversations/` and batch `P0_BATCH_*_CANONICAL_CANDIDATES.md`.

**Total unique candidate IDs:** ~125 (CC-B01 through CC-B04)  
**Status:** **All blocked or candidate — not canonical.** Promotion requires owner decisions in synthesis §12.

### Highest-priority chat candidates (blocked on noted items)

| ID | Candidate | Conv(s) | Blocker |
|----|-----------|---------|---------|
| CC-B04-27–31 | Attention sessions + ACS + split reward endpoints | 039 | **Session bypass (CR-01)** |
| CC-B03-01, CC-B04-07–08 | aCoin + eCoin specs | 023, 033 | Currency pipeline |
| CC-B02-01, CC-B04-23 | 4-tab product IA | 014, 038 | Demo lineage (HI-01) |
| CC-B01-04, CC-B02-04 | Progressive trust ladder | 009, 014 | — |
| CC-B03-16 | Tier 1 A/I/V/E/O | 028 | Letter semantics (CR-02–06) |

### Chat candidate tiers (summary)

| Tier | Count (approx) | Action |
|------|----------------|--------|
| A — SoT-aligned | ~30 | Promote after blockers cleared |
| B — Needs reconciliation | ~45 | Owner decision required |
| C — Experimental | ~35 | Preserve only |
| D — Process/obsolete | ~15 | Do not promote to product canon |

**Do not merge chat candidates with repo audit candidates below until currency + session bypass resolved.**

---

## Tier 1 — Canonical Candidates (Audit-Backed, Promote When Reconciling)

### Product & UX

| Candidate | Evidence path | Confidence | Beats |
|-----------|---------------|------------|-------|
| Loop 1 investor spine | `app/` + [`docs/MVP_CANONICAL_FLOW.md`](../docs/MVP_CANONICAL_FLOW.md) (IVAULT primary repo) | **High** | archive v2 linear story, i-mvp-prototype monolith |
| Pending-first wallet UX | `github-source-repos/eye-earn-sparkle-archive/src/lib/demoState.ts` | **Medium** | Source-verified demo-only localStorage; canonical-aligned UX pattern, not canonical system |
| Consent + proof layer screens | `app/` ProofLayer, ConsentGate | **High** | archive v2 (absent) |
| Creator economics slide | `app/CreatorEconomicsScreen` | **High** | v2 fintech-only demo |
| HeroEntry investor copy | v2 HeroEntry.tsx | **Medium** | app/ splash copy |

### Architecture & Authority

| Candidate | Evidence path | Confidence | Beats |
|-----------|---------------|------------|-------|
| Ownership contract | `integrations/old-source-preservation/ivault-eye-tracking/snapshot/docs/source-of-truth-ownership-contract.md` | **Medium** | Source-verified in preservation snapshot; **not promoted** to `docs/` |
| Runtime wiring matrix | `integrations/old-source-preservation/ivault-eye-tracking/snapshot/docs/runtime-wiring-matrix.md` | **Medium** | Source-verified in preservation snapshot; **not promoted** to `docs/` |
| SYSTEM_PROMOTION_SOURCE_OF_TRUTH | `docs/technical/SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md` (35 systems §3) | **High** (source-verified) | Readable in IVAULT primary repo; governs promotion decisions per SoT |
| Studio placement decision | STUDIO_ROUTING audit ADR | **High** | ET main for web studio |

### Attention & Verification

| Candidate | Evidence path | Confidence | Beats |
|-----------|---------------|------------|-------|
| Native signal runtime | integrations/eye-tracking/flutter-runtime/ | **High** | v1 branches, checkpoint monolith, attention_mediapipe |
| Proof Packet v0 schema | `docs/technical/PROOF_PACKET_SCHEMA_V0.md` + `integrations/eye-tracking/flutter-runtime/lib/proof/proof_packet_v0.dart` | **High** (schema/types) | Source-verified; **no runtime emission** — candidate wire format, not live pipeline |
| VSL operator bands | verification_stability_layer.dart | **Medium** | Ad-hoc debug HUD |
| Web vision cherry-pick set | archive @ 22cabd3 (13 files) | **High** | v2 archive baseline, v2 main adapters-only |
| validate-attention edge fn | `github-source-repos/eye-earn-sparkle-archive/supabase/functions/validate-attention/index.ts` | **Medium** | Source-verified; authoritative for promo attention sessions only — not ProofPacketV0 / full POPS |

### Trust & POPS

| Candidate | Evidence path | Confidence | Beats |
|-----------|---------------|------------|-------|
| Backend POPS executable | `integrations/old-source-preservation/ivault-eye-tracking/snapshot/services/api/src/pops/` (~184 files) | **High** (snapshot) | Flutter `lib/pops/` partial; not promoted to migration archive root |
| Safe Action Execution Engine | integrations/eye-tracking/source/.../safe-action-engine.ts | **High** | trust-impact seeds alone |
| Evidence Vault v2 SQL | `integrations/old-source-preservation/ivault-eye-tracking/snapshot/supabase/migrations/204–209_*.sql` | **Medium** | Source-verified admin custody in preservation snapshot; not in archive Supabase migrations |
| POPS architecture doc | `docs/technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` | **High** (design) | Source-verified six-layer model §2; design canonical per SoT — execution gap remains |

### Economy & Wallet

| Candidate | Evidence path | Confidence | Beats |
|-----------|---------------|------------|-------|
| Supabase wallet ledger | eye-earn-sparkle-archive Feb 18 migrations | **High** | Flutter wallet_ledger_engine sim |
| issue-reward edge fn | archive Supabase | **High** | Demo setTimeout settle |
| Transaction status taxonomy | demoState types | **Medium** | app/ simplified types |

### Creator Economy

| Candidate | Evidence path | Confidence | Beats |
|-----------|---------------|------------|-------|
| Studio collab/media types | integrations/eye-tracking/source/src/screens/studio/ | **High** | Legacy Stage 1–7 reducer |
| IVAULT publish/post-package types | preservation snapshot publish/ | **Medium** | Legacy studio-publish mock |
| i Command router + fixtures | preservation src/lib/i/ | **Medium** | Unstructured command ideas |
| Archive AI studio widgets | eye-earn-sparkle-archive components/studio/ | **Medium** | IVAULT mock panels alone |

---

## Tier 2 — Experimental (Preserve, Extract Patterns, Do Not Canonize Whole)

| Item | Why experimental | Extract |
|------|------------------|---------|
| investor-demo-mode-v2 full branch | Full app overlay | demoState, presenter controls, HeroEntry |
| IVAULT platform monolith @ d23d365 | 2368-file checkpoint | POPS API, contracts, SQL slices |
| attention_mediapipe plugin | Parallel native | Diff vs flutter-runtime |
| Tobii WebSocket | Hardware-specific | None unless hardware decision |
| Y-plane transport flag | Perf experiment | Benchmark results only |
| ELO mock shell | Not ranking engine | Permission model patterns |
| HTML 02–08 prototypes | Static design | UX copy/layout references |
| Red-team adversarial_layer | Simulation | Test scenario ideas |

---

## Tier 3 — Obsolete (Do Not Promote)

| Item | Reason |
|------|--------|
| cursor/v1-* branches | Identical stale bookmarks |
| cursor/dev-environment-setup | Superseded compile fix |
| codex/investor-demo-mode v1 | Superseded by v2 |
| v2 archive for web vision promotion | Superseded by 22cabd3 |
| Flutter CLIENT SIMULATION economy files | Explicitly non-authoritative |
| Bulk merge IVAULT → ET main | Destroys T-series |
| Studio mock proof | Not cryptographic / not v0 |

See `OBSOLETE/INDEX.md`.

---

## Tier 4 — Unknown (Needs Owner Decision)

| Item | Question |
|------|----------|
| Coin naming map | Vicoin/Icoin → aCoins/iCoins/vCoins? **See synthesis §5 + `P0_BATCH_03_CURRENCY_RECONCILIATION_NOTES.md`** |
| rCoin definition | Pool vs hub vs reputation — **blocked (CR-04)** |
| Demo canonical URL | 6+ lineages — **blocked (HI-01)** |
| Product vs demo IA | 4-tab vs multi-screen — **blocked (HI-02)** |
| Attention session bypass | Owner YES in conv 039 — **blocked (CR-01)** |
| iVatar scope | Product concept vs cut feature? |
| Fourth studio merge | Which lineage wins for ship? |
| Full 35-system SoT | Verified in IVAULT `docs/technical/SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md` §3 — reconcile with workspace checkout |
| Dual demo long-term | Maintain both app/ and archive demo indefinitely? |

See `RESEARCH/GAPS_AND_UNKNOWNS.md` and **`CHAT_RECOVERY/EXTRACTED/P0_BATCHES_01_04_SYNTHESIS.md` §12**.

---

## Canonical Stack Recommendation (Knowledge Synthesis)

When [ i ] is eventually unified, audits converge on this **target stack** (not implementation plan):

```
Constitution:     i_SOURCE_OF_TRUTH
Loop 1 UX:        app/ + pending UX pattern from demoState (candidate)
Native signals:   flutter-runtime + Proof Packet v0 emission (gap)
Web signals:      22cabd3 vision files in Capacitor shell
Validation:       validate-attention for promo sessions + POPS API candidate
Wallet:           Supabase ledger + pending holds
Trust actions:    safe-action-engine + backend trust rules
Admin custody:    Evidence Vault v2 SQL candidate
Creator tools:    source/ collab + IVAULT publish contracts + archive widgets
Investor pitch:   Dual path — Loop 1 spine + optional full-app demo
```

---

## Confidence Summary

| Tier | Count | Action |
|------|-------|--------|
| Declared canonical | 4 | Already in MASTER_BRAIN/CANONICAL/ |
| Audit-backed candidates | ~25 | Reference during reconciliation; several need source-path verification |
| Experimental | ~14 | INDEX in EXPERIMENTAL/ |
| Obsolete | ~13 | INDEX in OBSOLETE/ |
| Unknown | ~5 | RESEARCH/ |

**Next knowledge step (not implementation):** Owner review of Tier 4 unknowns + synthesis §12 agenda; **fix attention session bypass (CR-01)**; coin glossary decision; promote preservation authority docs or unify workspace with IVAULT primary repo. **Continue P0 extraction (ranks 41+) in parallel with owner session.**
