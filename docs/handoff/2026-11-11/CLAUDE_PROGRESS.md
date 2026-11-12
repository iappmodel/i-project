# Claude lane — progress

Lane branch: `handoff/claude-app-2026-11-11`. Review branches are cut from it and proposed back to it by pull
request. Nothing here is merged to `main`, deployed, or applied to a database.

Evidence labels: CODE VERIFIED (a test or command ran here), CONFIRMED IN CODE (read, not executed),
NOT MEASURED.

## 2026-11-11 — issue-reward type errors

- `a40c3db` on the lane branch (same change as `1fba7c1`, merged to `main` by the owner as PR #3).
- CODE VERIFIED: `deno test supabase/functions/issue-reward` 22/22; app typecheck and build clean.

## 2026-11-12 — settle authority (`review/claude-pop-settle-authority`)

### What was wrong (CONFIRMED IN CODE at `a40c3db`)

`integrations/pop-core/validator/src/server.ts`, `POST /v1/pending-holds/:sessionId/settle`, read `userId` from
the request body, checked only that it was UUID-shaped, and passed it to the service-role RPC
`settle_pop_pending_hold(session, user)`. That function credits `p_user_id` and overwrites the hold's
`user_id` with it (`app/supabase/migrations/20260602120000_pop_settlement_v2.sql`). There was no token and no
ownership check, so a caller who knew a session id could credit any account, once per hold. The app sent a
default demo user id when no one was signed in (`resolveDemoUserId`).

`settle-demo` took no identity at all. It only ever wrote local JSON, so it could not reach the ledger; the
risk there was a remote caller marking local demo holds settled.

### What changed

- `validator/src/settle-authority.ts` (new): every settle decision. Ledger settlement is off unless
  `POP_LEDGER_SETTLE_ENABLED=true`, needs a bearer token verified by Supabase Auth, takes the user from the
  token, refuses a different body `userId`, and requires the hold to be bound to that user. Another user's
  hold and a missing hold return the same 404. Demo settlement is refused next to a ledger and from
  non-local addresses.
- `validator/src/server.ts`: both settle routes call `handleSettleRequest`. The validate route binds the
  packet to the token's user, or to no one, when Supabase is configured; the packet's own `userId` is dropped.
- `validator/src/supabase-settlement-client.ts`: `verifyAccessToken` (`auth.getUser`).
- `app/src/lib/popValidator.ts`: sends the signed-in user's access token on validate and settle; no longer
  falls back to a default demo user id for the ledger route.
- `validator/README.md`: the new request shape, switches and responses.

### Verification (CODE VERIFIED)

- `cd integrations/pop-core/validator && npm ci && npm test`: 41 passed (was 22). 19 new in
  `tests/settle-authority.test.ts`: no token, forged token, another user's hold, body/token mismatch, unbound
  hold, the caller's own hold, switch off, malformed session id, demo rules, packet binding, replayed packet.
- `cd app && npm run typecheck && npm run build`: clean.
- One test pins that the lower-level `settlePendingHold` still credits whatever user it is handed. That is the
  old behaviour, kept visible so no new route calls it directly.

### Not done, and why

- NOT MEASURED against a real Supabase stack. `verifyAccessToken` is exercised through a fake client only.
- No SQL change. The handoff forbids Supabase migrations. The RPC should also refuse when the hold's
  `user_id` is set and differs from `p_user_id`; that needs an owner-approved migration and a database test.
- The proof is still client-scored. `app/src/lib/demoProofPacket.ts` computes presence, perception and
  `rewardEligibility` in the browser and the validator reviews those numbers. Closing the settle route does
  not make the review trustworthy. This legacy path must stay a local demo until the POP V10 server contract
  replaces it; the ledger switch defaults to off for that reason.
- `validator` typecheck has 17 errors at this commit and had them before it (JSON fixture typing, row mapper
  types). None is in a file added here. Not fixed, to keep this change reviewable.
- `integrations/pop-core/validator/node_modules` is committed to git with macOS binaries, so `npm test` fails
  on Linux until `npm ci` rewrites it. The rewritten files were not committed. It should be untracked.
- `GET /v1/pending-holds?localUserRef=` and the event stream still take a caller-supplied reference with no
  authentication. Read-only, but it lists another user's holds. Next smallest task.

### Behaviour change for the local demo

Without Supabase nothing changes for a browser on the same machine. With Supabase configured, settlement to
the ledger now needs the switch and a signed-in user; before, it worked for anyone.
