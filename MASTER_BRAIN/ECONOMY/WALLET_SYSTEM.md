# Wallet System Knowledge Map

**Classification:** Mixed  
**Confidence:** Medium — authoritative backend identified; UX fragmented

## Canonical Role

Wallet = user's economic identity. Holds balances, pending, restricted earnings, transaction history, reputation-linked privileges.

## Competing Implementations

| Implementation | Location | Authority | Classification |
|----------------|----------|-----------|----------------|
| Supabase wallet ledger | eye-earn-sparkle-archive migrations (Feb 18) | **Authoritative** when deployed | Canonical candidate |
| Backend POPS wallet | IVAULT `services/api/src/pops/wallet/` | **Authoritative** per ownership contract | Canonical candidate (reference) |
| demoState.ts | archive investor-demo v2 | Demo localStorage | **Experimental** — best pending UX |
| app/demoContext.tsx | migration archive `app/` | Instant credit in some paths | **Experimental** — gap vs POPS |
| Flutter simulation | IVAULT checkpoint `wallet_ledger_engine.dart` | Non-authoritative | **Obsolete for production** |
| ELO mock wallet | i-initial-structures fixtures | Mock | **Experimental** |

## Pending-First vs Instant Credit

| Path | Behavior | POPS alignment |
|------|----------|----------------|
| POPS architecture docs | Delayed validation, holds | **Canonical intent** |
| demoState verification_required | Timer settle after delay | **Experimental UX match** |
| app/ finishRewardToWallet | Instant credit | **Conflict** |
| investor-demo (i-initial-structures branch) | Instant credit | **Conflict** |

## Transaction Status Model (Best UX Reference)

From `demoState.ts`: `pending`, `completed`, `reversed`, `verification_required` with reasons (`verification`, `fraud_review`, `compliance_review`, etc.)

**Sources:** EVIDENCE_VAULT audit §9; INVESTOR_DEMO v2 audit §6
