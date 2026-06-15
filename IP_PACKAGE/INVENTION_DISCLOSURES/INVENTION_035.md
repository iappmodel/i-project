# INVENTION_035 — Interaction Abuse Controls (Nonce/Overrun/Cooldown Stack)

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Wallet & Settlement Infrastructure
**Date:** 2026-06-15

## Problem Solved

Attention economy platforms that pay users for content engagement are vulnerable to interaction fraud: automated scripts replaying share/view_complete events, users claiming impossibly long watch durations, rapid-fire action spamming to inflate engagement metrics, and duplicate requests from network retries triggering double-counted rewards. Existing rate limiting approaches (simple per-IP throttling) are insufficient for economic interactions where each event may trigger a financial settlement. There is no existing system that combines nonce-based deduplication, watch duration overrun detection, per-action cooldown enforcement, and layered rate limiting (per-user + per-IP) with a 24-hour idempotency cache in a single interaction abuse control stack.

## Current Industry Approach

API rate limiting tools (Redis-based limiters, Cloudflare Rate Limiting) enforce per-IP or per-API-key request caps but do not understand the semantic content of requests. Payment systems (Stripe, PayPal) use idempotency keys for transaction deduplication but not for attention interaction events. Advertising fraud detection (IAS, DoubleVerify) detects invalid traffic at aggregate levels but not per-interaction with sub-second enforcement. No existing system applies financial-grade fraud controls (nonce dedup, cooldown timestamps, overrun detection, layered rate limiting, idempotency caching) to individual content interaction events in real-time.

## How [ i ] Solves It

The [ i ] Interaction Abuse Controls implement a five-layer defense stack in the `track-interaction` Edge Function. Layer 1: **Nonce Deduplication** — share and view_complete events carry a UUID `eventNonce`; the system atomically inserts the nonce into `interaction_event_nonces` table with a unique constraint, rejecting duplicates (Postgres error code 23505). Nonces are retained for 14 days and cleaned up per-user via `cleanup_interaction_event_nonces` RPC. Layer 2: **Watch Overrun Detection** — for view events, `watchDuration` is validated against `totalDuration` using `MAX_WATCH_OVERRUN_RATIO` (2.0x) and `MAX_WATCH_OVERRUN_SECONDS` (30s additive). If `watchDuration > max(totalDuration * 2.0, totalDuration + 30)`, the event is rejected as implausible. Layer 3: **Per-Action Cooldown** — share actions have a 15-second cooldown and view_complete has a 10-second cooldown, enforced via `last_share_at` and `last_view_complete_at` timestamp columns on `content_interactions`. If the same user attempts the same action on the same content within the cooldown window, a 429 response is returned with `retryAfterSeconds`. Layer 4: **Layered Rate Limiting** — `checkRewardRateLimit` via Postgres RPC enforces dual buckets: 60 requests per user per minute and 120 requests per IP per minute across a 60-second sliding window. Both user and IP must be within limits. Layer 5: **24-Hour Idempotency Cache** — the `Idempotency-Key` header triggers a lookup in `reward_idempotency` table scoped by (key, userId, scope). First requests are processed and cached; duplicate keys within 24 hours return the cached response without re-execution.

## System Description

The track-interaction Edge Function processes content interaction events through the five-layer abuse control stack before upserting the interaction record. The function accepts single events or batches of up to 20 events. **Input validation** uses Zod schemas: each event must have a valid contentId, action type (from a strict enum of 11 types), watchDuration and totalDuration within 0-86400 range, attentionScore 0-100, tags array (max 20 items, max 50 chars each), and optional eventNonce (UUID format). **Nonce dedup** applies to events in the `NONCE_DEDUP_EVENTS` set (share, view_complete): the system first checks `hasInteractionEventNonce` and then attempts `reserveInteractionEventNonce` with atomic insert; Postgres unique constraint violation (23505) catches concurrent duplicates. Before processing, `cleanupInteractionEventNoncesForUser` removes nonces older than `INTERACTION_NONCE_RETENTION_DAYS` (14 days) via RPC with a limit of 250 per cleanup. **Watch overrun detection** applies to view events: `view_complete` requires positive watchDuration and totalDuration; the maximum allowed watchDuration is `max(totalDuration * MAX_WATCH_OVERRUN_RATIO, totalDuration + MAX_WATCH_OVERRUN_SECONDS)`. **Per-action cooldown** checks the existing interaction row's cooldown timestamp column; if the age is less than the action's cooldown seconds, a 429 error returns with the remaining cooldown time. **Rate limiting** calls `checkRewardRateLimit` which invokes a Postgres RPC (`check_reward_rate_limit`) with dual bucket parameters (user key, IP key, per-user max, per-IP max, window seconds). The RPC atomically checks and increments counters in a sliding window. If either bucket is exhausted, the response includes `Retry-After` header. **Idempotency** extracts the `Idempotency-Key` header, looks up `reward_idempotency` for a cached response within 24 hours, and returns the cached response if found. If not cached, the request processes normally and the response is stored for future dedup. After all layers pass, the interaction is upserted into `content_interactions` with conflict resolution on `(user_id, content_id)`, and `user_preferences` are updated for meaningful engagement events (not view_progress heartbeats). Content ownership is resolved server-side from `user_content.user_id` — never trusting client-provided `contentOwnerId` for UUID content.

