# P0-035: i App Development Roadmap (OpenAI)

**Extraction batch:** P0 Batch 04  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | OpenAI |
| Conversation ID | `67fc36ec-599c-8008-8c1f-c7058c571483` |
| Title | i App Development Roadmap |
| Date created | 2025-04-13 |
| Date updated | 2026-04-23 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CHATGPT/gpt chats/conversations-001.json#67fc36ec-599c-8008-8c1f-c7058c571483` |
| Messages | 2 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 84 | P0 | Tech Architecture, Economy (display), Attention, UX |

---

## 3. Project-Specific Summary

Early (2025) **Flutter + Firebase** MVP roadmap for the *i* App. Recommends TensorFlow Lite/MediaPipe eye-tracking in Flutter, **Vicoins/Icoins** dual currency with Stripe, Firestore backend, Google Maps for local promos, 5-screen cross-navigation, promotional campaign system, facial re-verification, GDPR/CCPA.

User pastes structured **phase checklist** (Phases 1–6+) aligning with assistant's stack proposal. **Historical artifact** — predates current React/Vite/Supabase/Capacitor lineage documented in later chats (031, 039).

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-035-01 | Original stack choice: **Flutter + Firebase** (not React/Supabase) | High (historical) |
| D-035-02 | **5-screen layout** with cross-screen swipe navigation | High |
| D-035-03 | Dual currency: **Vicoins + Icoins** + Stripe payouts | High |
| D-035-04 | Eye-tracking via **TensorFlow Lite or MediaPipe in Flutter** | Medium |
| D-035-05 | Local business map + GPS promotions as core feature | Medium |
| D-035-06 | Phased roadmap: Init → UI → Core → Security → Campaigns → Backend | Medium |

---

## 5. Extracted Feature/System Concepts

### Phase checklist highlights

- Fullscreen media, 3D customizable buttons, wallet, eye-tracking prompt UI
- Reward calculation on promo completion
- Locked media segments purchasable with Vicoins
- Campaign creation + analytics + internal inbox
- Firebase security rules, Cloud Functions for business logic

---

## 6. Extracted UX/Design Ideas

- Figma primary for mockups
- Promotional rewards animations
- Local business promotional map UI

---

## 7. Extracted Technical Architecture Ideas

| Layer | Choice |
|-------|--------|
| Mobile | Flutter (Dart), hot reload |
| Auth/DB | Firebase Auth, Firestore, Storage |
| Payments | Stripe or Braintree |
| Vision | TensorFlow Lite / MediaPipe on-device |
| Maps | Google Maps API |
| Analytics | Firebase Analytics + Crashlytics |

Optional PostgreSQL secondary — noted as usually unnecessary.

---

## 8. Extracted Economy/Currency Ideas

- Vicoins: virtual, in-app purchases (locked content)
- Icoins: real monetary value, withdrawable via Stripe
- Reward calculation on promotional content completion

No alphabet coins, no aCoin/rCoin pipeline.

---

## 9. Extracted Investor/Demo Ideas

- Phase-gated roadmap document for stakeholder alignment
- Local interaction + physical reward earning as differentiator

---

## 10. Conflicts with Current Masterbrain

| Topic | This thread | SoT / current repo | Verdict |
|-------|-------------|-------------------|---------|
| Stack | Flutter/Firebase | React/Vite/Supabase/Capacitor | **Obsolete stack** |
| Currency | Vicoins/Icoins | a/i/v/e/o | **Naming fork** |
| Maps/local | Core phase feature | SoT mentions earn paths | **Concept may persist** |

---

## 11. Conflicts with P0 Batches 1–3

| Topic | Prior | This thread |
|-------|-------|-------------|
| 4-tab IA (014, 038) | Feed/Earn/Wallet/Profile | 5-screen nav | **IA conflict — historical** |
| React stack (031, 039) | Supabase Edge Functions | Firebase Cloud Functions | **Backend fork** |
| Alphabet economy (B03) | A–Z specs | Not present | **Era split** |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B04-15 | Phased MVP roadmap structure (process reference) | D |
| CC-B04-16 | Local business + GPS promo as earn vector | C — if still in scope |

---

## 13. Preserve-Only Notes

- Useful as **archaeological baseline** showing stack pivot timeline (2025 Flutter → 2026 React)
- Checklist items may map to unbuilt features — cross-ref repo

---

## 14. Obsolete Notes

- **Entire Flutter/Firebase stack recommendation** — superseded by eye-earn-sparkle lineage
- Stripe-as-primary if Supabase payout path chosen
- 5-screen nav if 4-tab locked (014/038)

---

## 15. Follow-Up Extraction Targets

- Inventory whether any Flutter `i_app` project exists in IVAULT repos
- Map phase checklist items to MASTER_BRAIN feature coverage gaps
- Reconcile local map feature with current demo scope
