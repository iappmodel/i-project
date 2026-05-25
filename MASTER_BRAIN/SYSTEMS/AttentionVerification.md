# Attention Verification System

**Classification:** Mixed — design strong, wiring partial  
**Confidence:** Medium  
**Critical blocker history:** CR-01 session bypass — **resolved in demo paths 2026-05-25**

---

## One-sentence definition

**Attention verification** qualifies whether a user's engagement met campaign rules — using dwell, interaction, device signals, optional gaze, and **server-side session gates** — without claiming perfect knowledge of inner attention.

---

## Philosophy (constitution + conv 039)

| Principle | Meaning |
|-----------|---------|
| Qualification not surveillance | Probabilistic confidence, not certainty |
| Server authority | Client signals inform; server decides reward |
| Session integrity | No session → no reward (CR-01) |
| ACS model | Attention Confidence Score — PC/EQ/Penalty components |

---

## Verification stack

| Layer | Component |
|-------|-----------|
| Capture | POP multimodal channels |
| Stability | VSL (Verification Stability Layer) |
| Session | `attentionSession.ts` (app), `attention_sessions` schema (chat 039) |
| Scoring | ACS / POPS six layers |
| Handoff | Proof Packet v0 |
| Settlement | validate-attention → pending wallet |

---

## 5-gate overlay (UX — Loop 1 demo)

From feature bible + conv 014/021:

1. Consent / camera gate  
2. Presence  
3. Dwell / watch time  
4. Interaction quality  
5. Verification result → reward reveal  

**app/** implements narrative gates; Flutter implements real signals.

---

## Split endpoints (chat 039 — candidate)

| Endpoint | Role |
|----------|------|
| validate-attention | Attention-qualified rewards |
| issue-attention-reward | Settlement after validation |
| (non-attention rewards) | Separate path — no bypass |

---

## Status matrix

| Item | State |
|------|-------|
| Session gating in `app/` | ✅ Fixed |
| sparkle-archive Index.tsx | ✅ Hardened |
| Flutter Seal Proof session check | ✅ Implemented |
| POPS full ingestion | ❌ Not wired |
| ACS in production DB | ⚠️ Schema in chat — verify Supabase |

**Evidence:** P0 batches 01–04 synthesis §1; conv 039; `ATTENTION_SYSTEM/VERIFICATION_AND_VISION.md`
