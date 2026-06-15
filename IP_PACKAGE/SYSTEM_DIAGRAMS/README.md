# System Diagrams — [ i ] Project IP Package

Architecture diagrams supporting patent family applications. Each diagram uses ASCII art for universal rendering compatibility.

---

## Family 01: POP Core — Proof of Presence Pipeline

```
  ┌─────────────────────────────────────────────────────────────┐
  │                     ON-DEVICE (Flutter)                      │
  │                                                             │
  │  Camera → Y-Plane → MediaPipe → Face/Eyes/Gaze/Pose        │
  │      │                   │                                  │
  │      ▼                   ▼                                  │
  │  ┌────────────┐   ┌──────────────┐                          │
  │  │ Attention  │   │ Calibration  │                          │
  │  │ Scoring    │   │ (Affine +    │                          │
  │  │ (EMA)      │   │  Residual)   │                          │
  │  └─────┬──────┘   └──────┬───────┘                          │
  │        │                 │                                  │
  │        ▼                 ▼                                  │
  │  ┌──────────────────────────────┐                           │
  │  │ Verification Stability Layer │                           │
  │  │ (VSL) — Rolling Window       │                           │
  │  │ POOR→WARMING→USABLE→STRONG  │                           │
  │  └─────────────┬────────────────┘                           │
  │                │                                            │
  │                ▼                                            │
  │  ┌──────────────────────────────┐                           │
  │  │ Proof Packet v0 (Sealed)    │                            │
  │  │ - derived metrics only      │                            │
  │  │ - no raw video/landmarks    │                            │
  │  │ - session hash + timestamp  │                            │
  │  └─────────────┬────────────────┘                           │
  └────────────────┼────────────────────────────────────────────┘
                   │ (HTTPS)
                   ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                    SERVER (Supabase Edge)                    │
  │                                                             │
  │  ┌───────────────┐   ┌─────────────────┐                    │
  │  │ POPS Scoring   │   │ Decision Engine  │                   │
  │  │ 6 Independent  │──▶│ (State Machine)  │                   │
  │  │ Proof Layers   │   │                  │                   │
  │  └───────────────┘   └────────┬──────────┘                  │
  │                               │                             │
  │         ┌─────────────────────┼─────────────────┐           │
  │         ▼                     ▼                 ▼           │
  │  ┌──────────┐         ┌──────────┐       ┌──────────┐      │
  │  │ APPROVED │         │ PARTIAL  │       │ REJECTED │      │
  │  │ (full)   │         │ (reduced)│       │ (zero)   │      │
  │  └────┬─────┘         └────┬─────┘       └──────────┘      │
  │       │                    │                                │
  │       ▼                    ▼                                │
  │  ┌──────────────────────────────────┐                       │
  │  │ Settlement Engine (Trust-Tier)   │                       │
  │  │ t0=4h  t1=1h  t2=instant        │                       │
  │  └────────────────┬─────────────────┘                       │
  │                   │                                         │
  │                   ▼                                         │
  │  ┌──────────────────────────────────┐                       │
  │  │ Wallet Ledger (Append-Only)      │                       │
  │  │ Value lots → Balance projection  │                       │
  │  └──────────────────────────────────┘                       │
  └─────────────────────────────────────────────────────────────┘
```

---

## Family 03: Intent OS — Safety Gate Chain

```
  User Gaze/Voice Input
          │
          ▼
  ┌───────────────────┐
  │ 1. EMERGENCY KILL │ ← hardware/panic override
  └────────┬──────────┘
           │ pass
           ▼
  ┌───────────────────┐
  │ 2. PREFILTER      │ ← basic sanity (null, malformed)
  └────────┬──────────┘
           │ pass
           ▼
  ┌───────────────────┐
  │ 3. EXTERNAL/OS    │ ← gaze-isolated: no financial/OS actions
  │    POLICY         │    from gaze-only paths
  └────────┬──────────┘
           │ pass
           ▼
  ┌───────────────────┐
  │ 4. HIGH-RISK LANE │ ← blocks payments, deletions,
  │                   │    system settings from gaze-only
  └────────┬──────────┘
           │ pass
           ▼
  ┌───────────────────┐
  │ 5. GOVERNANCE     │ ← confidence > 0.85
  │    KERNEL         │    risk < threshold
  │                   │    fixation + dwell required
  │                   │    rate limit > 600ms
  │                   │    reversibility check
  └────────┬──────────┘
           │ pass
           ▼
  ┌───────────────────┐
  │ 6. SAFETY KERNEL  │ ← final sanity + audit log
  └────────┬──────────┘
           │ pass
           ▼
  ┌───────────────────┐
  │ 7. EXECUTE        │ → UI commit via unified executor
  └───────────────────┘
```