## Technical Components

- `track-interaction/index.ts` — Edge Function with five-layer abuse control stack
- `_shared/rateLimit.ts` — Dual-bucket rate limiting (per-user 60/min, per-IP 120/min)
- `_shared/idempotency.ts` — 24-hour idempotency cache with scope-aware keying
- `interaction_event_nonces` table — Nonce deduplication with unique constraint
- `reward_idempotency` table — Cached responses keyed by (idempotency_key, user_id, scope)
- `content_interactions` table — Interaction records with cooldown timestamp columns
- `check_reward_rate_limit` RPC — Postgres atomic rate limit check-and-increment
- `cleanup_interaction_event_nonces` RPC — Periodic nonce cleanup with per-user scoping
- Zod validation schemas — `SingleEventSchema`, `TrackInteractionSchema`, `MetadataSchema`
- `TrackInteractionHttpError` — Typed HTTP error with status, code, and structured details
- `MAX_WATCH_OVERRUN_RATIO` (2.0) — Maximum watchDuration/totalDuration ratio
- `MAX_WATCH_OVERRUN_SECONDS` (30) — Additive watchDuration tolerance
- `ACTION_COOLDOWNS` — Per-action cooldown configuration (share: 15s, view_complete: 10s)
- `NONCE_DEDUP_EVENTS` set — Events requiring nonce deduplication (share, view_complete)
- `RATE_LIMITED_EVENTS` set — Events subject to rate limiting
- `getClientIp()` — IP extraction from X-Forwarded-For / X-Real-IP headers

## Data Flow

1. Client sends interaction event(s) to `track-interaction` Edge Function with auth token.
2. JWT authentication validates user identity.
3. **Idempotency check**: If `Idempotency-Key` header present, look up cached response in `reward_idempotency`. If found within 24h TTL, return cached response immediately.
4. **Input validation**: Zod schema validates event structure, types, ranges.
5. **Rate limit check**: `checkRewardRateLimit` RPC validates per-user (60/min) and per-IP (120/min) buckets. If exceeded, return 429 with `Retry-After`.
6. **Nonce cleanup**: For events with nonces, clean up nonces older than 14 days for the user.
7. For each event in the batch:
   a. **Content validation**: Verify content exists and is active in `user_content`.
   b. **Nonce dedup check**: For share/view_complete with nonces, check `hasInteractionEventNonce`. If nonce exists, skip (deduped).
   c. **Watch overrun check**: For view events, validate `watchDuration ≤ max(totalDuration * 2.0, totalDuration + 30)`.
   d. **Cooldown check**: For share/view_complete, check `last_share_at`/`last_view_complete_at` timestamps. If within cooldown, return 429.
   e. **Nonce reserve**: Atomically insert nonce; if unique constraint violation, skip (concurrent dedup).
   f. **Upsert interaction**: Write to `content_interactions` with conflict resolution.
   g. **Update preferences**: For meaningful events, update `user_preferences` (engagement score, liked/disliked tags, focus score).
8. **Cache response**: If idempotency key present, store response in `reward_idempotency`.
9. Return success with interaction results.

## User Flow

The user watches a video, shares it, and the client sends a `view_complete` event and a `share` event. Both events carry unique `eventNonce` values. The share event has a 15-second cooldown — if the user tries to share the same content again within 15 seconds, the app receives a 429 response with a retry timer. If the network glitches and the client retries the same share event, the nonce dedup catches it and returns a deduped flag without double-counting. If the user reports watching 300 seconds of a 30-second video, the overrun detection rejects the event. All of this happens transparently — the user's genuine interactions are recorded accurately while fraudulent or duplicate events are silently rejected.

## Economic Flow

Each interaction event can trigger downstream economic effects: `view_complete` with high attention scores contributes to reward eligibility; `share` events contribute to engagement scoring that affects feed ranking and creator attribution; `like` events affect content visibility. The abuse control stack ensures economic accuracy at the event level: nonce dedup prevents double-counting events that trigger rewards; overrun detection prevents inflated watch durations from generating unearned attention scores; cooldown enforcement prevents rapid-fire actions from artificially boosting engagement metrics; rate limiting prevents bot-driven interaction farming; and idempotency prevents network-retry-driven double execution. Together, these controls ensure that the economic signals flowing from interaction events accurately represent genuine human engagement.

