# Patent Family Map — [ i ] Project

**CONFIDENTIAL — [ i ] Project IP Package**

| Field | Value |
|-------|-------|
| **Document ID** | IP-FAM-2026-001 |
| **Date** | 2026-06-15 |
| **Total families** | 10 |
| **Total applications (estimated)** | 42+ (8 existing + 34 new) |

---

## Family Dependency Overview

```
                    ┌──────────────────┐
                    │   FAMILY 01      │
                    │   POP CORE       │
                    │   (8 apps, P1-P8)│
                    │   [FOUNDATION]   │
                    └────────┬─────────┘
                             │
        ┌────────┬───────────┼───────────┬────────┐
        │        │           │           │        │
        ▼        ▼           ▼           ▼        ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │FAM 02  │ │FAM 03  │ │FAM 04  │ │FAM 05  │ │FAM 06  │
    │Attent. │ │Intent  │ │Elo AI  │ │Wallet  │ │Economy │
    │Verific.│ │OS      │ │Compan. │ │Settle. │ │UX      │
    └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
        │          │          │          │          │
        │    ┌─────┘          │          │          │
        │    │    ┌───────────┘          │          │
        ▼    ▼    ▼                      ▼          ▼
    ┌────────┐ ┌────────┐          ┌────────┐ ┌────────┐
    │FAM 07  │ │FAM 08  │          │FAM 09  │ │FAM 10  │
    │Market- │ │Creator │          │Immersi.│ │Modules │
    │place   │ │Tools   │          │UI      │ │Identity│
    └────────┘ └────────┘          └────────┘ └────────┘
```

**Legend:** All families depend on Family 01 (POP Core) as the foundation proof system. Families 07-08 additionally depend on attention verification (02), intent OS (03), and Elo (04) for composite claims.

---

## Family 01: POP Core

| Field | Value |
|-------|-------|
| **Family ID** | POP-FAM-2026-001 |
| **Status** | Filed-ready (fully documented) |
| **Applications** | 8 (P1-P8) |
| **Inventions** | INV-001 through INV-008 |

### Scope

Multimodal human-attention qualification system with privacy-preserving proof packets and delayed server-gated settlement. Six-layer POPS scoring engine, Verification Stability Layer, sealed proof artifacts, trust-tier modulation, campaign eligibility, remote control, and multi-currency minting.

### Applications

| Patent | Title | Filing Window |
|--------|-------|---------------|
| P1 | POP Core Engine | Immediate |
| P2 | POP + Reward Distribution | +45 days |
| P3 | POP + Campaign Validation | +60 days |
| P4 | POP + Attention Marketplace | +105 days |
| P5 | POP + Creator Economy | +90 days |
| P6 | POP + Remote Control | +120 days |
| P7 | POP + Trust Score | +30 days |
| P8 | POP + Multi-Currency Economy | +75 days |

### Continuation Opportunities
- CIP for multi-device proof synchronization (when cross-device POP ships)
- Divisional for each POPS layer as standalone scoring patent
- PCT international filing for P1 and P7

### Existing Documentation
- `docs/legal/POP_INVENTION_DISCLOSURE.md`
- `docs/legal/POP_PATENT_FAMILY.md`
- `docs/legal/POP_PATENT_CLAIMS_APPENDIX.md`
- `docs/legal/POP_PATENT_PROVISIONAL_ABSTRACTS.md`

---

## Family 02: Attention Verification

| Field | Value |
|-------|-------|
| **Family ID** | ATT-FAM-2026-001 |
| **Status** | New — disclosure required |
| **Applications** | 3-4 |
| **Inventions** | INV-009, INV-010, INV-011, INV-032, INV-033 |
| **Depends on** | Family 01 (POP core proof system) |

### Scope

Time-weighted multimodal attention scoring, adaptive gaze calibration with polynomial residual correction, Y-plane luminance transport optimization, signal stale policy, and headless replay regression testing.

### Proposed Applications

| Patent | Title | Filing Window |
|--------|-------|---------------|
| A1 | Time-Weighted Multimodal Attention Scoring with EMA | +30 days |
| A2 | Adaptive Gaze Calibration with Polynomial Residual Model | +60 days |
| A3 | Luminance-Plane Transport for Real-Time Vision Processing | +120 days |
| A4 | Headless Gaze Pipeline Replay Testing System | +180 days |

### Continuation Opportunities
- CIP when additional biometric signals (heart rate, skin conductance) are added
- Divisional for calibration method vs scoring method

---

