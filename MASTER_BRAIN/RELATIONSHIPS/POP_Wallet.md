# Relationship: POP ↔ Wallet

**Classification:** Candidate — constitution-aligned, wiring incomplete  
**Confidence:** High (design intent) · Low (end-to-end wired)

---

## Canonical flow

```
POP validates session
  → Proof Packet sealed
  → Server confirms eligibility
  → Pending wallet entry
  → (hold period / trust rules)
  → Available balance
  → iGET claim moment (optional UX layer)
```

---

## Economic gates

| Gate | Enforcer | Blocker if missing |
|------|----------|-------------------|
| Session exists | Attention session + CR-01 | Reward rejected |
| POP eligibility | POPS / validate-attention | Pending or denied |
| Trust rules | Trust system | Slower payout, limits |
| Campaign rules | Creator/advertiser config | No match |

---

## Wallet states (POP interaction)

| Wallet state | POP trigger |
|--------------|---------------|
| Pending | Session submitted, awaiting validation |
| Verification required | Low confidence — resubmit proof |
| Available | POP + trust passed |
| Restricted | Fraud signal from POP layers |

---

## Currency entry (MVP)

| Coin | Typical POP path |
|------|------------------|
| aCoins | Verified attention session |
| eCoins | Engagement above aCoin gate |
| iCoins | Conversion from qualified value — not direct from raw gaze |

---

## Current gap

| Step | Status |
|------|--------|
| Flutter Seal Proof | ✅ Local packet |
| POPS ingestion | ❌ |
| Pending wallet RPC | ⚠️ In archive migrations, not wired to packet |
| app/ demo | ✅ Pending-first after CR-01 fix |

**Evidence:** EVIDENCE_VERIFICATION.md; conv 039; `SYSTEMS/Wallet.md`

---

## iGET role

**iGET** is the **user-facing claim layer** on top of wallet settlement — separates "you earned" from "you received."

See [Modules_Currency.md](./Modules_Currency.md)
