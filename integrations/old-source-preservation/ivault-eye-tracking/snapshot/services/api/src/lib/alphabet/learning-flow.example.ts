import {
  completeLearningSession,
  startLearningSession,
  updateLearningSessionProgress,
  verifyStoredLearningSession
} from "./learning-session-store";
import { issueRewardFromVerifiedEvent } from "./reward-issuance-engine";
import { applyRewardIssuanceResult, calculateWalletSummary, createWallet } from "./wallet-store";
import { applyTrustImpactEventToUser, getOrCreateTrustScore } from "./trust-store";
import { applyUValueImpactEventToUser, getOrCreateUValueState } from "./u-value-store";
import {
  createTrustEventFromLearningVerification,
  createUValueEventFromLearningVerification
} from "./learning-event-factory";
import { createTrustEventFromRewardResult } from "./trust-event-factory";
import { createUValueEventFromRewardResult } from "./u-value-event-factory";

const userId = crypto.randomUUID();
const wallet = createWallet(userId);

const session = startLearningSession({
  userId,
  context: "iearn",
  lessonId: crypto.randomUUID(),
  courseId: crypto.randomUUID(),
  requiredDurationMs: 10 * 60 * 1000,
  ageBand: "18_plus"
});

updateLearningSessionProgress({
  learningSessionId: session.learningSessionId,
  watchedDurationMs: 10 * 60 * 1000
});

completeLearningSession(session.learningSessionId);

const learningResult = verifyStoredLearningSession({
  learningSessionId: session.learningSessionId,
  attentionScore: 0.9,
  focusScore: 0.85,
  focusMultiplier: 1.1,
  quizScore: 0.9,
  quizQuestionCount: 10,
  quizCorrectCount: 9,
  recallScore: 0.85,
  recallDelayHours: 24,
  applicationScore: 0.8,
  practiceCompletionScore: 0.85,
  explanationQualityScore: 0.8,
  cheatingRisk: 0.03,
  aiAnswerRisk: 0.03,
  answerCopyRisk: 0.02,
  velocityRisk: 0.04,
  deviceIntegrityScore: 0.9
});

const learningTrustEvent = createTrustEventFromLearningVerification(learningResult);
if (learningTrustEvent) applyTrustImpactEventToUser(learningTrustEvent);

const learningUValueEvent = createUValueEventFromLearningVerification(learningResult);
if (learningUValueEvent) applyUValueImpactEventToUser(learningUValueEvent);

const trustState = getOrCreateTrustScore(userId);

if (learningResult.learningEvent) {
  const lCoinReward = issueRewardFromVerifiedEvent({
    walletId: wallet.walletId,
    context: {
      event: learningResult.learningEvent,
      trustScore: trustState.trustScore,
      trustTier: trustState.trustTier,
      qualityScore: learningResult.qualityScore,
      riskScore: learningResult.riskScore,
      ageBand: "18_plus",
      hasBudgetSource: false
    }
  });

  applyRewardIssuanceResult(lCoinReward);

  const trustEvent = createTrustEventFromRewardResult(lCoinReward);
  if (trustEvent) applyTrustImpactEventToUser(trustEvent);

  const uValueEvent = createUValueEventFromRewardResult(lCoinReward);
  if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);
}

if (learningResult.knowledgeEvent) {
  const kCoinReward = issueRewardFromVerifiedEvent({
    walletId: wallet.walletId,
    context: {
      event: learningResult.knowledgeEvent,
      trustScore: trustState.trustScore,
      trustTier: trustState.trustTier,
      qualityScore: learningResult.qualityScore,
      riskScore: learningResult.riskScore,
      ageBand: "18_plus",
      hasBudgetSource: false
    }
  });

  applyRewardIssuanceResult(kCoinReward);

  const trustEvent = createTrustEventFromRewardResult(kCoinReward);
  if (trustEvent) applyTrustImpactEventToUser(trustEvent);

  const uValueEvent = createUValueEventFromRewardResult(kCoinReward);
  if (uValueEvent) applyUValueImpactEventToUser(uValueEvent);
}

console.log("Learning verification:");
console.log(JSON.stringify(learningResult, null, 2));

console.log("Wallet:");
console.log(JSON.stringify(calculateWalletSummary(wallet.walletId), null, 2));

console.log("Trust:");
console.log(JSON.stringify(getOrCreateTrustScore(userId), null, 2));

console.log("U Value:");
console.log(JSON.stringify(getOrCreateUValueState(userId), null, 2));
