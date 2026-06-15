# INVENTION_019 — Two-Step Server-Recomputed Attention Reward

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Wallet & Settlement Infrastructure
**Date:** 2026-06-15

## Problem Solved

Attention-based reward systems are inherently vulnerable to client-side manipulation: if the client computes an attention score and sends it to the server for reward issuance, a malicious client can fabricate high scores to earn undeserved rewards. Existing ad-verification and attention-measurement platforms either trust client-reported metrics or rely on statistical anomaly detection after rewards have already been issued, making them reactive rather than preventive.

## Current Industry Approach

Digital advertising platforms (Google Ads, Meta Ads) measure viewability through client-side JavaScript SDK metrics (e.g., percentage of ad pixels in viewport for a duration) and report these to the server, which trusts them for billing. Third-party verification vendors (IAS, DoubleVerify, MOAT) provide independent measurement but still rely on client-side instrumentation. No existing system recomputes attention scores server-side from raw biometric samples before issuing rewards, nor does any system combine server-recomputed attention with single-use session tokens, all-or-nothing reward policies, and SHA-256 sample attestation in a two-step pipeline.

## How [ i ] Solves It

The [ i ] platform implements a two-step server-authoritative reward pipeline. In Step 1 (`validate-attention`), the client sends raw attention samples (timestamp + raw attention value pairs) to the server. The server explicitly rejects any client-supplied attention score, attentive milliseconds, or total milliseconds — these fields are accepted only for logging/display and are never used for validation or multiplier computation. The server recomputes the attention score entirely from the raw samples using its own algorithm (clamped delta-time intervals, configurable attentive threshold). It then runs five weighted validation checks (attention score, watch duration, face detection, minimum time, timing consistency) and produces a binary validated/not-validated result with a reward multiplier of exactly 1.0 or 0.0 — no partial payouts. If validated, a single-use `attention_session` row is created with an expiration time (10 minutes). In Step 2 (`issue-reward`), the client sends only the session ID and media ID — never an amount or coin type. The server verifies the session is validated, unredeeemed, unexpired, and belongs to the requesting user, then atomically redeems it through a Postgres RPC that enforces daily caps (80 iCoin, 120 viCoin, 20 promo views) and marks the session as redeemed in a single transaction.

## System Description

The validate-attention edge function accepts a Zod-validated request body containing: contentId (UUID), promoId (optional UUID), raw attention samples (array of {t: number, r: number} with 0–1 range, 1–10,000 items), an optional samplesHash (SHA-256 attestation), watchDuration, totalDuration, optional framesDetected/totalFrames (legacy), source (vision/fallback/none), sourceConfidence, and deviceFingerprint. The function immediately rejects requests containing `userId` or `user_id` fields (identity comes from Authorization header only). If source is 'fallback' or 'none', validation fails immediately with rewardMultiplier 0. If no raw samples are provided, validation fails with a message that client score is not accepted. The server computes attention by sorting samples by timestamp, computing clamped delta-time intervals (max 500ms between consecutive samples), and counting attentive time where raw attention ≥ 0.6. The server score (0–100) is `100 * attentiveMs / totalMs`. If a samplesHash is provided, the server computes SHA-256 of the canonicalized (sorted-by-timestamp) samples JSON and rejects mismatches. Five weighted validation checks are applied: attention_score (weight 30, threshold 85%), watch_duration (weight 25, threshold 99% — all-or-nothing full watch required), face_detection (weight 25, threshold 50%), minimum_frames (weight 10, threshold 2000ms or 30 frames), timing_consistency (weight 10, ratio between 0.99 and 1.5). Validation passes only when the composite score ≥ 90%, and the reward multiplier is binary (1.0 or 0.0). Suspicious patterns (high attention + low watch, perfect face detection over long periods) are logged and flagged in an `abuse_logs` table. The attention_sessions row stores user_id, content_id, campaign_id, validated status, validation_score, reward_multiplier, samples_hash, timestamps, and a 10-minute expires_at. The issue-reward edge function handles both promo_view rewards (via `redeem_attention_reward` RPC) and non-promo rewards (via `issue_reward_atomic` RPC), with per-type daily caps, forbidden-key rejection (amount, coinType, currency, campaign_id, userId, attention metrics), and action verification (checking promotion_checkins, attention_sessions, user_tasks, user_content, content_likes, etc. depending on reward type).

## Technical Components