## Family 03: Intent OS / Autonomous Kernel

| Field | Value |
|-------|-------|
| **Family ID** | IOS-FAM-2026-001 |
| **Status** | New — disclosure required |
| **Applications** | 4-5 |
| **Inventions** | INV-012, INV-013, INV-014, INV-015 |
| **Depends on** | Family 01 (POP for attention verification), Family 02 (gaze tracking) |

### Scope

Autonomous gaze-driven execution kernel with ordered safety gate chain, governance kernel with confidence/risk/reversibility checks, multimodal voice+gaze command fusion, and on-device digital twin adaptive learning engine.

### Proposed Applications

| Patent | Title | Filing Window |
|--------|-------|---------------|
| I1 | Autonomous Execution Kernel with Ordered Safety Gate Chain | Immediate |
| I2 | Governance Kernel for Gaze-Driven Autonomous Actions | +30 days |
| I3 | Multimodal Voice + Gaze Command Fusion Engine | +90 days |
| I4 | On-Device Digital Twin with Local Adaptive Learning | +60 days |
| I5 | External OS Control Policy for Gaze-Isolated Actions | +120 days |

### Continuation Opportunities
- CIP when Intent OS controls third-party apps (OS-level integration)
- CIP for cross-device intent synchronization
- PCT filing recommended — strong global applicability

---

## Family 04: Elo AI Companion

| Field | Value |
|-------|-------|
| **Family ID** | ELO-FAM-2026-001 |
| **Status** | New — disclosure required |
| **Applications** | 2-3 |
| **Inventions** | INV-016, INV-017 |
| **Depends on** | Family 01 (POP for attention prerequisite) |

### Scope

Doctrine-safe AI companion with financial-fraud-aware prompt blocking, biometric-to-emotion expression mapping, attention-verified interaction gating.

### Proposed Applications

| Patent | Title | Filing Window |
|--------|-------|---------------|
| E1 | Doctrine-Safe AI Companion with Financial Fraud Blocking | +30 days |
| E2 | Biometric Expression Engine for AI Avatar | +90 days |
| E3 | Attention-Verified AI Interaction System | +60 days |

### Continuation Opportunities
- CIP when Elo gains long-term memory / relationship modeling
- CIP for multi-modal Elo (voice + visual presence)

---

## Family 05: Wallet & Settlement Infrastructure

| Field | Value |
|-------|-------|
| **Family ID** | WAL-FAM-2026-001 |
| **Status** | New — disclosure required |
| **Applications** | 3 |
| **Inventions** | INV-018, INV-019, INV-035 |
| **Depends on** | Family 01 (POP for settlement trigger) |

### Scope

Append-only ledger with value lots and invariant rules, two-step server-recomputed attention rewards (client never sends amounts), and interaction abuse controls (nonce dedup, overrun ratio cap, action cooldowns).

### Proposed Applications

| Patent | Title | Filing Window |
|--------|-------|---------------|
| W1 | Append-Only Wallet Ledger with Value Lots and Invariant Constraints | Immediate |
| W2 | Two-Step Server-Recomputed Attention Reward System | +30 days |
| W3 | Interaction Abuse Prevention Stack for Digital Economy | +90 days |

### Continuation Opportunities
- CIP for multi-currency ledger partitioning
- CIP for real-time ledger analytics / audit dashboard

---

## Family 06: Attention Economy UX

| Field | Value |
|-------|-------|
| **Family ID** | UX-FAM-2026-001 |
| **Status** | New — disclosure required |
| **Applications** | 3-4 |
| **Inventions** | INV-020, INV-021, INV-027, INV-028 |
| **Depends on** | Family 01 (POP), Family 05 (wallet) |

### Scope

Fibonacci offer ramp curves for escalating engagement, composable gesture buttons mapped to economy actions, gesture vocabulary for monetization, and pending-first wallet settlement UX.

### Proposed Applications

| Patent | Title | Filing Window |
|--------|-------|---------------|
| U1 | Gesture-to-Economy Action Mapping with Attention Verification | +60 days |
| U2 | Fibonacci Offer Ramp for Engagement Gamification | +120 days |
| U3 | Configurable Composable Economy Button System | +90 days |
| U4 | Pending-First Settlement UX for Digital Wallet | +150 days |

### Continuation Opportunities
- CIP for haptic feedback integration with gesture economy
- Design patents for gesture button visual language

---

## Family 07: Marketplace & Commerce

