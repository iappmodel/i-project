# P0 Chat Extraction — Batches 01–04 Synthesis

**Generated:** 2026-05-22  
**Scope:** 40 P0 conversations (ranks 1–40) extracted from OpenAI + Claude exports  
**Sources:** `P0_BATCH_01` through `P0_BATCH_04` summaries, canonical candidates, conflicts, and `P0_BATCH_03_CURRENCY_RECONCILIATION_NOTES.md`  
**Constitution anchor:** `CANONICAL/i_SOURCE_OF_TRUTH.md` (wins all product conflicts)

**Classification legend:** Every item below is **Candidate**, **Experimental**, **Obsolete**, or **Blocked** — nothing here is promoted to canonical.

> **P0 chat extraction batches 1–4 synthesized; further P0/P1 extraction still required before final canonicalization. Owner decisions required on currency semantics, demo lineage, and attention session bypass remediation.**

---

## 1. Executive Summary

Forty P0 conversations (Claude-heavy ranks 1–20; mixed OpenAI ranks 14–40) yield a **coherent product vision** with **irreconcilable implementation forks**. The recovered corpus strongly reinforces the SoT thesis: [ i ] is an Attention Wallet and Media Marketplace with Watch → Verify → Earn, three participants, progressive trust, and a five-coin MVP intent (a/i/v/e/o).

**What converges across batches:**
- Product positioning and core loop (conv 009, 014, multiple demos)
- 60/30/10 revenue split (convs 002, 004, 007, 024)
- Progressive trust ladder (009, 013, 014)
- 4-tab product IA law: Feed / Earn / Wallet / Profile (014, 038 — strongest Claude + OpenAI UX alignment)
- aCoin = verified attention foundation (023, 028 — aligns SoT)
- eCoin = verified engagement above attention (033 — aligns SoT)
- Attention must be server-gated, not client-trusted (039 — strongest technical spec)

**What does not converge:**
- **Currency semantics** — three naming eras (Vicoin/Icoin chat, SoT a/i/v/e/o, OpenAI letter specs) plus **rCoin triple definition** and **uCoin fork**
- **Demo lineage** — at least six deploy URLs / architectures (HTML, Vite, glass, neumorphic, 5-screen, 8-screen, 9-step presenter)
- **Tech stack** — Flutter/Firebase (035, 014 Flutter playbook) vs React/Vite/Supabase/Capacitor (031, 039 repo audit)
- **Attention trust boundary** — owner confirmed **session bypass still exists** (039) — **critical blocker**

**Synthesis verdict:** Knowledge recovery is **substantially complete for ranks 1–40** on product intent and economy *evidence*. Canonicalization remains **blocked** pending owner decisions and repo verification — not more extraction alone.

---

## 2. Strongest Recovered Systems

Ranked by cross-batch reinforcement and SoT alignment.

| Rank | System | Primary convs | SoT align | Status |
|------|--------|---------------|-----------|--------|
| 1 | **Attention trust boundary + ACS model** | 039, 015, 017, 023 | High (qualification not surveillance) | **Blocked** — session bypass |
| 2 | **Product constitution / brief** | 009, 014, 021 | Very high | Candidate — verify provenance |
| 3 | **aCoin verified attention spec** | 023, 028, 009 | High | Candidate — pipeline blocked |
| 4 | **4-tab product IA + UX constitution** | 014, 038, 013 | High | **Blocked** — demo IA fork |
| 5 | **OpenAI Alphabet Tier 1 (A/I/V/E/O)** | 028, 023, 025, 033 | Partial (letter semantics fork) | **Blocked** — owner lock |
| 6 | **Progressive trust + wallet states** | 009, 014, 020, 025 | High | Candidate |
| 7 | **Investor demo narrative (9-step / 8-screen)** | 002, 003, 005, 024, 030 | Medium | **Blocked** — pick lineage |
| 8 | **eCoin engagement layer** | 033, 028 | High | Candidate |
| 9 | **Native + web attention engine** | 015, 017, 031, 003 | Medium | Experimental — stack fork |
| 10 | **Build process meta (Phase 0→3, build-log)** | 036, 011, 010 | N/A (process) | Candidate — process only |

---

## 3. Canonical Candidates by Subsystem

Consolidated from CC-B01 through CC-B04 (~125 unique candidate IDs). **None promoted.**