- `app/supabase/functions/validate-attention/index.ts` — Step 1: Server-side attention recomputation, 5-check validation, session creation
- `app/supabase/functions/issue-reward/index.ts` — Step 2: Session redemption, forbidden-key enforcement, atomic reward issuance
- `app/supabase/functions/_shared/rateLimit.ts` — Rate limiting for reward endpoints
- `app/supabase/functions/_shared/idempotency.ts` — Idempotency-key caching for replay protection
- `app/supabase/functions/_shared/cors.ts` — Strict CORS header enforcement
- Postgres RPCs: `redeem_attention_reward` (promo views), `issue_reward_atomic` (non-promo rewards)
- Tables: `attention_sessions`, `reward_sessions`, `reward_logs`, `abuse_logs`, `wallet_ledger`
- Daily limits: 80 iCoin, 120 viCoin, 20 promo views

## Data Flow

1. User completes watching media content with POP biometric tracking active.
2. Client collects raw attention samples (timestamp + raw attention value pairs, up to 10,000 samples).
3. Client sends raw samples, content metadata, and watch duration to `validate-attention` edge function (no authoritative score, no userId in body).
4. Server authenticates user via Authorization bearer token.
5. Server rejects forbidden keys (userId, user_id) if present in the body.
6. Server rejects fallback/none sources immediately (no iCoin for non-vision tracking).
7. Server rejects requests without raw samples (client score is never accepted).
8. Server computes attention from samples: sorts by timestamp, computes clamped (500ms max) delta-time intervals, counts attentive time where raw ≥ 0.6 threshold.
9. If samplesHash is provided, server computes SHA-256 of canonicalized samples and rejects mismatches.
10. Server runs five weighted validation checks (attention 85%, watch 99%, face 50%, minimum time, timing consistency).
11. If composite score ≥ 90%, server creates an `attention_sessions` row with validated=true, rewardMultiplier=1.0, and expires_at (10 minutes).
12. Server returns session ID to client (only when validated; no session ID for failed validation).
13. Client sends session ID + media ID to `issue-reward` edge function (no amount, no coinType, no userId).
14. Server verifies session: belongs to user, validated, not redeemed, not expired, media matches.
15. Server calls `redeem_attention_reward` RPC which atomically: locks the session, checks daily caps, credits wallet, marks redeemed.
16. Server returns reward amount, coin type, new balance, and daily remaining caps.

## User Flow

1. User opens a media item in the immersive feed.
2. POP biometric tracking begins collecting attention samples.
3. User watches the full content (99%+ required — no credit for partial views).
4. Upon completion, the app submits the raw attention data for validation.
5. If validation succeeds, the user sees "Attention validated! Reward eligible."
6. The reward is automatically issued from the validated session.
7. User sees updated wallet balance with the earned reward.
8. Daily remaining caps are displayed so the user knows their earning potential for the day.
9. If validation fails, the user sees specific reasons (attention below threshold, watch incomplete, etc.).

## Economic Flow

1. Raw attention data flows from client to server — value flows in the opposite direction.
2. Server-recomputed attention score determines binary eligibility (all or nothing).
3. Reward amount and coin type are server-authoritative — the client never specifies them.
4. Promo rewards derive amount/currency from the `promo_campaigns` table linked via the session's campaign_id.
5. Non-promo rewards use fixed server-side amounts per type (login: 3 viCoin, like: 1 viCoin, post: 5 viCoin, etc.).
6. Daily caps create a bounded daily economy: 80 iCoin + 120 viCoin + 20 promo views per user per day.
7. Per-type caps add further granularity (login: 1/day, daily_spin: 1/day, session_usage: 12/day, etc.).
8. Reward issuance flows through atomic Postgres RPCs that enforce caps, single-use sessions, and ledger integrity in a single transaction.

## Fraud Prevention

