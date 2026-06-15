# INVENTION_009 — Time-Weighted Attention Scoring Ledger

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Attention Verification
**Date:** 2026-06-15

## Problem Solved

Digital advertising and attention-economy platforms have no reliable way to prove that a user was genuinely attentive during a content session. Existing systems rely on binary "viewport visible" heuristics, which cannot distinguish passive screen-on time from true cognitive engagement. This allows bots and inattentive users to drain reward pools without providing real attention value.

## Current Industry Approach

Competitors (Google Ads, Meta, TikTok) primarily measure viewability through intersection-observer timers—if a pixel area is on screen for N seconds, it counts as a "view." Some platforms add basic scroll-depth metrics. None employ real-time multimodal biometric scoring that weights face presence, eye openness, gaze position, and head pose into a continuous engagement signal with distinct thresholds for different sensor confidence levels.

## How [ i ] Solves It

The [ i ] system implements a time-weighted attention scoring ledger that combines four biometric channels—face detection, Eye Aspect Ratio (EAR), calibrated gaze position within an elliptical region-of-interest, and head pose (yaw/pitch)—into a single weighted composite score. Each channel contributes a configurable weight (faceWeight, eyesWeight, gazeWeight, poseWeight). The composite is compared against separate thresholds for vision-grade samples versus fallback/device-motion samples, ensuring that lower-confidence sensors require a higher raw score to confirm attention. A rolling-window ledger (default 2000ms) maintains timestamped attentive/not-attentive entries, and a time-span ratio produces the final percentage score. An exponential moving average (alpha=0.2) smooths the UI display score separately from the authoritative ledger percentage.

## System Description

The attention scoring engine maintains an `AttentionState` object containing a time-stamped ledger array, cumulative attentive/total milliseconds, a UI EMA value, neutral gaze reference, and source metadata. Each incoming `AttentionSample` carries face presence, eye aspect ratio, gaze coordinates (raw or calibrated), head orientation, and an optional pre-computed fallback score. The `computeRawAttention` function evaluates whether the gaze falls within a configurable ellipse (gazeEllipseX/Y radii), whether eyes are open (linear interpolation between earClosed and earOpen thresholds), and whether head yaw/pitch are within acceptable bounds. These four sub-scores are multiplied by their respective weights and summed. The `applyAttentionSample` function then compares the composite against a source-appropriate threshold (attentiveThresholdVision or attentiveThresholdFallback), appends the result to the ledger, trims entries older than the rolling window, and recomputes cumulative attentive span by iterating consecutive attentive pairs. The system outputs both an authoritative percentage (attentiveMs/totalMs) and a smoothed UI score for display purposes.

## Technical Components

- `app/src/lib/attentionScoring.ts` — core scoring engine
- `AttentionConfig` interface — 14 tunable parameters per configuration
- `AttentionSample` interface — multimodal biometric input structure
- `AttentionState` interface — stateful ledger with rolling window
- `computeRawAttention()` — weighted multimodal composite scoring algorithm
- `applyAttentionSample()` — ledger append, trim, and time-span computation
- `getAttentionResult()` — final score derivation (percentage + EMA)
- `trimLedger()` — rolling-window pruning by timestamp cutoff
- `resetForPromoStart()` — session boundary reset
- Gaze ellipse boundary test (parametric inequality)
- EAR linear interpolation for eye openness
- Head pose bounded-angle test

## Data Flow

1. Camera or device sensor produces a raw frame
2. Vision pipeline (or fallback estimator) extracts `AttentionSample` fields
3. `applyAttentionSample()` is called with the sample, current state, config, source type, and confidence
4. `computeRawAttention()` evaluates composite score from four channels
5. Score is compared against the source-appropriate threshold to produce a boolean attentive flag
6. Ledger is trimmed to the rolling window and the new entry is appended
7. Consecutive-attentive spans are summed to compute `attentiveMs`
8. UI EMA is updated with alpha=0.2 smoothing
9. `getAttentionResult()` returns the authoritative percentage, source, confidence, and display score
10. Score is consumed by the reward engine to mint attention tokens

## User Flow

