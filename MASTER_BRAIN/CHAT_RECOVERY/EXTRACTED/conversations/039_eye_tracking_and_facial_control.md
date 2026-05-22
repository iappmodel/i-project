# P0-039: Eye-Tracking and Facial Control (OpenAI)

**Extraction batch:** P0 Batch 04  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | OpenAI |
| Conversation ID | `699979ee-0088-832b-af86-a1249c2016e4` |
| Title | Eye-Tracking and Facial Control |
| Date created | 2026-02-21 |
| Date updated | 2026-02-26 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CHATGPT/gpt chats/conversations-002.json#699979ee-0088-832b-af86-a1249c2016e4` |
| Messages | 67 (39 substantive user/assistant) |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 77 | P0 | Attention, Trust, Economy, Tech Architecture, Remote Control |

---

## 3. Project-Specific Summary

Largest technical thread in Batch 04. Spans: (1) market survey separating **gaze / face-gesture / identity** buckets; (2) full **structural audit** of `eye-earn-sparkle-archive` repo pasted by owner; (3) **Kill or Build** decision framework; (4) **Attention Confidence Scoring (ACS)** model with PC/EQ/Penalty; (5) mathematical **v1 reward gating**; (6) exact **`attention_sessions` schema + RPCs** and split **`issue-attention-reward`** vs non-attention rewards; (7) fraud dashboard metrics; (8) master Cursor prompts for scoring engine implementation.

Pivot recommendation: claim **"verified human attention quality"** not **"certified exact gaze."** Backend `issue-reward` partially hardened — priority shifts to **proving all client paths use session-gated flow**.

Owner confirms: **YES — client can still issue reward without valid attentionSessionId** (critical blocker).

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-039-01 | Separate problems: gaze (attention proof) vs expressions (remote control) vs identity (verification) | High |
| D-039-02 | **No validated session → no reward** — non-negotiable invariant | High |
| D-039-03 | Split endpoints: `issue-attention-reward` (strict) vs `issue-nonattention-reward` | High |
| D-039-04 | Server computes reward from **session data**; reject client `attentionScore`/multiplier | High |
| D-039-05 | Product claim = **probabilistic attention quality**, not lab-grade gaze | High |
| D-039-06 | Mint VCOIN aggressively; mint ICOIN conservatively with escrow + trust gating | Medium |
| D-039-07 | MediaPipe + ML Kit (Flutter path) or MediaPipe web — SeeSo/Tobii as alternatives | Medium |
| D-039-08 | Remote control via face gestures **viable but not defensible moat alone** | Medium |

---

## 5. Extracted Feature/System Concepts

### Audit findings (eye-earn-sparkle)

- **Dual reward paths:** MediaCard (validate-attention → issue-reward) vs PromoVideosFeed (timer-only, hardcoded score 95)
- Eye-tracking disabled → user still eligible (`eligible: isEligible || !eyeTrackingEnabled`)
- `validate-attention` output (`rewardMultiplier`) discarded by issuer
- Missing Edge Functions: `claim-reward`, `get-nearby-campaigns`, `initiate-withdrawal`
- Profiles RLS `USING (true)` on SELECT — balance leak
- Zero tests; monolithic 289 TSX files

### ACS model (per second)

- `PC(t)` presence confidence (face, pose, eyes, blink, micro-motion)
- `EQ(t)` engagement quality (touch/scroll telemetry)
- `Penalty(t)` fraud patterns
- `ACS(t) = 100 · clip(0.7·PC + 0.3·EQ - Pen, 0, 1)`
- Valid second: ACS≥70, PC≥0.65, Pen≤0.15

### attention_sessions table (v1 spec)

Fields: user_id, device_fingerprint_hash, media_id, campaign_id, reward_type, status lifecycle (validated→redeemed), PC/EQ/penalty/ACS scores, reward_multiplier, trust/risk snapshots, risk_flags jsonb, expires_at, redeemed_at.

### Reward gating math

Session qualification: length≥60s, valid density≥0.60, anomaly rate≤0.05. Daily decay `D(S)=e^(-S/600)`. Trust multiplier from device trust − user risk.

