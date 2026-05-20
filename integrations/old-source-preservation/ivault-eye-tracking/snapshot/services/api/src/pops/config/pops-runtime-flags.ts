/**
 * Runtime feature flags for P.O.P.S API (process.env).
 * Defaults favor privacy-safe MVP: no visual presence, no raw media.
 */
function envBool(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(raw).toLowerCase());
}

export const popsRuntimeFlags = {
  enablePops: () => envBool("POPS_ENABLE", true),
  enableRewardDecisions: () => envBool("POPS_ENABLE_REWARD_DECISIONS", true),
  enableWalletPending: () => envBool("POPS_ENABLE_WALLET_PENDING", true),
  enablePrivacyReceipts: () => envBool("POPS_ENABLE_PRIVACY_RECEIPTS", true),
  enableTrustImpact: () => envBool("POPS_ENABLE_TRUST_IMPACT", true),
  enableVisualPresence: () => envBool("POPS_ENABLE_VISUAL_PRESENCE", false),
  enableStrictFraudMode: () => envBool("POPS_ENABLE_STRICT_FRAUD", false)
};
