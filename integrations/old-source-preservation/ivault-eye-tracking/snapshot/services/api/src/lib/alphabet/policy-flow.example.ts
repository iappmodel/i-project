import {
  createPolicyCheck,
  evaluateStoredPolicyCheck
} from "./policy-store";
import {
  applyTrustImpactEventToUser,
  getOrCreateTrustScore
} from "./trust-store";
import {
  applyUValueImpactEventToUser,
  getOrCreateUValueState
} from "./u-value-store";
import {
  createTrustEventFromPolicyDecision,
  createUValueEventFromPolicyDecision
} from "./policy-event-factory";

const userId = crypto.randomUUID();

const check = createPolicyCheck({
  userId,
  ageBand: "13_15",
  userRole: "teen",
  context: "conversion",
  actionType: "convert_available_coin_to_icoin",
  riskCategory: "financial",
  region: "US",
  countryCode: "US"
});

const policyResult = evaluateStoredPolicyCheck({
  policyCheckId: check.policyCheckId,
  guardianApproved: true,
  schoolApproved: false,
  businessApproved: false,
  kycStatus: "not_required",
  taxProfileStatus: "not_required",
  complianceStatus: "clear",
  trustScore: 55,
  uValueScore: 10,
  safetyRisk: 0.02,
  financialRisk: 0.05,
  privacyRisk: 0.02,
  contentRisk: 0.01,
  locationRisk: 0.02,
  messagingRisk: 0.02,
  laborRisk: 0.02,
  identityRisk: 0.02,
  regionRestricted: false,
  regionRequiresKyc: false,
  regionRequiresTaxProfile: false,
  regionRequiresGuardianForMinors: true
});

const trustEvent = createTrustEventFromPolicyDecision(policyResult);
if (trustEvent) applyTrustImpactEventToUser(trustEvent);

const uValueEvent = createUValueEventFromPolicyDecision(policyResult);
if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);

if (policyResult.blockAction) {
  console.log("Action blocked:", policyResult.reasons);
}

if (policyResult.requireReview) {
  console.log("Action requires review:", policyResult.reasons);
}

if (policyResult.allowAction) {
  console.log("Action allowed with flags:", {
    requireGuardian: policyResult.requireGuardian,
    restrictWithdrawal: policyResult.restrictWithdrawal,
    restrictMessaging: policyResult.restrictMessaging,
    restrictLocalPresence: policyResult.restrictLocalPresence
  });
}

console.log("Policy:");
console.log(JSON.stringify(policyResult, null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
