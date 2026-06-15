# INVENTION_024 — Feed Personalization with Attention Scoring Integration

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Marketplace & Commerce
**Date:** 2026-06-15

## Problem Solved

Content feeds today rank items by engagement metrics (likes, shares, watch time) that measure popularity but not verified attention quality. This creates a misalignment between what advertisers pay for (genuine human attention) and what platforms deliver (passive scroll-through impressions). There is no existing feed algorithm that integrates real-time attention verification scores into content ranking alongside traditional preference and location signals.

## Current Industry Approach

TikTok, YouTube, and Instagram rank feeds using collaborative filtering, engagement history, and creator signals. None incorporate biometric attention verification as a scoring dimension. Advertiser-facing "attention" metrics are estimated from proxy signals (dwell time, scroll speed) rather than verified through proof-of-presence protocols. Cold-start users receive generic trending content with no attention-quality weighting.

## How [ i ] Solves It

The [ i ] personalized feed engine pools up to 80 candidate items from both organic user content and paid promotions into a unified scoring pipeline. Each candidate receives a composite relevance score integrating user preference tags, historical attention scores from past content_interactions, watch completion rates per category, geolocation proximity (Haversine distance), content freshness decay, and a stochastic diversity injection. The attention_score field on content_interactions is populated by the proof-of-presence (POP) verification pipeline, creating a closed loop where verified attention from past sessions improves future content ranking. Cold-start users receive a reward-weighted fallback with location boosting until sufficient interaction history accumulates.

## System Description

The system operates as a Supabase Edge Function (`get-personalized-feed`) that executes server-side to prevent client manipulation of ranking signals. Upon receiving a request, it authenticates the user via JWT, then loads their preference profile (liked_tags, disliked_tags, preferred_categories, last_seen_content) and their 50 most recent content_interactions including watch_completion_rate and attention_score fields. It constructs a candidate pool by querying up to POOL_SIZE (80) items from the user_content table (public, active, non-draft items with media) and up to POOL_SIZE items from the promotions table (active, non-expired). Each candidate is scored starting from a base of 50, with additive boosts for matched liked_tags (+15 per tag), preferred_categories (+25), high historical watch completion in the same category (+0.3 weight on average completion rate), proximity within 10km (+15) or 3km (+10 additional), freshness under 1 day (+12) or 7 days (+6), and a 15% random diversity injection (+10). Penalties are applied for disliked tags (-20 per tag) and previously seen content (-30). The scored pool is sorted descending and sliced to the requested page size (default 15, max 30). A cursor-based pagination mechanism returns excludeIds arrays for subsequent pages.

## Technical Components

- `get-personalized-feed/index.ts` — Deno Edge Function implementing the scoring pipeline
- `feed.service.ts` — Client-side service invoking the edge function with fallback to demo content
- `ImmersiveFeedItem` type — Canonical feed item shape consumed by the immersive feed screen
- `content_interactions` table — Stores per-user per-content attention_score, watch_completion_rate
- `user_preferences` table — Stores liked_tags, disliked_tags, preferred_categories, last_seen_content
- `user_content` table — Creator-published content with media, tags, reward_type
- `promotions` table — Business-funded promotional content with geolocation
- `profiles` table — Creator display names and avatars for feed cards
- Haversine distance calculator — Server-side geo-scoring without exposing user coordinates to clients
- Cold-start sample content array — Hardcoded fallback for empty-database bootstrapping

## Data Flow

1. Client sends authenticated POST to `get-personalized-feed` with optional latitude, longitude, limit, and excludeIds.
2. Edge Function validates JWT and extracts user_id.
3. System loads user_preferences row and 50 most recent content_interactions for the user.
4. System queries up to 80 user_content items (public, active, non-draft, has media) and up to 80 promotions (active, non-expired).
5. Candidates are filtered against excludeIds set.
6. Each candidate is scored through the multi-signal pipeline (preferences, attention history, geo, freshness, diversity).
7. Candidates are sorted by composite score descending.
8. Top N items are sliced, annotated with position and personalization metadata.
9. Response includes feed array, pagination cursor, and meta (coldStart, personalized, hasMore).
10. Client maps edge items to ImmersiveFeedItem shape and renders in the immersive feed.