## Fraud Prevention

- **Nonce dedup (Layer 1)**: Atomic Postgres unique constraint prevents duplicate share/view_complete events from being processed, even under concurrent requests. Nonces retained 14 days, cleaned up per-user.
- **Watch overrun (Layer 2)**: `MAX_WATCH_OVERRUN_RATIO` (2.0x) and `MAX_WATCH_OVERRUN_SECONDS` (30s) cap prevents impossible watch durations from inflating attention scores. `view_complete` requires positive durations.
- **Action cooldown (Layer 3)**: Per-action cooldown timestamps on `content_interactions` prevent rapid-fire engagement spamming. Share: 15s cooldown, view_complete: 10s cooldown.
- **Rate limiting (Layer 4)**: Dual-bucket (per-user 60/min, per-IP 120/min) prevents bot-driven interaction farming. Atomic Postgres RPC prevents race conditions in counter updates.
- **Idempotency cache (Layer 5)**: 24-hour response cache keyed by (key, userId, scope) prevents network-retry-driven double execution.
- **Content validation**: Server-side content ownership resolution from `user_content.user_id` — never trusting client-provided owner IDs for UUID content.
- **Strict input validation**: Zod schemas enforce field types, ranges, and formats before any processing occurs.

## Unique Elements

1. Five-layer defense stack combining nonce deduplication, watch overrun detection, per-action cooldowns, dual-bucket rate limiting, and 24-hour idempotency caching in a single interaction processing pipeline.
2. Watch duration overrun detection using a combined ratio cap (2.0x) and additive tolerance (30s) formula that handles both short and long content durations.
3. Per-action cooldown timestamps stored on the interaction record itself (`last_share_at`, `last_view_complete_at`), enabling per-content-per-user cooldown enforcement without additional tables.
4. Dual-bucket rate limiting (per-user + per-IP) via atomic Postgres RPC that prevents both single-user bot farming and distributed IP-rotating attacks.
5. Scoped idempotency cache with 24-hour TTL supporting multiple endpoint scopes (issue_reward, validate_attention, verify_checkin, track_interaction, request_payout, send_coin_gift, submit_promotion_review).

## Potential Patent Claims

1. A method for preventing interaction fraud in an attention economy comprising: deduplicating interaction events via atomic nonce insertion with unique constraint enforcement; validating watch duration plausibility against content duration using a combined ratio and additive tolerance formula; enforcing per-action cooldown periods via timestamp columns on interaction records; applying dual-bucket rate limiting (per-user and per-IP) via atomic database operations; and caching responses for idempotent replay protection within a time-to-live window.
2. A system for real-time interaction abuse detection comprising: a nonce deduplication layer that atomically reserves event identifiers in a database with unique constraints; a watch overrun detector that rejects events where reported watch duration exceeds a configurable multiple of content duration plus an additive tolerance; per-action cooldown timestamps stored on interaction records; layered rate limiting with independent per-user and per-IP sliding window counters; and a scoped idempotency cache with configurable TTL.
3. A method for watch duration fraud detection comprising: receiving a content interaction event with watchDuration and totalDuration fields; computing a maximum allowed watch duration as the greater of (totalDuration multiplied by a ratio cap) and (totalDuration plus an additive tolerance in seconds); rejecting the event if watchDuration exceeds the computed maximum; and requiring positive watchDuration and totalDuration for view completion events.
4. A multi-layer interaction protection system for an attention economy comprising: input validation via schema enforcement; nonce-based deduplication for financially significant event types; per-action cooldown enforcement via per-record timestamp tracking; atomic dual-bucket rate limiting via database stored procedure; response-level idempotency with scoped caching; and server-authoritative content ownership resolution that overrides client-provided identifiers.
5. A method for cooldown enforcement on attention economy interactions comprising: maintaining per-action timestamp columns on content interaction records; checking the elapsed time since the last action of the same type for the same user-content pair; rejecting the interaction with a retry-after period if the elapsed time is within the action's cooldown window; and supporting configurable cooldown durations per action type.

## Potential Competitors

- Stripe (payment idempotency, not interaction-level)
- Cloudflare Rate Limiting (IP-level, not semantic)
- Redis-based rate limiters (generic, not attention-economy-specific)
- IAS / DoubleVerify (aggregate ad fraud, not per-interaction)
- Arkose Labs (bot detection, not economic interaction abuse)

## Related Files

- `app/supabase/functions/track-interaction/index.ts`
- `app/supabase/functions/_shared/rateLimit.ts`
- `app/supabase/functions/_shared/idempotency.ts`
- `app/src/services/feed.service.ts` (client-side idempotency key usage)
- `app/supabase/migrations/` (interaction_event_nonces, reward_idempotency tables)

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 10 |
| Patentability | 8 |
| Business Value | 10 |
