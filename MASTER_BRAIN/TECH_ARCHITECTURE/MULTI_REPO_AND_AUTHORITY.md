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

## Authority Contract (From IVAULT Docs — Promotion Candidate)

| Domain | Canonical Writer |
|--------|------------------|
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

## Subsystem Registry (35 systems — per SYSTEM_PROMOTION_SOURCE_OF_TRUTH)

Referenced in audits: Android/web vision, POPS, proof, wallet, studio, ELO, iVatar, admin, payments, documentation. The full SoT table is cited as `docs/technical/SYSTEM_PROMOTION_SOURCE_OF_TRUTH.md`, but that source file was not readable during the quality review.

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

**Current gap:** Packet emission and POPS ingestion are not verified as wired.

**Sources:** EVIDENCE_VAULT audit §8; STUDIO_ROUTING audit; CURSOR_V1 audit; MULTI_REPO report
