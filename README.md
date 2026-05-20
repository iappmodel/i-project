# [ i ] Project — Migration Archive

Unified repository for the rescued [ i ] product archive, navigation launcher, imported eye-tracking technology, and (future) application workspace.

## What lives here

| Area | Path | Purpose |
|------|------|---------|
| **Rescued ChatGPT archive** | `00_README` … `08_raw_originals` | Source-of-truth exports — **read-only**; do not rewrite originals in place |
| **Prototype launcher** | `prototype-app/index.html` | Premium dark UI to open every rescued file + integrations |
| **Eye-tracking import** | `integrations/eye-tracking/` | Copy of `~/eye_tracking_app` (source left untouched on disk) |
| **Technical docs** | `docs/technical/` | Integration maps and cross-project notes |
| **Future app workspace** | *(not created yet)* | Planned home for React/Vite or Flutter MVP wired to archive + gaze |

## Start here

1. Open **`prototype-app/index.html`** in a browser (or `python3 -m http.server` from repo root).
2. Read **`00_README/README_FIRST.md`** for migration context.
3. For eye-tracking: **`docs/technical/EYE_TRACKING_INTEGRATION_MAP.md`**.

## Eye-tracking source of truth

- **Live original:** `~/eye_tracking_app` (never deleted by this archive)
- **Archive copy:** `integrations/eye-tracking/`
- **Provenance:** `integrations/eye-tracking/ai-history/IMPORT_PROVENANCE.md`

## Rules of engagement

- Do not delete archived folders or `08_raw_originals` files.
- Prefer new work under `integrations/`, `prototype-app/`, `docs/`, or a future `app/` — not in-place edits to rescued exports.
- UI redesign is out of scope until integration is stable.

## Related rescued product loops

Verified attention and **watch → verify → earn** are documented in:

- `06_feed_earning_loops/iapp_loop1_watch_verify_earn.html`
- `integrations/eye-tracking/demos/investor-demo/` (React demo, mocked gaze)