---

## 6. Extracted UX/Design Ideas

- UI may show progress; **only backend-confirmed responses update balances**
- Disable reward buttons on paths without validation session
- Remote control gesture map (Gameface reference) for accessibility

---

## 7. Extracted Technical Architecture Ideas

```
Camera → MediaPipe/ML Kit → ACS Engine (1Hz) → validate-attention → attentionSessionId
  → issue-attention-reward → atomic ledger
```

- Flutter scaffold commands for ML Kit, SeeSo, FaceTec bridges (if mobile-native path)
- Dashboard metrics schema for fraud + sponsor ROI from day one
- Regression tests: no session → fail 100%; replay session → fail

### Vendor alternatives surveyed

VisualCamp SeeSo (mobile camera gaze), Tobii (hardware), MediaPipe Face Landmarker, Google Gameface, ARKit blend shapes.

---

## 8. Extracted Economy/Currency Ideas

- VCOIN vs ICOIN minting asymmetry (growth vs cashable danger)
- Confidence-weighted payout; cash-out harder than earn
- Sponsor budget consumption tracking optional in daily aggregates
- Fraud economics: attack cost must exceed payout

---

## 9. Extracted Investor/Demo Ideas

- Kill/Build committee prompt for diligence narrative
- Master full-audit command for GitHub repo reviews
- "Attention probability" framing for credible sponsor pitch

---

## 10. Conflicts with Current Masterbrain

| Topic | This thread | SoT | Verdict |
|-------|-------------|-----|---------|
| Attention claim | Probabilistic quality | Qualification not surveillance | **Align if wording fixed** |
| Vicoin/Icoin naming | Audit uses Vcoins/Icoins | a/i/v/e/o | **Naming fork** |
| Biometric consent | App store/privacy gates raised | SoT mentions optional eye tracking | **Needs consent architecture** |

---

## 11. Conflicts with P0 Batches 1–3

| Topic | Prior | This thread |
|-------|-------|-------------|
| TF.js vs MediaPipe (017, 031) | Both stacks | Layered PC/EQ model — **supersedes simple stack picks** |
| aCoin spec (023) | 6-dimension attention | ACS PC/EQ — **merge into unified scoring** |
| issue-reward (030 client call) | Client-side reward service | Server session mandatory — **039 overrides** |
| Remote control (027, 031) | Product feature | Viable but not moat — **scope trim** |
| rCoin (B03) | Conversion hub | Not central here — **no new rCoin data** |

---

## 12. Canonical Candidates

| ID | Candidate | Tier |
|----|-----------|------|
| CC-B04-27 | `attention_sessions` schema + lifecycle | A — Trust/Attention |
| CC-B04-28 | Split issue-attention-reward / issue-nonattention-reward | A |
| CC-B04-29 | ACS scoring model (PC + EQ + Penalty) | A |
| CC-B04-30 | Valid-second + session qualification gates | A |
| CC-B04-31 | No session → no reward invariant | A |
| CC-B04-32 | Fraud/dashboard metrics schema | B |
| CC-B04-33 | VCOIN aggressive / ICOIN conservative mint policy | B |
| CC-B04-34 | Kill/Build viability gates (K1–K5) | C — process |

---

## 13. Preserve-Only Notes

- Full audit text is point-in-time for eye-earn-sparkle-archive — re-verify against current repo
- Flutter ML Kit scaffold if stack remains React — adapt paths
- Reverse-engineering proprietary SDKs explicitly rejected

---

## 14. Obsolete Notes

- "Backend totally open" if issue-reward hardening confirmed — replace with path-integrity audit
- "No CI/CD" — `.github/workflows` may exist now
- Exact gaze certification marketing — rejected in-thread

---

## 15. Follow-Up Extraction Targets

- Re-run audit acceptance tests against current `issue-reward` + all client call sites
- Map ACS model to POPS/proof_packet schema in docs/technical
- Extract dashboard metrics into TRUST_SYSTEM/
- Confirm owner "YES" on session bypass — track remediation status
