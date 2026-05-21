# Creator Economy Knowledge Map

**Classification:** Experimental (multiple lineages)  
**Confidence:** Medium

## Canonical Intent

Creators earn via quality engagement, trust, attention delivered. Revenue share 60/30/10. Tools for publish, campaigns, tips, revenue share.

## Three Studio Lineages (Competing)

| Lineage | Location | Strength | Classification |
|---------|----------|----------|----------------|
| IVAULT monolith | preservation snapshot `src/screens/studio/` (151 files) | Publish/wallet/POPS events, i Command | **Experimental reference** |
| i-initial-structures | promoted `integrations/eye-tracking/source/` (25 files) | Collab/media/render engines | **Canonical candidate types** |
| Archive consumer UI | eye-earn-sparkle-archive `components/studio/` | AI editor widgets | **Experimental UX** |

## i Command Routing (Branch-Only)

Domains: `wallet_economy`, `studio_creation`, `feed_content`, `private_self`, safety, etc.  
Router: `i-command-router.ts` — **not promoted** to integration archive.

## Creator Tools Status

| Tool | Status |
|------|--------|
| Collab permission/review/version engines | Implemented mock (i-initial-structures) |
| Publish post-package builder | Mock (IVAULT) |
| Campaign runtime previews | Mock panels |
| tip-creator edge fn | Production (archive main) |
| HTML campaign prototypes | Static (`05_creator_campaigns/`) |

## Decision (From Audits)

Studio + i Command belong in **web integration archive**, not eye_tracking_app/main. ET repo = signals + Intent OS only.

**Sources:** STUDIO_ROUTING audit; I_INITIAL_STRUCTURES audit; constitution