### CANONICAL / Core Product

| Candidate IDs | Concept | Tier | Blocker |
|---------------|---------|------|---------|
| CC-B01-01, CC-B01-02, CC-B02-03 | Core loop Watch→Verify→Earn | A | Session bypass |
| CC-B01-03 | 60/30/10 revenue | A | Rate verification |
| CC-B01-08, CC-B02-03 | Three participants | A | — |
| CC-B02-01, CC-B02-02, CC-B04-23 | 4-tab IA; kill 5-screen primary nav | A | Demo fork |
| CC-B01-07, CC-B02-09 | MVP / non-MVP exclusions | A | Scope drift in demos |

### ECONOMY / Wallet

| Candidate IDs | Concept | Tier | Blocker |
|---------------|---------|------|---------|
| CC-B03-01, CC-B03-04 | aCoin = 6-dimension verified attention; not directly withdrawable | A | rCoin pipeline |
| CC-B04-07, CC-B04-08 | eCoin = engagement above aCoin gate | A | — |
| CC-B03-16 | Tier 1 five-coin A/I/V/E/O | A | Letter semantics |
| CC-B01-06, CC-B02-13, CC-B02-14 | Wallet 4-state / pending→available | B | vCoin role fork |
| CC-B03-02, CC-B03-03, CC-B03-09 | a→r→i pipeline; 100:1 default | B | rCoin undefined |
| CC-B03-07, CC-B03-08 | iCoin 6-state lifecycle; only withdrawable class | B | Identity vs cash |
| CC-B03-17 | Four-engine economy (Trust/Conversion/Reward/Saga) | B | Repo verify |
| CC-B04-11 | wCoin = verified work completion | B | Post-MVP |
| CC-B04-35, CC-B04-36 | gCoin = Go/Growth; G≠Governance | B | Post-MVP; G letter |
| CC-B01-11, CC-B01-12 | rcoins clearing pool + rates | B/C | Conflicts 023/028 |

### ATTENTION / Verification

| Candidate IDs | Concept | Tier | Blocker |
|---------------|---------|------|---------|
| CC-B04-27–31 | attention_sessions, split endpoints, ACS, no-session-no-reward | A | **Bypass open** |
| CC-B01-05, CC-B02-06, CC-B02-07 | Selective eye-tracking; scores-only backend | A | Demo over-scopes camera |
| CC-B01-10, CC-B02-15, CC-B02-16 | 5-gate overlay; AttentionEngine; audit P0 | B | Map to POPS/repo |
| CC-B04-01, CC-B04-02 | Unified MediaPipe+TF.js pipeline | B | MVP scope |
| CC-B03-14, CC-B03-15 | Remote control / MediaPipe | C | Experimental |

### TRUST / Governance

| Candidate IDs | Concept | Tier | Blocker |
|---------------|---------|------|---------|
| CC-B01-04, CC-B02-04 | Progressive trust ladder | A | — |
| CC-B02-08 | vCoin cannot buy Trust/Reputation | A | vCoin role fork |
| CC-B04-32 | Fraud/dashboard metrics schema | B | Supabase verify |

### INVESTOR_DEMO / UX

| Candidate IDs | Concept | Tier | Blocker |
|---------------|---------|------|---------|
| CC-B01-09, CC-B02-05, CC-B03-05 | 9-step presenter / 8-screen walkthrough / 5-screen funnel | B/C | **Lineage blocked** |
| CC-B03-21, CC-B03-23 | QR zero-backend demo; 9-phase plan | C | URL proliferation |
| CC-B01-17, CC-B02-10, CC-B04-24 | Glass / soft depth design modes | B | vs neumorphic/glassmorphism |
| CC-B02-19, CC-B04-25 | Wallet fintech dashboard layout | B | Naming fork |

### TECH_ARCHITECTURE / Process

| Candidate IDs | Concept | Tier | Blocker |
|---------------|---------|------|---------|
| CC-B01-19, CC-B04-17 | DEMO/PRODUCTION dual-track; Phase 0→3 build order | D | Process only |
| CC-B01-29, CC-B02-18, CC-B03-24, CC-B04-18 | Dev workflow (Sonnet/Haiku, build-log, skills) | D | Process only |

---

## 4. Conflicts by Severity

### Critical (blocks canonicalization)

