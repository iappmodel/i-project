# SYSTEMS — Index

**Generated:** 2026-05-25  
**Sources:** 189 Desktop extractions + MASTER_BRAIN domain maps + branch audits

---

## What is a System?

A **system** is operational machinery — code paths, pipelines, and subsystems that **do work**. Entities (Elo, POP) are **who**; systems are **how**.

---

## System Registry

| System | Role | Status | Doc |
|--------|------|--------|-----|
| **Wallet** | Economic identity — balances, pending, history | Candidate — backend authoritative | [Wallet.md](./Wallet.md) |
| **Eye Tracking** | Native gaze signal channel (inside POP) | Canonical candidate (flutter-runtime) | [EyeTracking.md](./EyeTracking.md) |
| **Attention Verification** | Qualification pipeline — sessions, gates, ACS | Blocked → CR-01 resolved in demo | [AttentionVerification.md](./AttentionVerification.md) |
| **Proof & Seal** | Proof Packet v0, Seal Proof, handoff | Schema canonical; wallet unwired | [ProofAndSeal.md](./ProofAndSeal.md) |
| **Studio** | Creator media pipeline — record, edit, publish | Experimental — 3 lineages | [Studio.md](./Studio.md) |
| **Creator Economy** | Campaigns, splits, marketplace | Candidate | [CreatorEconomy.md](./CreatorEconomy.md) |
| **Remote Control** | Cross-device control / Intent OS extension | Experimental | [RemoteControl.md](./RemoteControl.md) |
| **Module Alphabet** | iGET, iGO, iHEAR, iMAP… | Candidate — post-MVP modules | [ModuleAlphabet.md](./ModuleAlphabet.md) |

---

## Core pipeline (technical)

```
Device signals (Eye Tracking, touch, GPS…)
  → POP / VSL / ACS
  → Attention Session
  → Seal Proof (Proof Packet v0)
  → POPS / validate-attention
  → Pending Wallet
  → iGET (claim) → iCoins
```

See [`../RELATIONSHIPS/Attention_Proof_Reward.md`](../RELATIONSHIPS/Attention_Proof_Reward.md)

---

## Build priority (constitution)

1. Investor Demo  
2. Attention Wallet  
3. Watch → Verify → Earn  
4. Wallet System  
5. Trust System  
6. Marketplace → Creator Economy → Campaign Builder → Full currency

Systems above Studio/Elo/iAM modules for MVP.

---

## Evidence hierarchy

1. `CANONICAL/i_SOURCE_OF_TRUTH.md`  
2. Branch audits (`docs/technical/*_AUDIT.md`)  
3. Promoted `integrations/` + `app/`  
4. Chat extractions (Desktop + P0 batches)
