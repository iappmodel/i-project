# Build Priority Roadmap — [ i ] Project

**Roadmap ID:** IP-ROADMAP-2026-001  
**Date:** 2026-06-15  
**Audience:** Board, investors, lead architect  
**Companion:** `INVESTMENT_SHEET.md`, `LEGAL_IP_BUDGET.md`

---

## How to Read This Roadmap

| Phase | Goal | Board outcome |
|-------|------|---------------|
| **P0** | Production spine — real money, real cloud | "It works in production" |
| **P1** | Core loop polished — investor-grade demo | "I can try it myself" |
| **P2** | Marketplace + creators — supply side | "Business model visible" |
| **P3** | Differentiation — identity, connect, remote | "Moat is obvious" |
| **P4** | Full platform — 14 modules, iVatar, iOmega | "Category leader scale" |

Phases can overlap. **Do not start P3 until P0 exits.** P2 can begin during late P1.

---

## Phase P0 — Production Spine (Months 1–4)

**Investment:** $550K – $850K | **Team:** 6 engineers + 1 DevOps + 1 PM  
**Unlocks:** Live wallet, cloud backend, POP validator hosted, App Store beta

| # | Build item | Domain | Remaining % | Team | Duration (6 dev) |
|---|------------|--------|------------:|------|:----------------|
| 1 | Cloud Supabase cutover + migrations | Infra | 50% | 2 backend | 6–8 weeks |
| 2 | Stripe live checkout + webhook + withdraw | Wallet | 60% | 2 full-stack | 8–10 weeks |
| 3 | POP validator TLS hosting + scale | POP | 18% | 1 backend + 1 DevOps | 4–6 weeks |
| 4 | Trust-tier settlement production | POP | 30% | 1 backend | 4 weeks |
| 5 | Delayed settlement + appeal holds UI | POP | 22% | 1 frontend | 4 weeks |
| 6 | Ledger cloud migration + audit UI | Wallet | 15% | 1 backend | 3 weeks |
| 7 | Capacitor Android + iOS beta builds | Infra | 65% | 2 mobile | 8–10 weeks |

**Parallel legal (P0):** Form LLC/Corp, inventor assignment, file POP P1 + Wallet W1 + Intent I1 provisionals (~$15K–$40K). See `LEGAL_IP_BUDGET.md` Tier A.

**Exit criteria:** User earns iCoins on device → pending hold → settles → withdraws to bank in production.

```
Month:  1──────2──────3──────4
        [Cloud+Stripe████████]
        [Validator TLS████]
        [Trust/settle UI████]
        [Capacitor beta████████████]
        [IP Tier A ██]
```

---

## Phase P1 — Core Loop Polish (Months 3–8)

**Investment:** $650K – $950K | **Team:** 6–8 engineers + 1 designer  
**Unlocks:** Immersive demo ready for investor meetings

| # | Build item | Domain | Remaining % | Team | Duration (6 dev) |
|---|------------|--------|------------:|------|:----------------|
| 8 | Web Vision Engine production (`VITE_VISION_ENGINE`) | Attention | 45% | 2 vision/ML | 10–12 weeks |
| 9 | Vision → proof bridge hardening | Attention | 28% | 1 backend | 4 weeks |
| 10 | Attention scoring production weights | Attention | 25% | 1 ML | 4 weeks |
| 11 | Pending-first wallet React port | Wallet | 28% | 1 frontend | 4 weeks |
| 12 | Timer line + coin pill production chrome | Economy UX | 25% | 1 frontend | 3 weeks |
| 13 | Gesture vocabulary full settlement | Economy UX | 25% | 1 full-stack | 4 weeks |
| 14 | Design system tokens + motion library | UI | 55% | 1 designer + 1 frontend | 8 weeks |
| 15 | Geo check-in map UX + streak UI | Marketplace | 22% | 1 full-stack | 4 weeks |
| 16 | Merchant checkout merchant onboarding | Marketplace | 30% | 2 full-stack | 6 weeks |

**Parallel legal (P1):** 5 more provisionals (Attention, Elo, Gesture, Design D1), 3 trademark ITU marks (~$25K–$60K). Tier B.

**Exit criteria:** Investor watches ad → gaze verified on web → earns → sees pending steps → converts → immersive shell polished.

---

## Phase P2 — Marketplace & Creators (Months 7–14)

**Investment:** $1.1M – $1.6M | **Team:** 8–10 engineers + 2 designers  
**Unlocks:** Supply side (creators + advertisers), revenue model

| # | Build item | Domain | Remaining % | Team | Duration (6 dev) |
|---|------------|--------|------------:|------|:----------------|
| 17 | Campaign builder React port | Creator | 60% | 2 frontend | 10 weeks |
| 18 | Studio NLE React port (MVP trim/layers) | Creator | 55% | 3 frontend | 12 weeks |
| 19 | POP gate publish binding | Creator | 50% | 1 backend | 6 weeks |
| 20 | 60/30/10 automated payout engine | Creator | 65% | 2 backend | 8 weeks |
| 21 | Promo marketplace advertiser self-serve | Marketplace | 32% | 2 full-stack | 8 weeks |
| 22 | Feed personalization ML cold-start | Marketplace | 28% | 1 ML + 1 backend | 8 weeks |
| 23 | Alphabet currency interactive wallet | Modules | 55% | 2 frontend | 8 weeks |
| 24 | Wheel mechanic immersive UX | Economy UX | 70% | 1 full-stack | 6 weeks |
| 25 | Three-loops Loop 2/3 production | Modules | 30% | 2 full-stack | 6 weeks |

