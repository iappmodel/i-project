# INVENTION_030 — Campaign Builder with Condition Rows and Live Preview

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Creator Tools
**Date:** 2026-06-15

## Problem Solved

Campaign creation interfaces for local businesses and content promoters are either too complex (Google Ads, Meta Business with dozens of configuration screens) or too simple (boosting a post with a budget slider). Neither approach lets a business owner visually compose campaign conditions as discrete, inspectable rule rows and immediately see exactly how their campaign will appear on a user's phone — in the same interface, without navigating away. This disconnect between configuration and preview causes misaligned expectations and wasted ad spend.

## Current Industry Approach

Google Ads uses a multi-step wizard with separate screens for targeting, bidding, and creative. Meta/Instagram boost uses a simplified slider for budget and audience with a small preview thumbnail. Neither presents campaign conditions as visual rule rows that can be individually inspected, reordered, or toggled. No existing campaign builder provides a real-time, full-fidelity phone preview that updates as the business owner modifies conditions, media, targeting, and budget in a single unified interface.

## How [ i ] Solves It

The [ i ] Campaign Builder presents the entire campaign creation workflow in a single screen with two primary zones: a configuration column with visual rule rows and a live phone preview that updates in real-time. The workflow follows a natural builder sequence: media upload → targeting configuration → budget allocation → condition rows → live preview. Each campaign condition (watch duration, visit location, follow account, share content, make purchase) is represented as a discrete visual row that can be individually configured, toggled, and inspected. Ghost-breathing placeholder animations indicate where content will appear before media is uploaded. The live phone preview renders the campaign exactly as it will appear in a user's immersive feed, with the glass overlay controls, reward indicator, and action buttons visible. A publish workflow with campaign validation ensures all required fields are populated and conditions are logically consistent before the campaign goes live.

## System Description

The Campaign Builder interface is structured as a responsive layout with a configuration panel and a phone-shaped preview panel. The **configuration panel** contains vertically stacked sections: (1) **Media Upload** — drag-and-drop zone with ghost-breathing placeholder animations that pulse until media is added; supports video and image with format validation. (2) **Targeting** — audience parameters including geographic radius, age range, interest categories, and platform connection requirements. (3) **Budget** — total spend allocation with daily cap, cost-per-verified-attention model, and projected reach calculator. (4) **Condition Rows** — the core innovation: each campaign condition is a discrete row with an icon, condition type label, configuration fields (e.g., minimum watch duration in seconds, geofence radius in meters, required action type), an enable/disable toggle, and validation status indicator. Conditions can be: time-based (watch X seconds), location-based (visit within Y meters), action-based (follow, share, purchase), and composite (multiple conditions AND/OR). Each condition row maps directly to a POP verification requirement that will be enforced at runtime. (5) **Publish Workflow** — validation checks all conditions for completeness and logical consistency (e.g., location condition requires a geocoordinate), budget sufficiency for projected reach, and media format compatibility. The **live phone preview** renders a pixel-accurate representation of the campaign within the immersive feed shell. As the business owner modifies any configuration field, the preview updates in real-time: changing the media shows the new content full-bleed; toggling a condition row shows/hides the corresponding verification indicator; adjusting the reward amount updates the coin pill display. The preview includes the glass overlay controls (timer, reward pill, action rail, out-profile, dock) to show exactly how the campaign integrates with the user's feed experience.

## Technical Components

- `campaign_builder_owner.html` — Full HTML/CSS/JS prototype of the campaign builder
- Media upload zone with ghost-breathing placeholder animations
- Targeting configuration panel — geo, age, interests, platform requirements
- Budget allocation with daily cap and cost-per-verified-attention model
- Condition rows — discrete visual rule components with type, config, toggle, validation
- Condition types: time-based, location-based, action-based, composite
- Live phone preview — real-time rendering of campaign in immersive feed context
- Publish workflow — multi-field validation with error/warning display
- Ghost-breathing CSS animation — placeholder pulse for empty media slots
- Campaign validation engine — logical consistency checks across conditions
- Budget sufficiency calculator — projected reach vs. allocated budget

## Data Flow

1. Business owner opens Campaign Builder from their dashboard.
2. Ghost-breathing placeholders indicate the empty campaign template.
3. Owner uploads media (video/image) — live preview immediately shows it full-bleed.
4. Owner configures targeting (location, age, interests) — preview updates audience scope display.
5. Owner sets budget and daily cap — projected reach calculator shows estimated impressions.
6. Owner adds condition rows: "Watch 30 seconds" (time-based), "Visit within 200m" (location-based).
7. Each condition row shows its configuration, toggle state, and validation status.
8. Live preview updates to show verification indicators corresponding to active conditions.
9. Owner adjusts reward amount — coin pill in preview updates in real-time.
10. Owner clicks Publish — validation engine checks all fields, conditions, budget sufficiency.
11. Validated campaign goes live with bound POP verification template matching the condition rows.

