# ADR-014: Investor Demo Lineage & Product IA

> **Visual supersession (2026-05-27):** Tab *names* below remain; **default product shell** is immersive glass (Picture 2) per `MASTER_BRAIN/CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md`. Card feed + fintech wallet dashboard is **not** the consumer home.

**Status:** Accepted (agent recommendation + owner delegation 2026-05-25)  
**Deciders:** Project owner (delegated HI-01/02 to archaeology recommendation)  
**Blockers addressed:** HI-01, HI-02  
**Deferred:** MOD-01

---

## HI-02 — Product IA (decided)

**Decision:** Lock **4-tab bottom navigation** as product law:

| Tab | Primary loop | Core screens |
|-----|--------------|--------------|
| **Feed** | Loop 2 — Browse → Save → Return | Discovery, stories, organic + sponsored entry |
| **Earn** | Loop 1 — Watch → Verify → Earn | Offer → consent → watch → verify → reward |
| **Wallet** | Loop 3 — Balance → Convert → Use | Balances, pending, convert, withdraw |
| **Profile** | Trust + settings + roadmap | Trust score, account, vision (modules TBD) |

**Rejected as product IA:**
- 5-screen cross navigation (conv 030, 032, 037)
- 6-button floating chrome
- Dashboard-first FLUX layout with Studio as primary tab

**Evidence:** Conv 014, 038, rank 9 product brief — strongest cross-platform alignment.

---

## HI-01 — Investor demo lineage (decided)

**Decision:** **Dual-track, single canonical pitch URL.**

### Canonical investor demo (pitch this)

| Item | Value |
|------|-------|
| **Location** | `app/` in migration archive |
| **Run** | `cd app && npm install && npm run dev` |
| **Mode** | Linear 13-screen **presenter flow** (Loop 1 spine) |
| **Why** | Built, typecheck clean, CR-01 fixed, proof-layer narrative, GitHub-synced |

Screen order (unchanged):

```
splash → feed → offer-detail → consent-camera-gate → watch-verify →
verification-result → reward-reveal → wallet → convert → withdraw-preview →
creator-economics → proof-layer → roadmap
```

### Secondary reference (patterns only — do not merge)

| Asset | Use |
|-------|-----|
| `eye-earn-sparkle-archive` @ `codex/investor-demo-mode-v2` | Pending-wallet UX, transaction pills, scenario selector |
| `prototype-app/index.html` | Archaeology launcher for HTML prototypes |
| `integrations/eye-tracking/demos/investor-demo/` | Legacy mirror — **do not maintain parallel to `app/`** |

### Not canonical for pitch

- Standalone HTML 8-screen / 9-step files as primary demo
- Neumorphic/glass one-off URLs (iappdemomarcelo, flux-i-app, etc.) unless explicitly revived

---

## Product IA + presenter coexistence

**Intentional split (resolves HI-02 fork):**

| Mode | Navigation | When |
|------|------------|------|
| **Investor presenter** | Linear auto-walk (current `app/`) | Live pitch, screen-share, demo day |
| **Product shell** | 4-tab bottom nav | Next `app/` increment — Loop 1 lives under **Earn** |

**Next build step:** Add `BottomNav` to `app/` with 4 tabs; keep presenter toggle (or deep-link into linear flow from Earn tab).

---

## MOD-01 — Roadmap modules (deferred)

**Owner:** Not defined yet.

**Interim:** `RoadmapScreen` shows vision categories only — no committed module list on investor roadmap until owner defines MOD-01.

Do not invent iGET/iGO/iHEAR tiles on roadmap without owner lock.

---

## References

- `docs/MVP_CANONICAL_FLOW.md`
- `INVESTOR_DEMO/DEMO_PATHS_AND_FLOWS.md`
- ADR-004 (dual demo — refined, not contradicted)
- Conv 014, 038, 030, 024
