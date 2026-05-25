import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { fromStoredPendingHoldRecord, type PendingHoldRecord } from "@pop-core/backend";

import { mapPopCurrencyToLedger } from "./supabase-settlement.js";

export interface LocalHoldApiRow {
  session_id: string;
  user_id: string | null;
  local_user_ref: string;
  offer_id: string;
  content_id: string;
  artifact_id: string | null;
  review_status: string;
  amount: number;
  currency: string;
  hold_status: "pending" | "settled" | "cancelled";
  release_status: string;
  ledger_ref_id: string | null;
  settled_at: string | null;
  created_at: string;
}

export interface LocalSettlementRecord {
  sessionId: string;
  holdStatus: "settled";
  settledAt: string;
  settlementMode: "demo";
  walletCreditAmount: number;
  currency: string;
}

function holdsDir(dataDir: string): string {
  return join(dataDir, "pending-holds", "records");
}

function settlementsDir(dataDir: string): string {
  const dir = join(dataDir, "settlements");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function readSettlement(dataDir: string, sessionId: string): LocalSettlementRecord | null {
  const path = join(settlementsDir(dataDir), `${sessionId}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8")) as LocalSettlementRecord;
}

function recordToApiRow(
  record: PendingHoldRecord,
  settlement: LocalSettlementRecord | null
): LocalHoldApiRow {
  const currency = mapPopCurrencyToLedger(record.amountBreakdown?.currency);
  const settled = settlement?.holdStatus === "settled";

  return {
    session_id: record.sessionId,
    user_id: record.userId ?? null,
    local_user_ref: record.localUserRef,
    offer_id: record.offerId,
    content_id: record.contentId,
    artifact_id: record.artifactId ?? null,
    review_status: record.reviewAudit.reviewStatus,
    amount: record.amount ?? 0,
    currency,
    hold_status: settled ? "settled" : "pending",
    release_status: settled ? "released" : record.releaseStatus,
    ledger_ref_id: settled ? `pop_hold_${record.sessionId}` : null,
    settled_at: settlement?.settledAt ?? null,
    created_at: record.createdAt
  };
}

function readHoldRecord(dataDir: string, sessionId: string): PendingHoldRecord | null {
  const path = join(holdsDir(dataDir), `${sessionId}.json`);
  if (!existsSync(path)) return null;
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  return fromStoredPendingHoldRecord(parsed);
}

export function listLocalPendingHolds(
  dataDir: string,
  localUserRef: string
): LocalHoldApiRow[] {
  const dir = holdsDir(dataDir);
  if (!existsSync(dir)) return [];

  const rows: LocalHoldApiRow[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json")) continue;
    const sessionId = file.replace(/\.json$/, "");
    const record = readHoldRecord(dataDir, sessionId);
    if (!record || record.localUserRef !== localUserRef) continue;
    rows.push(recordToApiRow(record, readSettlement(dataDir, sessionId)));
  }

  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getLocalPendingHold(
  dataDir: string,
  sessionId: string
): LocalHoldApiRow | null {
  const record = readHoldRecord(dataDir, sessionId);
  if (!record) return null;
  return recordToApiRow(record, readSettlement(dataDir, sessionId));
}

export function settleLocalHoldDemo(dataDir: string, sessionId: string): LocalHoldApiRow {
  const record = readHoldRecord(dataDir, sessionId);
  if (!record) {
    throw new Error("hold_not_found");
  }

  const existing = readSettlement(dataDir, sessionId);
  if (existing) {
    return recordToApiRow(record, existing);
  }

  if (record.reviewAudit.reviewStatus !== "approved" &&
      record.reviewAudit.reviewStatus !== "partial") {
    throw new Error(`review_not_settlement_eligible:${record.reviewAudit.reviewStatus}`);
  }

  const currency = mapPopCurrencyToLedger(record.amountBreakdown?.currency);
  const settlement: LocalSettlementRecord = {
    sessionId,
    holdStatus: "settled",
    settledAt: new Date().toISOString(),
    settlementMode: "demo",
    walletCreditAmount: record.amount ?? 0,
    currency
  };

  writeFileSync(
    join(settlementsDir(dataDir), `${sessionId}.json`),
    `${JSON.stringify(settlement, null, 2)}\n`,
    "utf8"
  );

  return recordToApiRow(record, settlement);
}