| ID | Conflict | Sources | Status |
|----|----------|---------|--------|
| **CR-01** | **Attention session bypass** — client can issue reward without valid `attentionSessionId` | 039 (owner YES); audit of eye-earn-sparkle | **Blocked — fix required** |
| **CR-02** | **iCoin semantics** — SoT cash-value vs OpenAI Identity-linked vs chat Icoins | 025, 028, 007, demos | **Blocked — owner decision** |
| **CR-03** | **vCoin semantics** — SoT utility vs 020 spendable/withdrawable vs 028 spendable platform | 020, 028, SoT, chat Vicoins | **Blocked — owner decision** |
| **CR-04** | **rCoin triple definition** — clearing pool (007) vs conversion hub (023/025) vs Reputation (028) | B01, B03 | **Blocked — owner decision** |
| **CR-05** | **uCoin fork** — 007 ucoins≈Vicoins vs 026 User Value (non-cash) | 007, 026, SoT silent | **Blocked — owner decision** |
| **CR-06** | **Currency naming map** — Vicoin/Icoin vs a/i/v/e/o across 40 convs | All batches | **Blocked — owner decision** |

### High

| ID | Conflict | Sources | Status |
|----|----------|---------|--------|
| HI-01 | **Demo lineage selection** — 6+ URLs/architectures | 002–006, 011–012, 016, 024, 030, 038 | **Blocked — owner decision** |
| HI-02 | **Product IA vs demo IA** — 4-tab (014, 038) vs 5/8/9-screen demos | B02–B04 | **Blocked — owner decision** |
| HI-03 | **A–Z scope** — 26-letter (007, 028) vs 5-coin MVP (SoT) | B01, B03 | **Blocked — owner decision** |
| HI-04 | **Instant demo credit vs pending wallet** | 002, 005 vs 009, POPS | Candidate tension |
| HI-05 | **oCoin semantic** — SoT Origin vs 028 Offers | 028, SoT | **Blocked — owner decision** |
| HI-06 | **gCoin letter** — Go/Growth (040) vs Governance (prior file) | 040, 028 | **Blocked — owner decision** |
| HI-07 | **Design lineage** — void luxury / warm glass / teal / soft depth / neumorphic / glassmorphism | B01–B04 | **Blocked — owner decision** |
| HI-08 | **Production stack** — Flutter (014, 035) vs React/Supabase (039 repo) | B02, B04 | Obsolete vs current (035) |

### Medium

| ID | Conflict | Status |
|----|----------|--------|
| ME-01 | Eye-tracking demo over-scopes vs selective product policy (009) | Demo-only |
| ME-02 | validate-attention output discarded by issue-reward (039 audit) | Repo verify |
| ME-03 | Streak UI removed (012) vs re-added (016, 038 profile) | Obsolete streak |
| ME-04 | Duplicate Claude MVP artifacts (032, 037) | Duplicate |
| ME-05 | "The Solution" UX text duplicate (021 ≈ 014) | Cite 014 only |
| ME-06 | wCoin vs gCoin-Go GPS overlap (034, 040) | Coordinate post-MVP |
| ME-07 | 5-gate labels vs POPS six layers | Map, don't merge blindly |

### Low / Duplicate

- Conv 029 meta-summary only — cite 007/015/028
- Conv 019 clarification — owner review, no product content
- Conv 021 near-duplicate of 014
- Multiple MD-file workflow variants (010, 013, 022, 036)

---

## 5. Currency Conflict Synthesis

**Full evidence map:** `P0_BATCH_03_CURRENCY_RECONCILIATION_NOTES.md` (still authoritative; not superseded).

### Three naming eras

| Era | Symbols | Where | SoT match |
|-----|---------|-------|-----------|
| **Chat demos** | Vicoins, Icoins | 002–008, 013–016, 021, 024, 030, 032, 037, 039 audit | Partial (roles roughly i=cash, v=utility) |
| **SoT constitution** | aCoins, iCoins, vCoins, eCoins, oCoins | `i_SOURCE_OF_TRUTH.md` | Baseline — not silently overridden |
| **OpenAI alphabet** | A–Z letter specs + pipelines | 020, 023–028, 033–034, 040 | Tier 1 count aligns; semantics diverge |

### Per-symbol synthesis (evidence only — **no resolution**)

