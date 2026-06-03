# [ i ] — Investor Readiness Checklist

**Status:** Operational guide (2026-06-03) · **Investor build:** `docs/investor/README.md`  
**Audience:** Founder + anyone running investor meetings  
**Related:** [`MVP_CANONICAL_FLOW.md`](MVP_CANONICAL_FLOW.md) · [`MASTER_BRAIN/WIRING_STATUS.md`](../MASTER_BRAIN/WIRING_STATUS.md)

---

## One-command gates

```bash
# Phase A — materials + business pack (always)
./scripts/smoke_investor_readiness.sh

# Phase B — product B1 + immersive shell
./scripts/smoke_investor_readiness.sh --product

# Proof spine (before claiming wired end-to-end)
./scripts/smoke_investor_readiness.sh --product --spine

# Phase C foundation (production + optional Supabase)
./scripts/smoke_investor_readiness.sh --product --spine --phase-c

# Live demo launcher
./scripts/run_investor_demo.sh
```

Device: `./scripts/run_investor_device_demo.sh` · Runbook: [`docs/investor/DEVICE_DEMO_RUNBOOK.md`](investor/DEVICE_DEMO_RUNBOOK.md)

---

## How to use this page

| Phase | Goal | Start when | Automation |
|-------|------|------------|------------|
| **A — Discovery** | Relationships, feedback, advisors | **Now** | `smoke_investor_phase_a.sh` |
| **B — Checks** | Pre-seed / angel commits | Device loop + one commercial signal | `--product` + B2 docs filled |
| **C — Priced round** | Lead investor / institutional seed | Cloud pilot + 8–12 weeks metrics | `--phase-c` + CSV data |

---

## Phase A — Discovery (start now)

### Story kit

| Item | Automation / artifact |
|------|----------------------|
| Thesis one sentence | Index + print bundle · grep `verified attention` in phase A smoke |
| Print bundle | `./scripts/open_investor_print_bundle.sh` |
| Presenter deck (20 slides) | `./scripts/open_investor_presenter.sh` |
| Explainers + simulator | `smoke_investor_explainers.sh` |
| Revenue 60 / 30 / 10 | [`REVENUE_MODEL.md`](../MASTER_BRAIN/CANONICAL/REVENUE_MODEL.md) |

### Ask in meetings

| Item | Artifact |
|------|----------|
| Skepticism capture | [`docs/investor/OBJECTION_LOG.md`](investor/OBJECTION_LOG.md) |
| Warm intros | [`docs/investor/INTRO_LOG.md`](investor/INTRO_LOG.md) |

### Do not block Phase A on

Full Lovable harvest · Studio / full Elo · production parity with sparkle-archive.

---

## Phase B — Checks (raise money)

**Gate:** B1–B4 before asking for a check. B5 recommended.

### B1 — 90-second magic moment

| Item | Built |
|------|-------|
| Immersive feed → earn clip | Nike hero in `feed.service.ts` |
| Attention signal | Mock gaze labeled; Seal Proof on device |
| Pending → settled | Mock timer; live POP + `RewardReveal` pending copy |
| Wallet updates | `ImmersiveWalletSheet` / `WalletScreen` |

**Path:** `app/` · `?investor=1` · `./scripts/run_investor_demo.sh` · `smoke_investor_b1.sh`

### B2 — Commercial proof (TBD — you fill)

| Item | Artifact |
|------|----------|
| LOI | [`PILOT_LOI_TEMPLATE.md`](investor/PILOT_LOI_TEMPLATE.md) |
| Pipeline slide | [`investor_pipeline_slide.html`](../06_feed_earning_loops/investor_pipeline_slide.html) |
| Micro-campaign | [`MICRO_CAMPAIGN_PLAYBOOK.md`](investor/MICRO_CAMPAIGN_PLAYBOOK.md) |

### B3 — Money & compliance

[`COMPLIANCE_BRIEF.md`](investor/COMPLIANCE_BRIEF.md) · POP: [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md)

### B4 — Team & use of funds

[`USE_OF_FUNDS_12MO.md`](investor/USE_OF_FUNDS_12MO.md) · [`OWNERSHIP_AND_GAPS.md`](investor/OWNERSHIP_AND_GAPS.md)

### B5 — Technical honesty

[`TECHNICAL_DISCLOSE.md`](investor/TECHNICAL_DISCLOSE.md) · investor preview banner in app · CR-01 in `attentionSession.ts`

---

## Phase C — Priced round (later)

| Item | Automation |
|------|------------|
| Cloud spine | `smoke_investor_phase_c.sh` (optional Supabase if stack up) |
| Pilot metrics | [`PILOT_METRICS_TEMPLATE.csv`](investor/PILOT_METRICS_TEMPLATE.csv) — fill weekly, no fake rows |
| Repeat spend | Documented in README — not fabricated in repo |
| Production readiness | Chained in phase C smoke |

---

## Meeting modes

| Mode | Entry |
|------|-------|
| Print / PDF | `open_investor_print_bundle.sh` |
| Presenter | `open_investor_presenter.sh` |
| Touch simulator | `open_app_ui_simulator.sh` |
| Live app | `run_investor_demo.sh` |

**Screen order:** splash → feed → offer → watch-verify → result → reward → wallet → convert → withdraw → creator economics → roadmap — [`MVP_CANONICAL_FLOW.md`](MVP_CANONICAL_FLOW.md)

---

## One-line calendar rule

**Start investor discovery immediately; start investor checks when B1 + B2 are true.**

---

## Changelog

| Date | Note |
|------|------|
| 2026-06-03 | Initial checklist |
| 2026-06-03 | Investor build: smokes, `docs/investor/`, B1 app path, automation column |
