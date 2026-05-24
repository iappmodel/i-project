# Pending Hold Persistence v1

PR6B durable persistence for `PendingHoldRecord` using versioned JSON documents on disk.

## Goals

- Implement the existing synchronous `PendingHoldStore` contract without changing `createPendingHoldFromReview`
- Persist PR6A-computed `amount` and `amountBreakdown` with `releaseStatus: "not_released"`
- Keep `@pop-core/backend` free of runtime npm dependencies
- Provide a canonical stored shape that maps 1:1 to a future Postgres/Supabase row

## On-disk layout

```
{baseDir}/
  records/
    {sessionId}.json
```

No `_indexes.json`. `PendingHoldStore` exposes only `getBySessionId`; `artifactId` and `packetId` are denormalized metadata on the record, not lookup keys.

### Record file (`records/{sessionId}.json`)

One pretty-printed JSON document per hold session. `sessionId` is the canonical unique identity and must be filesystem-safe (see below).

`PendingHoldStoredRecordV1` fields:

| Field | Type | Notes |
|-------|------|-------|
| `storageVersion` | `1` | Serializer version guard |
| `sessionId` | string | Primary key; also filename |
| `userId` | string \| null | Optional |
| `localUserRef` | string | Required |
| `contentId` | string | Required |
| `offerId` | string | Required |
| `packetId` | string \| null | Secondary metadata only |
| `artifactId` | string \| null | Secondary metadata only |
| `amount` | number \| null | PR6A computed minor units |
| `amountBreakdown` | object \| null | Full `SettlementAmountBreakdown` snapshot |
| `status` | `"pending"` | Must round-trip as `"pending"` |
| `releaseStatus` | `"not_released"` | Must round-trip as `"not_released"` |
| `createdAt` | ISO-8601 string | Hold creation timestamp |
| `reviewAudit` | object | `PendingHoldReviewAudit` snapshot |

Example (approved PP-000001):

```json
{
  "storageVersion": 1,
  "sessionId": "sess_8f3c2a1b-4e5d-6a7b-8c9d-0e1f2a3b4c5d",
  "userId": null,
  "localUserRef": "local-user-001",
  "contentId": "content-001",
  "offerId": "nike-pegasus-41-watch",
  "packetId": "pkt-test-001",
  "artifactId": "PP-000001",
  "amount": 100,
  "amountBreakdown": {
    "policyVersion": "SETTLEMENT_AMOUNT_POLICY_V1",
    "currency": "ICOIN",
    "offerId": "nike-pegasus-41-watch",
    "baseRewardMinor": 100,
    "statusMultiplier": 1,
    "computedAmountMinor": 100,
    "presenceUnits": null
  },
  "status": "pending",
  "releaseStatus": "not_released",
  "createdAt": "2026-05-23T12:01:00.000Z",
  "reviewAudit": {
    "sessionId": "sess_8f3c2a1b-4e5d-6a7b-8c9d-0e1f2a3b4c5d",
    "reviewedAt": "2026-05-23T12:00:01.000Z",
    "reviewStatus": "approved",
    "artifactId": "PP-000001",
    "packetId": "pkt-test-001",
    "lifecycleEventCount": 1
  }
}
```

## Write semantics

1. Validate `sessionId` is filesystem-safe
2. Reject duplicate `sessionId` with `PendingHoldConflictError`
3. Serialize with `toStoredRecord(record)`
4. Write record to `records/{sessionId}.json.tmp`, then `renameSync` to final path
5. Append-only: no update or delete APIs in v1

PR6B assumes a single writer process. Multi-process concurrent writes are out of scope.

## Read validation

`fromStoredRecord` rejects:

- Unsupported `storageVersion`
- Non-`pending` status or non-`not_released` releaseStatus
- Missing or malformed required fields
- **Amount inconsistency:** when both `amount` and `amountBreakdown` are non-null, require `amount === amountBreakdown.computedAmountMinor`; otherwise throw `PendingHoldRecordStorageError` (wrapped as `PendingHoldStoreReadError` by the store)

## Session ID rules

`sessionId` values used with `JsonFilePendingHoldStore` must:

- Be non-empty
- Match `^[A-Za-z0-9._-]+$`
- Not contain path separators (`/`, `\`) or `..` segments
- Not be `.` or `..`

Unsafe values throw `PendingHoldInvalidSessionIdError`.

## Adapter usage

```typescript
import {
  JsonFilePendingHoldStore,
  ProofReviewService,
  createPendingHoldFromReview,
  InMemoryProofReviewStore
} from "@pop-core/backend";

const reviewService = new ProofReviewService(new InMemoryProofReviewStore());
const holdStore = new JsonFilePendingHoldStore({ baseDir: "./data/pending-holds" });

const record = reviewService.submitProofPacketForReview(packet, {
  artifactId: "PP-000001",
  submittedAt: new Date().toISOString()
});

const result = createPendingHoldFromReview(record, { store: holdStore });
```

Records survive process restart when a new store instance is created with the same `baseDir`.

## Future Postgres target schema

The serializer output maps directly to a future relational row:

```sql
create table pending_hold_records (
  session_id text primary key,
  user_id text,
  local_user_ref text not null,
  content_id text not null,
  offer_id text not null,
  packet_id text,
  artifact_id text,
  amount integer,
  amount_breakdown jsonb,
  status text not null check (status = 'pending'),
  release_status text not null check (release_status = 'not_released'),
  created_at timestamptz not null,
  review_audit jsonb not null,
  storage_version int not null default 1
);
```

## Supabase migration path (later PR)

1. Keep `PendingHoldStoredRecordV1` as the canonical document/row shape
2. Add an async store adapter in a separate API/service package
3. Bulk import `{baseDir}/records/*.json` with `insert ... on conflict do nothing`
4. Leave `createPendingHoldFromReview` unchanged until an explicit async service PR

## Forward compatibility (PR7 release state machine)

PR7 defines five legal `releaseStatus` values (`not_released`, `release_ready`, `release_blocked`, `released`, `cancelled`) and a pure projection API (`PendingHoldReleaseState`, `releaseLifecycleEvents[]`). **PR6B persistence is unchanged** — on-disk records remain `releaseStatus: "not_released"` only until a future persistence PR.

When release lifecycle persistence is added:

| Concern | Recommended approach |
|---------|---------------------|
| `releaseStatus` widening | Bump to `PendingHoldStoredRecordV2` or relax V1 read guard; write `storageVersion: 2` for mutated records |
| Lifecycle events | Persist `releaseLifecycleEvents: PendingHoldReleaseLifecycleEvent[]` (mirror proof review `lifecycleEvents`) |
| Store API | Add `update(record)` or dedicated release-state save with atomic tmp+rename |
| Eligibility on read | Reuse `isReleaseAmountConsistent()` in `fromStoredRecord` |
| Postgres sketch | Drop `check (release_status = 'not_released')`; add `release_lifecycle_events jsonb not null default '[]'` |

See [`pending-hold-release-state-machine.md`](./pending-hold-release-state-machine.md) for the canonical transition table.

## Out of scope (PR6B)

- Hold release or `releaseStatus` mutation
- Wallet, available balance, ledger writes
- Supabase client, Postgres migrations
- HTTP routes, Flutter runtime changes
- Trust mutation
- Secondary lookup APIs (`getByArtifactId`, `getByPacketId`)
- `_indexes.json` or any index file
- Update/delete hold APIs
- Encryption at rest, retention, backup automation
