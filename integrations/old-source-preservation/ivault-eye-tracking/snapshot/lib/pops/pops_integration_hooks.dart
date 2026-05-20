import 'package:eye_tracking_app/core/events/presence_event.dart';
import 'package:eye_tracking_app/core/system.dart';

import 'pops_models.dart';
import 'pops_privacy_receipt_service.dart';
import 'pops_reward_decision_service.dart';
import 'pops_scoring_service.dart';

/// Stage-1 orchestration hooks that bridge P.O.P.S decisions to existing engines.
final class PopsIntegrationHooks {
  const PopsIntegrationHooks({
    this.scoring = const PopsScoringService(),
    this.rewardDecision = const PopsRewardDecisionService(),
    this.privacyReceipt = const PopsPrivacyReceiptService(),
  });

  final PopsScoringService scoring;
  final PopsRewardDecisionService rewardDecision;
  final PopsPrivacyReceiptService privacyReceipt;

  PopsIntegrationResult evaluate({
    required PopsVerificationRequest request,
    required PopsSessionState currentState,
    required bool createPrivacyReceipt,
    required String receiptId,
  }) {
    final score = scoring.score(request.signals);
    final decision = rewardDecision.decide(
      score: score,
      currentState: currentState,
    );
    final receipt = createPrivacyReceipt
        ? privacyReceipt.create(
            receiptId: receiptId,
            verificationId: request.verificationId,
            userId: request.userId,
            sessionId: request.sessionId,
            now: request.createdAt,
            signals: request.signals,
          )
        : null;

    final createdAtIso = request.createdAt.toUtc().toIso8601String();
    System.bus.emit(
      PresenceVerificationScoredEvent(
        verificationId: request.verificationId,
        userId: request.userId,
        sessionId: request.sessionId,
        proofLevel: request.proofLevel,
        momentType: request.momentType,
        presenceConfidence: score.presenceConfidence,
        attentionConfidence: score.attentionConfidence,
        intentConfidence: score.intentConfidence,
        continuityConfidence: score.continuityConfidence,
        fraudRisk: score.fraudRisk,
        createdAt: createdAtIso,
      ),
    );
    System.bus.emit(
      PresenceDecisionProducedEvent(
        verificationId: request.verificationId,
        userId: request.userId,
        sessionId: request.sessionId,
        decisionType: decision.decisionType,
        rewardEligible: decision.rewardEligibility,
        trustImpactDelta: decision.trustImpact,
        createdAt: createdAtIso,
      ),
    );
    if (receipt != null) {
      System.bus.emit(
        PresencePrivacyReceiptCreatedEvent(
          receiptId: receipt.receiptId,
          verificationId: request.verificationId,
          userId: request.userId,
          sessionId: request.sessionId,
          createdAt: createdAtIso,
        ),
      );
    }

    return PopsIntegrationResult(
      score: score,
      decision: decision,
      privacyReceipt: receipt,
    );
  }
}

final class PopsIntegrationResult {
  const PopsIntegrationResult({
    required this.score,
    required this.decision,
    required this.privacyReceipt,
  });

  final PopsVerificationScore score;
  final PopsDecisionResult decision;
  final PopsPrivacyReceipt? privacyReceipt;
}
