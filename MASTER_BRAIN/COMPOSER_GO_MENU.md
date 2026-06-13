# Composer GO Menu — [ i ] Platform Build

**Updated:** 2026-06-11  
**Law:** [`FABLE_FULL_PLATFORM_AUDIT_2026-06-10.md`](FABLE_FULL_PLATFORM_AUDIT_2026-06-10.md)  
**Usage:** Send one line per session: `GO <id>`

---

## GO Protocol

Every `GO` command implies:

1. **One sub-item** only (no multi-epic sessions)
2. **Branch** as listed below
3. **Exit smoke** must pass before done
4. **Do not touch** spine files unless the GO id says so

### Model routing

| Tier | Model | When |
|------|-------|------|
| **C** | Composer 2.5 / Auto | Default — ports, UI, smokes, docs |
| **S** | Sonnet / Codex | Composer failed smoke twice; cross-file UI |
| **O** | Opus / Fable | Spine/money design or review (≤20 min) |

---

## Overnight shift (unattended)

| GO command | Branch | Model | Exit | Notes |
|------------|--------|-------|------|-------|
| `GO overnight` | `feature/lovable-harvest` | C | serial queue + final smokes | Prior queue complete |
| `GO overnight resume` | same | C | continue from `.overnight-shift/state.json` | After context reset |

**Queue:** [`OVERNIGHT_SHIFT.md`](OVERNIGHT_SHIFT.md) · [`overnight_queue.json`](overnight_queue.json)

---

## GO Marathon (largest single command)

| GO command | Branch | Model | Exit | Notes |
|------------|--------|-------|------|-------|
| `GO marathon` | `feature/lovable-harvest` | C | M1–M17 serial + final smokes | **MVP slice Done** — not full harvest |
| `GO marathon resume` | same | C | `.marathon-shift/state.json` | After context reset |
| `GO marathon depth M9` | harvest | S | `deno test` + full checkout edges | **Next** — archive parity |
| `GO marathon depth M10` | harvest | S | `smoke_merchant_pay.sh` + 2k LOC pay sheet | After M9 |

**Depth:** `GO marathon` = ~1–3 sessions, smoke MVP + demo fallbacks. `GO marathon depth *` = 50–80h full Lovable harvest per [`marathon_queue.json`](marathon_queue.json) `depth_policy`.  
**Queue:** [`marathon_queue.json`](marathon_queue.json) · [`MARATHON_AGENT_PROMPT.md`](MARATHON_AGENT_PROMPT.md) · [`MARATHON_CLOUD_PROMPTS.md`](MARATHON_CLOUD_PROMPTS.md)

---

## Spine phases (serial — do not parallelize)

| GO command | Branch | Model | Autonomy | Exit smoke | Owner gate | Status |
|------------|--------|-------|----------|------------|------------|--------|
| `GO H1.4` | `feature/lovable-harvest` | C | 5 | `deno test issue-reward` + `smoke_organism_spine.sh` | — | **Done** |
| `GO H1.5` | `feature/lovable-harvest` | C | 5 | `smoke_organism_spine.sh` + `npm run typecheck` | — | **Done** |
| `GO Loop-1 edge wiring` | `main` | S→C | 4 | `smoke_organism_spine.sh` + `smoke_pop_wallet_loop_supabase.sh` | Confirm web=edge, device=POP | **Done** |
| `GO wire owner gates` | `main` | C | 0→5 | `smoke_owner_gates.sh` after `.env.production.owner` | Fill 5 gates in owner env | **Ready to wire** |
| `GO production cutover` | `main` | O→C | 1 | `smoke_production_readiness.sh` + `smoke_investor_phase_c.sh` | All 5 gates READY | Blocked until owner env |

**Loop-1 edge wiring** touches: `attentionValidation.ts`, `rewardIssuance.ts`, `settlementConfig.ts`, `demoContext.tsx`, `WatchVerifyScreen.tsx` (optional).  
**Do not parallelize** with other agents while Loop-1 is open.

---

## Epic H0 — Audit hygiene

| GO command | Branch | Exit | Status |
|------------|--------|------|--------|
| `GO H0 PR checklist` | `feature/lovable-harvest` | Template in harvest PR description | **Done** |

