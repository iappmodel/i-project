import { supabaseAdmin } from "../../config/supabase";

export async function listRetentionPolicies() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_retention_policies")
    .select("*")
    .eq("status", "active")
    .order("source_type", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getArchiveIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_archive_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listArchiveManifests(input: {
  limit?: number;
  sourceType?: string;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_archive_manifest_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.sourceType) {
    query = query.eq("source_type", input.sourceType);
  }

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createArchiveManifest(input: {
  adminAuthUserId: string;
  sourceType: string;
  periodStart: string;
  periodEnd: string;
  storageProvider?: string;
  storageUri?: string;
  checksumSha256?: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "create_admin_security_archive_manifest",
    {
      p_source_type: input.sourceType,
      p_period_start: input.periodStart,
      p_period_end: input.periodEnd,
      p_storage_provider: input.storageProvider ?? "external_archive_stub",
      p_storage_uri: input.storageUri ?? null,
      p_checksum_sha256: input.checksumSha256 ?? null,
      p_created_by_auth_user_id: input.adminAuthUserId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityArchiveManifestId: String(data)
  };
}

export async function sealArchiveManifest(input: {
  adminAuthUserId: string;
  manifestId: string;
  storageUri: string;
  checksumSha256: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "seal_admin_security_archive_manifest",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_manifest_id: input.manifestId,
      p_storage_uri: input.storageUri,
      p_checksum_sha256: input.checksumSha256,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityArchiveManifestId: String(data),
    status: "sealed"
  };
}

export async function verifyArchiveManifest(input: {
  adminAuthUserId: string;
  manifestId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "verify_admin_security_archive_manifest",
    {
      p_admin_auth_user_id: input.adminAuthUserId,
      p_manifest_id: input.manifestId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityArchiveManifestId: String(data),
    status: "verified"
  };
}

export async function listArchiveCandidates(input: {
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 500);

  const { data, error } = await supabaseAdmin
    .from("admin_security_archive_candidates")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function listDeletionCandidates(input: {
  limit?: number;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 500);

  const { data, error } = await supabaseAdmin
    .from("admin_security_deletion_candidates")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(safeLimit);

  if (error) throw error;
  return data ?? [];
}

export async function enqueueArchiveExportJob(input: {
  manifestId: string;
  storageProvider: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "enqueue_admin_security_archive_export_job",
    {
      p_archive_manifest_id: input.manifestId,
      p_storage_provider: input.storageProvider,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityArchiveExportJobId: String(data)
  };
}

export async function listArchiveExportJobs(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_archive_export_job_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getArchiveExportIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_archive_export_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function enqueueArchiveVerificationJob(input: {
  manifestId: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabaseAdmin.rpc(
    "enqueue_admin_security_archive_verification_job",
    {
      p_archive_manifest_id: input.manifestId,
      p_request_id: input.requestId,
      p_metadata: input.metadata ?? {}
    }
  );

  if (error) throw error;

  return {
    adminSecurityArchiveVerificationJobId: String(data)
  };
}

export async function listArchiveVerificationJobs(input: {
  limit?: number;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_archive_verification_job_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) {
    query = query.eq("status", input.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getArchiveVerificationIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_archive_verification_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}
