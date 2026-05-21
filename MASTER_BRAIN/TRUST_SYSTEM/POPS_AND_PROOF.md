# POPS — Proof of Presence System

**Classification:** Canonical-aligned architecture (source-verified design); Experimental/Partial (runtime wiring)  
**Confidence:** High (design doc); Medium (executable code)  
**Evidence pass:** 2026-05-21 — see [`EVIDENCE_VERIFICATION.md`](../EVIDENCE_VERIFICATION.md)

## Six-Layer Model (Source-Verified)

Per [`docs/technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](../../docs/technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md) §2:

| Layer | Question answered |
|-------|-------------------|
| Proof of Presence | Was a plausible human present? |
| Proof of Participation | Did the user perform required interaction? |
| Proof of Perception | Did attention align with content? |
| Proof of Signal | Are device/session signals consistent? |
| Proof of Session Integrity | Was the session continuous and un-tampered? |
| Proof of Reward Eligibility | Does the session qualify under campaign rules? |

> Note: `POPS_AND_PROOF.md` previously listed a simplified pipeline (capture → handoff → scoring → …). The **authoritative layer names** are in the architecture doc §2.

## Executable Implementations

| Layer | Best evidence | Status |
|-------|---------------|--------|
| Scoring/decision/wallet hold | `integrations/old-source-preservation/ivault-eye-tracking/snapshot/services/api/src/pops/` (~184 files) | **Most complete executable** (preservation snapshot) |
| Flutter hooks | IVAULT `lib/pops/` (6 files) | Partial — no proof packets |
| Design doc | `docs/technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` | **Source-verified** — canonical design per SoT |
| Proof wire format | `docs/technical/PROOF_PACKET_SCHEMA_V0.md`, `integrations/eye-tracking/flutter-runtime/lib/proof/proof_packet_v0.dart` | **Source-verified schema/types** — **no verified emission** |
| Web path | `github-source-repos/eye-earn-sparkle-archive/supabase/functions/validate-attention/` | Production promo path — not POPS packet ingestion |

## Scoring Dimensions (Backend)

Weighted: presence, attention, intent, continuity + automation/impossible-behavior fraud signals.

## Critical Distinction

**Evidence Vault v2** = admin legal custody (`snapshot/supabase/migrations/204–209_*.sql`).  
**Proof Packet v0** = device → platform handoff (`PROOF_PACKET_SCHEMA_V0.md`).  
**Complementary layers**, not duplicates.

**Sources:** EVIDENCE_VAULT audit §4–§6; STUDIO_ROUTING audit; constitution Core Loop; source-verified POPS + proof docs