## User Flow

A restaurant owner opens the Campaign Builder to create a promotional campaign. They see a clean interface with a ghost-breathing placeholder where their video will go, and a phone preview showing how it will look. They drag-drop a 30-second promotional video — it instantly appears full-bleed in the phone preview. They set targeting: 5km radius around their restaurant, ages 18-45, food and dining interests. They set a $100 budget with $10/day cap. They add condition rows: "Watch at least 15 seconds" (toggle on), "Visit restaurant" (toggle on, 200m radius), "Confirm dining" (toggle on, staff QR verification). The phone preview now shows the campaign with a timer line, verification indicators, and the $1.50 reward pill. The preview updates as they adjust — they increase the reward to $2.00 and see it change instantly. They click Publish, validation passes, and the campaign goes live.

## Economic Flow

The Campaign Builder directly connects advertising spend to verification requirements through the condition row system. Each condition row represents both a user experience element and an economic gate. Higher-friction conditions (location visit, purchase confirmation) justify higher rewards, and the budget calculator reflects this: more conditions = higher cost-per-verification but higher-quality attention. The cost-per-verified-attention model means businesses pay only when all conditions are met — not for impressions or partial engagement. Budget sufficiency calculations prevent campaigns from going live with insufficient funds to deliver meaningful reach. Daily caps prevent budget exhaustion and enable sustained campaign presence.

## Fraud Prevention

- Condition rows map directly to POP verification requirements enforced server-side; the visual builder is a configuration interface, not an execution bypass.
- Campaign validation prevents publishing campaigns with impossible or contradictory conditions.
- Budget sufficiency checks prevent underfunded campaigns that could create verification obligations without payout capacity.
- Location-based conditions require valid geocoordinates verified against real map data.
- The live preview shows the actual user experience, preventing the creation of campaigns that appear different to the business owner than to the end user.
- Each condition row has a validation status indicator showing whether the condition is properly configured and enforceable.

## Unique Elements

1. Visual condition rows where each campaign requirement is a discrete, inspectable, toggleable rule component with inline configuration — not a multi-screen wizard or a simplified boost slider.
2. Real-time live phone preview rendering the campaign within the immersive feed shell (glass overlay, timer, reward pill, action buttons) that updates instantly as any configuration field changes.
3. Direct mapping between visual condition rows and POP verification requirements: what the business owner sees in the builder is exactly what the viewer will face.
4. Ghost-breathing placeholder animations that provide spatial awareness of campaign structure before content is added, guiding the builder workflow naturally.
5. Unified single-screen builder that collapses media upload, targeting, budget, conditions, and preview into one interface without navigation between separate configuration steps.

## Potential Patent Claims

1. A campaign creation interface comprising: a configuration panel with discrete, toggleable condition rows each representing a verification requirement; a live phone preview panel that renders the campaign within an immersive media feed context; and a real-time update mechanism that synchronizes preview rendering with configuration changes as they occur.
2. A method for visual campaign rule composition comprising: presenting campaign conditions as individually configurable row components with type, parameters, enable/disable toggle, and validation status; mapping each condition row to a server-side verification requirement; and validating logical consistency across all condition rows before permitting publication.
3. A campaign builder system with integrated preview comprising: a media upload zone with animated placeholder indicators; a condition row builder with visual rule components; a live preview rendering the campaign within a glass-morphism overlay shell; and a validation workflow ensuring condition completeness, budget sufficiency, and logical consistency before publication.
4. A method for creating attention-verified advertising campaigns comprising: composing verification conditions as visual rule rows in a builder interface; rendering real-time preview of the campaign as experienced by end users; binding the composed conditions to proof-of-presence verification templates at publish time; and enforcing the conditions through the platform's attention verification pipeline.

## Potential Competitors

- Google Ads (multi-step wizard, no live preview)
- Meta Business / Instagram Boost (simplified slider, tiny preview)
- TikTok Promote (boost interface, no condition rows)
- Snapchat Ads Manager (campaign builder, no live immersive preview)
- Yelp Ads (local business advertising, no visual rule builder)

## Related Files

- `05_creator_campaigns/campaign_builder_owner.html`
- `integrations/eye-tracking/prototypes/i-mvp-prototype/design-reference/html-prototypes/campaign_builder_owner.html`
- `MASTER_BRAIN/CREATOR_ECONOMY/`
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/src/screens/studio/verification/studioPOPS.ts`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 7 |
| Patentability | 8 |
| Business Value | 9 |