**Parallel legal (P2):** Remaining POP family P2–P8 provisionals, 10 trademark ITU marks (~$40K–$100K). Tier C.

**Exit criteria:** Creator publishes campaign → user completes → payout splits 60/30/10 → advertiser dashboard shows verified attention.

---

## Phase P3 — Differentiation & Moat (Months 12–20)

**Investment:** $1.4M – $2.0M | **Team:** 10–12 engineers + 2 designers + 1 ML  
**Unlocks:** Platform Connect, iAM, Blink Remote, Elo production

| # | Build item | Domain | Remaining % | Team | Duration (6 dev) |
|---|------------|--------|------------:|------|:----------------|
| 26 | Platform Connect Hub (OAuth + attribution) | Marketplace | 65% | 3 full-stack | 14 weeks |
| 27 | iAM V1: Emotional Vault + Routes | Modules | 75% | 2 full-stack + 1 designer | 12 weeks |
| 28 | Blink Remote full port | Intent OS | 50% | 2 mobile | 10 weeks |
| 29 | Elo doctrine production + `elo-reply` scale | Elo | 25% | 2 backend | 8 weeks |
| 30 | Evidence vault consent production | Modules | 60% | 1 backend | 6 weeks |
| 31 | React ↔ Flutter in-process bridge | Infra | 45% | 2 mobile | 8 weeks |
| 32 | Intent OS governance audit dashboard | Intent OS | 20% | 1 backend | 4 weeks |
| 33 | iGO mission engine (beyond check-in) | Modules | 45% | 2 full-stack | 8 weeks |

**Parallel legal (P3):** Non-provisional conversion of top 5 apps, Madrid Protocol 3 marks (~$50K–$150K). Tier D.

**Exit criteria:** User connects Spotify → earns via [ i ] overlay → iAM route suggests next action → blink controls TV.

---

## Phase P4 — Full Platform Scale (Months 18–30)

**Investment:** $2.5M – $3.8M | **Team:** 15–20 engineers (4 module squads)  
**Unlocks:** 14 i* modules, iVatar, iOmega, full FEATURE_BIBLE

| # | Build item | Domain | Remaining % | Squad | Duration |
|---|------------|--------|------------:|-------|:---------|
| 34–47 | i* module surfaces (14 modules) | Modules | 80% | 4 squads × 3 dev | 12–14 mo @ 12 dev |
| 48 | iVatar embodiment pipeline | Modules | 85% | 2 graphics + 1 ML | 10 weeks |
| 49 | iOmega cross-module reputation | Modules | 90% | 2 backend | 8 weeks |
| 50 | Stories bar + topic filter pills | UI | 85% | 2 frontend | 8 weeks |
| 51 | Mood sessions atmosphere engine | UI | 90% | 2 frontend + 1 designer | 10 weeks |
| 52 | Multimodal voice + gaze production | Intent OS | 45% | 2 ML + 1 mobile | 12 weeks |
| 53 | Digital twin UI evolution ship | Intent OS | 40% | 2 ML | 10 weeks |
| 54 | Attention marketplace listings | Marketplace | 45% | 2 full-stack | 8 weeks |

**Parallel legal (P4):** Full trademark family, copyright registrations, PCT 3 patents (~$80K–$200K). Tier E.

**Exit criteria:** All 14 modules live, iVatar in creator streams, iOmega score affects trust tier globally.

---

## Board Priority Summary (What to Fund First)

| Rank | Phase | What board gets | Capital | Time (6 dev) |
|------|-------|-----------------|--------:|:------------:|
| **1** | P0 | Production wallet + POP cloud | $550K–$850K | 4 mo |
| **2** | P1 | Investor-grade immersive demo | $650K–$950K | +4–5 mo |
| **3** | P2 | Creator + advertiser revenue | $1.1M–$1.6M | +6 mo |
| **4** | P3 | Platform moat (Connect, iAM, Remote) | $1.4M–$2.0M | +8 mo |
| **5** | P4 | Category-scale 14 modules | $2.5M–$3.8M | +12 mo |

**Minimum board approval to demo:** P0 + P1 = **$1.2M – $1.8M** over **6–8 months**.

**Full platform:** P0–P4 = **$6.2M – $9.2M** engineering + **$85K–$320K** legal/IP over **18–30 months** (6-dev) or **10–14 months** (12-dev).

---

## Legal & IP — Parallel Track (Never Skip)

| Tier | When | Action | Budget |
|------|------|--------|-------:|
| A | Month 1 | Entity + assignment + 3 provisionals | $15K–$40K |
| B | Month 3–6 | 8 provisionals + 3 trademarks | $25K–$60K |
| C | Month 7–12 | POP family complete + 10 trademarks | $40K–$100K |
| D | Month 12–18 | Non-provisional top 5 + international | $50K–$150K |
| E | Month 18–30 | Full IP portfolio + PCT | $80K–$200K |

Detail: `LEGAL_IP_BUDGET.md`

---

## Gantt Overview (Growth Team — 12 engineers)

```
Phase:  P0────P1────P2────────P3──────────P4────────────────
Mo:     1-4  3-8  7-14    12-20       18-30
        ████ ████████ ████████████ ██████████████ ████████████████████████
Legal:  A█ B████ C████████ D████████████ E████████████████████
```

---

*This roadmap is the board-facing build order. IP filing order is independent — see `FILING_REFERENCE.md`.*
