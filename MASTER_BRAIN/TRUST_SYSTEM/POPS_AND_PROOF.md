# POPS — Proof of Presence System

**Classification:** Canonical-aligned architecture (referenced docs); Experimental/Partial (code)  
**Confidence:** Medium — core docs are audit-referenced but were not directly readable during quality review

## Six-Layer Model (Documented)

1. Signal capture (device)
2. Proof packet handoff
3. Multi-signal scoring
4. Delayed validation / review
5. Reward decision
6. Wallet settlement (pending → available)

## Executable Implementations

| Layer | Best evidence | Status |
|-------|---------------|--------|
| Scoring/decision/wallet hold | IVAULT `services/api/src/pops/` (~70 files, tests) | **Most complete executable** |
| Flutter hooks | IVAULT `lib/pops/` (6 files) | Partial — no proof packets |
| i-project docs | `POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md` | Canonical design candidate; source doc requires verification |
| Proof wire format | `PROOF_PACKET_SCHEMA_V0.md`, `proof_packet_v0.dart` | Schema target — **no verified emission** |
| Web path | validate-attention → issue-reward | Production promo path — not POPS packet |

## Scoring Dimensions (Backend)

Weighted: presence, attention, intent, continuity + automation/impossible-behavior fraud signals.

## Critical Distinction

**Evidence Vault v2** = admin legal custody (SQL 204–209).  
**Proof Packet v0** = device → platform handoff.  
**Complementary layers**, not duplicates.

**Sources:** EVIDENCE_VAULT audit §4–§6; STUDIO_ROUTING audit; constitution Core Loop
