# POP V10 M5 client-side authority hard stop — 2026-11-11

## Status
Patch prepared on isolated `audit/gpt-pop-integration-2026-11-11` branch from `a2713af`. No app merge or deployment. No real camera or human results.

## Code changes
- `submitProofPacket` fails closed before contacting any configured validator for every ProofPacketV0Json, **including packets with modified metadata**.
- `settlePendingHold` fails closed before any health request, Supabase request or demo settlement request.
- Manual settlement CTA is disabled with explicit M5 HOLD status.
- Focused tests assert no `fetch` is made for original demo, rebranded demo or settlement.

## Limits
These are browser/client-side controls for the investor app; they are **not server-side proof authority**. Untrusted clients can bypass shipped JavaScript. Server-side validators, authenticated policy, challenge binding, nonce continuity, replay rejection and financially separate authoritative ledgers must independently enforce policy. The historical in-memory POP value-flow test is not a production authorization.

## Verification
Source-level patch committed; tests, typecheck and build must be run in a trusted checkout. No CI for this app review branch was configured at preparation time. Continue M5 real-phone smoke separately and retain rollout HOLD.

## Local verification
```bash
cd app
npm ci
npm test
npm run typecheck
npm run build
```

Keep Cursor/Claude branches unchanged until reviewed.
