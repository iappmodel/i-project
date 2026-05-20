import { describe, expect, it } from "vitest";
import { buildSystemObjectGraph } from "../system-object-graph";

describe("system-object-graph", () => {
  it("links ledger to execution request", () => {
    const graph = buildSystemObjectGraph({
      ledgers: [
        {
          ledger_entry_id: "ledger_1",
          wallet_id: "wallet_1",
          direction: "credit",
          amount: 10,
          coin_code: "I",
          ledger_status: "posted",
          source_type: "execution_request",
          source_object_id: "exec_1",
          created_at: new Date().toISOString()
        }
      ],
      executions: [
        {
          execution_request_id: "exec_1",
          handler_name: "wallet.credit",
          status: "execution_completed",
          created_at: new Date().toISOString()
        }
      ],
      policies: [],
      pipelines: [],
      sagas: [],
      transfers: [],
      reconciliations: [],
      compensations: [],
      reviews: [],
      audits: [],
      notifications: [],
      events: []
    });

    expect(graph.nodes.some((node) => node.objectId === "ledger_1")).toBe(true);
    expect(graph.edges.some((edge) => edge.relationType === "caused_by")).toBe(true);
  });
});
