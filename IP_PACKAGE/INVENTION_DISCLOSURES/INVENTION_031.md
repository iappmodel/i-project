# INVENTION_031 — Multi-Stop Promo Route Builder

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Marketplace & Commerce
**Date:** 2026-06-15

## Problem Solved

Promotional platforms offer single-location check-in incentives but lack the ability for users to compose multi-stop routes through multiple promotional locations, optimizing their path to maximize earnings across a set of local business offers. There is no existing system that combines attention-verified promotional offers with geographic route planning, allowing users to plan and execute a verified multi-business earning session in a single trip.

## Current Industry Approach

Google Maps offers multi-stop route planning but with no promotional integration. Yelp and Groupon show nearby deals on a map without route optimization or multi-stop planning. Foursquare/Swarm tracks check-ins without economic incentives or route composition. Pokémon GO's PokéStop routes are the closest analog — multi-stop geographic gameplay — but without real-world business promotions or attention-verified economic rewards. No existing platform lets users build an earning route through promotional business locations with verification at each stop.

## How [ i ] Solves It

The [ i ] Multi-Stop Promo Route Builder is an immersive glass sheet (`ImmersiveRouteBuilderSheet`) that lets users compose a route through multiple promotional locations. Users add promotional stops from the available promotions in their area, and the system renders them as an ordered list. The route builder supports adding, removing, and reordering stops, with map visualization of the complete route and optimized ordering suggestions. Each stop corresponds to a promotional offer that requires location-based POP verification (GPS check-in) for reward settlement. The route is persisted in `promo_routes` and `promo_route_stops` tables, allowing users to save, resume, and share routes. The system integrates with the wallet's pending settlement UX — as users complete each stop's verification, the corresponding reward transitions from pending to available.

## System Description

The ImmersiveRouteBuilderSheet component renders within the glass immersive shell as a slide-up sheet panel. The sheet contains an ordered list of promo stops, each displayed as a numbered row with the stop name. Users can add stops from the available local promotions feed, with each addition appending to the route list. The component tracks the route state and provides toast notifications for user actions. The backend data model uses two tables: `promo_routes` (route_id, user_id, status, created_at, optimized_order, estimated_duration, total_potential_reward) and `promo_route_stops` (stop_id, route_id, promotion_id, stop_order, verification_status, verified_at, reward_released). When a user activates a saved route, the system renders a map visualization showing the complete path between stops. Each stop is associated with a promotion that has geolocation coordinates (latitude, longitude) stored in the promotions table. The system can suggest optimized ordering to minimize travel distance using the Haversine distance calculation already implemented in the feed personalization engine. As the user visits each stop and completes GPS check-in verification, the stop's verification_status updates and the associated reward enters the pending-to-available settlement pipeline. The route sheet integrates with the bottom dock's Promo tab, providing a dedicated entry point for route-based promotion engagement.

## Technical Components

- `ImmersiveRouteBuilderSheet.tsx` — React component for building multi-stop promo routes
- `ImmersiveGlassSheet.tsx` — Base glass sheet component used for the route builder overlay
- `promo_routes` table — Route persistence (user, status, optimized order, estimated duration, total reward)
- `promo_route_stops` table — Individual stop records (route, promotion, order, verification status)
- `promotions` table — Source promotional offers with geolocation (latitude, longitude)
- Haversine distance calculator — Route optimization using geo-distance between stops
- Map visualization layer — Route rendering on map with stop markers
- GPS check-in verification — POP location_presence method per stop
- Pending settlement integration — Per-stop reward settlement through wallet pipeline
- Route sharing mechanism — Shareable route links for social distribution

## Data Flow

1. User opens the Promo tab from the bottom dock and enters the Route Builder.
2. System loads nearby promotions with geolocation data from the promotions table.
3. User taps promotions to add them as stops to their route.
4. Each added stop creates a `promo_route_stops` entry linked to the route.
5. System renders the ordered stop list with numbered rows.
6. User can reorder stops; system suggests optimized ordering via Haversine distance minimization.
7. Map visualization shows the complete route path between all stops.
8. User activates the route and begins their physical journey.
9. At each stop, GPS check-in triggers location_presence POP verification.
10. Upon successful verification, the stop's reward enters the pending-to-available settlement pipeline.
11. User's wallet updates with rewards as each stop is verified.
12. Route completion is tracked; fully completed routes are recorded for analytics.

