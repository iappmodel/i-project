import type { PopsEconomicReconciliationRunResult } from "./pops-economic.types";

export interface PopsEconomicAuditEntry {
  id: string;
  runId: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  payloadJson: string;
  createdAt: string;
}

export interface PopsEconomicAuditSink {
  append(entry: PopsEconomicAuditEntry): Promise<void>;
}

/**
 * Persists reconciliation outcomes for compliance and brand reporting.
 * Demo default: in-memory sink; swap for Postgres append-only in production.
 */
export class PopsEconomicAuditService {
  constructor(private readonly sink: PopsEconomicAuditSink) {}

  async recordReconciliationRun(result: PopsEconomicReconciliationRunResult): Promise<void> {
    const createdAt = result.finishedAt;
    await this.sink.append({
      id: `pops_econ_audit_${crypto.randomUUID()}`,
      runId: result.runId,
      level: result.failedCount > 0 ? "WARN" : "INFO",
      message: `P.O.P.S economic reconciliation: matched=${result.matchedCount} failed=${result.failedCount} issues=${result.issues.length}`,
      payloadJson: JSON.stringify({
        range: result.range,
        matchedCount: result.matchedCount,
        failedCount: result.failedCount,
        issueCodes: result.issues.map((i) => i.code),
        recordIds: result.records.map((r) => r.id)
      }),
      createdAt
    });
  }
}

export class PopsInMemoryEconomicAuditSink implements PopsEconomicAuditSink {
  readonly entries: PopsEconomicAuditEntry[] = [];

  async append(entry: PopsEconomicAuditEntry): Promise<void> {
    this.entries.push(entry);
  }
}