| Field | Value |
|-------|-------|
| **Family ID** | MKT-FAM-2026-001 |
| **Status** | New — disclosure required |
| **Applications** | 4-5 |
| **Inventions** | INV-022, INV-023, INV-024, INV-025, INV-031 |
| **Depends on** | Family 01 (POP), Family 02 (attention scoring), Family 05 (wallet) |

### Scope

Geo-verified promotion check-in with streak bonuses, merchant checkout funnel integrated with attention wallet, feed personalization powered by attention metrics, cross-platform attention aggregation layer, and multi-stop promotional route building.

### Proposed Applications

| Patent | Title | Filing Window |
|--------|-------|---------------|
| M1 | Geo-Verified Promotion Check-In with Streak Bonus Ladder | +60 days |
| M2 | Attention-Wallet-Integrated Merchant Checkout | +90 days |
| M3 | Cross-Platform Attention Aggregation Layer | +120 days |
| M4 | Feed Personalization with Attention Scoring | +150 days |
| M5 | Multi-Stop Promotional Route Builder | +180 days |

### Continuation Opportunities
- CIP for AR-overlay promotion discovery
- CIP for real-time bidding with attention verification

---

## Family 08: Creator Tools

| Field | Value |
|-------|-------|
| **Family ID** | CRE-FAM-2026-001 |
| **Status** | New — disclosure required |
| **Applications** | 2-3 |
| **Inventions** | INV-029, INV-030 |
| **Depends on** | Family 01 (POP), Family 03 (Intent OS for creation), Family 07 (marketplace for distribution) |

### Scope

Non-linear studio editor with POP gate template binding at publish time, campaign builder with visual condition rows and live device preview.

### Proposed Applications

| Patent | Title | Filing Window |
|--------|-------|---------------|
| C1 | Content Studio with Attention-Verification Gate Template | +90 days |
| C2 | Campaign Builder with Condition Rules and Live Preview | +120 days |

### Continuation Opportunities
- CIP for AI-assisted campaign optimization
- CIP for collaborative creator studios

---

## Family 09: Immersive UI Design

| Field | Value |
|-------|-------|
| **Family ID** | DES-FAM-2026-001 |
| **Status** | New — design patent required |
| **Applications** | 3 (design patents) |
| **Inventions** | INV-026, INV-038, INV-039 |
| **Depends on** | Independent (visual design) |

### Scope

Glass immersive feed shell (full-bleed media, floating glass controls, 5-tab white dock), timer line + coin pill top chrome pattern, and out-profile creator chip bottom-left anchoring.

### Proposed Applications

| Patent | Title | Filing Window |
|--------|-------|---------------|
| D1 | GUI Design — Glass Immersive Feed with Attention Chrome | +60 days |
| D2 | GUI Design — Timer Line + Coin Pill Indicator | +90 days |
| D3 | GUI Design — Creator Out-Profile Chip | +120 days |

### Continuation Opportunities
- Additional design patents for dark/light mode variants
- International design registration via Hague Agreement

---

## Family 10: Platform Modules & Identity

| Field | Value |
|-------|-------|
| **Family ID** | MOD-FAM-2026-001 |
| **Status** | New — conceptual / early-stage |
| **Applications** | 2-3 |
| **Inventions** | INV-034, INV-036, INV-037, INV-040 |
| **Depends on** | Family 01 (POP), Family 05 (wallet/economy) |

### Scope

Evidence vault with consent-scoped storage, 26-letter interactive currency taxonomy, three-loops product framework, iAM identity/future-self layer, and i* module surface system (14 modules).

### Proposed Applications

| Patent | Title | Filing Window |
|--------|-------|---------------|
| X1 | Consent-Scoped Evidence Vault for Attention Data | +120 days |
| X2 | Multi-Currency Alphabetic Taxonomy with Conversion Hub | +150 days |
| X3 | Modular Identity Platform with Aspirational Self-Model | +180 days |

### Continuation Opportunities
- CIP as each i* module ships with novel functionality
- CIP for cross-platform identity federation

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total patent families | 10 |
| Total existing applications | 8 (Family 01) |
| Total new applications proposed | 34 |
| Total estimated applications | 42 |
| Immediate filings (Priority 1) | 5 |
| 90-day filings (Priority 2) | 12 |
| 6-month filings (Priority 3) | 17 |
| Design patent filings | 3 |
| PCT international recommended | 3 (P1, I1, W1) |

---

*See individual family documents in docs/legal/ (Family 01) and INVENTION_DISCLOSURES/ (Families 02-10). See FILING_PRIORITY.md for detailed schedule.*