| Symbol | Convergence | Divergence | Synthesis status |
|--------|-------------|------------|------------------|
| **aCoins** | Attention foundation (SoT, 023, 028) | Direct withdraw? Pipeline via rCoin? | **Candidate** — strongest align |
| **iCoins** | Primary withdrawable output | Cash-value vs Identity-linked; direct earn vs r→i hub | **Blocked** |
| **vCoins** | In-platform spend | Utility vs spendable economic layer; withdrawable? (020) | **Blocked** |
| **eCoins** | Engagement (SoT, 033, 028) | Full spec only in 033 | **Candidate** |
| **oCoins** | Tier 1 letter | Origin (SoT) vs Offers (028) | **Blocked** |
| **rCoins** | Symbol reused everywhere | Pool / hub / reputation — **three concepts** | **Blocked** |
| **uCoins** | — | Not in SoT; 007≈Vicoins vs 026 User Value | **Blocked** |
| **wCoins** | — | Work spec (034) — post-MVP | Experimental |
| **gCoins** | — | Go/Growth (040) vs Governance (prior) | **Blocked** (letter) |

### Pipeline fork (no canonical pipeline)

```
SoT:          [implicit — no pipeline specified]
007 (B01):    all earns → rcoins POOL → {icoins, mcoins, ucoins}
023/025 (B03): behavior → rcoins HUB → icoins (100:1)
020 (B02):    proof → a/i → vCoin usable economic layer
028 (B03):    Earn → Reward Issuance → Conversion ← Trust → Saga
039 (B04):    ACS → validate-attention → attentionSessionId → issue-attention-reward
```

**039 pipeline is the only one addressing the session bypass blocker** — must be reconciled with economy pipelines after owner lock.

---

## 6. Attention / Proof / Trust Synthesis

### Recovered architecture (candidate stack)

```
Camera → MediaPipe (+ optional TF.js classifier) → ACS Engine (1Hz)
  → PC(t) + EQ(t) − Penalty(t) → valid-second flag
  → validate-attention → attention_sessions row → attentionSessionId
  → issue-attention-reward (strict) | issue-nonattention-reward (separate)
  → atomic ledger + fraud metrics
```

### Cross-batch alignment

| Concept | Convs | Notes |
|---------|-------|-------|
| Qualification not surveillance | 009, 014, 015, 039 | Aligns SoT |
| Scores-only backend (no raw video upload) | 015, 017 | Privacy candidate |
| 5-gate / 6-layer mapping | 002, 017, POPS docs | Needs explicit map |
| Probabilistic not certified gaze | 039, 009 | Rejects exact-gaze marketing (031) |
| Remote control | 027, 031, 039 | Viable feature; not economic moat alone |
| Native flutter-runtime authority | 017, repo audits | vs web TF.js demos (003, 031) |

### Critical blocker (explicit)

> **Owner confirmed YES (conv 039): a client screen can still issue a reward without a valid `attentionSessionId`.**  
> Until remediated and regression-tested in repo, **no attention/reward knowledge may be treated as production-safe.** Classification: **Blocked**.

### Audit findings to re-verify in repo (039)

- PromoVideosFeed bypass (hardcoded score 95)
- Eye-tracking disabled → still eligible
- validate-attention multiplier discarded
- Missing Edge Functions (claim-reward, get-nearby-campaigns, initiate-withdrawal)
- Profiles RLS `USING (true)` on SELECT

---

## 7. Wallet / Reward Synthesis

| Theme | Evidence | Conflict | Status |
|-------|----------|----------|--------|
| **4-state wallet** | Available / Pending / Restricted / Lifetime (009) | Demos show instant credit | Candidate |
| **Pending→available clearance** | 020, 025, 034, 040 Go flows | vs instant demo credit | Blocked until pipeline locked |
| **Progressive trust gates payout** | 009, 014, 039 trust multipliers | Not wired in demos | Candidate |
| **Tips zero platform cut** | 004, 007 | — | Candidate |
| **VCOIN aggressive / ICOIN conservative mint** | 039 math | Vicoin/Icoin naming | Experimental |
| **Atomic balance updates** | 039 audit (repo) | Client bypass paths | Blocked |

**Wallet UI patterns (competing candidates):**
- Fintech dashboard — glass/warm (016, 018)
- Soft depth 4-tab shell (038)
- Dual-currency strip on Earn tab (038, demos)
- OpenAI separate a/i/r balances (023, 025)

