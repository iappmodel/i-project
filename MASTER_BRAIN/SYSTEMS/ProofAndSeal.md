# Proof & Seal System

**Classification:** Schema canonical · Wallet handoff experimental  
**See also:** `TRUST_SYSTEM/SEAL_PROOF.md`, `ENTITIES/POP.md`

---

## One-sentence definition

**Proof & Seal** is the device-to-platform evidence pipeline — collecting session signals, building **Proof Packet v0**, and **sealing** it as an immutable artifact that authorizes (future) wallet settlement.

---

## Flow

```
Active attention session
  → ProofSessionCollector (samples)
  → VerificationStabilityLayer
  → ProofPacketEmitter.sealAndEmit()  ← "Seal Proof" button
  → ProofPacketSealedEvent (local bus)
  → (future) POPS ingestion → pending wallet
```

---

## Seal Proof

| Aspect | Detail |
|--------|--------|
| **What** | Verb — finalize Proof Packet v0 at session end |
| **Where** | Flutter debug UI + `proof_packet_emitter.dart` |
| **Invariant** | Throws without active session |
| **PR1 scope** | Local event + validator POST when configured |
| **Production** | POPS validate → pending hold → ledger settle ✅ (local) |

---

## vs other "proof" surfaces

| Surface | Type |
|---------|------|
| Flutter Seal Proof | **Real** packet build |
| `app/ProofLayerScreen` | **Narrative** for investors |
| Evidence Vault v2 | **Admin** legal custody — complementary |
| POPS backend | **Production** scoring authority |

---

## Schema authority

- `docs/technical/PROOF_PACKET_SCHEMA_V0.md`
- `integrations/pop-core/contracts/proof-packet-v0/`
- `flutter-runtime/lib/proof/proof_packet_v0.dart`

---

## Gap (confirmed)

Proof Packet → POPS → pending wallet **not wired**. Promotion sequence in pop-core docs.

**Evidence:** ranks 39, 108, 17; EVIDENCE_VERIFICATION.md