- **Server-recomputed attention:** Client-supplied attention scores, attentive milliseconds, and total milliseconds are explicitly ignored for validation — only server-computed values from raw samples are used.
- **Forbidden key rejection:** Requests containing `userId`, `amount`, `coinType`, `currency`, `campaign_id`, `reward_multiplier`, or attention metrics in the body are rejected with 400 errors.
- **Binary reward multiplier:** No partial rewards — multiplier is exactly 1.0 (fully validated) or 0.0 (not validated), eliminating gradient-exploitation attacks.
- **Single-use session tokens:** Each attention session can be redeemed exactly once (redeemed_at timestamp set atomically); replaying a session ID returns an error.
- **10-minute session expiration:** Validated sessions expire after 10 minutes, preventing delayed replay attacks.
- **SHA-256 sample attestation:** Optional samples hash allows the server to verify that samples were not modified in transit.
- **All-or-nothing watch policy:** 99% watch completion required; no credit for partial views.
- **Suspicious pattern detection:** High attention with low watch, perfect face detection over long periods, and other anomalous patterns are logged to `abuse_logs`.
- **Rate limiting and idempotency:** Per-user rate limits and idempotency keys prevent rapid-fire attacks and duplicate submissions.
- **Daily caps:** Hard daily limits on iCoin (80), viCoin (120), and promo views (20) bound the maximum damage from any exploitation.

## Unique Elements

1. **Server-side attention recomputation from raw samples** — The server independently computes attention metrics from raw biometric sample data rather than trusting any client-supplied score, with explicit rejection of client-authoritative fields.
2. **Binary all-or-nothing reward policy** — No partial rewards or gradient multipliers; attention is either fully validated (1.0) or not (0.0), combined with 99% watch completion requirement.
3. **Single-use session token bridge between validation and reward** — A time-limited, single-use attention session ID bridges the two-step pipeline, preventing replay, ensuring atomicity, and decoupling validation from reward issuance.
4. **SHA-256 sample attestation** — Optional cryptographic hash of canonicalized samples provides tamper detection for the raw attention data in transit.
5. **Comprehensive forbidden-key enforcement** — Both endpoints explicitly reject any client attempt to send authoritative economic fields (amount, coinType, currency, userId), ensuring the server is the sole authority on reward parameters.
6. **Multi-layered daily cap system** — Global per-currency daily caps combined with per-reward-type daily caps create a bounded economy resistant to farming through type rotation.

## Potential Patent Claims

1. A method for issuing attention-based rewards in a digital platform, comprising: receiving raw biometric attention samples from a client device, each sample comprising a timestamp and a raw attention value; recomputing an attention score on a server by sorting the samples by timestamp, computing clamped time intervals between consecutive samples, and determining the ratio of attentive time to total time using a configurable attention threshold; rejecting any client-supplied attention score; applying a plurality of weighted validation checks including an attention-score threshold, a watch-completion threshold, and a face-detection threshold; generating a single-use session token with an expiration time only when all validation checks produce a composite score exceeding a validation threshold; and atomically redeeming the session token to issue a server-determined reward amount.
2. A system for fraud-resistant attention reward issuance, comprising: a validation edge function that accepts raw attention samples and independently computes attention metrics while rejecting client-supplied authoritative fields including user identity, reward amount, and attention scores; a session store that creates single-use, time-limited session tokens for validated attention; a reward issuance edge function that accepts only a session token identifier and atomically redeems it through a database transaction that enforces daily currency caps, per-type reward caps, and single-use session constraints; and an abuse detection module that flags suspicious patterns in attention data.
3. A computer-implemented method for preventing attention-reward fraud, comprising: rejecting reward requests containing any of a predefined set of forbidden keys including user identity, reward amount, coin type, and currency; requiring raw biometric sample data for attention validation and refusing to use client-computed metrics; computing a SHA-256 hash of canonicalized sample data and rejecting hash mismatches; enforcing a binary reward multiplier of exactly 1.0 or 0.0 with no partial rewards; limiting session token validity to a predetermined expiration window; and enforcing global and per-type daily reward caps through atomic database transactions.

## Potential Competitors

- **Google (Ad viewability)** — Client-side viewability SDK; trusts client metrics for billing
- **IAS / DoubleVerify / MOAT** — Third-party verification but still client-instrumented
- **Brave (BAT)** — Client-side attention measurement for ad rewards; not server-recomputed
- **Basic Attention Token** — Attention metrics computed in browser; server does not recompute
- **TikTok (Creator Fund)** — Engagement metrics for creator payouts; not biometric sample-based
- **YouTube (Ad revenue)** — View counting with fraud detection but not per-sample server recomputation

## Related Files

- `app/supabase/functions/validate-attention/index.ts`
- `app/supabase/functions/issue-reward/index.ts`
- `app/supabase/functions/_shared/rateLimit.ts`
- `app/supabase/functions/_shared/idempotency.ts`
- `app/supabase/functions/_shared/cors.ts`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 10 |
| Patentability | 10 |
| Business Value | 10 |
