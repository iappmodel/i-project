import { supabaseAdmin } from "../../config/supabase";

type TrustDependencyInput = {
  relationshipType: string;
  dependencyStrength?: string;
  parentSourceType: string;
  parentSourceId: string;
  childSourceType: string;
  childSourceId: string;
  parentArtifactKey?: string;
  childArtifactKey?: string;
  parentTitle?: string;
  childTitle?: string;
  customerName?: string;
  customerDomain?: string;
  impactOnParentChange?: string;
  impactOnParentRevocation?: string;
  impactOnParentDeletion?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

type ImpactAnalysisInput = {
  adminAuthUserId: string;
  sourceType: string;
  sourceId: string;
  analysisType: string;
  requestedAction: string;
  maxDepth?: number;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

export async function listTrustDependencies(input: {
  limit?: number;
  status?: string;
  parentSourceType?: string;
  childSourceType?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_artifact_dependency_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.parentSourceType) query = query.eq("parent_source_type", input.parentSourceType);
  if (input.childSourceType) query = query.eq("child_source_type", input.childSourceType);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listImpactAnalyses(input: { limit?: number }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_artifact_impact_analysis_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function listPropagationEvents(input: { limit?: number; status?: string }) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_artifact_propagation_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getTrustDependencyIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_artifact_dependency_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertTrustDependency(input: TrustDependencyInput) {
  const { data, error } = await supabaseAdmin.rpc(
    "upsert_admin_security_trust_artifact_dependency",
    {
      p_relationship_type: input.relationshipType,
      p_dependency_strength: input.dependencyStrength ?? "strong",
      p_parent_source_type: input.parentSourceType,
      p_parent_source_id: input.parentSourceId,
      p_child_source_type: input.childSourceType,
      p_child_source_id: input.childSourceId,
      p_parent_artifact_key: input.parentArtifactKey ?? null,
      p_child_artifact_key: input.childArtifactKey ?? null,
      p_parent_title: input.parentTitle ?? null,
      p_child_title: input.childTitle ?? null,
      p_customer_name: input.customerName ?? null,
      p_customer_domain: input.customerDomain ?? null,
      p_impact_on_parent_change: input.impactOnParentChange ?? "review_required",
      p_impact_on_parent_revocation: input.impactOnParentRevocation ?? "child_review_required",
      p_impact_on_parent_deletion: input.impactOnParentDeletion ?? "block_child_or_delete_child",
      p_discovered_by: "admin-api",
      p_request_id: input.requestId ?? null,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    trustArtifactDependencyId: String(data)
  };
}

export async function runTrustDependencyDiscovery(input: {
  batchSize?: number;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "discover_admin_security_trust_artifact_dependencies",
    {
      p_batch_size: input.batchSize ?? 1000,
      p_worker_id: "admin-api",
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    runId: String(data)
  };
}

export async function runImpactAnalysis(input: ImpactAnalysisInput) {
  const { data, error } = await supabaseAdmin.rpc(
    "analyze_admin_security_trust_artifact_impact",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_source_type: input.sourceType,
      p_source_id: input.sourceId,
      p_analysis_type: input.analysisType,
      p_requested_action: input.requestedAction,
      p_max_depth: input.maxDepth ?? 5,
      p_request_id: input.requestId ?? null,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    impactAnalysisId: String(data)
  };
}

export async function processPropagationEvents(input: {
  batchSize?: number;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "process_admin_security_trust_artifact_propagation_events",
    {
      p_batch_size: input.batchSize ?? 100,
      p_worker_id: "admin-api",
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    runId: String(data)
  };
}
