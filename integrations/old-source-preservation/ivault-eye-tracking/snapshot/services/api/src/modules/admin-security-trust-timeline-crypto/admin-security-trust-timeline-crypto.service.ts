import { supabaseAdmin } from "../../config/supabase";

export async function listTimelineChains(input: {
  limit?: number;
  status?: string;
  chainScope?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_timeline_chain_dashboard")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.chainScope) query = query.eq("chain_scope", input.chainScope);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTimelineChainEntries(input: {
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_timeline_chain_entry_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function listTimelineCheckpoints(input: {
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_timeline_chain_checkpoint_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function listTimelineMerkleBatches(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_timeline_merkle_batch_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTimelineAnchors(input: {
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_timeline_anchor_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function getTimelineCryptoIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_timeline_crypto_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function chainTimelineEvent(input: {
  timelineEventId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("chain_admin_security_trust_timeline_event", {
    p_timeline_event_id: input.timelineEventId,
    p_worker_id: "admin-api",
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    chainEntryId: String(data)
  };
}

export async function createTimelineCheckpoint(input: {
  chainId: string;
  checkpointType?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_trust_timeline_chain_checkpoint",
    {
      p_chain_id: input.chainId,
      p_checkpoint_type: input.checkpointType ?? "manual",
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    checkpointId: String(data)
  };
}

export async function buildMerkleBatch(input: {
  chainId: string;
  fromSequenceNumber: number;
  toSequenceNumber: number;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "build_admin_security_trust_timeline_merkle_batch",
    {
      p_chain_id: input.chainId,
      p_from_sequence_number: input.fromSequenceNumber,
      p_to_sequence_number: input.toSequenceNumber,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    merkleBatchId: String(data)
  };
}

export async function createTimelineAnchor(input: {
  chainId?: string;
  checkpointId?: string;
  merkleBatchId?: string;
  anchorType?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc("create_admin_security_trust_timeline_anchor", {
    p_chain_id: input.chainId ?? null,
    p_checkpoint_id: input.checkpointId ?? null,
    p_merkle_batch_id: input.merkleBatchId ?? null,
    p_anchor_type: input.anchorType ?? "internal",
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    anchorId: String(data)
  };
}

export async function verifyTimelineChain(input: {
  chainId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc("verify_admin_security_trust_timeline_chain", {
    p_chain_id: input.chainId
  });

  if (error) throw error;
  return data;
}

export async function verifyTimelineMerkleBatch(input: {
  merkleBatchId: string;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "verify_admin_security_trust_timeline_merkle_batch",
    {
      p_merkle_batch_id: input.merkleBatchId
    }
  );

  if (error) throw error;
  return data;
}
