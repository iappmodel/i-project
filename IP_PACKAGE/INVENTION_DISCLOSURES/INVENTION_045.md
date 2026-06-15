# INVENTION_045 — i* Module Surface System (14 Capability Domains)

**Inventor:** Marcelo Silva  
**Category:** Patent  
**Family:** Platform Modules & Identity  
**Date:** 2026-06-15  
**Feature ID:** F-091  
**Build status:** 20% shipped | 80% module surfaces + backends

## Problem Solved
Super-app platforms bundle features without a coherent capability taxonomy. Users cannot navigate a unified attention economy across perception, creation, movement, learning, ownership, and earning domains. No platform defines 14 first-class module surfaces where each capability domain has distinct economy binding, trust feed, and route integration from a central identity layer (iAM).

## Current Industry Approach
WeChat and Grab bundle services under one app but without proof-gated attention economics per module. Apple's app ecosystem separates apps entirely. Google Workspace modules (Docs, Drive, Maps) share account but not earning mechanics. No platform maps alphabet-named capability modules (iSEE, iMAKE, iGO...) to a 26+ω currency taxonomy with conversion hub and POP verification per module action.

## How [ i ] Solves It
The [ i ] i* Module Surface System registers 14 capability domains as first-class platform entry points. Each module exposes: a **Capability API** (what actions the module supports), an **Economy Binding** (which coins earn/spend there), a **Trust Feed** (module engagement affects trust tier), and **Route Integration** (iAM goals decompose into module paths). Modules share the immersive glass shell and POP spine; each adds domain-specific verification (e.g., iGO = geo POP, iSEE = gaze depth POP, iMAKE = publish POP gate).

## System Description

### Module Registry (14 surfaces)

| Module | Domain | Primary coins | POP gate type |
|--------|--------|---------------|---------------|
| **iSEE** | Visual perception, notice, discover | dCoin, fCoin | Gaze depth verification |
| **iMAKE** | Creation, studio, publish | cCoin, pCoin | Publish POP gate template |
| **iGO** | Movement, location missions | sCoin, eCoin | Geo Haversine check-in |
| **iHEAR** | Audio, music, podcasts | wCoin, kCoin | Listen-duration verification |
| **iLEARN** | Education, quizzes, growth | kCoin, lCoin | Completion + quiz POP |
| **iMAP** | Navigation, spatial, routes | nCoin | Route stop verification |
| **iOWN** | Asset ownership, digital goods | mCoin, uCoin | Ownership proof |
| **iSAVE** | Value retention, savings goals | lCoin, rCoin | Hold-duration verification |
| **iDO** | Action execution, tasks | eCoin, bCoin | Task completion POP |
| **iEARN** | Economic participation, Loop 1 | aCoin, iCoin, vCoin | Full POPS session |
| **iASK** | Inquiry, research, Q&A | qCoin, kCoin | Engagement depth |
| **iGET** | Acquisition, claims, rewards | rCoin, hCoin | Claim eligibility POP |
| **iAM** | Identity, future-self, routes | tCoin (non-tradeable) | Identity consistency |
| **iOmega** | Meta-integration, reputation | zCoin, gCoin | Cross-module aggregation |

### Architecture
**Module Router:** 5-tab dock + module launcher maps to surface screens. **Shared Spine:** all modules call `attentionSession` → proof packet → settlement. **Economy Router:** module actions tag `source_module` for ledger analytics and cap enforcement. **iAM Routes:** goal → ordered module sequence with checkpoints.

## Technical Components
- `MASTER_BRAIN/SYSTEMS/ModuleAlphabet.md` — module definitions
- `MASTER_BRAIN/ECONOMY/i-app-economy-rules.md` — per-coin earning rules
- `07_currency_system/alphabet-currency.html` — interactive taxonomy UI
- Module entry stubs in immersive nav (iGO via promo, iEARN via watch, iGET via wallet)
- iAM Routes engine — `INVENTION_040.md`
- POP gate per module — extends `INVENTION_029.md`

## Data Flow
1. User selects module from launcher or route checkpoint.
2. Module loads surface UI within immersive glass shell.
3. User performs domain action (watch, create, check-in, learn, etc.).
4. Module tags action with `source_module` + required POP gate type.
5. Attention session captures module-specific evidence.
6. Proof packet seals with module context field.
7. Server POPS scoring applies module-weighted layers.
8. Settlement issues module-appropriate coin types.
9. Trust feed and iAM identity graph update module engagement metrics.

## User Flow
User opens iGO — sees local promo missions on map. Completes check-in — earns sCoin + eCoin. iAM route suggests iLEARN checkpoint — user completes quiz for kCoin. iGET consolidates claimable rewards. iOmega dashboard shows cross-module reputation score.

## Economic Flow
Each module feeds the rCoins conversion hub before cash-equivalent withdrawal. Non-convertible coins (gCoin governance, tCoin trust, zCoin zenith) stay module-bound per economy rules. Module engagement increases trust tier → better conversion rates platform-wide.

## Fraud Prevention
- Module-specific POP gates — cannot earn iGO rewards without geo verification
- `source_module` server-validated — client tag advisory only
- Per-module daily caps
- Cross-module farming detection (impossible module switch timing)
- iOmega reputation resists single-module gaming

## Unique Elements
1. Fourteen alphabet-named capability modules as first-class surfaces (not just feature flags)
2. Per-module economy binding with distinct coin types and POP gate types
3. Central iAM Routes engine decomposing goals into cross-module execution plans
4. iOmega meta-module aggregating cross-module reputation
5. Shared POP spine with module-specific verification extensions
6. Integration with 26+ω currency taxonomy and rCoins conversion hub

## Potential Patent Claims
1. A modular digital platform comprising a plurality of alphabet-named capability module surfaces, each module having a distinct economy binding mapping module actions to specific virtual currency types, a module-specific proof-of-presence gate type, and a trust feed updating platform trust score from module engagement.
2. A method for cross-module goal execution comprising: receiving a user goal in an identity layer; decomposing the goal into an ordered sequence of capability module checkpoints; validating proof-of-presence at each checkpoint using a gate type specific to the module; and issuing module-appropriate virtual currency upon settlement.
3. A meta-integration module aggregating engagement metrics across a plurality of capability modules to compute a cross-module reputation score affecting platform-wide economic capabilities.

## Potential Competitors
WeChat (super-app), Grab, Apple (ecosystem), Google (Workspace modules), Meta (Horizon worlds)

## Related Files
- `MASTER_BRAIN/SYSTEMS/ModuleAlphabet.md`
- `MASTER_BRAIN/ECONOMY/i-app-economy-rules.md`
- `07_currency_system/alphabet-currency.html`
- `INVENTION_DISCLOSURES/INVENTION_036.md` (currency taxonomy)
- `INVENTION_DISCLOSURES/INVENTION_040.md` (iAM identity)

## Scores
| Metric | Score (1-10) |
|--------|-------------|
| Priority | 7 |
| Patentability | 7 |
| Business Value | 9 |