---

## 8. Design / UX Synthesis

### Product IA (strongest cross-batch signal)

**Candidate (not locked):** Feed / Earn / Wallet / Profile — stated in 014 (OpenAI UX constitution), implemented in 038 (Claude HTML prototype), reinforced in 013.

**Kill rule (candidate):** 5-screen cross-navigation as **primary product nav** (014) — but **still used in demos** (030, 032, 037, 035).

### Visual language forks (**blocked pending owner decision**)

| Lineage | Traits | Convs | Status |
|---------|--------|-------|--------|
| Content-first glass | Glass cards, light neumorphic settings only | 003, 009 | Candidate |
| Soft depth + dark/light | 038, 014 | Candidate — vs glassmorphism |
| Glassmorphism demo | 030, 024 | Demo experimental |
| Neumorphic-primary | 011 prompt, 037 | Obsolete for product (014 ban) |
| Void black luxury | 011, 006 | Demo experimental |
| Warm amber glass | 012, 016 | Demo experimental |

### Rejected UX (obsolete)

- 12-day streak bar (012) — do not promote; conflict in 016, 038
- FLUX Dashboard+Studio as primary IA (012)
- Full neumorphism everywhere (009, 003 scope correction)

---

## 9. Investor Demo Synthesis

### Competing demo architectures (**blocked — owner must pick lineage**)

| Lineage | Format | Convs | URL hints |
|---------|--------|-------|-----------|
| 9-step presenter + free explore | HTML / Vite | 002, 003, 005, 006, 011 | iappdemomarcelo, ~/i-app-demo |
| 8-screen walkthrough | HTML | 024 | i-app-walkthrough.html |
| 9-phase QR deploy | Vite/Vercel | 030 | iappdemomarcelo.vercel.app |
| 4-tab clickable shell | HTML | 038 | artifact TBD |
| Early React artifact | i-app.jsx | 037 | artifact TBD |
| Linear app/ spine | React screens | repo `app/` | Not from chat |

### Demo vs product rule (candidate)

> **Product IA (4-tab) and investor demo IA (multi-screen presenter) may intentionally diverge** — but this must be **owner-locked**, not assumed.

### Demo currency display

Demos consistently show **iCoins + vCoins** (chat naming) — not a/r/i pipeline from OpenAI specs. **Gap:** demo narrative understates alphabet economy until owner locks naming.

---

## 10. Tech Stack Synthesis

| Layer | Evidence | Status |
|-------|----------|--------|
| **Current repo lineage** | React + Vite + Supabase + Capacitor (039 audit) | **Candidate current** |
| **Obsolete early roadmap** | Flutter + Firebase (035, 2025) | **Obsolete** |
| **Flutter production playbook** | Riverpod tree (014) | **Blocked** — conflicts React repo |
| **Expo ~/i-app** | 011, 017 | Experimental |
| **Vision: MediaPipe + TF.js** | 003, 031, 039 | Candidate layered stack |
| **Vision: flutter-runtime native** | 017, repo audits | Candidate native authority |
| **Backend: Supabase Edge Functions** | 028, 039 | Candidate |
| **Backend: Firebase** | 035 | Obsolete |

**Synthesis:** Chat evidence supports **React/Supabase as active lineage**; Flutter threads are **parallel or obsolete** — not merged silently.

---

## 11. Post-MVP Alphabet Expansion Synthesis

| Letter | Evidence | Definition | MVP? |
|--------|----------|------------|------|
| A | 023, 028 | Attention | **Tier 1 — candidate** |
| I | 025, 028 | Identity-linked value | Tier 1 — **blocked semantics** |
| V | 020, 028 | Spendable platform / utility | Tier 1 — **blocked semantics** |
| E | 033, 028 | Engagement | Tier 1 — **candidate** |
| O | 028 | Offers (vs SoT Origin) | Tier 1 — **blocked semantics** |
| R | 007, 023, 028 | Pool / hub / Reputation | **Blocked — triple fork** |
| U | 007, 026, 028 | Vicoin alias / User Value | **Blocked** |
| W | 034 | Work — verified task completion | Post-MVP experimental |
| G | 040, 028 | Go/Growth (vs Governance) | Post-MVP **blocked letter** |
| B–Z (most) | 028 index only | Unextracted | P1 extraction target |

