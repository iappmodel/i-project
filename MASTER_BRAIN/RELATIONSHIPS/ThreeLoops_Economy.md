# Relationship: Three Loops ↔ Economy

**Classification:** Candidate — strong Claude/OpenAI alignment  
**Confidence:** High

---

## The three loops (product brief rank 9)

| Loop | Flow | Economic meaning |
|------|------|------------------|
| **Loop 1** | Watch → Verify → Earn | Attention → aCoins → wallet |
| **Loop 2** | Browse → Save → Return | Discovery → retention → future earn |
| **Loop 3** | Balance → Convert → Use | iCoins utility → marketplace |

---

## Loop 1 — detail (MVP spine)

```mermaid
flowchart LR
  Feed[Feed / Earn tab]
  Watch[Watch content]
  Verify[POP + 5 gates]
  Reward[Pending reward]
  Wallet[Wallet]
  iGET[iGET claim UX]

  Feed --> Watch --> Verify --> Reward --> Wallet --> iGET
```

**Constitution core loop:** identical spine.

**Demo:** `app/` 13-screen linear flow.

---

## Loop 2 — detail

| Step | System |
|------|--------|
| Browse | Feed, iMAP (future), iHEAR (future) |
| Save | Bookmarks, creator follow |
| Return | Notifications, Elo nudges (candidate) |

**Revenue:** Indirect — enables Loop 1 repeat + creator value.

---

## Loop 3 — detail

| Step | System |
|------|--------|
| Balance | Wallet 4-state view |
| Convert | a/e → i pipeline (candidate rates) |
| Use | iPAY, iBUY, withdraw preview |

**Trust affects:** conversion rates, withdraw speed (constitution).

---

## Navigation law (conv 014)

**4 tabs:** Feed · Earn · Wallet · Profile

Maps to loops:

| Tab | Primary loop |
|-----|--------------|
| Feed | Loop 2 + Loop 1 entry |
| Earn | Loop 1 primary |
| Wallet | Loop 3 primary |
| Profile | Trust, identity, iAM (future) |

**Owner confirmed 2026-05-25:** 4-tab IA locked. Linear presenter in `app/` remains pitch mode until 4-tab shell lands.

| Tab | Primary loop |
|-----|--------------|
| Feed | Loop 2 |
| Earn | Loop 1 (presenter flow) |
| Wallet | Loop 3 |
| Profile | Trust + roadmap (modules TBD — MOD-01 deferred) |

See `DECISIONS/DEMO_IA_ADR.md`.

---

## Revenue split (all loops)

**60% Creator · 30% Viewer · 10% Platform**

Applies to campaign economics across Loop 1 and creator tools.

---

## Evidence

| Rank | Source |
|------|--------|
| 9 | Attention wallet product brief |
| 14 | UX/UI strategy separation |
| 21 | App redesign strategy |
| 1 | Complete feature breakdown |

See `CANONICAL/CORE_LOOP.md`, `docs/MVP_CANONICAL_FLOW.md`
