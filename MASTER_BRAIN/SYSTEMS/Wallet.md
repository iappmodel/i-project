# Wallet System

**Classification:** Mixed — authoritative backend identified; UX fragmented  
**Confidence:** Medium  
**Supersedes detail in:** `ECONOMY/WALLET_SYSTEM.md` (cross-linked)

---

## One-sentence definition

The **Wallet** is the user's **economic identity** — balances, pending earnings, transaction history, and reputation-linked privileges.

---

## Core loop position

```
Watch → Verify → Reward → **Wallet** → Spend / Convert / Withdraw → Repeat
```

Loop 3 (product): **Balance → Convert → Use**

---

## Four-state model (candidate — conv 014, 038)

| State | Meaning |
|-------|---------|
| Available | Spendable / withdrawable |
| Pending | Awaiting verification or hold |
| Restricted | Compliance / fraud review |
| Verification required | User action needed |

---

## Competing implementations

| Implementation | Location | Authority |
|----------------|----------|-----------|
| Supabase ledger | eye-earn-sparkle-archive migrations | **Canonical candidate** (deployed) |
| POPS wallet | IVAULT snapshot `pops/wallet/` | Reference |
| `app/demoContext.tsx` | migration archive | Pending-first (CR-01 fixed) |
| demoState.ts | investor-demo v2 | Best pending UX pattern |
| ELO mock fixtures | i-initial-structures | Experimental |

---

## Currency holdings (MVP — ADR-001)

| Coin | Wallet role |
|------|-------------|
| aCoins | Attention — foundation, not directly withdrawable |
| iCoins | Cash-value — withdrawable |
| vCoins | Utility — boosts, features |
| eCoins | Engagement above attention gate |
| oCoins | External provenance |

Naming fork: Vicoin/Icoin in archive UI → map at presentation layer.

---

## Module interface

| Module | Wallet interaction |
|--------|-------------------|
| **iGET** | Claim / receive qualified rewards |
| **iPAY** | Spend |
| **iSAVE** | Hold / escrow |
| **iTIP** | Creator tips |
| **iBUY** | Marketplace checkout |

---

## Critical conflicts

| Conflict | Status |
|----------|--------|
| Instant credit vs pending-first | CR-01 fixed in app; verify POPS path |
| Vicoin/Icoin vs a/i/v | ADR-001 working default |
| Simulation-only trust in demos | Backend exists, not wired to Loop 1 |

**Evidence:** ranks 9, 11, 20, 26, Desktop chats + `DUPLICATES_AND_CONFLICTS.md`
