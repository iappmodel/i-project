/**
 * [ i ] Studio Stage 8 — lightweight validators (no external deps). Never trust client for economics.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function ok(warnings: string[] = []): ValidationResult {
  return { valid: true, errors: [], warnings };
}

function fail(errors: string[], warnings: string[] = []): ValidationResult {
  return { valid: false, errors, warnings };
}

export function validateProjectDraft(project: { title?: string } | null | undefined): ValidationResult {
  if (!project) return fail(["Project draft is required"]);
  if (!project.title || project.title.trim().length < 1) return fail(["Title is required"]);
  return ok();
}

export function validateAsset(asset: { id?: string; uri?: string } | null | undefined): ValidationResult {
  if (!asset?.id) return fail(["Asset id required"]);
  if (!asset.uri) return fail(["Asset URI required"]);
  return ok();
}

export function validateTimeline(tracks: unknown[] | null | undefined): ValidationResult {
  if (!Array.isArray(tracks)) return fail(["Tracks must be an array"]);
  if (tracks.length === 0) return ok(["Timeline is empty"]);
  return ok();
}

export function validateMagicReveal(reveal: { id?: string; description?: string } | null | undefined): ValidationResult {
  if (!reveal?.id) return fail(["Magic reveal id required"]);
  if (!reveal.description || reveal.description.trim().length < 3) return ok(["Magic description is short — review before publish"]);
  return ok();
}

export function validatePostPackage(pkg: { id?: string; hash?: string } | null | undefined): ValidationResult {
  if (!pkg?.id) return fail(["Post package id required"]);
  if (!pkg.hash) return ok(["Package hash should be server-signed in production"]);
  return ok();
}

export function validateCampaign(campaign: { id?: string; budgetMinor?: number } | null | undefined): ValidationResult {
  if (!campaign?.id) return fail(["Campaign id required"]);
  if (typeof campaign.budgetMinor === "number" && campaign.budgetMinor < 0) return fail(["Budget cannot be negative on client"]);
  return ok(["Campaign budget caps are server authoritative"]);
}

export function validateLedgerEntryRequest(req: { amountMinor?: number; clientSuppliedBalance?: number } | null | undefined): ValidationResult {
  if (!req) return fail(["Ledger request required"]);
  if (typeof req.amountMinor !== "number") return fail(["amountMinor must be server-computed in production"]);
  if (typeof req.clientSuppliedBalance === "number") return fail(["Do not trust client-supplied balances"]);
  return ok();
}

export function validateUnlockRequest(req: { clientDecided?: boolean } | null | undefined): ValidationResult {
  if (!req) return fail(["Unlock request required"]);
  if (req.clientDecided) return fail(["Unlock must be server-decided"]);
  return ok();
}

export function validateVerificationRequest(req: { clientMarkedPassed?: boolean } | null | undefined): ValidationResult {
  if (!req) return fail(["Verification request required"]);
  if (req.clientMarkedPassed) return fail(["Verification pass cannot be asserted by client"]);
  return ok();
}

export function validateDisputeRequest(req: { evidence?: unknown[] } | null | undefined): ValidationResult {
  if (!req) return fail(["Dispute request required"]);
  if (!Array.isArray(req.evidence)) return ok(["Evidence should be uploaded server-side"]);
  return ok();
}

export function validatePublishRequest(req: { safetyPassedClient?: boolean; blocked?: boolean } | null | undefined): ValidationResult {
  if (!req) return fail(["Publish request required"]);
  if (req.blocked) return fail(["Blocked posts cannot publish"]);
  if (req.safetyPassedClient) return fail(["Safety pass must not be client-supplied in production"]);
  return ok();
}