---

## Epic H1 — Wallet & money movement

| GO command | Branch | Model | Exit | Status |
|------------|--------|-------|------|--------|
| `GO H1.1` | harvest | C | `transferCoins` + wallet sheet | **Done** |
| `GO H1.2` | harvest | C | `useWalletTransactions` | **Done** |
| `GO H1.3` | harvest | C | `WithdrawPreviewScreen` + `usePayout` | **Done** |
| `GO H1.4` | harvest | C | Edge parity verify + tests | **Done** |
| `GO H1.5` | harvest | C | `security.service.ts` + edge abuse hooks | **Done** |

---

## Epic H2 — Live feed & social

| GO command | Branch | Model | Exit | Do not touch |
|------------|--------|-------|------|--------------|
| `GO H2.1` | harvest | C | `useImmersiveFeed` | — | **Done** |
| `GO H2.2` | harvest | C | `track-interaction` wiring | — | **Done** |
| `GO H2.3` | harvest | C | `smoke_immersive_shell.sh` | ledger | **Done** |
| `GO H2.4` | harvest | C | `OutProfileChip` + follow | ledger | **Done** |
| `GO H2.5` | harvest | C | `SavedScreen` + Supabase | ledger | **Done** |
| `GO H2.6` | harvest | C | `submit-promotion-review` | ledger | **Done** |

---

## Epic H3 — Promo & geo

| GO command | Branch | Model | Exit | Owner gate |
|------------|--------|-------|------|------------|
| `GO H3.1` | harvest | C | `get-nearby-promotions` | — | **Done** |
| `GO H3.2` | harvest | C | `verify-checkin` + streak UI | — | **Done** |
| `GO H3.3` | harvest | C | Map sheet smoke | **Mapbox token** | **Done** (demo tier) |
| `GO H3.4` | harvest | C | Route builder (optional) | — | **Done** |

---

## Epic H4 — Merchant pay

| GO command | Branch | Model | Exit | Owner gate |
|------------|--------|-------|------|------------|
| `GO H4.1` | harvest | C | 8 `merchant-checkout-*` edges | — | **Done** |
| `GO H4.2` | harvest | C | Pay glass sheet | — | **Done** |
| `GO H4.3` | harvest | C | `send-coin-gift` | Stripe for live charge |

---

## Epic H5 — Gamification

| GO command | Branch | Model | Exit | Parallel OK |
|------------|--------|-------|------|-------------|
| `GO H5.1` | harvest | C | TaskCenter sheet | Yes (Cloud Agent) | **Done** |
| `GO H5.2` | harvest | C | Achievements + spin | Yes | **Done** |
| `GO H5.3` | harvest | C | Referrals panel | Yes | **Done** |
| `GO H5.4` | harvest | C | Leaderboard | Yes | **Done** |

---

## Epic H6 — Studio

| GO command | Branch | Model | Exit | Owner gate |
|------------|--------|-------|------|------------|
| `GO H6.1` | harvest | C | Upload + Create flow | Storage bucket | **Done** (demo) |
| `GO H6.2` | harvest | S | Timeline glass screen | — | **Done** (demo) |
| `GO H6.3` | harvest | C | 6 `generate-*` edges | **OpenAI keys** |
| `GO H6.4` | harvest | C | `analyze-video` | — |

---

## Epic H7 — Chat · stories · connect

| GO command | Branch | Model | Exit | Owner gate |
|------------|--------|-------|------|------------|
| `GO H7.1` | harvest | C | DM threads | — | **Done** |
| `GO H7.2` | harvest | C | Stories ring | — | **Done** |
| `GO H7.3` | harvest | C | Social connect | **OAuth apps** |
| `GO H7.4` | harvest | C | Go Live (optional) | — |

---

## Epic H8 — Vision hardening

| GO command | Branch | Model | Exit | Parallel OK |
|------------|--------|-------|------|-------------|
| `GO H8.1` | harvest | C | Calibration wizard | Yes | **done 2026-06-13** |
| `GO H8.2` | harvest | C | Full blink remote (presenter flag) | Yes | **Done** |
| `GO H8.3` | harvest | D | Tobii bridge — **skip** | — |

---

## Epic H9 — Admin (defer)

