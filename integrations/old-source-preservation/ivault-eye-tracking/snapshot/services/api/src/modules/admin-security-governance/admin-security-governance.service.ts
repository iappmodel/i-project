import { supabaseAdmin } from "../../config/supabase";

export async function listGovernancePolicies(input: {
  limit?: number;
  category?: string;
  status?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 50, 1), 100);

  let query = supabaseAdmin
    .from("admin_security_governance_policy_dashboard")
    .select("*")
    .limit(safeLimit);

  if (input.category) query = query.eq("category", input.category);
  if (input.status) query = query.eq("status", input.status);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listGovernancePolicyRules(input: {
  limit?: number;
  category?: string;
  policyKey?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_governance_policy_rule_dashboard")
    .select("*")
    .limit(safeLimit);

  if (input.category) query = query.eq("category", input.category);
  if (input.policyKey) query = query.eq("policy_key", input.policyKey);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function listPolicyEvaluations(input: {
  limit?: number;
  policyKey?: string;
  evaluationStatus?: string;
}) {
  const safeLimit = Math.min(Math.max(input.limit ?? 100, 1), 250);

  let query = supabaseAdmin
    .from("admin_security_policy_evaluations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (input.policyKey) query = query.eq("policy_key", input.policyKey);
  if (input.evaluationStatus) query = query.eq("evaluation_status", input.evaluationStatus);

  const { data, error } = await query;
  if (error) throw error;

  return data ?? [];
}

export async function getGovernancePolicyIntegrity() {
  const { data, error } = await supabaseAdmin
    .from("admin_security_governance_policy_integrity")
    .select("*")
    .maybeSingle();

  if (error) throw error;

  return data;
}