## User Flow

The user opens the [ i ] app and lands on the immersive full-bleed feed. Content appears ranked by personal relevance — items matching their historically verified attention patterns appear first. As the user watches content and the POP system records genuine attention, their future feed becomes increasingly personalized. Swiping through the feed loads the next page via cursor-based pagination. New users see a curated trending feed with location-boosted local promotions until they build enough interaction history for full personalization.

## Economic Flow

Promotions from paying businesses compete for feed placement alongside organic creator content in the same scoring pipeline. Higher-reward promotions receive slight scoring boosts through the reward weighting mechanism. As users engage with promoted content and generate verified attention (earning iCoins/vCoins), the attention_score feedback loop ensures future feeds surface content types the user genuinely attends to — aligning advertiser spend with verified engagement. Creator content that receives high verified attention organically rises in feed ranking, creating a merit-based content marketplace.

## Fraud Prevention

- All scoring runs server-side in an Edge Function; clients cannot manipulate relevance scores.
- Attention scores are populated exclusively by the POP verification pipeline, not by client self-reporting.
- Previously seen content receives a -30 penalty to prevent impression farming.
- Cold-start fallback uses server-side sample data, preventing feed manipulation before user history exists.
- Content must be status='active' and is_draft=false to enter the candidate pool; creators cannot game ranking with unpublished content.
- Rate limiting on the track-interaction endpoint prevents synthetic attention score inflation.

## Unique Elements

1. Unified scoring pipeline that ranks organic content and paid promotions through the same attention-weighted algorithm rather than separate ad auction and organic ranking systems.
2. Closed-loop attention feedback: verified POP attention scores from past sessions directly influence future content ranking, creating a self-improving relevance engine.
3. Cold-start strategy that uses reward magnitude and geolocation as proxy signals until behavioral attention data accumulates.
4. Server-side Haversine geo-scoring that boosts local content without exposing precise user coordinates to content creators or advertisers.
5. Stochastic diversity injection (15% probability, +10 score) that prevents filter bubbles while maintaining attention-weighted relevance.

## Potential Patent Claims

1. A method for ranking content items in a media feed comprising: collecting verified attention scores from a biometric proof-of-presence system; computing a composite relevance score for each candidate item by combining said attention scores with user preference signals, geolocation proximity, content freshness, and stochastic diversity factors; and presenting items in descending order of said composite relevance score.
2. A system for personalized content delivery wherein organic user-generated content and advertiser-funded promotions are scored through a single unified ranking pipeline that incorporates verified human attention metrics from a separate verification subsystem.
3. A cold-start content ranking method that transitions from reward-magnitude and geolocation-weighted ranking to attention-history-weighted ranking as a user's verified interaction corpus grows.
4. A method for preventing content feed manipulation comprising: executing all relevance scoring computations server-side; populating attention quality metrics exclusively through a trusted verification pipeline; and applying penalties to previously-viewed content identifiers.

## Potential Competitors

- TikTok (engagement-based feed ranking)
- YouTube (watch history + collaborative filtering)
- Instagram (engagement signals + ad auction)
- Brave Browser (attention-based advertising without feed personalization)
- TVision / Lumen (attention measurement, not feed ranking)

## Related Files

- `app/supabase/functions/get-personalized-feed/index.ts`
- `app/src/services/feed.service.ts`
- `app/src/data/immersiveFeedContext.ts`
- `app/src/screens/ImmersiveFeedScreen.tsx`
- `app/supabase/functions/track-interaction/index.ts`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 9 |
| Patentability | 7 |
| Business Value | 9 |
