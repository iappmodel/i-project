# Investment Sheet — [ i ] Project Full Development

**Sheet ID:** IP-INV-SHEET-2026-001  
**Date:** 2026-06-15  
**Currency:** USD  
**Basis:** `BUILD_COMPLETION_AUDIT.md` (68% built | 32% remaining) + `FEATURE_REGISTRY.md` (54 features)

---

## Executive Totals

| Category | Remaining effort | Cost range (blended team) |
|----------|-----------------:|--------------------------:|
| **Engineering & product** | 396 person-months | **$5.9M – $7.9M** |
| **Design & UX** | 48 person-months | **$480K – $720K** |
| **QA / DevOps / PM** | 72 person-months | **$720K – $1.1M** |
| **Cloud & third-party (18 mo)** | — | **$180K – $540K** |
| **Legal, IP, patents, trademarks** | — | **$85K – $320K** (see `LEGAL_IP_BUDGET.md`) |
| **Contingency (15%)** | — | **$1.0M – $1.5M** |
| **TOTAL TO 100% PLATFORM** | — | **$8.4M – $12.1M** |

### Already invested (sunk — estimated)

| Asset | Estimate |
|-------|----------|
| 2+ years solo + AI-assisted development | $400K – $800K equivalent |
| 9,500+ source files, 58 prototypes, 249 MASTER_BRAIN docs | Included above |
| Android POP MVP, local spine, smoke suite | Included above |
| **Platform value today (68% built)** | **$5.5M – $8.0M** replacement cost |

---

## Cost Assumptions

| Role | Monthly loaded cost | Notes |
|------|--------------------:|-------|
| Senior engineer (full-stack / mobile) | $18,000 | Baseline for estimates |
| ML / vision specialist | $22,000 | Attention, gaze, personalization |
| Product designer | $12,000 | Immersive UI, design system |
| QA engineer | $10,000 | Smoke expansion, device matrix |
| DevOps / SRE | $15,000 | Cloud cutover, validator hosting |
| PM / tech lead | $16,000 | Cross-domain coordination |
| Legal / IP (contract) | Variable | See legal budget |

**Team-size calendar formula:**  
`Calendar months ≈ (Remaining PM ÷ Team size) × Coordination factor`  
Coordination: 3 devs = 1.00 | 6 devs = 1.15 | 12 devs = 1.30 | 20 devs = 1.45

---

## Platform Parts — Investment by Domain

### Domain 1 — POP / Proof / Settlement (Core Moat)

**Current:** 82% built | **Remaining:** 18% | **Remaining effort:** 18 PM

| Team size | Calendar time | Engineering cost |
|----------:|:-------------|-----------------:|
| 3 developers | 7–8 months | $378K – $432K |
| 6 developers | 3–4 months | $324K – $432K |
| 12 developers | 2–3 months | $432K – $648K |

| Feature / system | Remaining % | PM | Priority |
|------------------|------------|---:|----------|
| POP Core Engine (POPS 6-layer) | 18% | 4 | P1 |
| Proof Packet v0 cross-platform | 10% | 2 | P1 |
| VSL server correlation | 15% | 2 | P2 |
| Delayed settlement + appeal UI | 22% | 3 | P1 |
| Trust-tier production | 30% | 3 | P1 |
| Campaign eligibility (P3) | 35% | 4 | P2 |
| Privacy audit tooling | 12% | 2 | P2 |
| Signal stale + replay CI | 10% | 2 | P3 |

---

### Domain 2 — Attention & Vision

**Current:** 73% built | **Remaining:** 27% | **Remaining effort:** 22 PM

| Team size | Calendar time | Engineering cost |
|----------:|:-------------|-----------------:|
| 3 developers | 8–9 months | $432K – $486K |
| 6 developers | 4–5 months | $432K – $540K |
| 12 developers | 2–3 months | $432K – $648K |

| Feature / system | Remaining % | PM | Priority |
|------------------|------------|---:|----------|
| Web Vision Engine (MediaPipe prod) | 45% | 8 | P1 |
| Attention scoring production weights | 25% | 3 | P1 |
| Gaze calibration web parity | 20% | 3 | P2 |
| Vision → proof bridge hardening | 28% | 3 | P1 |
| Y-plane iOS path | 12% | 2 | P3 |
| Skin tone fairness testing | 30% | 3 | P3 |

---

### Domain 3 — Intent OS / Autonomous Kernel

**Current:** 69% built | **Remaining:** 31% | **Remaining effort:** 37 PM

| Team size | Calendar time | Engineering cost |
|----------:|:-------------|-----------------:|
| 3 developers | 12–14 months | $648K – $756K |
| 6 developers | 6–7 months | $648K – $756K |
| 12 developers | 3–4 months | $648K – $864K |

