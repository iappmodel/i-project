# Investor demo variant comparison

**Status:** Preservation + diff record — no merge performed.  
**Date:** 2026-05-20

---

## 1. Source paths compared

| Label | Path |
|-------|------|
| **Canonical (archive)** | `integrations/eye-tracking/demos/investor-demo/` |
| **External source (IVAULT)** | `~/Desktop/IVAULT/DEMOS:REPOS/eye_tracking_app/investor-demo` |
| **Candidate copy (archive)** | `integrations/eye-tracking/demos/investor-demo-candidates/from-ivault-investor-demo/` |

The external directory was **not modified**. The candidate tree is a project-files-only copy into the portable `[ i ]` archive.

Index and policy: [`integrations/eye-tracking/demos/investor-demo-candidates/README.md`](../../integrations/eye-tracking/demos/investor-demo-candidates/README.md)

---

## 2. Files known to differ

`diff -rq` between canonical and candidate reports differences **only** in:

| File | Summary of candidate (IVAULT) changes |
|------|----------------------------------------|
| `src/demo/screensOrder.ts` | Adds `DEMO_SCREEN_FLOW_LABELS` and `presenterFlowLegendShort()`; same `DEMO_SCREEN_FLOW` order |
| `src/components/PresenterStrip.tsx` | Shows “Next path: …” legend above Prev/Next |
| `src/index.css` | Styles for presenter flow legend |
| `src/prototypes.css` | Feed layout (`feed-phone-layout`), watch HUD extensions, verification gate presentation |
| `src/screens/FeedScreen.tsx` | Wraps top chrome + feed list in layout containers for scroll/sticky behavior |
| `src/screens/WatchVerifyScreen.tsx` | Richer demo harness badge, `/ 100` ring label, `useMemo` for duration, renamed score vars |
| `src/screens/VerificationResultScreen.tsx` | Renamed gate steps, `GATE_STEP_MS` interval sequencing, clearer pass copy |

All other copied files (remaining `src/`, `public/`, `design-ref/`, config roots) are **byte-identical** between canonical and candidate at import time.

---

## 3. Package comparison

```bash
diff integrations/eye-tracking/demos/investor-demo/package.json \
     integrations/eye-tracking/demos/investor-demo-candidates/from-ivault-investor-demo/package.json
# (no output — identical)
```

`package-lock.json` was copied from external source as-is; dependency graph should match canonical since `package.json` matches.

---

## 4. Build artifact exclusions

Not copied from external source:

| Excluded | Reason |
|----------|--------|
| `node_modules/` | Machine-local install; reproducible via lockfile |
| `dist/` | Build output |
| `.vite/`, `coverage/`, `*.tsbuildinfo` | Cache / CI artifacts |

Import used `rsync` with explicit excludes; post-copy verification: no `node_modules` or `dist` under the candidate tree.

---

## 5. Review recommendation

1. **Side-by-side screen review** — Run canonical and candidate demos (each needs local `npm install` once) and walk Loop 1: Feed → Offer → Watch → Verify → Reward. Confirm both honor the order in [`docs/MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md).
2. **Prioritize Loop 1 screens** — `FeedScreen`, `WatchVerifyScreen`, and `VerificationResultScreen` carry the largest UX deltas; decide if IVAULT polish improves investor clarity without changing mocked-gaze semantics.
3. **Presenter strip** — Candidate adds a visible full-route legend; low risk if copy stays accurate to `DEMO_SCREEN_FLOW`.
4. **Do not bulk-replace** — Seven differing files do not justify replacing the whole canonical tree.

---

## 6. Proposed merge policy

| Rule | Detail |
|------|--------|
| Inspect behavior first | Manual pass through Watch → Verify → Result before any file merge |
| MVP alignment | Accept changes only if they support [`docs/MVP_CANONICAL_FLOW.md`](../MVP_CANONICAL_FLOW.md) (Loop 1 spine, mocked gaze, presenter Prev/Next) |
| No artifact import | Never copy `node_modules/` or `dist/` from IVAULT or any machine |
| One file at a time | Merge per path with `diff -u` review; run `npm run dev` on canonical after each merge |
| Canonical stays default | Launcher and docs continue to reference `integrations/eye-tracking/demos/investor-demo/` until an explicit promotion decision |

Suggested merge order if promoting pieces:

1. `src/demo/screensOrder.ts` + `PresenterStrip.tsx` + `index.css` (presenter legend, no screen logic)
2. `src/screens/VerificationResultScreen.tsx` (gate timing/copy)
3. `src/screens/WatchVerifyScreen.tsx` + related `prototypes.css` hunks
4. `src/screens/FeedScreen.tsx` + remaining `prototypes.css` (layout-only)

---

## Related

- Archive launcher section `09_eye_tracking` — `prototype-app/index.html`
- Eye-tracking integration map — [`EYE_TRACKING_INTEGRATION_MAP.md`](EYE_TRACKING_INTEGRATION_MAP.md)
