/// Rule 7 — governance: every reward, trust, and fraud decision records which
/// policy bundle produced it. Published versions are append-only (see
/// [AdminPolicyVersion] / admin console); this id is the stable wire key.
///
/// Use [kBootstrapPolicyVersionId] only when no admin-published version applies
/// (tests, greenfield); production paths should pass the current published id.
///
/// **Mandatory `policyVersion` on wire payloads** (audit / replay must know
/// which rules produced each financial or trust-adjacent decision):
///
/// - `attention.verification.created`, `attention.verification.rejected`
/// - `reward.decision.approved`, `reward.decision.rejected`, `reward.decision.held`
/// - `trust.score.updated`
/// - `fraud.flag.created`
/// - `withdrawal.approved`, `withdrawal.rejected`
/// - `admin.campaign.approved` (control plane)
/// - `campaign.approved` (campaign lifecycle §8; distinct from admin mirror)
const String kBootstrapPolicyVersionId = 'policy-bootstrap-v1';
