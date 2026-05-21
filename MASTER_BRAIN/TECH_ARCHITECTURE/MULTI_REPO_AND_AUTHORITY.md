# Technical Architecture Knowledge Map

**Classification:** Mixed  
**Confidence:** Medium

## Multi-Repo Topology

11 cloned repos at `github-source-repos/`. Migration archive = promotion/integration hub, not single app.

| Repo | Role |
|------|------|
| eye_tracking_app | Native Flutter runtime, Intent OS |
| eye-earn-sparkle-archive | Production Capacitor/React + Supabase |
| eye-earn-sparkle-v2 | Parallel line; vision archive baseline |
| i-initial-structures | Safe-action, studio types, ELO mock |
| i-project | This migration archive |

## Authority Contract (Source-Verified — Preservation Snapshot)

Paths verified 2026-05-21 in `integrations/old-source-preservation/ivault-eye-tracking/snapshot/docs/`:

| Doc | Path |
|-----|------|
| Ownership contract | `.../snapshot/docs/source-of-truth-ownership-contract.md` |
| Runtime wiring matrix | `.../snapshot/docs/runtime-wiring-matrix.md` |

These are **not yet promoted** to `docs/` at archive root. See [`EVIDENCE_VERIFICATION.md`](../EVIDENCE_VERIFICATION.md).

| Domain | Canonical writer (per ownership contract) |
|--------|-------------------------------------------|
| Wallet / ledger / payouts | Backend API / Supabase |
| Trust / fraud decisions | Backend POPS + admin |
| POPS scoring | Backend |
| Flutter / web clients | **Signals only** — no silent money writes |
| On-device Intent OS | UI action gates only |

## Promoted Integration Paths

```
eye_tracking_app/main → integrations/eye-tracking/flutter-runtime/
i-initial-structures/main → integrations/eye-tracking/source/
IVAULT d23d365 → integrations/old-source-preservation/ivault-eye-tracking/snapshot/
```

## Subsystem Registry (35 systems — source-verified)

Verified in `docs/technical/SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md` §3 (IVAULT primary repo): Android/web vision, POPS, proof, wallet, studio, ELO, iVatar, admin, payments, documentation — 35 numbered rows with canonical repo · branch · path.

## Intent OS (Flutter)

```
EventBus → IntentEngine → AutonomousAgent → UISandbox →
AutonomousExecutionKernel (governance → safety → execute)
```

Kernels: GovernanceKernel, SafetyKernel, ActionPipelineKernel. **Not wallet authority.**

## Proof Pipeline (Target Architecture)

```
Device signals → Proof Packet v0 (schema target) → POPS scoring candidate → Pending wallet →
Evidence Vault custody (admin)
```

**Current gap:** Packet emission and POPS ingestion are **confirmed unbuilt** in source docs (`PROOF_PACKET_SCHEMA_V0.md` §3; `proof_packet_v0.dart` header).

**Sources:** EVIDENCE_VAULT audit §8; STUDIO_ROUTING audit; CURSOR_V1 audit; MULTI_REPO report
