# INVENTION_025 — Platform Aggregation Attention Layer

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Marketplace & Commerce
**Date:** 2026-06-15

## Problem Solved

Creators distribute content across multiple platforms (YouTube, TikTok, Instagram, Spotify, etc.) but have no unified way to verify and monetize the genuine attention their cross-platform content receives. Each platform reports its own opaque engagement metrics, making it impossible for creators or advertisers to compare attention quality across platforms or for creators to monetize their aggregated content portfolio through a single verified attention economy.

## Current Industry Approach

Creators manage separate analytics dashboards per platform with no cross-platform attention verification. Link aggregators (Linktree, Beacons) aggregate profile links but not content or attention data. Social media management tools (Hootsuite, Buffer) schedule posts cross-platform but do not verify or monetize attention. No existing system acts as an attention verification and earnings attribution layer that sits atop multiple content platforms simultaneously.

## How [ i ] Solves It

[ i ] functions as a cross-platform attention verification layer. The Connect Platforms screen allows users to link their existing accounts on YouTube, TikTok, Instagram, Twitch, Snapchat, Facebook, X/Twitter, Pinterest, and Kik via OAuth. Once connected, [ i ] imports the creator's content catalog, assigns each piece a unified content identity within the [ i ] ecosystem, and surfaces it in the immersive feed. When any user on [ i ] watches imported content, the POP verification pipeline generates attention proofs. Earnings are attributed back to the original creator regardless of which external platform the content originated on. The system maintains real-time sync status, post counts per platform, and a unified earnings dashboard.

## System Description

The platform aggregation system begins with the Connect Platforms interface, which presents each supported platform as a toggle-controlled row showing connection status, sync progress, and content count. Connected platforms display real-time sync indicators (spinning ring during active import, green badge with post count when complete). The system maintains a platform connection registry mapping each user's OAuth tokens to their external platform identities. Content import runs asynchronously — when a platform is connected, the system fetches the creator's content catalog (videos, reels, posts, clips) and creates corresponding entries in the [ i ] user_content table with source_platform metadata. Each imported item retains its original platform identifier for deduplication and attribution. The connected summary strip provides at-a-glance portfolio metrics: number of active platforms and total post count across all sources. Disconnecting a platform hides its content from the board without deletion, preserving historical earnings data. The system explicitly communicates ownership: "You keep ownership — [ i ] distributes it." This architecture transforms [ i ] from a standalone content platform into a cross-platform attention monetization layer.

## Technical Components

- `iapp_connect_platforms.html` — Platform connection UI prototype with OAuth toggle mechanic
- Connected platform registry — Maps user accounts to external platform identities
- OAuth integration layer — Per-platform authentication (Instagram, YouTube, TikTok, Twitch, Snapchat, Facebook, X, Pinterest, Kik)
- Content sync engine — Asynchronous import of creator content catalogs from connected platforms
- Cross-platform content identity — Unified content ID mapping external platform content to [ i ] user_content entries
- Real-time sync status indicator — Visual sync ring and progress tracking
- Platform content count badges — Live post/video inventory display per connected platform
- Connected summary strip — Aggregate portfolio metrics (platforms active, total posts)
- Source attribution system — Maps attention earnings back to content's originating platform and creator

## Data Flow

1. Creator navigates to Connect Platforms from their Profile.
2. Creator taps toggle on a platform row, triggering OAuth flow in a sheet overlay.
3. Upon successful OAuth, system registers the platform connection with access tokens.
4. Async content sync begins: system fetches creator's content catalog from the external platform API.
5. Each imported content item is created as a user_content row with source_platform, external_content_id, and creator attribution metadata.
6. Sync progress is displayed in real-time (spinning indicator, count badge updates).
7. Imported content enters the [ i ] feed candidate pool for all users.
8. When a viewer watches imported content, the POP verification pipeline generates attention proofs.
9. Verified attention earnings are attributed to the original creator's [ i ] wallet.
10. Creator sees aggregated earnings across all connected platforms in their unified wallet.

## User Flow