The user opens a piece of content (video, article, ad). The attention scoring engine begins sampling at frame rate. A visual indicator (ring, bar, or timer pill) reflects the smoothed UI score in real-time. If the user looks away, closes eyes, or turns their head beyond thresholds, the attentive flag drops and the percentage declines. When the content session ends, the authoritative percentage is submitted to the Proof-of-Presence system for reward calculation.

## Economic Flow

1. Advertiser funds a campaign with iCOIN budget
2. User watches content; attention ledger accumulates attentive time
3. At session end, attentiveMs/totalMs ratio determines reward eligibility
4. Only sessions exceeding minimum threshold qualify for token minting
5. Reward amount is proportional to verified attentive time
6. Minted aCOIN enters user's wallet; advertiser is charged proportionally
7. Higher-quality attention (vision-grade, higher confidence) earns premium rates

## Fraud Prevention

- Separate thresholds for vision vs. fallback prevent spoofing with low-confidence sensors
- Rolling window prevents accumulation gaming (past attention cannot be "banked" indefinitely)
- Multimodal requirement (face + eyes + gaze + pose) makes single-vector attacks insufficient
- Neutral gaze warmup period prevents instant-start exploits
- EMA smoothing prevents score manipulation through rapid on/off toggling
- Source confidence tracking enables downstream audit of sensor reliability
- Ledger entries are timestamped for forensic replay

## Unique Elements

1. Four-channel weighted composite attention score (face, EAR, gaze ellipse, head pose) with configurable per-channel weights
2. Dual-threshold architecture with separate vision-grade and fallback-grade attentive thresholds within the same engine
3. Time-weighted rolling-window ledger that computes attentive milliseconds from consecutive-pair spans rather than simple sample counting
4. Gaze ellipse boundary test using parametric inequality rather than rectangular bounding box
5. Separation of authoritative ledger percentage from smoothed UI EMA, preventing display jitter from affecting economic outcomes
6. Source-tagged samples enabling per-sensor confidence auditing across heterogeneous device capabilities

## Potential Patent Claims

1. A method for computing a continuous attention score by combining weighted sub-scores from face detection, eye aspect ratio, gaze position within a parametric ellipse, and head pose orientation, wherein said sub-scores are compared against a source-dependent threshold selected based on sensor confidence level.

2. A system for maintaining a time-weighted attention ledger comprising timestamped boolean entries within a rolling window, wherein attentive duration is computed from consecutive attentive-pair time spans and used as an authoritative measure for digital reward allocation.

3. A computer-implemented method for attention verification comprising: receiving multimodal biometric samples from heterogeneous sensors; applying distinct attentive thresholds based on the source confidence classification of each sample; maintaining a bounded temporal ledger; and producing both an authoritative time-ratio score and a separately-smoothed display score.

4. An attention scoring engine for an attention-economy platform wherein gaze position is evaluated against a configurable elliptical region-of-interest using parametric inequality, and eye openness is determined by linear interpolation of an Eye Aspect Ratio between open and closed reference thresholds.

5. A method for preventing attention fraud in a token-minting system comprising: requiring concurrent satisfaction of face presence, eye openness, gaze containment, and head orientation constraints; applying a rolling temporal window that precludes historical accumulation; and separating display feedback from economic scoring to prevent manipulation through UI-targeted attacks.

## Potential Competitors

- Google Ad Viewability (Active View) — viewport-timer only, no biometric scoring
- DoubleVerify / IAS — viewability measurement, limited attention metrics
- Lumen Research — eye-tracking for ad research (offline panel, not real-time reward)
- Adelaide — attention measurement for media planning (probabilistic, not per-user)
- Brave Browser BAT — time-based attention tokens without biometric verification
- TVision — TV attention measurement (panel-based, not mobile-first)

## Related Files

- `app/src/lib/attentionScoring.ts`
- `app/src/constants/attentionPass.ts`
- `app/src/hooks/useEyeTracking.ts`
- `app/src/lib/visionCalibration/calibrationFit.ts`
- `app/src/lib/visionCalibration/profile.ts`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 9 |
| Patentability | 8 |
| Business Value | 10 |
