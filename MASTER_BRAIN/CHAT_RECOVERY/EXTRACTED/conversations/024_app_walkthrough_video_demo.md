# P0-024: App Walkthrough Video Demonstration (Claude)

**Extraction batch:** P0 Batch 03  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `6cf0db82-7250-41bd-afdd-89d27b0bde93` |
| Title | App walkthrough video demonstration |
| Date created | 2026-03-20 |
| Date updated | 2026-03-20 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json#6cf0db82-7250-41bd-afdd-89d27b0bde93` |
| Messages | 2 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 105 | P0 | Demo, UX, Economy (display) |

---

## 3. Project-Specific Summary

Owner requests an **auto-playing HTML walkthrough** artifact for [ i ] app. Claude delivers **`i-app-walkthrough.html`** — 8-screen animated demo with voiceover-style captions, no backend.

Screens: Splash → Feed → Watch & Earn → Wallet → Earn Marketplace → Wheel → Coin Economy → Profile & Trust.

Uses **iCoins + vCoins** in wallet/economy screens (chat naming, not a/e/o alphabet).

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-024-01 | 8-screen walkthrough sequence for investor/stakeholder demo | High |
| D-024-02 | Coin economy slide: **60/30/10** split (user/creator/platform) | Medium |
| D-024-03 | Wallet shows dual balances: iCoins + vCoins | High |

---

## 5. Extracted Feature/System Concepts

- Watch & Earn funnel with verification badge
- Earn Marketplace + Wheel as engagement surfaces
- Profile & Trust tier display
- Auto-advance timing per screen (~5–8s)

---

## 6. Extracted UX/Design Ideas

- Dark theme, green accent (#00E676)
- Animated transitions between screens
- Single-file HTML deployable artifact

---

## 7. Extracted Technical Architecture Ideas

- Static HTML/CSS/JS only — zero backend
- Suitable for screen recording → video export

---

## 8. Extracted Economy/Currency Ideas

| Display | Role in walkthrough |
|---------|---------------------|
| iCoins | Primary earned/cash-like balance |
| vCoins | Secondary utility balance |
| 60/30/10 | Revenue/reward split visualization |

No aCoins/eCoins/oCoins in this artifact.

---

## 9. Extracted Investor/Demo Ideas

- HTML walkthrough as **video source material**
- 8-screen narrative arc for pitch deck alignment
- Coin economy screen for investor FAQ

---

## 10. Conflicts with Current Masterbrain

| Topic | Walkthrough | SoT | Verdict |
|-------|-------------|-----|---------|
| iCoins | Cash-like display | iCoins = cash-value | Aligns |
| vCoins | Utility secondary | vCoins = utility | Aligns |
| 60/30/10 split | Shown | SoT silent | **Evidence only** |

---

## 11. Conflicts with P0 Batch 1 and 2

| Topic | Prior | This thread |
|-------|-------|-------------|
| vs 016 | Demo HTML patterns | Similar static demo approach |
| vs 014 | 4-tab IA | Walkthrough includes marketplace/wheel — **more screens than 4 tabs** |
| vs 020 | vCoin economic layer | vCoin shown as utility — aligns with chat naming |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B03-05 | 8-screen investor walkthrough sequence | C — demo UX |
| CC-B03-06 | 60/30/10 split as cited economy visualization | D — verify against SoT |

---

## 13. Preserve-Only Notes

- Full HTML artifact path in thread — locate on disk if archived
- Animation timing values — demo tuning only

---

## 14. Obsolete Notes

- None — still valid as demo narrative reference

---

## 15. Follow-Up Extraction Targets

- Locate `i-app-walkthrough.html` in IVAULT archive
- Compare screen list to conv 030 investor demo phases
