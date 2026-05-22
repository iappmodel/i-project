# P0-003: Camera-Based Gaze Tracking with Attention Scoring

**Extraction batch:** P0 Batch 01  
**Extracted:** 2026-05-21

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `ada911f5-d2c0-4aa9-8c7f-25f660c73b0b` |
| Title | Camera-based gaze tracking with attention scoring |
| Date created | 2026-04-09 |
| Date updated | 2026-04-10 |
| Raw path | `…/conversations.json#ada911f5-d2c0-4aa9-8c7f-25f660c73b0b` |
| Messages | 15 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 181 | P0 | Attention, Investor Demo, Design/UX, Eye Tracking |

---

## 3. Project-Specific Summary

Major investor-demo design session combining **camera-based gaze simulation**, **glassmorphic customizable UI**, and a **9-step presenter flow**. Owner provided extensive UX references (10 mockup images). Thread includes explicit **design-system pivot** away from "fintech dashboard" toward **content-first glass platform** with light neumorphic settings screens.

Session ends with **HANDOFF.md**, `index.html` v3 (~785 lines), and `i-app-design-system-v2.md` for continuation in new chat.

---

## 4. Extracted Decisions

| ID | Decision |
|----|----------|
| D-003-01 | **Web eye-tracking MVP**: getUserMedia + TensorFlow.js + MediaPipe face detection — client-side, CPU-only, no server |
| D-003-02 | Gaze UI: cyan dot, dwell timer **1.5s = look confirmed**, attention score 0–100, face outline + attention ring |
| D-003-03 | **Two visual modes**: content screens = full-screen media + glass overlays; function/settings screens = light neumorphic `#e8ecf1` |
| D-003-04 | Platform must be **invisible** — content is the background; glass buttons float on top |
| D-003-05 | Official logo: **3D cyan-pink gradient `i`** (not flat `[ i ]` text) for branding moments |
| D-003-06 | Feed layouts: **1/4/8/16 tile grid**; multi-directional swipe (promo/friends/discover) |
| D-003-07 | Button customizer: 7 properties — color, extrusion, size, transparency, texture, structure, position |
| D-003-08 | Floating buttons draggable for thumb ergonomics |
| D-003-09 | Investor entry: QR → splash → auto demo, no signup, pre-signed as "i" |
| D-003-10 | Presenter mode: triple-tap logo → step navigation; free explore after guided flow |

---

## 5. Extracted Feature/System Concepts

**9-step presenter flow**
1. Splash — animated logo + tagline  
2. Feed — stories, topic pills, organic + sponsored cards  
3. Watch & Earn — offer detail → attention ring → reward burst  
4. Wallet — iCoins/vCoins separated, pending, transactions  
5. Earn Marketplace — watch/survey/GPS offers  
6. Wheel — swipe up vCoins, down iCoins, heart both  
7. Economy — coin grid with tap-to-expand  
8. Creator Split — 60/30/10 animated bars  
9. Trust Score — ring + tier progression  

**Eye-tracking tab**
- Camera via getUserMedia
- Simulated gaze dot, face detection box
- 6-stage depth classification (mentioned)
- Dwell timer and attention scoring

**Onboarding overlay (4 steps)**
- "Your attention has value" → dual currencies → wheel → user control

---

## 6. Extracted UX/Design Ideas

- **Glass variables**: `--glass-light/mid/heavy/dark`, blur 20–40px, opacity 8–20%
- **Soft UI / claymorphism** for button editor (images 3, 4, 9, 10)
- **Zero-chrome immersive mode**: tap tile → full-screen content, UI hides, edge touch reveals
- Stories bar: unseen = cyan-lime gradient ring; seen = dim
- Sponsored tiles: subtle cyan shimmer
- Design system v2 replaces "premium fintech clarity" with "invisible glass platform, content-first"

---

## 7. Extracted Technical Architecture Ideas

- Pure client-side vision — no eye-tracking server for demo
- Single HTML file, zero dependencies beyond Google Fonts
- Balance animation propagates to floating strip after watch flow
- Variable naming discipline (avoid `bC` collisions noted in thread)

---

## 8. Extracted Economy/Currency Ideas

- iCoins green / vCoins amber — never mixed in UI
- Currency amounts in JetBrains Mono
- Wheel mechanic ties scroll direction to coin type

---

## 9. Extracted Investor/Demo Ideas

- QR card → `iapp.vercel.app` — scan opens mobile demo
- Triple-tap logo for presenter step nav
- All interactions instant — 3s watch → reward animates
- Target: "checkbook moment" UI/UX

---

## 10. Conflicts with Current Masterbrain

| Topic | Chat | SoT | Verdict |
|-------|------|-----|---------|
| Design direction | Light neumorphic wallet/earn screens | Premium fintech clarity (SoT-adjacent docs) | **Design evolution** — v2 design system supersedes fintech-first demos |
| Eye-tracking scope | Prominent demo feature with camera tab | Eye tracking optional; qualification not surveillance | **Aligns** if scoped to high-value offers only |
| 12-coin economy screen | 12 coins in grid (early build) | 5 MVP currencies | **Demo expansion** — not canonical until reconciled |

---

## 11. Canonical Candidates

| Candidate | Target |
|-----------|--------|
| Design system v2 two-mode model (content vs settings) | `CANONICAL_CANDIDATES.md` → design |
| Web demo eye-tracking stack (TF.js + MediaPipe) | `ATTENTION_SYSTEM/VERIFICATION_AND_VISION.md` |
| 7-property button customizer spec | Experimental / customizable UI |
| 9-step presenter narrative | `INVESTOR_DEMO/DEMO_PATHS_AND_FLOWS.md` |
| HANDOFF.md state document | Locate in IVAULT; cross-ref demo continuity |

---

## 12. Preserve-Only Notes

- Image reference numbers 1–10 (mockups in chat attachments — not reproduced here)
- Specific line counts per demo iteration (2761 → 742 → 918 → 785)

---

## 13. Obsolete Notes

- Dark void `#070709` as primary background for **all** screens — superseded by v3 light neumorphic function screens
- Tab bar navigation — replaced by floating glass buttons in v3

---

## 14. Follow-Up Extraction Targets

- Locate `HANDOFF.md` and `i-app-design-system-v2.md` in IVAULT
- Conv `729c0fa9` — eye-tracking verified engagement interface
- Conv `a26669ba` — eye-tracking system audit
- Cross-check against `integrations/eye-tracking/flutter-runtime` evidence