**028 partial reconciliation (candidate, not decided):** Ship Tier 1 (A/I/V/E/O) at MVP; expand A–Z post-launch — **requires owner confirmation**.

---

## 12. Owner Decision Agenda

**Do not treat any row as decided.** Required before canonical promotion.

| # | Decision | Options (evidence) | Blocker IDs |
|---|----------|-------------------|-------------|
| 1 | **Fix attention session bypass** | Implement 039 spec; regression tests | CR-01 |
| 2 | **Currency naming map** | Vicoin/Icoin → a/i/v/e/o; or retain chat names in demos | CR-06 |
| 3 | **iCoin framing** | SoT cash-value vs OpenAI Identity-linked | CR-02 |
| 4 | **vCoin framing** | SoT utility vs 020 economic vs 028 spendable | CR-03 |
| 5 | **rCoin disambiguation** | Pool / hub / reputation — one coin or rename | CR-04 |
| 6 | **uCoin fate** | Cut MVP; post-MVP User Value; retire 007 mapping | CR-05 |
| 7 | **Pipeline lock** | 007 clearing vs 023 a→r→i vs 020 vs 028 engines vs 039 session | CR-04, CR-01 |
| 8 | **MVP coin scope** | 5-coin only vs Tier-1-then-expand | HI-03 |
| 9 | **oCoin letter** | Origin (SoT) vs Offers (028) | HI-05 |
| 10 | **gCoin letter** | Go/Growth (040) vs Governance (prior) | HI-06 |
| 11 | **Product IA** | Lock 4-tab (014, 038) | HI-02 |
| 12 | **Demo lineage** | Pick canonical URL + stack for investors | HI-01 |
| 13 | **Design lineage** | Soft depth vs glass vs glassmorphism | HI-07 |
| 14 | **Production stack** | React/Supabase vs Flutter | HI-08 |
| 15 | **Demo vs product IA split** | Allow intentional divergence? | HI-02 |

---

## 13. What Is Now Safe to Treat as Canonical-Candidate

**Safe = strong SoT alignment + cross-batch reinforcement + no unresolved critical conflict on the concept itself.**

| Concept | Confidence | Still requires |
|---------|------------|----------------|
| Attention Wallet + Media Marketplace positioning | High | — |
| Core loop Watch → Verify → Earn | High | Session bypass fix for *implementation* |
| Three participants | High | — |
| 60/30/10 revenue split intent | High | Commercial verification |
| Progressive trust ladder | High | — |
| Selective eye-tracking + consent | High | Demo scope correction |
| aCoin = verified attention (not raw views) | High | Pipeline owner lock |
| eCoin = verified engagement above attention | High | — |
| 4-tab product IA (Feed/Earn/Wallet/Profile) | High | Owner lock vs demos |
| Kill 5-screen as primary product nav | High | Demo exception rule |
| Non-MVP exclusions (streaks, vague rewards) | High | — |
| Probabilistic attention (not certified gaze) | High | ACS promotion after bypass fix |
| DEMO vs PRODUCTION dual-track (process) | Medium | Process only |
| Tier 1 five-letter count at MVP (028 proposal) | Medium | Letter semantics lock |

**Not safe yet (blocked despite partial align):** iCoin/vCoin/rCoin/uCoin definitions, any reward pipeline, any demo URL as canonical, gCoin/wCoin post-MVP letters, remote control as MVP scope.

---

## 14. What Must Remain Experimental

| Item | Reason |
|------|--------|
| Full A–Z 26-coin taxonomy + tiered reveal | Scope explosion vs 5-coin MVP |
| rcoins clearing pool (007) until rCoin disambiguated | Conflicts OpenAI specs |
| 7-property button customizer | Demo gimmick (003, 030) |
| Remote control / gesture nav (027, 031) | Not defensible moat; MVP scope |
| QR zero-backend demos | URL proliferation |
| Platform-for-all-platforms GTM (004) | Strategic fork |
| xCoins / ωCoins | Undefined / not in SoT |
| NFC tap-to-pay, pay-link viral (007) | No repo evidence |
| AI remote-control intent panel (015) | Cost/privacy |
| Social Media Command Center (012) | Strategic fork |
| OpenCV browser anti-spoof (031) | Weight/complexity |
| Brand-locked vCoin variants (020) | Commercial complexity |
| wCoin / gCoin full specs | Post-MVP until scope locked |
| Flutter/Expo parallel production trees | Competing with React repo |
| All undeployed demo URLs | Until owner picks lineage |