| Feature / system | Remaining % | PM | Priority |
|------------------|------------|---:|----------|
| Autonomous execution kernel (full OS catalog) | 28% | 6 | P2 |
| Governance audit dashboard | 20% | 3 | P2 |
| Multimodal voice + gaze (prod STT) | 45% | 8 | P3 |
| Digital twin feedback loops | 40% | 7 | P3 |
| Blink Remote full port | 50% | 8 | P2 |
| Gesture combo marketplace | 22% | 3 | P3 |
| External OS control policy | 25% | 2 | P3 |

---

### Domain 4 — Elo AI Companion

**Current:** 69% built | **Remaining:** 31% | **Remaining effort:** 22 PM

| Team size | Calendar time | Engineering cost |
|----------:|:-------------|-----------------:|
| 3 developers | 8–9 months | $432K – $486K |
| 6 developers | 4–5 months | $432K – $540K |
| 12 developers | 2–3 months | $432K – $648K |

| Feature / system | Remaining % | PM | Priority |
|------------------|------------|---:|----------|
| Doctrine expansion + multilingual | 25% | 3 | P2 |
| Personalization + memory | 35% | 5 | P3 |
| Expression engine production | 30% | 4 | P2 |
| Voice in/out low-latency | 40% | 5 | P3 |
| Always-on presence zones | 22% | 3 | P3 |
| `elo-reply` production scale | 35% | 2 | P2 |

---

### Domain 5 — Wallet & Settlement

**Current:** 71% built | **Remaining:** 29% | **Remaining effort:** 17 PM

| Team size | Calendar time | Engineering cost |
|----------:|:-------------|-----------------:|
| 3 developers | 6–7 months | $324K – $378K |
| 6 developers | 3–4 months | $324K – $432K |
| 12 developers | 2 months | $432K |

| Feature / system | Remaining % | PM | Priority |
|------------------|------------|---:|----------|
| Stripe live + KYC withdraw | 60% | 6 | **P0** |
| Cloud ledger migration | 15% | 2 | **P0** |
| Pending-first wallet React port | 28% | 3 | P1 |
| Trust-tier conversion production | 32% | 2 | P1 |
| Abuse dashboard | 18% | 2 | P2 |
| Two-step reward hardening | 20% | 2 | P1 |

---

### Domain 6 — Attention Economy UX

**Current:** 71% built | **Remaining:** 29% | **Remaining effort:** 15 PM

| Team size | Calendar time | Engineering cost |
|----------:|:-------------|-----------------:|
| 3 developers | 6 months | $324K |
| 6 developers | 3 months | $324K |
| 12 developers | 1.5–2 months | $324K – $432K |

| Feature / system | Remaining % | PM | Priority |
|------------------|------------|---:|----------|
| 5-screen cross-navigation | 18% | 2 | P2 |
| Timer line + coin pill production | 25% | 2 | P1 |
| Gesture vocabulary full settle | 25% | 3 | P1 |
| Creator gesture button marketplace | 25% | 3 | P2 |
| Wheel mechanic (scroll earns) | 70% | 5 | P2 |
| Fibonacci ramp A/B | 15% | 1 | P3 |

---

### Domain 7 — Marketplace & Commerce

**Current:** 62% built | **Remaining:** 38% | **Remaining effort:** 34 PM

| Team size | Calendar time | Engineering cost |
|----------:|:-------------|-----------------:|
| 3 developers | 13–15 months | $702K – $810K |
| 6 developers | 6–7 months | $648K – $756K |
| 12 developers | 3–4 months | $648K – $864K |

| Feature / system | Remaining % | PM | Priority |
|------------------|------------|---:|----------|
| Platform Connect Hub (OAuth bridge) | 65% | 12 | P2 |
| Merchant checkout live onboarding | 30% | 4 | P1 |
| Feed personalization ML | 28% | 4 | P2 |
| Promo marketplace self-serve | 32% | 5 | P2 |
| Geo check-in map UX | 22% | 3 | P1 |
| Route builder + optimization | 45% | 4 | P3 |
| Attention marketplace listings | 45% | 6 | P3 |

---

### Domain 8 — Creator Tools

**Current:** 40% built | **Remaining:** 60% | **Remaining effort:** 60 PM

| Team size | Calendar time | Engineering cost |
|----------:|:-------------|-----------------:|
| 3 developers | 23–26 months | $1.2M – $1.4M |
| 6 developers | 11–13 months | $1.2M – $1.4M |
| 12 developers | 6–7 months | $1.3M – $1.5M |

| Feature / system | Remaining % | PM | Priority |
|------------------|------------|---:|----------|
| Studio NLE React port | 55% | 18 | P2 |
| Campaign builder live React | 60% | 15 | P2 |
| POP gate publish binding | 50% | 10 | P2 |
| 60/30/10 automated payout | 65% | 10 | P2 |
| Creator tier progression | 70% | 7 | P3 |

---

### Domain 9 — Immersive UI Design

**Current:** 53% built | **Remaining:** 47% | **Remaining effort:** 33 PM

| Team size | Calendar time | Engineering cost |
|----------:|:-------------|-----------------:|
| 3 developers | 12–14 months | $432K – $504K eng + **$144K – $168K design** |
| 6 developers | 6–7 months | $432K – $504K eng + design |
| 12 developers | 3–4 months | $432K – $576K eng + design |

