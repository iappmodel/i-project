# INVENTION_022 — Geo-Verified Promotion Check-In with Streak Bonus Ladder

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Marketplace & Commerce
**Date:** 2026-06-15

## Problem Solved

Location-based promotions and check-in systems lack rigorous server-side geofence verification combined with sustained engagement incentives. Existing check-in platforms either trust client-reported locations without server verification, or they verify location but do not reward sustained engagement patterns (returning customers) with economically meaningful streak bonuses tied to a wallet system.

## Current Industry Approach

Foursquare/Swarm pioneered check-ins but the rewards were virtual badges with no economic value. Google Maps and Yelp offer check-in features primarily for review solicitation, not for direct economic rewards. Loyalty programs (Starbucks, Dunkin') track visits but use proprietary point systems disconnected from a general-purpose digital wallet. No existing system combines Haversine-formula geofence verification on the server (ignoring client-supplied coordinates for known promotions), escalating streak bonus percentages tied to consecutive daily visits, atomic reward finalization through database RPCs, and integration with a general-purpose attention-economy wallet.

## How [ i ] Solves It

The [ i ] verify-checkin edge function implements a server-authoritative geo-verification system where the server resolves the canonical promotion coordinates from the database rather than trusting client-supplied location hints. The Haversine formula computes the great-circle distance between the user's GPS coordinates and the promotion's server-stored coordinates, with a fixed 150-meter geofence radius enforced server-side (client may use different UX-hint radii). When verified, the system calculates a streak bonus based on consecutive daily check-ins using a progressive bonus ladder: 2 days = 5%, 3 days = 10%, 5 days = 15%, 7 days = 25%, 14 days = 35%, 30 days = 50%. The bonus amount is added to the base reward, and the total is finalized atomically through a Postgres RPC (`finalize_promotion_checkin_reward`) that credits the user's wallet, updates XP, and marks the check-in as claimed in a single transaction. A 24-hour cooldown prevents duplicate check-ins at the same location, and daily limits prevent farming.

## System Description

The verify-checkin edge function accepts a Zod-validated request containing: promotionId (optional UUID), userLat and userLng (required GPS coordinates from device), optional client hint fields (promotionLat, promotionLng, businessName, rewardAmount, rewardType, maxDistanceMeters) that are explicitly ignored for non-standalone check-ins, and a standalone boolean for quick check-ins without a promotion. For promotion-linked check-ins, the server loads the promotion record from the `promotions` table (id, business_name, latitude, longitude, reward_amount, reward_type, is_active, expires_at), verifying it exists, is active, and not expired. Server-resolved coordinates and reward parameters override any client-supplied values with explicit logging when client hints are ignored. The Haversine distance formula uses Earth's radius (6,371,000 meters) to compute great-circle distance, and the fixed PROMOTION_CHECKIN_MAX_DISTANCE_METERS (150m) determines the geofence boundary. The streak calculation determines consecutive daily check-ins: if the user's last_active_date was yesterday, the streak increments; if today, it remains; otherwise it resets to 1. The streak bonus ladder is a monotonically increasing lookup table where the highest matching tier applies (e.g., 8 days gets the 7-day bonus of 25%). The total reward (base + bonus) is stored on the `promotion_checkins` row along with distance, coordinates, streak day, and status. If the check-in is within range, `finalize_promotion_checkin_reward` is called atomically. If finalization fails, a 503 response with `Retry-After: 5` allows the client to retry (the check-in record exists and can be finalized on subsequent attempts). Existing check-ins within 24 hours are detected and, if they have an unfulfilled reward (verified but not claimed), the system attempts to finalize the pending reward before rejecting the duplicate.

## Technical Components

- `app/supabase/functions/verify-checkin/index.ts` — Server-side geofence verification, streak calculation, atomic reward finalization
- Haversine formula: `calculateDistance()` — Great-circle distance between GPS coordinates
- Streak bonus ladder: `STREAK_BONUSES` constant and `getStreakBonus()` function
- `finalize_promotion_checkin_reward` — Postgres RPC for atomic wallet credit + XP + claim flag
- Tables: `promotion_checkins` (check-in records with distance, coordinates, streak, reward info), `promotions` (promotion configuration with canonical coordinates), `user_levels` (streak tracking, XP, level)
- `app/supabase/functions/_shared/rateLimit.ts` — Rate limiting for check-in endpoint
- `app/supabase/functions/_shared/idempotency.ts` — Idempotency-key caching for replay protection
- `ImmersivePromoMapSheet.tsx` — Map UI component for promotion discovery and check-in

## Data Flow

1. User opens the promotion map in the immersive feed and selects a nearby promotion.
2. The app sends the user's GPS coordinates and the promotion ID to the verify-checkin edge function.
3. Server authenticates the user via Authorization bearer token.
4. Server loads the promotion record from the `promotions` table, verifying existence, active status, and expiration.
5. Server uses the promotion's stored coordinates (ignoring any client-supplied coordinates) and the fixed 150m geofence radius.
6. Haversine formula computes great-circle distance between user GPS and promotion coordinates.
7. If distance ≤ 150m, the check-in is "verified"; otherwise "failed."
8. Server checks for existing check-ins at this location within the last 24 hours.
9. If a pending (verified but unclaimed) check-in exists, the server attempts to finalize its reward.
10. If no existing check-in, the server calculates the streak by comparing today's date with the user's last_active_date.
11. The streak bonus is looked up from the progressive ladder (2d=5%, 3d=10%, ..., 30d=50%).
12. Total reward (base + bonus) is computed and stored on the new `promotion_checkins` row.
13. `finalize_promotion_checkin_reward` RPC atomically credits the wallet, updates XP, and marks the check-in as claimed.
14. Response includes verification status, distance, streak info, reward breakdown, and next check-in availability.

## User Flow

1. User opens the promotion map within the [ i ] immersive interface.
2. User sees nearby promotions as pins on the map with reward amounts displayed.
3. User walks to a promotion location (e.g., a partnered coffee shop).
4. User taps "Check In" on the promotion.
5. The app sends GPS coordinates for verification.
6. If within 150m, the check-in succeeds: "Check-in successful! You earned 50 viCoin!"
7. If the user has a multi-day streak: "Check-in successful! You earned 57 viCoin (+7 streak bonus!)" (5% on day 2).
8. The wallet balance updates immediately.
9. The next check-in at this location is available in 24 hours.
10. As the user returns daily, streak bonuses escalate: 10% at day 3, 15% at day 5, up to 50% at day 30.
11. If the user misses a day, the streak resets to 1.

## Economic Flow

1. Merchants fund promotions with reward budgets (reward_amount per check-in in the promotions table).
2. Users earn the base reward amount in the promotion's configured currency (viCoin or iCoin) for each verified check-in.
3. Streak bonuses add a percentage on top of the base reward, funded from the same promotion budget.
4. Rewards are credited to the user's attention wallet through atomic Postgres RPCs, ensuring the wallet ledger integrity (per INVENTION_018).
5. XP is awarded alongside the wallet credit, contributing to the user's level progression.
6. The 24-hour cooldown creates a natural daily engagement cadence that benefits both the merchant (regular customer visits) and the user (consistent earning opportunity).
7. The escalating streak bonus ladder incentivizes sustained engagement — the economic return per visit increases with loyalty.

## Fraud Prevention

- **Server-authoritative coordinates:** The server loads canonical promotion coordinates from the database and ignores any client-supplied coordinate hints, preventing location spoofing via modified requests.
- **Fixed server-side geofence radius:** The 150m PROMOTION_CHECKIN_MAX_DISTANCE_METERS is enforced server-side regardless of any client-supplied maxDistanceMeters value.
- **Haversine distance verification:** Great-circle distance computation ensures accurate geofence checking on the curved Earth surface.
- **24-hour cooldown:** Only one check-in per location per 24-hour period, preventing rapid farming.
- **Promotion validation:** Server verifies promotion existence, active status, and expiration before processing.
- **Rate limiting:** Per-user rate limits prevent rapid-fire check-in attempts.
- **Idempotency:** Idempotency keys prevent duplicate reward issuance from retried requests.
- **Atomic finalization:** The `finalize_promotion_checkin_reward` RPC ensures wallet credit, XP update, and claim flag are set in a single transaction, preventing partial state.
- **Pending reward recovery:** If a check-in was verified but reward finalization failed (503), subsequent requests detect and attempt to finalize the pending reward rather than creating duplicates.

## Unique Elements

1. **Server-authoritative coordinate resolution** — The server resolves canonical promotion coordinates from the database rather than trusting client-supplied location, explicitly logging when client hints are overridden.
2. **Progressive streak bonus ladder** — Consecutive daily check-ins earn escalating percentage bonuses (5% → 10% → 15% → 25% → 35% → 50%) that increase the economic value of sustained engagement.
3. **Atomic reward finalization RPC** — Wallet credit, XP award, and claim flag are set in a single Postgres transaction, with retry-safe 503 responses and pending-reward recovery on subsequent requests.
4. **Haversine geofence with fixed server radius** — Great-circle distance verification uses a server-enforced radius (150m) regardless of client-requested radius, combining geodetic accuracy with anti-spoofing protection.
5. **Dual-mode check-in** — Both promotion-linked check-ins (with server-resolved coordinates and merchant-funded rewards) and standalone quick check-ins (with smaller fixed rewards) are supported through the same endpoint.

## Potential Patent Claims

1. A method for geo-verified promotion check-in with progressive streak rewards, comprising: receiving GPS coordinates from a user device; loading canonical promotion coordinates from a server-side database; computing great-circle distance using the Haversine formula between the user coordinates and the server-stored promotion coordinates; verifying the distance is within a server-enforced geofence radius; calculating a streak bonus percentage from a progressive ladder based on consecutive daily check-in count; computing a total reward as the sum of a base promotion reward and the streak bonus; and atomically crediting the total reward to the user's digital wallet through a database transaction that simultaneously marks the check-in as claimed.
2. A system for fraud-resistant location-based rewards, comprising: a promotion store with canonical GPS coordinates and reward parameters; a verification module that computes Haversine distance using only server-stored coordinates and a fixed server-enforced geofence radius, ignoring client-supplied coordinate hints; a streak tracker that determines consecutive daily check-in count and looks up a progressive bonus percentage; an atomic finalization module that credits a wallet, updates experience points, and sets a claim flag within a single database transaction; and a recovery module that detects pending unfulfilled rewards from prior check-ins and attempts finalization before rejecting duplicates.
3. A computer-implemented method for incentivizing sustained merchant engagement, comprising: maintaining a streak counter that increments for consecutive daily check-ins at a location and resets upon a missed day; applying a monotonically increasing bonus percentage from a progressive ladder, wherein higher streak counts yield higher percentages up to a maximum; adding the bonus to a base merchant-funded reward amount; crediting the total to a general-purpose digital attention wallet; and enforcing a 24-hour cooldown per location to create a natural daily engagement cadence.

## Potential Competitors

- **Foursquare / Swarm** — Check-in badges with no economic value; no streak bonuses
- **Google Maps** — Location check-ins for reviews; no direct wallet rewards
- **Yelp** — Check-in features; no streak-based economic incentives
- **Starbucks Rewards** — Loyalty points but proprietary system; no general-purpose wallet
- **Shopkick** — Location-based rewards but uses Bluetooth beacons; no GPS Haversine verification with server-authoritative coordinates
- **Pokémon GO** — Location-based check-ins (PokéStops) with streak bonuses but in a gaming context; not merchant-funded economic rewards

## Related Files

- `app/supabase/functions/verify-checkin/index.ts`
- `app/supabase/functions/_shared/rateLimit.ts`
- `app/supabase/functions/_shared/idempotency.ts`
- `app/supabase/functions/_shared/cors.ts`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 8 |
| Patentability | 7 |
| Business Value | 9 |
