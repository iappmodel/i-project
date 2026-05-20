import { describe, expect, it } from "vitest";
import { buildSystemTimelineResult } from "../system-timeline-engine";

describe("system-timeline-engine", () => {
  it("detects provider unknown without review", () => {
    const result = buildSystemTimelineResult({
      input: {
        root: {
          objectType: "external_transfer",
          objectId: "transfer_1"
        },
        includeRawPayloads: false,
        includeServiceOnly: false,
        maxDepth: 2,
        maxEntries: 100,
        now: new Date().toISOString()
      },
      nodes: [],
      edges: [],
      entries: [],
      rows: {
        ledgers: [],
        transfers: [
          {
            external_transfer_id: "transfer_1",
            status: "provider_unknown"
          }
        ],
        compensations: [],
        reconciliations: [],
        reviews: [],
        executions: []
      }
    });

    expect(
      result.anomalies.some((anomaly) => anomaly.anomalyType === "provider_unknown_without_review")
    ).toBe(true);
  });
});