## User Flow

The user opens the Promo tab and sees a "Build Route" option. They tap it and the glass route builder sheet slides up. They see their current stops listed as numbered rows: (1) Cafe promo, (2) Retail brief, (3) Local gym. They tap "Add stop" to browse nearby promotions and add a fourth stop — a restaurant offer. The system shows the updated route with estimated travel time and total potential earnings. They can drag to reorder stops for a more efficient path, or accept the system's optimized suggestion. They close the builder and begin their route. At each location, their phone automatically detects arrival within the geofence radius and triggers a check-in verification. After completing all four stops, they've earned the combined rewards from all promotions, visible in their wallet with each stop's settlement status.

## Economic Flow

The multi-stop route creates a batched earning opportunity that increases user engagement with local business promotions. Each stop represents a separate economic transaction between the user and the promoting business, with the route serving as an aggregation layer. Businesses benefit from route inclusion because it creates guaranteed foot traffic — users have pre-committed to visiting. The total potential reward displayed in the route builder incentivizes completion of all stops. Route completion analytics provide businesses with data on multi-location visit patterns. The system can offer route completion bonuses — additional rewards for completing all stops in a route — funded by the platform or participating businesses as a group.

## Fraud Prevention

- Each stop requires independent GPS-verified check-in through the POP location_presence system; completing the route requires physical presence at each location.
- Stop verification timestamps are recorded server-side, preventing retroactive or bulk verification.
- Haversine distance between consecutive stops is validated against reasonable travel times to detect GPS spoofing.
- Route status is tracked server-side in `promo_routes`; users cannot self-mark stops as verified.
- Each stop's reward is independently settled through the standard POP pending-to-available pipeline, not released as a batch that could be partially fraudulent.
- Promotion geolocation coordinates are set by businesses and validated against real addresses; users cannot create stops at arbitrary locations.

## Unique Elements

1. Multi-stop promotional route builder within an immersive glass sheet interface, allowing users to compose earning routes through multiple business locations.
2. Integration of geographic route planning with attention-verified promotional offers, where each stop requires POP location verification for reward settlement.
3. Route optimization using Haversine distance calculation to suggest efficient ordering of promotional stops.
4. Per-stop verification tracking with independent reward settlement, creating a multi-transaction earning session within a single planned route.
5. Route persistence and sharing allowing users to save, resume, and distribute multi-stop earning routes.

## Potential Patent Claims

1. A method for composing multi-stop promotional routes comprising: presenting available promotional offers with geolocation data; allowing a user to select and order multiple promotional stops into a route; optimizing stop ordering based on geographic distance; and tracking per-stop verification status as the user completes the physical route with proof-of-presence verification at each location.
2. A system for multi-location attention-verified earnings comprising: a route builder interface for composing ordered promotional stops; a geolocation verification system that independently validates presence at each stop; a per-stop reward settlement pipeline that transitions rewards from pending to available upon verification; and route completion tracking with analytics.
3. A user interface for multi-stop promotional route building comprising: a glass sheet overlay displaying an ordered list of promotional stops with numbered indicators; an add-stop mechanism that draws from nearby promotional offers; a route optimization suggestion based on geographic distance; and a map visualization showing the complete route path.
4. A method for verified multi-business promotional engagement comprising: persisting a user-composed route with ordered stops linked to promotional offers; detecting physical arrival at each stop via GPS geofencing; independently settling each stop's reward through a proof-of-presence pipeline; and recording route completion for analytics and bonus reward calculation.

## Potential Competitors

- Google Maps (multi-stop routing, no promotions)
- Yelp / Groupon (nearby deals, no route planning)
- Foursquare / Swarm (check-ins, no economic incentives or route building)
- Pokémon GO (PokéStop routes, no real-business promotions)
- Shopkick (location-based rewards, no route building)

## Related Files

- `app/src/components/immersive/ImmersiveRouteBuilderSheet.tsx`
- `app/src/components/immersive/ImmersiveGlassSheet.tsx`
- `app/supabase/functions/get-personalized-feed/index.ts` (Haversine, promotions with geolocation)
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/src/screens/studio/verification/studioPOPS.ts` (location_presence POP method)

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 6 |
| Patentability | 8 |
| Business Value | 8 |
