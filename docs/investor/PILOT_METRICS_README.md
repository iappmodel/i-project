# Pilot metrics collection (Phase C)

Fill [`PILOT_METRICS_TEMPLATE.csv`](PILOT_METRICS_TEMPLATE.csv) weekly during an **8–12 week** pilot. Do not fabricate rows in the repo.

| Column | Definition |
|--------|------------|
| `dau` / `wau` | Distinct users with ≥1 session |
| `sessions_started` | Watch sessions opened |
| `sessions_completed` | Reached validated + reward path |
| `completion_rate` | completed / started |
| `fraud_rejected` | POP / validator reject count |
| `avg_attention_score` | Mean session ACS |
| `total_earn_icoin` | Settled viewer rewards |
| `repeat_advertiser_spend_usd` | Second+ campaign spend (Phase C gate) |

Gate for priced round: trend improving over 8+ weeks + repeat spend > 0.
