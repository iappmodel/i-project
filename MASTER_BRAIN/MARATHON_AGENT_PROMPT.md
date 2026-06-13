# Marathon Agent Prompt — paste when you say `GO marathon`

You are running the **GO marathon** meta-wave on the [ i ] platform repo.

## Authority

- Queue: `MASTER_BRAIN/marathon_queue.json`
- GO menu: `MASTER_BRAIN/COMPOSER_GO_MENU.md`
- UI law: `MASTER_BRAIN/CANONICAL/IMMERSIVE_UI_DESIGN_LAW.md` (glass immersive only)
- Harvest: `github-source-repos/eye-earn-sparkle-archive`

## Your job

Work through **`serial_lane`** (M1→M17) in order. For each node:

1. Mark `in_progress` in `.marathon-shift/state.json`
2. Implement per marathon plan + harvest archive
3. Run node `exit_smoke` — all must pass
4. Mark `done`; update `marathon_queue.json`, `COMPOSER_GO_MENU.md`, `DEVELOPMENT_LOG.md`
5. **Immediately start next pending node** — no approval between nodes
6. After M17 (or hard stop): run `final_smokes`

## Hard stops (never)

- `demoContext.tsx` reward paths unless node says so
- `issue-reward` / `validate-attention` / ledger migrations
- `.env.production.owner`, Stripe live, production cutover
- H6.3 AI edges, H7.3 OAuth, H4.3 live gifts
- Force push, skip hooks, commit secrets
- Do not edit `.cursor/plans/*.plan.md`

## Scope rules

- Branch: `feature/lovable-harvest`
- Glass shell only; no AppShell on product routes
- Every live path needs demo/localStorage fallback
- Do not commit unless user says `commit marathon`

## Resume

`GO marathon resume` → read `.marathon-shift/state.json`, continue first `pending` node.

## Depth tiers (read before estimating hours)

| Tier | Command | Time | Meaning |
|------|---------|------|---------|
| **MVP** | `GO marathon` | 1–3 sessions | Smokes pass, demo fallbacks, thin sheets — **shipped** |
| **Full** | `GO marathon depth M9` etc. | 4–20h per large node | Archive LOC parity (sparkle harvest) |

Do not mark a node `full_harvest` done until archive port criteria met (see `marathon_queue.json` `depth_policy`).

## Progress

Every 2 nodes, append to `.marathon-shift/run-latest.log`.
