# Launcher Link Audit

**Date:** 2026-05-20  
**Launcher:** `prototype-app/index.html`  
**Method:** Parsed `SECTIONS` array; resolved each generated `href()` relative to `prototype-app/`; verified file existence on disk.

---

## Summary

| Metric | Count |
|--------|------:|
| **Total links checked** | 85 |
| **Valid links** | 85 |
| **Broken links found** | 0 |
| **Links fixed** | 0 |
| **Missing major docs added** | 1 |
| **Remaining unresolved links** | 0 |

---

## Scope

### Included

- All file links built from the `SECTIONS` JavaScript data (`href(folder, filename)` → `../<folder>/<filename>` with URI encoding).
- Paths resolved from `prototype-app/index.html` to repo root.

### Excluded (per audit rules)

- External URLs (`https://fonts.googleapis.com`, …)
- In-page anchors (`#00_README`, `#09_eye_tracking`, …)
- `mailto:`, `javascript:`, empty hrefs

Static HTML contains no file-system hrefs outside the generated grid; navigation uses `#section-id` anchors only.

---

## Broken links found

**None.** All 84 pre-existing launcher entries pointed to files that exist on disk.

---

## Links fixed

**None required.** No broken targets were found; no folder or filename corrections were made.

---

## Missing major docs — status

| Document | Pre-audit | Action |
|----------|-----------|--------|
| `docs/MVP_CANONICAL_FLOW.md` | Not linked | **Added** to section `00_README` (README & Bootstrap) |
| `docs/technical/EYE_TRACKING_INTEGRATION_MAP.md` | Already in `09_eye_tracking` | No change |
| `masterbrain/00_INDEX.md` | Already in `10_masterbrain` | No change |
| `masterbrain/01_chat_inventory/CHAT_LEDGER.md` | Already in `10_masterbrain` | No change |

### Addition detail

```javascript
{ name: 'MVP_CANONICAL_FLOW.md', ext: 'md', folder: 'docs', label: 'MVP Canonical Flow' }
```

Inserted in `00_README` after `MIGRATION_PLAN.md` — same “start here” bucket as migration plan and manifest; canonical investor demo decision map.

Resolved href: `../docs/MVP_CANONICAL_FLOW.md` ✓ verified exists.

---

## Remaining unresolved links

**None.**

---

## Links by section (post-audit)

| Section | Files linked |
|---------|-------------:|
| `00_README` | 7 |
| `01_strategy_docs` | 1 |
| `02_clickable_prototypes` | 2 |
| `03_pitch_pages` | 2 |
| `04_wallet_payments` | 10 |
| `05_creator_campaigns` | 3 |
| `06_feed_earning_loops` | 5 |
| `07_currency_system` | 2 |
| `08_raw_originals` | 25 |
| `09_eye_tracking` | 13 |
| `10_masterbrain` | 15 |
| **Total** | **85** |

---

## Verification command

Re-run from repo root:

```bash
node -e "
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync('prototype-app/index.html', 'utf8');
const m = html.match(/var SECTIONS = \\[([\\s\\S]*?)\\];\\s*\\n\\s*var totalFiles/);
const SECTIONS = eval('(' + '[' + m[1] + ']' + ')');
function href(folder, filename) {
  return '../' + folder.split('/').map(encodeURIComponent).join('/') + '/' + encodeURIComponent(filename);
}
let broken = 0;
for (const sec of SECTIONS) {
  for (const file of sec.files) {
    const folder = file.folder || sec.id;
    const rel = decodeURIComponent(href(folder, file.name).replace(/^\\.\\.\\//, ''));
    if (!fs.existsSync(path.resolve('prototype-app/..', rel))) broken++;
  }
}
console.log(broken ? 'BROKEN: ' + broken : 'All links OK');
"
```

---

## Files changed in this audit

1. `prototype-app/index.html` — added `MVP_CANONICAL_FLOW.md` entry (1 link)
2. `docs/LAUNCHER_LINK_AUDIT.md` — this report

No archived originals were modified. No visual design changes.
