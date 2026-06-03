# [ i ] — Investor Readiness Checklist

**Status:** Operational guide (2026-06-03)  
**Audience:** Founder + anyone running investor meetings  
**Related:** [`MVP_CANONICAL_FLOW.md`](MVP_CANONICAL_FLOW.md) · [`MASTER_BRAIN/WIRING_STATUS.md`](../MASTER_BRAIN/WIRING_STATUS.md) · [`MASTER_BRAIN/CANONICAL/i_SOURCE_OF_TRUTH.md`](../MASTER_BRAIN/CANONICAL/i_SOURCE_OF_TRUTH.md)

---

## How to use this page

| Phase | Goal | Start when |
|-------|------|------------|
| **A — Discovery** | Relationships, feedback, advisors | **Now** |
| **B — Checks** | Pre-seed / angel commits | Device loop + one commercial signal |
| **C — Priced round** | Lead investor / institutional seed | Cloud pilot + 8–12 weeks metrics |

Run **Pre-meeting smokes** before every live demo. Use **Honest disclose** for technical diligence — do not oversell production parity.

---

## Phase A — Discovery (start now)

Narrative and materials only. No need for cloud production or marketplace scale.

### Story kit

- [ ] Thesis in one sentence: *verified attention → wallet → creator/advertiser value*
- [ ] Print bundle opens: `./scripts/open_investor_print_bundle.sh`
- [ ] Presenter deck (19 slides): `./scripts/open_investor_presenter.sh`
- [ ] Explainer index + simulators pass: `./scripts/smoke_investor_explainers.sh`
- [ ] Revenue model aligned: 60 / 30 / 10 (`MASTER_BRAIN/CANONICAL/REVENUE_MODEL.md`)

### Ask in meetings

- [ ] “What would make you skeptical?” (not “will you invest?”)
- [ ] Capture 3 objections → backlog (regulatory, fraud, unit economics, platform risk)
- [ ] Log warm intros and follow-ups (name, date, next step)

### Do not block Phase A on

- Full Lovable harvest (H2–H9)
- Studio / full Elo / 26+ω currency tree
- Production parity with `eye-earn-sparkle-archive`

---

## Phase B — Checks (raise money)

**Gate:** All **B1–B4** must be true before asking for a check. **B5** strongly recommended.

### B1 — 90-second magic moment (device)

Investor sees on **their phone or yours** (not laptop-only presenter mode):

- [ ] Immersive feed → sponsored / earn clip
- [ ] Watch session with attention signal (real gaze path or labeled demo path)
- [ ] Reward path shows **pending → settled** (not instant mystery credit)
- [ ] Wallet updates (balance or activity row)

**Canonical app path:** `app/` → immersive feed → watch → wallet sheet  
**HTML/React backup:** `06_feed_earning_loops/` · `integrations/eye-tracking/demos/investor-demo/`

### B2 — One commercial proof point

At least one:

- [ ] Signed LOI or pilot letter (brand, creator, or agency)
- [ ] Paid micro-campaign (even $500–$2k test budget)
- [ ] Credible pipeline slide with **named** counterparty + date

Without B2, stay in Phase A (advisors / angels who bet on team + tech).

### B3 — Money & compliance story (15 min ready)

- [ ] Rewards = attention compensation (not securities pitch — get counsel if US)
- [ ] Withdraw / payout path explained (demo vs live Stripe)
- [ ] Privacy: camera / gaze consent copy matches product (`IMMERSIVE_UI_DESIGN_LAW.md`)
- [ ] Fraud: multi-signal POP — architecture doc ready: [`POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md`](technical/POPS_MULTI_SIGNAL_VALIDATION_ARCHITECTURE.md)

### B4 — Team & use of funds

- [ ] 12-month plan: wiring + pilot + hire 1–2 roles (name which)
- [ ] Who owns proof → ledger → payout promotion into canonical `app/`
- [ ] Known gaps stated (e.g. cloud cutover, archive promotion)

### B5 — Technical honesty (recommended)

- [ ] Currency: canonical **a/i/v/e/o** per `MASTER_BRAIN/DECISIONS/CURRENCY_NAMING_ADR.md`; demo may show legacy labels — say so once
- [ ] POP v2: tag `pop-v2-complete` · doc [`docs/POP_V2_RELEASE.md`](POP_V2_RELEASE.md)
- [ ] Session gate (CR-01): resolved in app — do not demo bypass paths

---

## Phase C — Priced round (later)

- [ ] Cloud spine live (not laptop-only): `./scripts/smoke_pop_wallet_loop_supabase.sh`
- [ ] 8–12 weeks pilot metrics: DAU/WAU, completion rate, fraud rate, earn per session
- [ ] Repeat advertiser or creator spend (not one-off demo)
- [ ] Production readiness: `./scripts/smoke_production_readiness.sh`

---

## Pre-meeting smokes (run in order)

From repo root:

```bash
# Materials (30s)
./scripts/smoke_investor_explainers.sh
./scripts/smoke_investor_print_bundle.sh

# Product shell (Loop 1 UX)
./scripts/smoke_immersive_shell.sh

# Proof spine (before claiming "wired end-to-end")
./scripts/smoke_pop_ship_gate.sh          # POP v2 gate
./scripts/smoke_pop_wallet_loop.sh        # local validate → settle
# Optional if Supabase stack up:
./scripts/smoke_pop_wallet_loop_supabase.sh

# Full local stack for live demo
./scripts/dev_stack.sh
```

**Device demo (Android USB):** `./scripts/run_android_device_test.sh` · `./scripts/smoke_android_seal_postcheck.sh`

If any smoke fails, use **print bundle + presenter deck** for that meeting; reschedule live device demo.

---

## Meeting modes

| Mode | Use when | Entry |
|------|----------|--------|
| **Print / PDF** | First email, async, no live call | `open_investor_print_bundle.sh` |
| **Presenter** | 20–30 min video or room | `open_investor_presenter.sh` |
| **Touch simulator** | Remote walkthrough of Picture 2 | `open_app_ui_simulator.sh` |
| **Live app** | Phase B gate met | `app/` on device + `dev_stack.sh` |

**Screen order (investor narrative):**  
`splash → feed → offer → watch-verify → result → reward → wallet → convert → withdraw → creator economics → roadmap`  
— see [`MVP_CANONICAL_FLOW.md`](MVP_CANONICAL_FLOW.md)

---

## Honest disclose (technical diligence)

Say these proactively:

| Topic | Truth today |
|-------|-------------|
| **Demo vs production** | DEMO track ships locally; PRODUCTION cloud cutover is parallel (`FEATURE_BIBLE.md`) |
| **Proof loop** | Validator + pending holds + ledger wired locally; cloud = pilot milestone |
| **Eye-tracking** | Flutter runtime + seal proof on device; web may use session-derived / mock gates |
| **Archive body** | `eye-earn-sparkle-archive` has production breadth — promotion into this repo is in flight |
| **External OS control** | POP blocks OS/payment actions by default (`docs/POP_EXTERNAL_OS_CONTROL.md`) |

---

## One-line calendar rule

**Start investor discovery immediately; start investor checks when B1 + B2 are true.**

---

## Changelog

| Date | Note |
|------|------|
| 2026-06-03 | Initial checklist from wiring + MVP + smoke inventory |
