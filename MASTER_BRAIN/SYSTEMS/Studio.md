# Studio System

**Classification:** Experimental — three competing lineages  
**Confidence:** Medium  
**Supersedes detail in:** `CREATOR_ECONOMY/STUDIO_AND_CAMPAIGNS.md`

---

## One-sentence definition

**Studio** is the creator media pipeline — record, edit, proof-tag, publish, and export content that enters campaigns and the marketplace.

---

## Three lineages (audits)

| Lineage | Location | Strength |
|---------|----------|----------|
| IVAULT monolith | preservation snapshot `src/screens/studio/` (151 files) | Publish/wallet/POPS events, i Command |
| i-initial-structures | promoted source (25 files) | Collab/media/render engines |
| eye-earn-sparkle-archive | `components/studio/` | AI editor widgets |
| eye_tracking_app | Stage 1 Studio shell (separate repo) | Proof plan, publish plan, autocut |

**Decision:** Studio belongs in **web integration archive**, not ET-only repo.

---

## Studio stages (eye_tracking_app evidence)

| Stage | Features |
|-------|----------|
| Session | Recording state, clips |
| AutoCut | Edit plans |
| Cleanup | Trim/dead air |
| Proof | StudioProofPlan — links to POP/proof layer |
| Publish | StudioPublishPlan — campaign handoff |
| Export | Render + package |

`npm run studio:typecheck` — narrow typecheck lane in ET repo.

---

## Chat evidence

| Rank | Title |
|------|-------|
| 105 | Media Control Studio |
| 125 | Studio Automation Brainstorm |
| 171 | Suno Studio Overview (adjacent — music) |

---

## Connections

| Entity/System | Relationship |
|---------------|--------------|
| Creator Economy | Studio produces campaign assets |
| POP / Proof | StudioProofPlan tags verified content |
| iMAKE | Module overlap — creation surface |
| Elo | Assistant for editing/publishing (candidate) |
| Wallet | Creator payouts from published campaigns |

See [`../RELATIONSHIPS/Elo_Studio.md`](../RELATIONSHIPS/Elo_Studio.md)
