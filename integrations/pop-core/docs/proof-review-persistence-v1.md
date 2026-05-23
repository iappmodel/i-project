# Proof Review Persistence v1

PR4 durable persistence for `ProofReviewRecord` using versioned JSON documents and a sidecar index file.

## Goals

- Implement the existing synchronous `ProofReviewStore` contract without changing `ProofReviewService`
- Persist state-machine-valid records including `lifecycleEvents` (PR3A)
- Keep `@pop-core/backend` free of runtime npm dependencies
- Provide a canonical stored shape that maps 1:1 to a future Postgres/Supabase row

## On-disk layout

```
{baseDir}/
  _indexes.json
  records/
    {sessionId}.json
```

### Record file (`records/{sessionId}.json`)

One pretty-printed JSON document per review session. `sessionId` is the canonical unique identity and must be filesystem-safe (see below).

`ProofReviewStoredRecordV1` fields:

| Field | Type | Notes |
|-------|------|-------|
| `storageVersion` | `1` | Serializer version guard |
| `sessionId` | string | Primary key; also filename |
| `userId` | string \| null | Optional |
| `localUserRef` | string | Required |
| `contentId` | string | Required |
| `offerId` | string | Required |
| `packetId` | string \| null | Secondary lookup index |
| `artifactId` | string \| null | Secondary lookup index |
| `submittedAt` | ISO-8601 string | Submission timestamp |
| `reviewedAt` | ISO-8601 string | Authority review timestamp |
| `status` | `ProofReviewStatus` | Canonical review status |
| `originalPacket` | `ProofPacketV0` | Pending submission snapshot |
| `projectedPacket` | `ProofPacketV0` | Authority-projected packet |
| `batch` | `PopsSignalBatch` | Scoring input batch |
| `scoring` | `PopsScoringResult` | Scoring output |
| `decision` | `PopsRewardDecision` | Eligibility decision |
| `review` | `ProofReviewResult` | Projected review block |
| `lifecycleEvents` | `ProofReviewLifecycleEvent[]` | Append-only lifecycle audit trail |

### Index file (`_indexes.json`)

Secondary lookup maps from optional identifiers to canonical `sessionId`:

```json
{
  "storageVersion": 1,
  "artifactId": {
    "PP-000001": "sess_8f3c2a1b-4e5d-6a7b-8c9d-0e1f2a3b4c5d"
  },
  "packetId": {
    "pkt-test-001": "sess_8f3c2a1b-4e5d-6a7b-8c9d-0e1f2a3b4c5d"
  }
}
```

`artifactId` and `packetId` are secondary indexes only. When the same secondary key is saved again, the index follows last-write-wins semantics (matching `InMemoryProofReviewStore`).

## Write semantics

1. Validate `sessionId` is filesystem-safe
2. Reject duplicate `sessionId` with `ProofReviewConflictError`
3. Write record to `records/{sessionId}.json.tmp`, then `renameSync` to final path
4. Read-modify-write `_indexes.json` using the same tmp+rename pattern
5. Append-only: no update or delete APIs in v1

PR4 assumes a single writer process. Multi-process concurrent writes are out of scope.

## Session ID rules

`sessionId` values used with `JsonFileProofReviewStore` must:

- Be non-empty
- Match `^[A-Za-z0-9._-]+$`
- Not contain path separators (`/`, `\`) or `..` segments
- Not be `.` or `..`

Unsafe values throw `ProofReviewInvalidSessionIdError`.

## Adapter usage

```typescript
import {
  JsonFileProofReviewStore,
  ProofReviewService
} from "@pop-core/backend";

const store = new JsonFileProofReviewStore({ baseDir: "./data/proof-reviews" });
const service = new ProofReviewService(store);

const record = service.submitProofPacketForReview(packet, {
  artifactId: "PP-000001",
  packetId: "pkt-test-001",
  submittedAt: new Date().toISOString()
});
```

Records survive process restart when a new store instance is created with the same `baseDir`.

## Future Postgres target schema

The serializer output maps directly to a future relational row:

```sql
create table proof_review_records (
  session_id text primary key,
  user_id text,
  local_user_ref text not null,
  content_id text not null,
  offer_id text not null,
  packet_id text,
  artifact_id text,
  submitted_at timestamptz not null,
  reviewed_at timestamptz not null,
  status text not null check (status in ('pending','approved','partial','rejected','escalated')),
  storage_version int not null default 1,
  original_packet jsonb not null,
  projected_packet jsonb not null,
  batch jsonb not null,
  scoring jsonb not null,
  decision jsonb not null,
  review jsonb not null,
  lifecycle_events jsonb not null,
  created_at timestamptz not null default now()
);

create unique index uq_proof_review_records_artifact_id
  on proof_review_records (artifact_id) where artifact_id is not null;

create unique index uq_proof_review_records_packet_id
  on proof_review_records (packet_id) where packet_id is not null;
```

## Supabase migration path (later PR)

1. Keep `ProofReviewStoredRecordV1` as the canonical document/row shape
2. Add an async store adapter in a separate API/service package
3. Bulk import `{baseDir}/records/*.json` with `insert ... on conflict do nothing`
4. Leave `ProofReviewService` unchanged until an explicit async service PR

## Out of scope (PR4)

- SQLite, Supabase client, Postgres migrations
- HTTP routes
- Wallet, settlement, trust mutation
- Async store interface
- Update/delete/re-review APIs
- Encryption at rest, retention, backup automation