A creator opens their Profile and taps "Connect Platforms." They see a list of supported platforms — some already connected (green toggle, post count badge), some available to connect. They tap the YouTube toggle, complete the OAuth flow, and see "Connecting..." followed by a sync ring animation. Within seconds, "47 videos" appears as a badge. Their YouTube content is now discoverable in the [ i ] feed. Other [ i ] users can watch their YouTube content, generating verified attention earnings. The creator checks their wallet to see earnings from all platforms combined. They can disconnect any platform at any time — content hides instantly, no data is deleted.

## Economic Flow

Creators' existing content across platforms becomes a passive earning asset within [ i ]. When a viewer watches imported content, the standard [ i ] attention verification and reward cycle executes: the viewer earns iCoins for verified attention, the creator's content generates engagement metrics, and the creator receives a share of the advertising/promotion revenue generated by their content's attention capture. Businesses running campaigns on [ i ] effectively access the aggregated content inventory of all connected platforms, with verified attention guarantees that no individual platform provides. The platform connection count becomes a key metric — more connected platforms means more content inventory, more attention capture, more earning potential.

## Fraud Prevention

- OAuth authentication verifies actual platform ownership; users cannot claim others' content.
- Content deduplication via external_content_id prevents the same content from being imported twice.
- Disconnecting a platform immediately removes content from feed candidacy, preventing stale or revoked content from generating earnings.
- All attention verification runs through the POP pipeline regardless of content source, maintaining consistent fraud detection.
- Platform sync operations run server-side with service-role credentials; import cannot be manipulated client-side.
- Content status validation ensures only active, non-deleted content on the source platform remains eligible.

## Unique Elements

1. Cross-platform attention verification layer that sits atop existing social media platforms, verifying and monetizing attention that those platforms cannot independently verify.
2. Unified content identity system that maps content from 9+ external platforms into a single attention economy with consistent proof-of-presence verification.
3. Single-toggle OAuth connection/disconnection with real-time sync status and content count display that treats external content as an "asset portfolio."
4. Earnings attribution that routes verified attention revenue back to creators regardless of which external platform originated the content.
5. Non-destructive disconnect — content hides from feed without deletion, preserving historical data and enabling instant reconnection.

## Potential Patent Claims

1. A system and method for cross-platform attention monetization comprising: connecting to multiple third-party content platforms via OAuth; importing content catalogs into a unified content registry; applying biometric attention verification to imported content when viewed by users; and attributing verified attention earnings to the original content creator across platform boundaries.
2. A method for creating a cross-platform attention verification layer comprising: maintaining a platform connection registry mapping user identities across multiple content platforms; synchronizing content catalogs from connected platforms into a unified feed; executing proof-of-presence verification on all content regardless of originating platform; and generating a unified earnings ledger aggregating attention value across all connected platforms.
3. A user interface for managing cross-platform content monetization comprising: a toggle-based platform connection display with real-time sync indicators; content count badges showing imported asset inventory per platform; a connected summary strip aggregating portfolio metrics; and non-destructive disconnect capability preserving historical earnings data.
4. A method for cross-platform advertising attention verification comprising: accepting advertising campaigns targeting a content inventory aggregated from multiple external platforms; delivering campaign content through a unified feed with biometric attention verification; and reporting verified attention metrics that span platform boundaries.

## Potential Competitors

- Linktree / Beacons (link aggregation, no attention verification)
- Hootsuite / Buffer (cross-platform scheduling, no monetization)
- YouTube / TikTok Creator Funds (single-platform monetization)
- Brave Rewards (attention-based ads, no cross-platform content aggregation)
- Patreon / Ko-fi (creator monetization, no attention verification or cross-platform content aggregation)

## Related Files

- `02_clickable_prototypes/iapp_connect_platforms.html`
- `MASTER_BRAIN/CHAT_RECOVERY/EXTRACTED/conversations/064_*.md`
- `MASTER_BRAIN/CHAT_RECOVERY/EXTRACTED/conversations/069_*.md`
- `app/src/services/feed.service.ts`
- `app/supabase/functions/get-personalized-feed/index.ts`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 8 |
| Patentability | 8 |
| Business Value | 10 |
