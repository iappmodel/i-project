# Core Loop — Canonical Definition

**Classification:** Canonical (from i_SOURCE_OF_TRUTH)  
**Confidence:** High — declared constitution

## Loop

```
Watch → Verify → Reward → Wallet → Spend / Convert / Withdraw → Repeat
```

## Repository Evidence Mapping

| Step | Canonical intent | Best evidence in archive | Status |
|------|-------------------|--------------------------|--------|
| Watch | User consumes content with attention | `app/` WatchVerifyScreen; archive feed + MediaCard | Partial — multiple UX paths |
| Verify | Qualify attention, not surveil | POPS docs (referenced); Proof Packet v0 schema (referenced); validate-attention edge fn | Source docs require verification; emission gap remains |
| Reward | Compensate verified attention | issue-reward (audit reference); demoState pending flow | Production-path and demo-path evidence are split |
| Wallet | Economic identity | eye-earn-sparkle-archive Supabase ledger (audit reference); app WalletScreen | Backend authority is audit-backed, not directly verified in this pass |
| Spend/Convert/Withdraw | Utility of earned value | WalletScreen, MerchantCheckout, Convert/Withdraw screens | Mixed mock + production |
| Repeat | Retention via earning + trust | Trust tiers, streak UX (mock) | Narrative more than wired |

## Critical Gap (Evidence)

Audits report promoted Flutter runtime has `proof_packet_v0.dart` types but **does not emit packets**. Canonical `app/` appears to **instant-credit** rewards in some paths while POPS and investor-demo v2 use **pending-first** UX. Core loop is **designed but not fully verified as wired** across repos.

**Sources:** `docs/technical/EVIDENCE_VAULT_V2_HARDENING_BRANCH_AUDIT.md`, `INVESTOR_DEMO_MODE_V2_BRANCH_AUDIT.md`, `PROOF_PACKET_SCHEMA_V0.md` (referenced)