---

## 15. What Must Be Rejected / Obsolete

| Item | Superseded by / reason |
|------|------------------------|
| Flutter + Firebase MVP roadmap (035) | React/Supabase repo lineage |
| G = Governance coin | 040 Go/Growth |
| U = Unlock | 026 User Value (if U kept at all) |
| 5-screen cross as **product** primary nav | 014 UX law |
| Dark fintech dashboard as primary visual | Design v2 / soft depth |
| Full neumorphism everywhere | 014, 009 scope |
| 12-day streak bar | 012 owner removal |
| Lovable iView fork | 010 rejection |
| User-facing compound coin names (`afcoins`) | 007 rejection |
| Exact gaze certification marketing | 039 probabilistic ACS |
| Eye-tracking simulation presented as production (037) | Demo disclaimer only |
| Conv 029 as economy source | Meta — cite 007/015/028 |
| Conv 021 as unique UX source | Duplicate of 014 |
| 032 + 037 duplicate MVP artifacts | Cite once |
| Direct aCoin → iCoin shortcut | Rejected 023/025 |
| Rebuilding single HTML repeatedly | 005/036 — use Vite + build-log |

---

## 16. What Must Be Extracted Next

### Priority order

| Priority | Target | Rationale |
|----------|--------|-----------|
| **P0** | Ranks 41–50 (next P0 batch) | Complete P0 band before P1 |
| **P0** | Remaining 64 P0 threads | Constitution requires full P0 pass |
| **P1** | B–Z letter specs beyond extracted letters | 028 index gaps |
| **P1** | oCoin Origin vs Offers deep spec | HI-05 |
| **Evidence** | Re-verify 039 audit vs current repo | CR-01 |
| **Evidence** | Locate i-app-economy-rules.md, build-log.md, 038 HTML, 037 i-app.jsx | Gaps |
| **Evidence** | Prior "Go coins" chat referenced in 040 | G letter reconciliation |

### Suggested ranks 41–50 (from priority queue)

Face Gesture Phone Control, Promotional Video Eye-Tracking, Best skills to install, Investor Demo Design, remaining economy letters (eCoin/wCoin neighbors already partially done), i Platform ecosystem thread, etc.

---

## 17. Readiness Verdict

| Criterion | Status |
|-----------|--------|
| P0 ranks 1–40 extracted | **Complete** |
| Cross-batch synthesis | **Complete** (this document) |
| Currency semantics resolved | **Blocked** — owner decision required |
| Attention session bypass fixed | **Blocked** — critical; owner confirmed YES |
| Demo lineage selected | **Blocked** — owner decision required |
| Product IA owner-locked | **Blocked** — 4-tab candidate not decided |
| Ready for canonical promotion | **No** |
| Ready to continue P0 extraction | **Yes** — extraction and owner decisions can parallel |

### Recommended next action

1. **Owner session:** Agenda §12 items 1–3 (session bypass remediation plan, currency naming, demo lineage) — these block everything else.
2. **Continue extraction:** P0 batch 05 (ranks 41–50) — does not require resolving forks first, but **must not silently resolve conflicts in extraction**.
3. **Do not promote** any CC-B01–B04 candidate into `CANONICAL/` until blockers CR-01 through CR-06 have owner disposition.

---

## Related Artifacts

| Document | Purpose |
|----------|---------|
| `P0_BATCH_01_SUMMARY.md` … `P0_BATCH_04_SUMMARY.md` | Per-batch detail |
| `P0_BATCH_*_CANONICAL_CANDIDATES.md` | Full CC-ID lists |
| `P0_BATCH_*_CONFLICTS_AND_DUPLICATES.md` | Per-batch conflicts |
| `P0_BATCH_03_CURRENCY_RECONCILIATION_NOTES.md` | Currency evidence map |
| `EXTRACTED/conversations/001–040_*.md` | Per-conversation extractions |
| `CANONICAL/i_SOURCE_OF_TRUTH.md` | Constitution |
| `CANONICAL_CANDIDATES.md` | Master candidate registry (updated) |
| `DUPLICATES_AND_CONFLICTS.md` | Master conflict registry (updated) |
