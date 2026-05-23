# PP-000001 acceptance checklist (PR1)

- [x] `integrations/pop-core/fixtures/PP-000001.json` exists
- [x] Validates against `proof_packet_v0.schema.json` (required fields + status)
- [x] `packetVersion` = `"0"`
- [x] `review.status` = `"pending"`
- [x] No wallet mutation code added
- [x] No backend HTTP ingest added
- [x] No settlement code added
- [x] flutter-runtime owns signal collection + emission
- [x] pop-core owns `ProofPacketV0` contract (`pop_core` package)
