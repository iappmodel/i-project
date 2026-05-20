import 'package:eye_tracking_app/core/events/presence_event.dart';
import 'package:eye_tracking_app/core/system.dart';
import 'package:eye_tracking_app/pops/pops_integration_hooks.dart';
import 'package:eye_tracking_app/pops/pops_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('P.O.P.S integration emits score, decision, and receipt events', () async {
    final hooks = PopsIntegrationHooks();
    final seen = <PresenceEvent>[];
    final sub = System.bus.presenceEvents.listen(seen.add);

    final now = DateTime.utc(2026, 4, 26, 22, 30);
    final result = hooks.evaluate(
      request: PopsVerificationRequest(
        verificationId: 'pv-1',
        userId: 'u-1',
        sessionId: 's-1',
        momentType: 'creator_post_read',
        proofLevel: PresenceProofLevel.level2,
        createdAt: now,
        signals: const PopsSignalSnapshot(
          screenActive: true,
          inForeground: true,
          contentProgressRatio: 0.8,
          touchRhythmScore: 0.72,
          scrollRhythmScore: 0.7,
          pauseResumeScore: 0.74,
          deviceMotionScore: 0.65,
          orientationStable: true,
          visualPresenceScore: null,
          ambienceScore: null,
          deviceIntegrityScore: 0.94,
          accountContinuityScore: 0.88,
          campaignRequirementScore: 0.79,
          trustTierScore: 0.81,
          eligibilityScore: 0.93,
        ),
      ),
      currentState: PopsSessionState.initializing,
      createPrivacyReceipt: true,
      receiptId: 'receipt-1',
    );

    await Future<void>.delayed(Duration.zero);
    expect(result.score.presenceConfidence, greaterThan(0.8));
    expect(result.decision.rewardEligibility, isTrue);
    expect(result.privacyReceipt, isNotNull);
    expect(seen.whereType<PresenceVerificationScoredEvent>(), hasLength(1));
    expect(seen.whereType<PresenceDecisionProducedEvent>(), hasLength(1));
    expect(seen.whereType<PresencePrivacyReceiptCreatedEvent>(), hasLength(1));
    await sub.cancel();
  });

  test('high fraud risk forces fraud decision path', () {
    final hooks = PopsIntegrationHooks();
    final now = DateTime.utc(2026, 4, 26, 22, 30);

    final result = hooks.evaluate(
      request: PopsVerificationRequest(
        verificationId: 'pv-2',
        userId: 'u-2',
        sessionId: 's-2',
        momentType: 'withdrawal_request',
        proofLevel: PresenceProofLevel.level5,
        createdAt: now,
        signals: const PopsSignalSnapshot(
          screenActive: true,
          inForeground: true,
          contentProgressRatio: 0.95,
          touchRhythmScore: 0.02,
          scrollRhythmScore: 0.01,
          pauseResumeScore: 0.05,
          deviceMotionScore: 0.0,
          orientationStable: false,
          visualPresenceScore: null,
          ambienceScore: null,
          deviceIntegrityScore: 0.1,
          accountContinuityScore: 0.0,
          campaignRequirementScore: 0.9,
          trustTierScore: 0.4,
          eligibilityScore: 1.0,
        ),
      ),
      currentState: PopsSessionState.tracking,
      createPrivacyReceipt: false,
      receiptId: 'unused',
    );

    expect(result.score.fraudRisk, greaterThan(0.85));
    expect(result.decision.decisionType, PresenceDecisionType.flagFraud);
    expect(result.decision.rewardEligibility, isFalse);
    expect(result.decision.sessionState, PopsSessionState.denied);
  });
}
