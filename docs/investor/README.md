# [ i ] Investor Build Pack

Artifacts for [`INVESTOR_READINESS_CHECKLIST.md`](../INVESTOR_READINESS_CHECKLIST.md). Run gates from repo root:

```bash
./scripts/smoke_investor_readiness.sh              # Phase A materials
./scripts/smoke_investor_readiness.sh --product    # + B1 app + immersive shell
./scripts/smoke_investor_readiness.sh --product --spine
./scripts/smoke_investor_readiness.sh --product --spine --phase-c
```

Live demo: `./scripts/run_investor_demo.sh` · Device: `./scripts/run_investor_device_demo.sh`

---

## Checklist mapping

| Phase | Item | Artifact / automation |
|-------|------|------------------------|
| A | Thesis | Index + print bundle cover |
| A | Materials | `06_feed_earning_loops/investor_*` · `smoke_investor_phase_a.sh` |
| A | Revenue 60/30/10 | [`MASTER_BRAIN/CANONICAL/REVENUE_MODEL.md`](../MASTER_BRAIN/CANONICAL/REVENUE_MODEL.md) |
| A | Objections / intros | [`OBJECTION_LOG.md`](OBJECTION_LOG.md) · [`INTRO_LOG.md`](INTRO_LOG.md) |
| B1 | 90s magic moment | `app/` · `?investor=1` · `smoke_investor_b1.sh` |
| B2 | LOI / pipeline | [`PILOT_LOI_TEMPLATE.md`](PILOT_LOI_TEMPLATE.md) · [`../06_feed_earning_loops/investor_pipeline_slide.html`](../06_feed_earning_loops/investor_pipeline_slide.html) |
| B2 | Micro-campaign | [`MICRO_CAMPAIGN_PLAYBOOK.md`](MICRO_CAMPAIGN_PLAYBOOK.md) |
| B3 | Compliance | [`COMPLIANCE_BRIEF.md`](COMPLIANCE_BRIEF.md) |
| B4 | Team / funds | [`USE_OF_FUNDS_12MO.md`](USE_OF_FUNDS_12MO.md) · [`OWNERSHIP_AND_GAPS.md`](OWNERSHIP_AND_GAPS.md) |
| B5 | Technical disclose | [`TECHNICAL_DISCLOSE.md`](TECHNICAL_DISCLOSE.md) |
| C | Metrics (template) | [`PILOT_METRICS_TEMPLATE.csv`](PILOT_METRICS_TEMPLATE.csv) · [`PILOT_METRICS_README.md`](PILOT_METRICS_README.md) |
| C | Cloud spine | `smoke_investor_phase_c.sh` (optional Supabase) |

---

## Manual only (by design)

- Fill **TBD** partner names in LOI / pipeline before Phase B checks
- Collect 8–12 weeks pilot data into CSV (no fabricated metrics in repo)
- US securities counsel for offering language
