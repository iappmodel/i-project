# P0-017: Eye-Tracking System Audit and Integration Review

**Extraction batch:** P0 Batch 02  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `a26669ba-ca17-4979-b30e-116280b3263b` |
| Title | Eye-tracking system audit and integration review |
| Date created | 2026-03-27 |
| Date updated | 2026-04-08 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json#a26669ba-ca17-4979-b30e-116280b3263b` |
| Messages | 126 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 119 | P0 | Attention, Trust, Economy, Tech Architecture, Dev Workflow |

---

## 3. Project-Specific Summary

Comprehensive **audit** of eye-tracking, remote control, and **reward integration** requested (Opus 4.6). Claude reviews project MD files (`i-app-design-system`, `economy-rules`, `feature-bible`, `demo-spec`) and a large codebase narrative (~2,630-line HTML/JS concerns, AttentionEngine TS, Expo app attempts).

**Key findings theme:** failures live at **system seams** (engine↔reward, iOS↔Android scoring, demo vs production).

**Remediation plan (prioritized):**

- **P0:** Error boundary on engine push, replay protection, resolve partial-reward contradiction (owner decision)
- **P1:** Cross-platform score parity (coordinate + EAR normalization)
- **P2:** Content-type dwell thresholds, fraud→trust, wheel button through verification
- **P3:** Demo polish (deprioritized if real engine is the demo)

Owner chooses **real live tracking for investor demo** (not mocked). Thread pivots to **Expo SDK 52** scaffold `~/i-app`, copies AttentionEngine, runs mock frames at 30fps in simulator, then struggles with native builds (VisionCamera/worklets, SDK 55 canary, x86_64 sim, dependency hell). Resolution path: **Expo Go + mock/sensor data** for deadline; real camera on **physical iPhone only**.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-017-01 | **DEMO vs PRODUCTION** tracks both exist; investor path = real engine on device when possible | High |
| D-017-02 | **P0 safety** before features: crash boundary, replay exploit close | High |
| D-017-03 | Platform parity (iOS ARKit vs Android MediaPipe) required before trusting payouts | High |
| D-017-04 | For deadline: **Expo Go + mock** beats broken native prebuild | High |
| D-017-05 | Chat = plan; Claude Code = build (reiterated) | High |
| D-017-06 | `~/i-app-demo` exists locally (Vite); full Expo `~/i-app` was sandbox-born — verify on disk | Medium |

---

## 5. Extracted Feature/System Concepts

### AttentionEngine (as audited)

- 14-step pipeline, classifiers, gaze/dwell processors
- `useAttentionEngine` hook with cleanup + error boundary requirement
- Reward gate example: HUMAN_PRESENCE threshold 70% — fails correctly on weak mock
- Fastify backend revalidation mentioned in file list

### Critical integration risks (seams)

- Partial reward vs full reward policy undefined
- iOS/Android score mismatch → unfair payouts
- Wheel/spin rewards bypassing verification
- Fraud signals not feeding trust scores

### Expo implementation status

- Engine runs in simulator with mock frames (MEANINGFUL_VIEW, dwell, zone)
- Native camera: blocked on sim; needs device + simplified expo-camera/face-detector path
- Gyroscope fallback explored when face-detector fails

---

## 6. Extracted UX/Design Ideas

- Live attention HUD, gaze cursor overlay on feed (planned Phase 4–5)
- Coin burst on reward pass
- Calibration flows referenced from conv 015

---

## 7. Extracted Technical Architecture Ideas

| Component | Path / note |
|-----------|-------------|
| Engine TS | `src/engine/*`, `src/hooks/useAttentionEngine.ts` |
| Native iOS | AttentionBridge.swift |
| Native Android | AttentionModule.kt |
| Cursor rules | `.cursorrules` invariants, never-do list |
| Web demo | `~/i-app-demo` Vite per audit |

**Stack tension:** Specs say Vite/React/Supabase; audit implements Expo RN for camera.

---

## 8. Extracted Economy/Currency Ideas

- Alpha ledger + per-letter triggers tied to engine events
- Reward gate must gate **all** earn paths including gamified wheel
- Partial vs pending vs available settlement — needs owner lock

---

## 9. Extracted Investor/Demo Ideas

- **Live demo thesis:** investor sees real attention scores on their device
- Critical path: one phone, real camera, real gate, real reward UI
- Until then: engine dashboard in Expo proves pipeline

---

## 10. Conflicts with Current Masterbrain

| Topic | Thread | SoT / docs | Verdict |
|-------|--------|------------|---------|
| Proof emission | Engine scores discussed | Proof packet not emitted (EVIDENCE_VERIFICATION) | **Gap persists** |
| flutter-runtime authority | Expo rebuild | MASTER_BRAIN points to flutter-runtime | **Repo fork** |
| Vicoin/Icoin vs alpha | Alpha ledger | 5-coin SoT | **Conflict** |

---

## 11. Conflicts with P0 Batch 1

| Topic | Batch 01 | This thread |
|-------|----------|-------------|
| Web TF.js demo | 003 | Expo native focus | **Competing implementation** |
| 5-gate labels | 002 overlay | Engine HUMAN_PRESENCE etc. | **Map required** |
| DEMO/PRODUCTION | 001, 010 | Explicit remediation tiers | **Strengthens** CC-B01-19 |
| Feature bible "not started" vs engine "90%" | Gap in 011 | Audit both claims | **Evidence gap** |

---

## 12. Canonical Candidates

| Candidate | Target |
|-----------|--------|
| P0 remediation: error boundary + replay protection | `TRUST_SYSTEM/` + engine docs |
| Cross-platform normalization requirement | `ATTENTION_SYSTEM/` |
| Seam-risk checklist (reward partial policy, wheel bypass) | `DUPLICATES_AND_CONFLICTS` |
| Demo=real engine on device strategy | `INVESTOR_DEMO/` |

---

## 13. Preserve-Only Notes

- ngrok, SSH, Termux overlap with conv 011 — dedupe in process docs
- Long Xcode/pod error logs
- Opus 4.6 marketing label

---

## 14. Obsolete Notes

- Assuming SDK 55 canary Expo for production
- Simulator-based eye-tracking demo claims
- 2,630-line monolithic HTML as long-term architecture

---

## 15. Follow-Up Extraction Targets

- Read `.cursorrules` + engine files in IVAULT repos vs audit claims
- Map P0/P1/P2 findings to `POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`
- Owner decision: partial reward policy
- Physical device test log for HUMAN_PRESENCE gate
