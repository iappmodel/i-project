# P0-015: Eye-Tracking Attention Interface for Verified Engagement

**Extraction batch:** P0 Batch 02  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `729c0fa9-5ad8-4de7-8056-1e8979f5b3d2` |
| Title | Eye-tracking attention interface for verified engagement |
| Date created | 2026-03-19 |
| Date updated | 2026-03-27 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json#729c0fa9-5ad8-4de7-8056-1e8979f5b3d2` |
| Messages | 24 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 125 | P0 | Attention, Economy, Trust, Tech Architecture |

---

## 3. Project-Specific Summary

Owner supplies an **ultra-detailed master concept brief** for eye-tracking + remote control inside [ i ] — framed as attention/intent infrastructure, not a gimmick. Claude builds **layered architecture**: on-device sensing (MediaPipe / ARKit) → native SDK (dwell, zones, confidence) → backend receives **scores only** (not raw video) → reward/advertiser logic.

Thread progresses to **A–Z alpha coin integration** with tracking→classification→reward pipeline artifacts, then a **12-file production engine** spec: `AttentionEngine.ts`, classifiers, `AlphaLedger`, platform bridges (YouTube/Instagram/TikTok/Web), Swift/Kotlin native modules. Includes **6-phase calibration UX** (gaze grid, blink baseline, head neutral, dwell speed, gesture thresholds) and **remote-control-opus** artifact with periodic AI interpretation panel.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-015-01 | Raw video stays on-device; backend gets **scored outputs only** | High |
| D-015-02 | UI artifact = design reference; production needs native bridges | High |
| D-015-03 | Alpha coins tied to **typed trigger conditions** per letter | Medium |
| D-015-04 | Platform bridge classes per external context (YT/IG/TikTok/Web) | Medium |
| D-015-05 | Remote control uses dwell + focus ring; AI panel for intent prediction (experimental) | Medium |

---

## 5. Extracted Feature/System Concepts

### Attention pipeline (14-step orchestrator claimed)

- GazeProcessor, DwellAccumulator, FixationClassifier (I-VT, 200ms window)
- Fraud scoring, rate limits, dedup hash buckets in AlphaLedger
- Coin tier colors: mint (base), gold (engagement), ice (fixation), ember (cross-platform), violet (peak)

### Calibration flow (6 phases)

Intro → 9-point gaze → blink baseline → head neutral → dwell speed selection → gesture thresholds

### Reward linkage

Tracking events → classification → alpha coin issuance → session wallet

---

## 6. Extracted UX/Design Ideas

- Live gaze cursor, dwell SVG arc, attention HUD on feed
- Camera-on indicator, privacy guarantee in calibration intro
- Remote control: intent / top command / confidence / signal quality panel every 5s

---

## 7. Extracted Technical Architecture Ideas

| Layer | Technology |
|-------|------------|
| iOS | ARKit `ARFaceAnchor.lookAtPoint`, Swift JSI bridge, EMA smoothing |
| Android | MediaPipe FaceLandmarker 468 landmarks, Camera2 |
| TS core | AttentionEngine, processors, AlphaBridge |
| Web demo | TF.js + MediaPipe (per batch 01 conv 003) |

---

## 8. Extracted Economy/Currency Ideas

- Full A–Z coin registry with trigger conditions tied to attention signals
- External platform engagement rewards via bridge pattern
- **Conflicts with 5-coin MVP** — treat as expansion/experimental

---

## 9. Extracted Investor/Demo Ideas

- Live interactive artifact demonstrating tracking→earn pipeline for presenter
- Calibration as trust-building onboarding for premium offers

---

## 10. Conflicts with Current Masterbrain

| Topic | Thread | SoT | Verdict |
|-------|--------|-----|---------|
| Eye-tracking scope | Deep integration + A–Z coins | Optional; qualification not surveillance | **Scope conflict** if all promoted |
| Alpha A–Z | Central to reward | 5 MVP currencies | **Experimental** |
| AI remote control | Opus interprets gaze every 5s | Not in SoT | **Experimental** |

---

## 11. Conflicts with P0 Batch 1

| Topic | Batch 01 | This thread |
|-------|----------|-------------|
| Web demo eye stack | TF.js client-side demo (003) | Native ARKit/MediaPipe production spec | **Layered** — demo vs prod |
| 5-gate overlay | Device/Dwell/Gaze/Complete/Fraud (002) | Engine + alpha ledger — map in conv 017 | **Reconcile** |
| 26-coin | Detailed in 007 | AlphaTypes A–Z registry here | **Duplicate taxonomy** |

---

## 12. Canonical Candidates

| Candidate | Target |
|-----------|--------|
| Scores-only backend boundary | `ATTENTION_SYSTEM/VERIFICATION_AND_VISION.md` |
| 14-step AttentionEngine pipeline | `TECH_ARCHITECTURE/` cross-ref flutter-runtime |
| Calibration UX phases | `ATTENTION_SYSTEM/` |
| Selective use + consent copy | Reinforces CC-B01-05 |

---

## 13. Preserve-Only Notes

- clinical/assistive technology reviewer framing — positioning language
- remote-control-opus.jsx — prototype only
- Imagine skill diagram content pollution in exports

---

## 14. Obsolete Notes

- Treating AI gaze intent polling as production dependency
- Full A–Z earn on every tracking event without MVP gating

---

## 15. Follow-Up Extraction Targets

- Conv 017 audit for engine/reward integration bugs
- Match 12-file list to `integrations/eye-tracking/flutter-runtime`
- Proof: which files exist on disk vs sandbox-only