| GO command | Branch | Status |
|------------|--------|--------|
| `GO H9` | separate `admin/` | Deferred |

---

## iTrack / POP / device

| GO command | Branch | Model | Exit | Owner gate |
|------------|--------|-------|------|------------|
| `GO POP cloud prep` | `main` | C | Deploy runbook + env templates | Cloud creds |
| `GO Android 60s E2E` | `main` | C | `smoke_pop_ship_gate.sh` | USB device |
| `GO iOS verify` | `main` | O | iOS contract test | Mac + device + signing |

**Note:** Capacitor in-process Flutter bridge is **not recommended** for MVP. Keep out-of-process POP bridge.

---

## Design & polish

| GO command | Branch | Model | Exit | Parallel OK |
|------------|--------|-------|------|-------------|
| `GO design-tokens` | `main` | C | `smoke_gesture_buttons.sh` | Yes | **Done** |
| `GO design-video-media` | `main` | C | `smoke_immersive_shell.sh` | Yes | **Done** |

---

## Daily picker (P0 → P2)

### P0 — Spine (do first, one per day)

1. `GO H1.4` — **Done**
2. `GO H1.5` — **Done**
3. `GO Loop-1 edge wiring` — **Done**
4. `GO H2.3` — **Done**
5. `GO H2.4` — **Done**
6. `GO H2.5` — **Done**

### P1 — Growth (after P0 smokes green)

7. `GO H2.6` — **Done**
8. `GO H3.1` — **Done**
9. `GO H5.1` — **Done**
10. `GO design-tokens` — **Done**

### P2 — Owner-gated

11. `GO H3.3` (Mapbox)
12. `GO H6.3` (AI keys)
13. `GO production cutover`

---

## Parallel agent rules

**Safe to run in parallel (separate branches/worktrees):**

- H5 gamification
- H8 vision (B-tier)
- design-tokens / design-video-media
- H2.3 comments (only if Loop-1 not in flight)

**Never parallelize:**

- `demoContext.tsx` reward paths
- `issue-reward` / `validate-attention` edits
- Ledger migrations
- Loop-1 edge wiring

---

## Composer prompt template

```text
GO <id>
Branch: <branch>
Law: IMMERSIVE_UI_DESIGN_LAW.md — glass only, no AppShell on product routes
Harvest: eye-earn-sparkle-archive path(s): ...
Target: app/src/... only
Do NOT: demoContext (unless GO says), POP validator, unrelated screens
Exit: <smoke commands>
```

---

## Environment flags (Loop-1)

| Variable | Values | Meaning |
|----------|--------|---------|
| `VITE_POP_VALIDATOR_URL` | URL | Enables live wallet + POP path |
| `VITE_REWARD_PATH` | `pop` \| `edge` \| `auto` | Reward authority (default `auto`) |
| `VITE_AUTO_SETTLE` | `true` | Auto-settle POP holds (local dev) |

**`auto` split:** native/Capacitor → POP; web + Supabase auth → edge; else mock.

---

## Quick reference

| Track | Autonomous % | Blockers |
|-------|--------------|----------|
| MVP DEMO | ~95% | Device polish optional |
| MVP PRODUCTION | ~70–75% | Stripe, cloud, TLS, signing |

**Owner gates:** [`OWNER_GATES_INDEX.md`](OWNER_GATES_INDEX.md) — `cp .env.production.owner.example .env.production.owner` → `GO wire owner gates`

**Start here:** Owner gates when ready · or next wave beyond marathon (H6.3 AI, H7.3 OAuth, production cutover)

---

## External prototype builds (Abacus AI)

| Asset | Path |
|-------|------|
| Full prompt | [`ABACUS_AI_BUILD_PROMPT.md`](ABACUS_AI_BUILD_PROMPT.md) |
| Short (~2K) | [`ABACUS_AI_BUILD_PROMPT_SHORT.md`](ABACUS_AI_BUILD_PROMPT_SHORT.md) |
| Phased (0–8) | [`ABACUS_AI_BUILD_PROMPT_PHASES.md`](ABACUS_AI_BUILD_PROMPT_PHASES.md) |

Copy-paste into Abacus **Create App**. Minimum investor demo = Phases 0–3 + 7.