| Feature / system | Remaining % | PM | Priority |
|------------------|------------|---:|----------|
| Design system tokens + motion | 55% | 10 | P1 |
| Stories bar + topic pills | 85% | 12 | P3 |
| Mood sessions atmosphere | 90% | 8 | P4 |
| Glass token consistency | 20% | 3 | P1 |
| Full-screen hide / reveal | 18% | 2 | P2 |

---

### Domain 10 — Platform Modules & Identity

**Current:** 38% built | **Remaining:** 62% | **Remaining effort:** 124 PM

| Team size | Calendar time | Engineering cost |
|----------:|:-------------|-----------------:|
| 3 developers | 47–54 months* | $2.5M – $2.9M |
| 6 developers | 24–28 months* | $2.6M – $3.0M |
| 12 developers | 12–14 months | $2.6M – $3.0M |
| 20 developers** | 8–10 months | $2.9M – $3.6M |

\*Sequential calendar; parallel squads recommended (see roadmap).  
\*\*Includes 4 module squads + platform team.

| Feature / system | Remaining % | PM | Priority |
|------------------|------------|---:|----------|
| i* Module surfaces (14 modules) | 80% | 56 | P3–P4 |
| iAM Identity V1 (Vault + Routes) | 75% | 18 | P3 |
| Alphabet currency interactive wallet | 55% | 12 | P2 |
| iVatar embodiment pipeline | 85% | 14 | P4 |
| iOmega meta-reputation | 90% | 10 | P4 |
| Evidence vault production | 60% | 8 | P3 |
| Three-loops Loop 2/3 production | 30% | 6 | P2 |

**Module squad estimate (per module, avg):** 4 PM | 6 devs × 3 weeks | ~$54K per module surface

---

### Domain 11 — Infrastructure & Ship

**Current:** 72% built | **Remaining:** 28% | **Remaining effort:** 14 PM

| Team size | Calendar time | Engineering cost |
|----------:|:-------------|-----------------:|
| 3 developers | 5–6 months | $270K – $324K |
| 6 developers | 3 months | $324K |
| 12 developers | 1.5–2 months | $324K – $432K |

| Feature / system | Remaining % | PM | Priority |
|------------------|------------|---:|----------|
| Cloud Supabase cutover | 50% | 4 | **P0** |
| Capacitor App Store / Play builds | 65% | 5 | P1 |
| Validator TLS + scale | 12% | 1 | P1 |
| React ↔ Flutter in-process bridge | 45% | 3 | P2 |
| iOS Seal Proof E2E | 15% | 1 | P2 |
| Cloud CI integration | 10% | 1 | P2 |

---

## Full Platform — Combined Timeline

Assumes parallel workstreams (not sequential sum). Critical path: **Infra P0 → Wallet P0 → POP cloud → Marketplace P1**.

| Team composition | Headcount | Calendar to 100% | Total eng cost |
|----------------|----------:|:----------------:|---------------:|
| **Lean startup** | 6 engineers + 1 designer + 1 PM | **18–24 months** | $5.9M – $7.0M |
| **Growth** | 12 engineers + 2 designers + 2 QA + 1 PM | **10–14 months** | $6.5M – $7.9M |
| **Aggressive** | 20 engineers + 3 designers + 3 QA + 2 DevOps + 2 PM | **7–9 months** | $7.5M – $9.2M |

Add legal/IP ($85K–$320K) + cloud ($180K–$540K) + contingency (15%) for full budget ceiling.

---

## Minimum Viable Investment (Investor Demo — 85% platform)

Goal: production money loop + immersive demo + IP secured — **not** full 14 modules.

| Stream | PM | 6-dev months | Cost |
|--------|---:|:------------:|-----:|
| P0 Infra + Wallet + POP cloud | 24 | 4–5 | $432K – $540K |
| P1 Attention web + Economy UX polish | 20 | 3–4 | $324K – $432K |
| P1 Marketplace (check-in + merchant) | 12 | 2 | $216K |
| P2 Legal/IP (starter filings) | — | — | $35K – $85K |
| Design + QA (partial) | 12 | parallel | $120K – $180K |
| Cloud 12 mo | — | — | $60K – $120K |
| **MVI subtotal** | | **6–8 months** | **$1.2M – $1.6M** |

At 6 engineers, board can show **live production wallet + Seal Proof + immersive feed** in **6–8 months** for ~**$1.2M–$1.6M** (+ IP).

---

## Cross-Reference

| Document | Content |
|----------|---------|
| `BUILD_PRIORITY_ROADMAP.md` | Phased build order for board |
| `LEGAL_IP_BUDGET.md` | Patents, trademarks, entity, compliance |
| `BOARD_INVESTMENT_SUMMARY.md` | One-page executive summary |
| `BUILD_COMPLETION_AUDIT.md` | % built per system |

---

*Estimates are planning-grade for board and investor discussions. Adjust rates for geography (US vs. offshore blend). Update after each funding round.*
