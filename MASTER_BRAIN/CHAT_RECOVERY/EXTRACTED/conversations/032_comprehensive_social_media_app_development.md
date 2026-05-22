# P0-032: Comprehensive Social Media App Development (Claude)

**Extraction batch:** P0 Batch 04  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `74a8e0c3-5a6b-42f8-96ac-a6d423fcde9d` |
| Title | Comprehensive social media app development |
| Date created | 2025-12-09 |
| Date updated | 2026-03-21 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json#74a8e0c3-5a6b-42f8-96ac-a6d423fcde9d` |
| Messages | 8 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 85 | P0 | Demo, Economy (display), Attention, UX |

---

## 3. Project-Specific Summary

Early Claude **Analysis Tool artifact** building a full **[ i ] App** MVP prototype. Core concept: immersive full-screen media, **dual currency (Vicoins virtual + Icoins USD-equivalent)**, promotional watch-to-earn with **eye-tracking indicator**, 3D customizable buttons, wallet/profile/settings. Delivers a working React artifact summarizing feature checklist — **no alphabet coin system**, chat-era **Vicoin/Icoin naming**.

Largely **duplicate of conv 037** (App development request) with richer feature enumeration.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-032-01 | MVP uses **Vicoins + Icoins** dual display (not a/i/v/e/o) | High |
| D-032-02 | Eye-tracking activates **during promotional content only** | Medium |
| D-032-03 | Full reward only on **complete video viewing** | Medium |
| D-032-04 | 6 floating 3D buttons (Wallet, Profile, Like, Comment, Share, Settings) | Medium |
| D-032-05 | Verification badges: ID + Eye-tracking on profile | Low |

---

## 5. Extracted Feature/System Concepts

- Full-screen media feed with swipe navigation
- Promotional content progress bar + completion coin animation
- Wallet: balances, transaction history, Withdraw/Transfer/Exchange/Promote
- Eye-tracking visual indicator (engagement verification UX)
- Smart notifications (3s auto-dismiss)
- Screen configuration / cross-navigation settings

---

## 6. Extracted UX/Design Ideas

- Clean immersive feed — no visible chrome during media
- Green money accents; gradient 3D buttons at screen edges
- Toggle button visibility via menu icon

---

## 7. Extracted Technical Architecture Ideas

- React artifact (Analysis Tool) — not production repo structure
- Eye-tracking described as feature flag / indicator — implementation depth unclear

---

## 8. Extracted Economy/Currency Ideas

| Coin | Role in thread |
|------|----------------|
| Vicoins | Virtual platform currency for engagement |
| Icoins | Real USD-equivalent, withdrawable |

No conversion pipeline, no aCoin/rCoin layer.

---

## 9. Extracted Investor/Demo Ideas

- Feature-complete MVP demo narrative for stakeholders
- Lifetime earnings + verified account on profile

---

## 10. Conflicts with Current Masterbrain

| Topic | This thread | SoT | Verdict |
|-------|-------------|-----|---------|
| Currency | Vicoins/Icoins | a/i/v/e/o MVP set | **Naming fork** |
| Icoin role | Cash USD | iCoins cash-value | **Role align, letter differ** |
| Vicoin role | Virtual engagement | vCoins utility | **Rough align** |

---

## 11. Conflicts with P0 Batches 1–3

| Topic | Prior | This thread |
|-------|-------|-------------|
| 4-tab IA (014, 038) | Feed/Earn/Wallet/Profile | Full-screen + floating buttons — **different IA** |
| OpenAI letter specs (023–028) | A–Z taxonomy | Not present — **chat-era only** |
| Conv 037 | Near-identical artifact | **Duplicate** — cite 032 or 037 once |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B04-05 | Promotional watch-to-earn with progress + completion gate | C — demo pattern |
| CC-B04-06 | Eye-tracking active indicator during sponsored content | C |

---

## 13. Preserve-Only Notes

- Artifact may exist only in Claude export — locate on-disk React/HTML if exported
- Feature list useful as **demo checklist**, not product constitution

---

## 14. Obsolete Notes

- Entire Vicoin/Icoin naming if owner locks OpenAI/SoT letters
- 6-button floating chrome vs 4-tab shell (038/014)

---

## 15. Follow-Up Extraction Targets

- Deduplicate with 037 — single canonical "early Claude MVP artifact" note
- Trace whether artifact was exported to IVAULT repos
