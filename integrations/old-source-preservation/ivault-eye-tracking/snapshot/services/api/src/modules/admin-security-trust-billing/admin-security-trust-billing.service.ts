import { supabaseAdmin } from "../../config/supabase";
import type { z } from "zod";
import type {
  createInvoiceFromPeriodSchema,
  createTrustBillingAccountSchema,
  entitlementCheckSchema,
  finalizeBillingPeriodSchema,
  recordUsageSchema,
  trustBillingQuerySchema
} from "./admin-security-trust-billing.validation";

export type TrustBillingQuery = z.infer<typeof trustBillingQuerySchema>;
export type CreateTrustBillingAccountBody = z.infer<typeof createTrustBillingAccountSchema>;
export type EntitlementCheckBody = z.infer<typeof entitlementCheckSchema>;
export type RecordUsageBody = z.infer<typeof recordUsageSchema>;
export type FinalizeBillingPeriodBody = z.infer<typeof finalizeBillingPeriodSchema>;
export type CreateInvoiceFromPeriodBody = z.infer<typeof createInvoiceFromPeriodSchema>;

export async function listTrustBillingPlans(input: TrustBillingQuery) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_billing_plans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.planCode) query = query.eq("plan_code", input.planCode);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTrustBillingAccounts(input: TrustBillingQuery) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_billing_account_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.customerName) query = query.eq("customer_name", input.customerName);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTrustEntitlements(input: TrustBillingQuery) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_customer_trust_entitlement_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.customerName) query = query.eq("customer_name", input.customerName);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTrustUsageRollups(input: TrustBillingQuery) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_usage_rollup_dashboard")
    .select("*")
    .order("billing_period_start", { ascending: false })
    .limit(safeLimit);

  if (input.customerName) query = query.eq("customer_name", input.customerName);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listTrustInvoices(input: TrustBillingQuery) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_trust_invoice_dashboard")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.status) query = query.eq("status", input.status);
  if (input.customerName) query = query.eq("customer_name", input.customerName);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getTrustBillingIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_trust_billing_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

type CreateTrustBillingAccountInput = CreateTrustBillingAccountBody & {
  adminAuthUserId: string;
  requestId: string;
};

export async function createTrustBillingAccount(input: CreateTrustBillingAccountInput) {
  const { data, error } = await supabaseAdmin.rpc("create_admin_security_trust_billing_account", {
    p_admin_auth_user_id: input.adminAuthUserId,
    p_customer_name: input.customerName,
    p_customer_domain: input.customerDomain ?? null,
    p_plan_code: input.planCode,
    p_billing_email: input.billingEmail ?? null,
    p_billing_contact_name: input.billingContactName ?? null,
    p_billing_cycle: input.billingCycle ?? "monthly",
    p_external_customer_id: input.externalCustomerId ?? null,
    p_external_subscription_id: input.externalSubscriptionId ?? null,
    p_external_payment_provider: input.externalPaymentProvider ?? null,
    p_trial_ends_at: input.trialEndsAt ? new Date(input.trialEndsAt).toISOString() : null,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    billingAccountId: String(data)
  };
}

type EntitlementCheckInput = EntitlementCheckBody & { requestId: string };

export async function checkTrustEntitlement(input: EntitlementCheckInput) {
  const { data, error } = await supabaseAdmin.rpc("check_admin_security_trust_entitlement", {
    p_customer_name: input.customerName,
    p_customer_domain: input.customerDomain ?? null,
    p_feature: input.feature ?? null,
    p_meter_name: input.meterName ?? null,
    p_requested_quantity: input.requestedQuantity ?? 1,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;
  return data;
}

type RecordUsageInput = RecordUsageBody & { requestId: string };

export async function recordTrustUsage(input: RecordUsageInput) {
  const { data, error } = await supabaseAdmin.rpc("record_admin_security_trust_usage_meter_event", {
    p_customer_name: input.customerName,
    p_customer_domain: input.customerDomain ?? null,
    p_meter_name: input.meterName,
    p_meter_category: input.meterCategory,
    p_quantity: input.quantity ?? 1,
    p_source_type: input.sourceType ?? "manual",
    p_source_id: input.sourceId ?? null,
    p_source_key: input.sourceKey ?? null,
    p_private_room_id: input.privateRoomId ?? null,
    p_proof_type: input.proofType ?? null,
    p_proof_key: input.proofKey ?? null,
    p_occurred_at: input.occurredAt ? new Date(input.occurredAt).toISOString() : new Date().toISOString(),
    p_dedupe_key: input.dedupeKey ?? null,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    usageEventId: String(data)
  };
}

export async function refreshUsageRollups() {
  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

  const { data, error } = await supabaseAdmin.rpc("refresh_admin_security_trust_usage_rollups", {
    p_period_start: start.toISOString(),
    p_period_end: end.toISOString(),
    p_batch_size: 5000,
    p_worker_id: "admin-api",
    p_metadata: { source: "admin-api" }
  });

  if (error) throw error;
  return data;
}

export async function processBillingCycle(input: { requestId: string }) {
  const { data, error } = await supabaseAdmin.rpc("process_admin_security_trust_billing_cycle", {
    p_worker_id: "admin-api",
    p_request_id: input.requestId,
    p_metadata: { source: "admin-api" }
  });

  if (error) throw error;
  return data;
}

type FinalizeBillingPeriodInput = FinalizeBillingPeriodBody & { requestId: string };

export async function finalizeBillingPeriod(input: FinalizeBillingPeriodInput) {
  const { data, error } = await supabaseAdmin.rpc("finalize_admin_security_trust_billing_period", {
    p_billing_period_id: input.billingPeriodId,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    billingPeriodId: String(data),
    status: "finalized"
  };
}

type CreateInvoiceFromPeriodInput = CreateInvoiceFromPeriodBody & { requestId: string };

export async function createInvoiceFromPeriod(input: CreateInvoiceFromPeriodInput) {
  const { data, error } = await supabaseAdmin.rpc("create_admin_security_trust_invoice_from_period", {
    p_billing_period_id: input.billingPeriodId,
    p_due_days: input.dueDays ?? 30,
    p_request_id: input.requestId,
    p_metadata: input.metadata ?? {}
  });

  if (error) throw error;

  return {
    invoiceId: String(data)
  };
}
