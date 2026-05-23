# POPS backend reference (read-only)

PR1 does **not** copy or run the preservation backend.

## Pointer

**Root:** `integrations/old-source-preservation/ivault-eye-tracking/snapshot/services/api/src/pops/`

| File | Role |
|------|------|
| `types/pops.types.ts` | `PopsSession`, `PopsSignalBatch` |
| `services/pops-scoring.service.ts` | Backend scoring authority |
| `../server/pops/routes/pops-event.routes.ts` | Ingest routes (deferred) |
| `../server/pops/POPS_EVENT_INGESTION_API_EXAMPLES.md` | Example payloads |

## PR1 boundary

- Mapping table: [`../mappings/pops-signal-batch-to-v0.md`](../mappings/pops-signal-batch-to-v0.md)
- No HTTP ingest, no DB migrations, no wallet hooks
