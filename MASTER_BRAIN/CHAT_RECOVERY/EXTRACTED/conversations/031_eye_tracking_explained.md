# P0-031: Eye Tracking Explained (OpenAI)

**Extraction batch:** P0 Batch 04  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | OpenAI |
| Conversation ID | `69ac899e-f9b4-832b-bd98-e01453a90e63` |
| Title | Eye Tracking Explained |
| Date created | 2026-03-07 |
| Date updated | 2026-03-07 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CHATGPT/gpt chats/conversations-002.json#69ac899e-f9b4-832b-bd98-e01453a90e63` |
| Messages | 20 (13 substantive after filtering thoughts/code stubs) |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 86 | P0 | Attention, Remote Control, Tech Architecture, Dev Workflow |

---

## 3. Project-Specific Summary

Owner asks how to implement **eye-tracking and remote control** on the same camera pipeline for the **[ i ] app**. OpenAI delivers: (1) educational overview of gaze mechanics; (2) recommended **MediaPipe Face Landmarker + TensorFlow.js + WebGazer.js** hybrid stack; (3) copy-paste **Codex terminal commands** for React/Vite/Capacitor + Supabase repos; (4) unified **multi-tracker vision stack** adding Hand Landmarker + Gesture Recognizer + `fingerpose` for blink/head/gesture remote control; (5) anti-fraud layer recommendation (OpenCV replay detection).

Assumes **React/Vite/Capacitor + Supabase** — aligns with eye-earn-sparkle lineage, not early Flutter/Firebase roadmap (035).

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-031-01 | Remote control and eye-tracking share **one camera pipeline** (multi-tracker), not separate stacks | High |
| D-031-02 | **MediaPipe tasks-vision** as primary on-device engine (468 landmarks, iris, blendshapes) | High |
| D-031-03 | **TensorFlow.js** as gaze-classification accuracy layer atop MediaPipe geometry | Medium |
| D-031-04 | **WebGazer.js** as browser fallback only — easier to cheat | Medium |
| D-031-05 | **OpenCV** recommended for anti-spoof (replay, photo, looped video) | Medium |
| D-031-06 | Gesture remote-control mapping: look L/R nav, double-blink click, pinch select, palm scroll, head nod confirm | Medium |

---

## 5. Extracted Feature/System Concepts

### Recommended vision modules

- `src/vision/initAttentionEngine.ts` — FaceLandmarker singleton
- `src/vision/startCamera.ts` — getUserMedia wrapper
- `src/vision/attentionMath.ts` — EAR, head pose, gaze proxy
- `src/vision/handControlEngine.ts` — HandLandmarker + gestures
- `src/services/attentionReward.ts` — client calls Supabase Edge `issue-reward`

### Signal outputs

Face presence, eye openness (EAR), gaze vector proxy, head pose, blink rate, hand landmarks (21/hand), gesture classification.

### Accuracy expectations

- Hardware IR trackers ~0.5°; webcam ~80–90% — sufficient for **attention verification**, not lab-grade gaze.

---

## 6. Extracted UX/Design Ideas

- Remote control as **accessibility + demo wow** (hands-free navigation)
- Calibration flow: four-corner gaze mapping before rewards
- Combined face + hand + head signals for richer control scheme

---

## 7. Extracted Technical Architecture Ideas

```
Camera Stream → MediaPipe Face (+ Hand/Gesture) → Attention Signal Engine
  → TF.js classifier → Anti-Fraud (OpenCV) → Supabase Edge → issueAttentionReward()
```

- npm packages: `@mediapipe/tasks-vision`, `@tensorflow/tfjs`, optional `fingerpose`, `@tensorflow-models/hand-pose-detection`
- Lazy-load TF.js; on-device inference (no cloud cost for vision)

---

## 8. Extracted Economy/Currency Ideas

- Rewards issued only after attention validator passes — ties to `issue-reward` Edge Function
- No new coin definitions; assumes existing wallet/reward loop

---

## 9. Extracted Investor/Demo Ideas

- Free stack demo-able on laptop webcam (no Tobii hardware)
- Remote control gesture table as live demo script

---

## 10. Conflicts with Current Masterbrain

| Topic | This thread | SoT / prior canon | Verdict |
|-------|-------------|-------------------|---------|
| Stack | React/Vite/Capacitor + Supabase | SoT agnostic; repo is React+Supabase | **Align** |
| Claim | "Certified gaze" implied in places | SoT: qualification not surveillance; probabilistic | **Soften claim** |
| Flutter | Not mentioned | Conv 035 recommends Flutter+Firebase | **Stack fork** (035 obsolete) |

---

## 11. Conflicts with P0 Batches 1–3

| Topic | Prior | This thread |
|-------|-------|-------------|
| TF.js vs MediaPipe (017, 027) | Both cited; 027 MediaPipe product feature | **MediaPipe primary + TF.js layer** — reconciles |
| Remote control (027) | Gesture/blink product feature | Same + hand landmarks — **extends 027** |
| issue-reward trust (039 overlap) | Session hardening in 039 audit | Client-side reward call shown — **must pair with 039 server spec** |
| WebGazer (015) | Optional fallback | Same — **align** |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B04-01 | Unified camera pipeline (face + hand + gesture) | B |
| CC-B04-02 | MediaPipe-first + TF.js classifier layering | B |
| CC-B04-03 | OpenCV anti-spoof as economy protection layer | C |
| CC-B04-04 | Codex scaffold file layout under `src/vision/` | D — process |

---

## 13. Preserve-Only Notes

- Third-party tool survey (GazeRecorder, PyGaze, LibreTracker, Tobii) — reference only
- Webcam accuracy claims (~85–90%) — validate on target devices

---

## 14. Obsolete Notes

- Installing `opencv.js` via npm for browser — heavy; evaluate need vs server-side fraud checks
- Generic "certified gaze" marketing language — superseded by probabilistic ACS model (039)

---

## 15. Follow-Up Extraction Targets

- Cross-check `src/vision/` in eye-earn-sparkle-archive vs proposed scaffold
- Reconcile with conv 039 `attention_sessions` schema (server boundary)
- Map gesture remote-control UX to MVP scope (027 flagged experimental)
