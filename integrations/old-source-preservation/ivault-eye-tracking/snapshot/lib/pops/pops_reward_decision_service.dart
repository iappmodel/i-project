import 'package:eye_tracking_app/core/events/presence_event.dart';

import 'pops_models.dart';
import 'pops_state_machine.dart';

/// Produces stage-1 decisions from P.O.P.S score outputs.
final class PopsRewardDecisionService {
  const PopsRewardDecisionService({
    this.minimumPresence = 0.55,
    this.minimumAttention = 0.50,
    this.minimumIntent = 0.55,
    this.minimumContinuity = 0.50,
    this.fraudHoldThreshold = 0.65,
    this.fraudDenyThreshold = 0.85,
    this.stateMachine = const PopsStateMachine(),
  });

  final double minimumPresence;
  final double minimumAttention;
  final double minimumIntent;
  final double minimumContinuity;
  final double fraudHoldThreshold;
  final double fraudDenyThreshold;
  final PopsStateMachine stateMachine;

  PopsDecisionResult decide({
    required PopsVerificationScore score,
    required PopsSessionState currentState,
  }) {
    if (score.fraudRisk >= fraudDenyThreshold) {
      return PopsDecisionResult(
        decisionType: PresenceDecisionType.flagFraud,
        sessionState: stateMachine.transition(
          current: currentState,
          degradeConfidence: true,
          requireReverification: true,
          hardDeny: true,
          completed: false,
        ),
        rewardEligibility: false,
        trustImpact: -0.12,
        recommendedAction: 'deny_reward_and_queue_fraud_review',
      );
    }

    final belowConfidence = score.presenceConfidence < minimumPresence ||
        score.attentionConfidence < minimumAttention ||
        score.intentConfidence < minimumIntent ||
        score.continuityConfidence < minimumContinuity;

    if (score.fraudRisk >= fraudHoldThreshold || belowConfidence) {
      return PopsDecisionResult(
        decisionType: score.fraudRisk >= fraudHoldThreshold
            ? PresenceDecisionType.holdReward
            : PresenceDecisionType.requireInteraction,
        sessionState: stateMachine.transition(
          current: currentState,
          degradeConfidence: true,
          requireReverification: true,
          hardDeny: false,
          completed: false,
        ),
        rewardEligibility: false,
        trustImpact: -0.03,
        recommendedAction: 'pause_and_reverify',
      );
    }

    return PopsDecisionResult(
      decisionType: PresenceDecisionType.approveReward,
      sessionState: stateMachine.transition(
        current: currentState,
        degradeConfidence: false,
        requireReverification: false,
        hardDeny: false,
        completed: true,
      ),
      rewardEligibility: true,
      trustImpact: 0.02,
      recommendedAction: 'issue_reward_and_continue_tracking',
    );
  }
}
