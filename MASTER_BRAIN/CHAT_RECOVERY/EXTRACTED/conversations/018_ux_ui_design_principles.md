# P0-018: UX/UI Design Principles

**Extraction batch:** P0 Batch 02  
**Extracted:** 2026-05-22

---

## 1. Source Metadata

| Field | Value |
|-------|-------|
| Source | Claude |
| Conversation ID | `090c9ca2-83c2-46d7-ad31-d08d7d5027ce` |
| Title | UX/UI design principles |
| Date created | 2026-04-07 |
| Date updated | 2026-04-07 |
| Raw path | `/Users/2023macbookpro/Desktop/IVAULT/CLAUDE/data-fe35a285-bb03-4a76-9713-3d7d7db136c1-1779344478-caa3e17f-batch-0000/conversations.json#090c9ca2-83c2-46d7-ad31-d08d7d5027ce` |
| Messages | 49 |

---

## 2. Relevance Score and Subsystem Tags

| Score | Priority | Subsystems |
|------:|----------|------------|
| 117 | P0 | UX, Brand, Investor Demo |

---

## 3. Project-Specific Summary

Owner shares **[ i ] logo** (3D gradient lowercase "i") and **visionOS-style glass UI** reference (dark teal environment, frosted panels). Claude extracts a **design principles** set: spatial glass layers, pink-magenta→cyan volumetric brand gradient on logo, high-contrast type on translucent surfaces, rounded-rectangle cards, subtle borders not heavy neumorphism.

Thread intent: translate references into **[ i ]-specific** rules (not Dribbble fantasy). Export pollution includes unrelated "Imagine" diagram skill text — **principles recovered from early assistant analysis** of the two images.

---

## 4. Extracted Decisions

| ID | Decision | Confidence |
|----|----------|------------|
| D-018-01 | Brand mark: **3D gradient "i"** — sphere tittle + pill stem; cyan highlight, magenta edge | High |
| D-018-02 | UI reference axis: **visionOS-like spatial glass** on dark teal base | High |
| D-018-03 | Neumorphism is **not** the target; use **controlled glass + depth** | High |
| D-018-04 | Logo gradient informs accent family but UI stays **premium dark + restrained glow** | Medium |

---

## 5. Extracted Feature/System Concepts

### Visual principles (from image analysis)

| Principle | Application |
|-----------|-------------|
| Spatial layering | Floating glass panels over cinematic background |
| Frosted blur | Translucent cards; readability preserved |
| Rounded geometry | Large corner radius; soft containers |
| Brand color | Pink `#FF2D78` range → cyan `#00D4FF` highlight on logo; UI accents more restrained |
| Typography | Strong hierarchy; high contrast on glass |
| Depth | Subtle shadow + border luminance, not mushy emboss |

### UX heuristics implied

- Familiar feed/profile split layout acceptable as **reference**, not clone
- Immersion via environment + blur, not hidden controls
- Accessibility: contrast must hold on glass

---

## 6. Extracted UX/Design Ideas

- Dark teal environmental base vs void black `#070709` in other demos — **second design lineage**
- Twitter/X redesign-style panels as compositional reference
- Logo can sit on light gray in marketing; app stays dark-first

---

## 7. Extracted Technical Architecture Ideas

- CSS: `backdrop-filter`, layered rgba surfaces, border highlights
- Cursor/implementation implied for Vite demo / Flutter `glass_panel.dart` (014)

---

## 8. Extracted Economy/Currency Ideas

None in thread.

---

## 9. Extracted Investor/Demo Ideas

- Logo + glass system suitable for pitch deck and app shell cohesion
- Distinct brand vs generic "AI slop" purple-gradient apps

---

## 10. Conflicts with Current Masterbrain

| Topic | Thread | Other extracts | Verdict |
|-------|--------|----------------|---------|
| Base color | Dark teal environment | `#070709` void (006, 011) | **Design fork** |
| Neumorphism | Rejected here | Prompted in 011 Code scaffold | **011 prompt outdated** |
| Glass-first | Yes | Aligns 014, 003 v2 | **Aligns** |

---

## 11. Conflicts with P0 Batch 1

| Topic | Batch 01 | This thread |
|-------|----------|-------------|
| Design v2 (003) | Content-first glass + light neumorphic settings | visionOS spatial glass | **Compatible variants** |
| Currency colors | iCoins mint / vCoins amber (001) | Not discussed | No conflict |
| Fintech dashboard | Cold luxury (006) | Warm/spatial (018) | **Lineage split** |

---

## 12. Canonical Candidates

| Candidate | Target |
|-----------|--------|
| Logo geometry + gradient spec | Brand section in design system |
| Glass panel rules (blur, border, contrast) | `CANONICAL/` or design tokens |
| Explicit "no neumorphism-dominant" | Reinforces 009, 014 |

---

## 13. Preserve-Only Notes

- Imagine diagram skill dumps in export — ignore
- Single-day thread; limited implementation follow-through

---

## 14. Obsolete Notes

- Treating Twitter/X layout as mandatory structure
- Exact hex values from screenshot analysis — verify with owner brand kit

---

## 15. Follow-Up Extraction Targets

- Merge with `i-app-design-system.md` if found in IVAULT
- Owner choose: teal spatial vs void black base
- Generate token file from principles (014 Pass 1)
