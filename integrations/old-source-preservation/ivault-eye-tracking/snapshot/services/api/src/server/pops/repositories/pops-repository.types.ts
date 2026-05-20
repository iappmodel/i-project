export type PopsSessionRow = {
  id: string;
  user_id: string;
  device_id: string;
  content_id: string | null;
  campaign_id: string | null;
  session_type: string;
  proof_level: string;
  state: string;
  started_at: string;
  ended_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
};

export type PopsEventInsert = {
  session_id: string;
  user_id: string;
  event_id: string;
  event_type: string;
  source: string;
  client_timestamp_ms: number;
  payload: Record<string, unknown>;
  privacy_flags?: Record<string, unknown> | null;
};

export type PopsSignalBatchInsert = {
  session_id: string;
  user_id: string;
  batch_id: string;
  client_timestamp_ms: number;
  window_start_ms: number;
  window_end_ms: number;
  signals: Record<string, unknown>;
  privacy?: Record<string, unknown> | null;
};

export type PopsJudgmentInsert = Record<string, unknown>;
export type PopsRewardDecisionInsert = Record<string, unknown>;
export type PopsWalletIntentInsert = Record<string, unknown>;
export type PopsPrivacyReceiptInsert = Record<string, unknown>;

export interface PopsSessionRepository {
  createSession(input: Record<string, unknown>): Promise<PopsSessionRow>;
  getSessionById(sessionId: string): Promise<PopsSessionRow | null>;
  updateSessionState(
    sessionId: string,
    state: string,
    patch?: Record<string, unknown>
  ): Promise<PopsSessionRow>;
  closeSession(sessionId: string, patch?: Record<string, unknown>): Promise<PopsSessionRow>;
}

export interface PopsEventRepository {
  insertEventsDeduped(events: PopsEventInsert[]): Promise<{ inserted: number; deduped: number }>;
  getEventsBySession(sessionId: string): Promise<Array<Record<string, unknown>>>;
}

export interface PopsSignalBatchRepository {
  insertSignalBatchDeduped(
    batch: PopsSignalBatchInsert
  ): Promise<{ inserted: boolean; deduped: boolean }>;
  getSignalBatchesBySession(sessionId: string): Promise<Array<Record<string, unknown>>>;
}

export interface PopsJudgmentRepository {
  createJudgment(row: PopsJudgmentInsert): Promise<Record<string, unknown>>;
  getJudgmentBySession(sessionId: string): Promise<Record<string, unknown> | null>;
}

export interface PopsRewardDecisionRepository {
  createRewardDecision(row: PopsRewardDecisionInsert): Promise<Record<string, unknown>>;
  getRewardDecisionBySession(sessionId: string): Promise<Record<string, unknown> | null>;
}

export interface PopsWalletIntentRepository {
  createWalletIntent(row: PopsWalletIntentInsert): Promise<Record<string, unknown>>;
  getWalletIntentByRewardDecision(rewardDecisionId: string): Promise<Record<string, unknown> | null>;
}

export interface PopsPrivacyReceiptRepository {
  createPrivacyReceipt(row: PopsPrivacyReceiptInsert): Promise<Record<string, unknown>>;
  getPrivacyReceiptBySession(sessionId: string): Promise<Record<string, unknown> | null>;
}

export interface PopsCompletionTransaction {
  runInTransaction<T>(fn: () => Promise<T>): Promise<T>;
}