---

## Family 04: Elo AI Companion — Runtime Pipeline

```
  User Input (text/voice)
          │
          ▼
  ┌───────────────────┐
  │ DOCTRINE LAYER    │ ← regex blocks:
  │                   │   - "skip verification"
  │                   │   - "give me coins"
  │                   │   - "I can guarantee"
  │                   │   - financial manipulation
  └────────┬──────────┘
           │ pass (safe)
           ▼
  ┌───────────────────┐
  │ PERSONALIZATION   │ ← user context, history, tone
  └────────┬──────────┘
           │
           ▼
  ┌───────────────────┐
  │ COMPOSE           │ ← generate response (LLM)
  └────────┬──────────┘
           │
           ▼
  ┌───────────────────┐
  │ POST-PROCESS      │ ← final safety check + formatting
  └────────┬──────────┘
           │
           ▼
  ┌───────────────────────────────────┐
  │ EXPRESSION ENGINE                 │
  │ head pose + eye openness +        │
  │ attention score → orb/face state  │
  └────────┬──────────────────────────┘
           │
           ▼
  ┌───────────────────────────────────┐
  │ PRESENCE LAYER (Glass Membrane)   │
  │ floating orb + zones + speech     │
  │ energy visualization              │
  └───────────────────────────────────┘
```

---

## Family 05: Wallet & Settlement — Two-Step Reward

```
  Device (Watch Session)
          │
          │ 1. Raw attention samples
          │    (no amount, no userId)
          ▼
  ┌───────────────────────────┐
  │ validate-attention        │
  │ Edge Function             │
  │                           │
  │ - Extract JWT userId      │
  │ - Recompute attention     │
  │   score from raw samples  │
  │ - REJECT client's score   │
  │ - Issue single-use token  │
  └─────────────┬─────────────┘
                │
                │ 2. Validated session token
                ▼
  ┌───────────────────────────┐
  │ issue-reward              │
  │ Edge Function             │
  │                           │
  │ - Validate token (1-use)  │
  │ - Check daily caps        │
  │   (80 iCoin, 120 vCoin)  │
  │ - Apply trust tier mult.  │
  │ - Atomic ledger insert    │
  └─────────────┬─────────────┘
                │
                ▼
  ┌───────────────────────────┐
  │ Append-Only Wallet Ledger │
  │                           │
  │ Rule 2: no manual edits   │
  │ Rule 4: lots immutable    │
  │ Rule 8: balance = SUM     │
  │          of lot values    │
  │                           │
  │ Lot types: EARNED, BONUS, │
  │ CONVERTED, PURCHASED      │
  └───────────────────────────┘
```

---

## Cross-Family Dependency Map

```
            POP CORE (Family 01)
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
 ATTENTION      INTENT OS        WALLET
 (Fam 02)      (Fam 03)        (Fam 05)
    │               │               │
    │    ┌──────────┤               │
    │    │          │               │
    │    ▼          ▼               │
    │  ELO AI    CREATOR          │
    │  (Fam 04)  (Fam 08)        │
    │               │               │
    │    ┌──────────┘               │
    │    │                          │
    ▼    ▼                          ▼
 MARKETPLACE                   ECONOMY UX
 (Fam 07)                     (Fam 06)

 IMMERSIVE UI (Fam 09) ← independent (design)
 MODULES (Fam 10) ← depends on Fam 01 + 05
```

---

*These diagrams are generated for patent filing support. Vector/Mermaid versions available on request.*
