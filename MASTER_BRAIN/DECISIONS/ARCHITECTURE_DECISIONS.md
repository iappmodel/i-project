# Architecture & Product Decisions (Extracted)

**Classification:** Canonical decisions from audits  
**Confidence:** High where explicitly stated in branch audits

## ADR-001: Product Constitution
**Decision:** `[ i ] Source of Truth` is highest-level product document.  
**Status:** Declared by owner.  
**Evidence:** `MASTER_BRAIN/CANONICAL/i_SOURCE_OF_TRUTH.md`

## ADR-002: ET Repo Scope
**Decision:** `eye_tracking_app/main` = Flutter eye-tracking OS + Intent OS only. No Studio/web economics on main.  
**Status:** Accepted in audits.  
**Evidence:** STUDIO_ROUTING audit §1; PRE_COMPOSER audit

## ADR-003: Studio Placement
**Decision:** Studio + i Command live in web integration (`i_project_migration_archive` / eye-earn-sparkle-archive), not ET main.  
**Status:** Accepted.  
**Evidence:** STUDIO_ROUTING audit §15

## ADR-004: Dual Investor Demo Strategy
**Decision:** Keep `app/` Loop 1 spine separate from archive full-app demo mode. Extract UX patterns, don't merge architectures.  
**Status:** Accepted.  
**Evidence:** INVESTOR_DEMO v2 audit §1, §4

## ADR-005: Web Vision Promotion
**Decision:** Cherry-pick `eye-earn-sparkle-archive/codex/vision-unified-pipeline` @ `22cabd3`, not v2 archive wholesale.  
**Status:** Accepted.  
**Evidence:** VISION_UNIFIED_PIPELINE audit; EYE_EARN_SPARKLE_V2 audit

## ADR-006: Native Runtime Canonical
**Decision:** Promoted `integrations/eye-tracking/flutter-runtime/` from ET main T-series — not checkpoint branches.  
**Status:** Accepted.  
**Evidence:** PRE_COMPOSER audit; CURSOR_V1 audit

## ADR-007: Backend POPS Reference
**Decision:** IVAULT `services/api/src/pops/` is most complete executable POPS — reconcile to Proof Packet v0, don't bulk-merge branch.  
**Status:** Accepted.  
**Evidence:** EVIDENCE_VAULT audit §6

## ADR-008: Evidence Vault ≠ Proof Packet
**Decision:** Complementary layers — device handoff vs admin legal custody.  
**Status:** Accepted.  
**Evidence:** EVIDENCE_VAULT audit §4.5

## ADR-009: Pending-First Wallet UX
**Decision:** Pending-first earn is a canonical-aligned UX requirement, but `demoState` is only an experimental reference pattern.  
**Status:** Recommended in audits — **not yet verified as implemented** in `app/`.  
**Evidence:** INVESTOR_DEMO v2 audit §6; I_INITIAL_STRUCTURES audit §7

## ADR-010: Close Stale Cursor Branches
**Decision:** cursor/v1-* and dev-environment-setup branches are obsolete bookmarks — no promotion.  
**Status:** Closed.  
**Evidence:** CURSOR_V1 audit; CURSOR_DEV_ENV audit

## ADR-011: Client Liveness Non-Authoritative
**Decision:** Web livenessScore and native likelyFake are hints only — not payout truth.  
**Status:** Accepted.  
**Evidence:** VISION_UNIFIED_PIPELINE audit §6

## ADR-012: ELO ≠ Recommendation Engine
**Decision:** "ELO" in i-initial-structures = personal intelligence UI mock, not ranking engine. iVatar not implemented.  
**Status:** Accepted.  
**Evidence:** I_INITIAL_STRUCTURES audit §4–5
