import 'package:eye_tracking_app/canonical/build_spec_v01.dart';
import 'package:eye_tracking_app/core/events/admin_event.dart';
import 'package:eye_tracking_app/core/events/conversion_event.dart';
import 'package:eye_tracking_app/core/events/fraud_event.dart';
import 'package:eye_tracking_app/core/events/policy_event.dart';
import 'package:eye_tracking_app/core/events/wallet_event.dart';
import 'package:eye_tracking_app/core/events/withdrawal_event.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Canonical v0.1', () {
    test('attentionVerificationPassedV01 matches campaign thresholds', () {
      final campaign = CampaignV01(
        id: 'c1',
        brandId: 'b1',
        status: CampaignStatusV01.active,
        title: 't',
        actionType: CampaignActionTypeV01.watch,
        rewardAmount: 1,
        rewardCoinType: 'iCoin',
        minAttentionScore: 0.7,
        minQualityScore: 0.6,
        maxFraudSignalScore: 0.3,
        minVerifiedMs: 5000,
        targetingRules: const {},
        budgetId: 'bud',
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2026-12-31T00:00:00.000Z',
        policyVersion: 'p1',
        createdAt: '2026-01-01T00:00:00.000Z',
      );

      final ok = AttentionVerificationResultV01(
        sessionId: 's',
        userId: 'u',
        passed: true,
        attentionScore: 0.8,
        qualityScore: 0.7,
        fraudSignalScore: 0.2,
        watchedMs: 6000,
        verifiedMs: 5500,
        reasonCodes: const [],
        policyVersion: 'p1',
        modelVersion: 'm1',
        createdAt: '2026-01-01T00:00:00.000Z',
      );

      final failFraud = ok.copyWith(fraudSignalScore: 0.5);

      expect(attentionVerificationPassedV01(verification: ok, campaign: campaign), isTrue);
      expect(
        attentionVerificationPassedV01(verification: failFraud, campaign: campaign),
        isFalse,
      );
    });

    test('attentionScoreFromComponentsV01 uses spec weights', () {
      const c = AttentionScoreComponentsV01(
        gazeOnTarget: 1,
        gazeStability: 1,
        faceContinuity: 1,
        blinkNaturalness: 1,
        headPoseValidity: 1,
        durationCompletion: 1,
        frameQuality: 1,
      );
      expect(attentionScoreFromComponentsV01(c), 1.0);
    });

    test('wire names for enums', () {
      expect(SpecCoinTypeV01.iCoin.wireName, 'iCoin');
      expect(LedgerEntryTypeV01.rewardPendingCredit.wireName, 'reward_pending_credit');
      expect(RiskActionV01.manualReview.wireName, 'manual_review');
      expect(CampaignStatusV01.budgetExhausted.wireName, 'budget_exhausted');
      expect(TrustTierNameV01.newUser.wireName, 'new');
      expect(CanonicalActorTypeV01.campaignAgent.wireName, 'campaign_agent');
      expect(CanonicalActorTypeV01.riskEngine.wireName, 'risk_engine');
    });

    test('CanonicalSubjectTypeV01 round-trips wire strings', () {
      for (final v in CanonicalSubjectTypeV01.values) {
        expect(canonicalSubjectTypeV01FromWire(v.wireName), v);
      }
      expect(canonicalSubjectTypeV01FromWire('unknown'), isNull);
    });

    test('CanonicalAttentionEventTypesV01 matches attention.* contract', () {
      expect(
        CanonicalAttentionEventTypesV01.sessionStarted,
        '${CanonicalEventGroupPrefixesV01.attention}session.started',
      );
      expect(
        CanonicalAttentionEventTypesV01.runtimeSignalSampled,
        'attention.runtime_signal.sampled',
      );
      expect(
        CanonicalAttentionEventTypesV01.verificationCreated,
        'attention.verification.created',
      );
    });

    test('attention pipeline payload maps wire enums and scores', () {
      const started = AttentionSessionStartedPayloadV01(
        sessionId: 's',
        userId: 'u',
        contentId: 'cnt',
        campaignId: 'c',
        placement: AttentionPlacementV01.campaignDetail,
        requiredMs: 5000,
      );
      expect(started.toPayloadMap()['placement'], 'campaign_detail');

      const sampled = AttentionRuntimeSignalSampledPayloadV01(
        sessionId: 's',
        userId: 'u',
        gazeX: 0.5,
        gazeY: 0.4,
        confidence: 0.9,
        blink: false,
        facePresent: true,
        trackingState: AttentionTrackingStateV01.valid,
        timestampMs: 1,
      );
      expect(sampled.toPayloadMap()['trackingState'], 'valid');

      const verification = AttentionVerificationCreatedPayloadV01(
        verificationId: 'v1',
        sessionId: 's',
        userId: 'u',
        contentId: 'cnt',
        verified: true,
        attentionScore: 0.8,
        qualityScore: 0.7,
        fraudRisk: 0.1,
        watchedMs: 6000,
        verifiedMs: 5500,
        requiredMs: 5000,
        gazeValidRatio: 0.9,
        facePresentRatio: 0.95,
        blinkNaturalnessScore: 0.85,
        interactionScore: 0.5,
        policyVersion: 'policy-acme-v3',
      );
      expect(verification.toPayloadMap()['fraudRisk'], 0.1);
      expect(verification.toPayloadMap()['verified'], isTrue);
      expect(verification.toPayloadMap()['policyVersion'], 'policy-acme-v3');

      const rejected = AttentionVerificationRejectedPayloadV01(
        verificationId: 'v1',
        sessionId: 's',
        userId: 'u',
        reason: AttentionVerificationRejectedReasonV01.policyFailed,
        policyVersion: 'policy-acme-v3',
      );
      expect(rejected.toPayloadMap()['reason'], 'policy_failed');
      expect(rejected.toPayloadMap()['policyVersion'], 'policy-acme-v3');
    });

    test('SystemEventV01 envelope matches canonical SystemEvent fields', () {
      final ev = SystemEventV01(
        eventId: 'e1',
        eventType: CanonicalAttentionEventTypesV01.sessionStarted,
        eventVersion: 1,
        actorType: CanonicalActorTypeV01.user,
        actorId: 'u1',
        subjectType: CanonicalSubjectTypeV01.attentionSession,
        subjectId: 's1',
        userId: 'u1',
        campaignId: 'c1',
        sessionId: 's1',
        payload: {'k': 1},
        policyVersion: 'p1',
        idempotencyKey: 'idem-1',
        correlationId: 'corr-1',
        causationId: 'e0',
        createdAt: '2026-01-01T00:00:00.000Z',
      );
      expect(ev.eventId, 'e1');
      expect(ev.eventVersion, 1);
      expect(ev.actorId, 'u1');
      expect(ev.subjectType.wireName, 'attention_session');
      expect(ev.userId, 'u1');
      expect(ev.campaignId, 'c1');
      expect(ev.sessionId, 's1');
      expect(ev.idempotencyKey, 'idem-1');
      expect(ev.correlationId, 'corr-1');
      expect(ev.causationId, 'e0');
      expect(ev.eventType.startsWith(CanonicalEventGroupPrefixesV01.attention), isTrue);
    });

    test('CanonicalTrustEventTypesV01 matches trust.* §13 contract', () {
      expect(CanonicalTrustEventTypesV01.scoreCreated, 'trust.score.created');
      expect(CanonicalTrustEventTypesV01.scoreUpdated, 'trust.score.updated');
      expect(CanonicalTrustEventTypesV01.limitChanged, 'trust.limit.changed');
    });

    test('MvpBackendEventSetV01 is the 39-type first-backend allow-list', () {
      expect(MvpBackendEventSetV01.eventTypes, hasLength(39));
      expect(MvpBackendEventSetV01.contains(CanonicalDeviceEventTypesV01.registered), isTrue);
      expect(MvpBackendEventSetV01.contains('policy.version.activated'), isTrue);
      expect(MvpBackendEventSetV01.contains(CanonicalCampaignEventTypesV01.completed), isTrue);
      expect(MvpBackendEventSetV01.contains(CanonicalAttentionEventTypesV01.runtimeSignalSampled), isFalse);
      expect(MvpBackendEventSetV01.contains(CanonicalBudgetEventTypesV01.depleted), isFalse);
      expect(MvpBackendEventSetV01.contains(CanonicalTrustEventTypesV01.limitChanged), isFalse);
      expect(MvpBackendEventSetV01.contains(CanonicalRewardEventTypesV01.decisionHeld), isFalse);
    });

    test('Mvp dotted namespaces align with local bus / telemetry wire catalogs', () {
      expect(CanonicalDeviceEventTypesV01.registered, 'device.registered');
      expect(CanonicalCampaignEventTypesV01.created, 'campaign.created');
      expect(CanonicalCampaignEventTypesV01.submittedForReview, 'campaign.submitted_for_review');
      expect(CanonicalCampaignEventTypesV01.approved, 'campaign.approved');
      expect(CanonicalCampaignEventTypesV01.rejected, 'campaign.rejected');
      expect(CanonicalCampaignEventTypesV01.activated, 'campaign.activated');
      expect(CanonicalCampaignEventTypesV01.paused, 'campaign.paused');
      expect(CanonicalCampaignEventTypesV01.completed, 'campaign.completed');
      expect(WalletEventWire.ledgerEntryCreated, CanonicalWalletEventTypesV01.ledgerEntryCreated);
      expect(FraudEventWire.flagCreated, CanonicalFraudEventTypesV01.flagCreated);
      expect(FraudEventWire.caseOpened, CanonicalFraudEventTypesV01.caseOpened);
      expect(FraudEventWire.caseResolved, CanonicalFraudEventTypesV01.caseResolved);
      expect(WithdrawalEventWire.requested, CanonicalWithdrawalEventTypesV01.requested);
      expect(WithdrawalEventWire.completed, CanonicalWithdrawalEventTypesV01.completed);
      expect(AdminEventWire.walletAdjustmentCreated, CanonicalAdminEventTypesV01.walletAdjustmentCreated);
      expect(AdminEventWire.rewardReversed, CanonicalAdminEventTypesV01.rewardReversed);
      expect(PolicyEventWire.versionCreated, CanonicalPolicyEventTypesV01.versionCreated);
      expect(PolicyEventWire.versionActivated, CanonicalPolicyEventTypesV01.versionActivated);
    });

    test('identity event types and payload maps match contract', () {
      expect(CanonicalIdentityEventTypesV01.userCreated, 'identity.user.created');
      expect(CanonicalIdentityEventTypesV01.userVerified, 'identity.user.verified');
      expect(CanonicalIdentityEventTypesV01.userRestricted, 'identity.user.restricted');
      expect(CanonicalIdentityEventTypesV01.userUnrestricted, 'identity.user.unrestricted');

      expect(IdentitySignupMethodV01.email.wireName, 'email');
      expect(IdentitySignupMethodV01.apple.wireName, 'apple');
      expect(identitySignupMethodV01FromWire('google'), IdentitySignupMethodV01.google);

      expect(IdentityVerificationLevelV01.kycBasic.wireName, 'kyc_basic');
      expect(identityVerificationLevelV01FromWire('phone'), IdentityVerificationLevelV01.phone);

      expect(IdentityRestrictionTypeV01.campaignAccess.wireName, 'campaign_access');
      expect(identityRestrictionTypeV01FromWire('withdrawal'), IdentityRestrictionTypeV01.withdrawal);

      final created = IdentityUserCreatedPayloadV01(
        userId: 'u1',
        signupMethod: IdentitySignupMethodV01.google,
        country: 'US',
      );
      expect(created.toPayloadMap(), {
        'userId': 'u1',
        'signupMethod': 'google',
        'country': 'US',
      });

      final verified = IdentityUserVerifiedPayloadV01(
        userId: 'u1',
        verificationLevel: IdentityVerificationLevelV01.email,
        provider: 'sendgrid',
      );
      expect(verified.toPayloadMap(), {
        'userId': 'u1',
        'verificationLevel': 'email',
        'provider': 'sendgrid',
      });

      final restricted = IdentityUserRestrictedPayloadV01(
        userId: 'u1',
        restrictionType: IdentityRestrictionTypeV01.earning,
        reason: 'velocity',
        expiresAt: '2026-06-01T00:00:00.000Z',
      );
      expect(restricted.toPayloadMap(), {
        'userId': 'u1',
        'restrictionType': 'earning',
        'reason': 'velocity',
        'expiresAt': '2026-06-01T00:00:00.000Z',
      });

      final unrestricted = IdentityUserUnrestrictedPayloadV01(
        userId: 'u1',
        restrictionType: IdentityRestrictionTypeV01.fullAccount,
        reason: 'appeal_accepted',
      );
      expect(unrestricted.toPayloadMap(), {
        'userId': 'u1',
        'restrictionType': 'full_account',
        'reason': 'appeal_accepted',
      });
    });

    test('reward event types and payload maps match contract', () {
      expect(CanonicalRewardEventTypesV01.candidateCreated, 'reward.candidate.created');
      expect(CanonicalRewardEventTypesV01.decisionApproved, 'reward.decision.approved');
      expect(CanonicalRewardEventTypesV01.decisionRejected, 'reward.decision.rejected');
      expect(CanonicalRewardEventTypesV01.decisionHeld, 'reward.decision.held');
      expect(CanonicalRewardEventTypesV01.released, 'reward.released');
      expect(CanonicalRewardEventTypesV01.clawedBack, 'reward.clawed_back');

      expect(RewardEventCurrencyV01.usd.wireName, 'USD');
      expect(rewardEventCurrencyV01FromWire('RCOIN'), RewardEventCurrencyV01.rCoin);

      expect(RewardCandidateEligibilityV01.needsReview.wireName, 'needs_review');
      expect(rewardCandidateEligibilityV01FromWire('eligible'), RewardCandidateEligibilityV01.eligible);

      expect(RewardDecisionRejectedReasonV01.trustTooLow.wireName, 'trust_too_low');
      expect(
        rewardDecisionRejectedReasonV01FromWire('daily_limit_exceeded'),
        RewardDecisionRejectedReasonV01.dailyLimitExceeded,
      );

      expect(RewardDecisionHoldReasonV01.newAccount.wireName, 'new_account');
      expect(rewardDecisionHoldReasonV01FromWire('fraud_review'), RewardDecisionHoldReasonV01.fraudReview);

      expect(RewardClawedBackReasonV01.manualAdminReview.wireName, 'manual_admin_review');
      expect(rewardClawedBackReasonV01FromWire('policy_violation'), RewardClawedBackReasonV01.policyViolation);

      final candidate = RewardCandidateCreatedPayloadV01(
        rewardCandidateId: 'rc1',
        userId: 'u1',
        campaignId: 'c1',
        verificationId: 'v1',
        expectedAmount: 0.5,
        currency: RewardEventCurrencyV01.usd,
        eligibilityStatus: RewardCandidateEligibilityV01.needsReview,
        reason: 'manual_queue',
      );
      expect(candidate.toPayloadMap(), {
        'rewardCandidateId': 'rc1',
        'userId': 'u1',
        'campaignId': 'c1',
        'verificationId': 'v1',
        'expectedAmount': 0.5,
        'currency': 'USD',
        'eligibilityStatus': 'needs_review',
        'reason': 'manual_queue',
      });

      final approved = RewardDecisionApprovedPayloadV01(
        decisionId: 'd1',
        rewardCandidateId: 'rc1',
        userId: 'u1',
        campaignId: 'c1',
        verificationId: 'v1',
        amount: 0.5,
        currency: RewardEventCurrencyV01.iCoin,
        budgetReservationId: 'br1',
        trustScoreAtIssuance: 0.82,
        fraudRiskAtIssuance: 0.11,
        initialStatus: RewardDecisionInitialStatusV01.pending,
        policyVersion: 'p1',
      );
      expect(approved.toPayloadMap()['currency'], 'ICOIN');
      expect(approved.toPayloadMap()['initialStatus'], 'pending');
      expect(approved.toPayloadMap()['policyVersion'], 'p1');

      final rejected = RewardDecisionRejectedPayloadV01(
        decisionId: 'd2',
        rewardCandidateId: 'rc2',
        userId: 'u1',
        campaignId: 'c1',
        verificationId: 'v2',
        reason: RewardDecisionRejectedReasonV01.budgetUnavailable,
        policyVersion: 'p1',
      );
      expect(rejected.toPayloadMap()['reason'], 'budget_unavailable');
      expect(rejected.toPayloadMap()['policyVersion'], 'p1');

      final held = RewardDecisionHeldPayloadV01(
        decisionId: 'd3',
        userId: 'u1',
        campaignId: 'c1',
        amount: 1,
        currency: RewardEventCurrencyV01.vCoin,
        holdReason: RewardDecisionHoldReasonV01.velocityLimit,
        policyVersion: 'p1',
        releaseEligibleAt: '2026-04-26T00:00:00.000Z',
      );
      expect(held.toPayloadMap()['holdReason'], 'velocity_limit');
      expect(held.toPayloadMap()['releaseEligibleAt'], '2026-04-26T00:00:00.000Z');
      expect(held.toPayloadMap()['policyVersion'], 'p1');

      final released = RewardReleasedPayloadV01(
        decisionId: 'd1',
        userId: 'u1',
        valueLotId: 'lot1',
        amount: 0.5,
        currency: RewardEventCurrencyV01.usd,
        releasedAt: '2026-04-25T12:00:00.000Z',
      );
      expect(released.toPayloadMap()['valueLotId'], 'lot1');

      final claw = RewardClawedBackPayloadV01(
        decisionId: 'd1',
        userId: 'u1',
        valueLotId: 'lot1',
        amount: 0.5,
        currency: RewardEventCurrencyV01.usd,
        reason: RewardClawedBackReasonV01.fraudConfirmed,
      );
      expect(claw.toPayloadMap()['reason'], 'fraud_confirmed');
    });

    test('budget event types, payloads, and strict map parsing', () {
      expect(CanonicalBudgetEventTypesV01.funded, 'budget.funded');
      expect(CanonicalBudgetEventTypesV01.reservationCreated, 'budget.reservation.created');
      expect(CanonicalBudgetEventTypesV01.reservationReleased, 'budget.reservation.released');
      expect(CanonicalBudgetEventTypesV01.reservationCaptured, 'budget.reservation.captured');
      expect(CanonicalBudgetEventTypesV01.depleted, 'budget.depleted');

      expect(BudgetReservationReleasedReasonV01.rewardRejected.wireName, 'reward_rejected');
      expect(
        budgetReservationReleasedReasonV01FromWire('campaign_cancelled'),
        BudgetReservationReleasedReasonV01.campaignCancelled,
      );
      expect(budgetReservationReleasedReasonV01FromWire('unknown'), isNull);

      const funded = BudgetFundedPayloadV01(
        campaignId: 'c1',
        amount: 1000,
        currency: BudgetEventCurrencyV01.usd,
        fundingSourceId: 'fs1',
      );
      expect(funded.toPayloadMap(), {
        'campaignId': 'c1',
        'amount': 1000.0,
        'currency': 'USD',
        'fundingSourceId': 'fs1',
      });
      expect(
        BudgetFundedPayloadV01.fromStrictMap(funded.toPayloadMap()).toPayloadMap(),
        funded.toPayloadMap(),
      );

      const created = BudgetReservationCreatedPayloadV01(
        reservationId: 'r1',
        campaignId: 'c1',
        userId: 'u1',
        rewardCandidateId: 'rc1',
        amount: 0.25,
        currency: BudgetEventCurrencyV01.iCoin,
        expiresAt: '2026-04-26T00:00:00.000Z',
      );
      expect(created.toPayloadMap()['expiresAt'], '2026-04-26T00:00:00.000Z');
      expect(
        BudgetReservationCreatedPayloadV01.fromStrictMap(created.toPayloadMap()).toPayloadMap(),
        created.toPayloadMap(),
      );

      const released = BudgetReservationReleasedPayloadV01(
        reservationId: 'r1',
        campaignId: 'c1',
        amount: 0.25,
        currency: BudgetEventCurrencyV01.vCoin,
        reason: BudgetReservationReleasedReasonV01.reservationExpired,
      );
      expect(released.toPayloadMap()['reason'], 'reservation_expired');
      expect(
        BudgetReservationReleasedPayloadV01.fromStrictMap(released.toPayloadMap()).toPayloadMap(),
        released.toPayloadMap(),
      );

      const captured = BudgetReservationCapturedPayloadV01(
        reservationId: 'r1',
        campaignId: 'c1',
        rewardDecisionId: 'd1',
        amount: 0.25,
        currency: BudgetEventCurrencyV01.rCoin,
      );
      expect(
        BudgetReservationCapturedPayloadV01.fromStrictMap(captured.toPayloadMap()).toPayloadMap(),
        captured.toPayloadMap(),
      );

      const depleted = BudgetDepletedPayloadV01(
        campaignId: 'c1',
        totalBudget: 5000,
        spentBudget: 4800,
        reservedBudget: 200,
        currency: BudgetEventCurrencyV01.usd,
      );
      expect(
        BudgetDepletedPayloadV01.fromStrictMap(depleted.toPayloadMap()).toPayloadMap(),
        depleted.toPayloadMap(),
      );

      expect(
        () => BudgetFundedPayloadV01.fromStrictMap(<String, Object?>{}),
        throwsFormatException,
      );
      expect(
        () => BudgetFundedPayloadV01.fromStrictMap(<String, Object?>{
          'campaignId': 'c',
          'amount': 1,
          'currency': 'NOPE',
          'fundingSourceId': 'x',
        }),
        throwsFormatException,
      );
    });

    test('§19 idempotencyKey required types align with core event wires', () {
      expect(CanonicalEventTypesRequiringIdempotencyKeyV01.all.length, 9);
      expect(
        CanonicalEventTypesRequiringIdempotencyKeyV01.attentionVerificationCreated,
        CanonicalAttentionEventTypesV01.verificationCreated,
      );
      expect(
        CanonicalEventTypesRequiringIdempotencyKeyV01.rewardCandidateCreated,
        CanonicalRewardEventTypesV01.candidateCreated,
      );
      expect(
        CanonicalEventTypesRequiringIdempotencyKeyV01.budgetReservationCreated,
        CanonicalBudgetEventTypesV01.reservationCreated,
      );
      expect(
        CanonicalEventTypesRequiringIdempotencyKeyV01.rewardDecisionApproved,
        CanonicalRewardEventTypesV01.decisionApproved,
      );
      expect(
        CanonicalEventTypesRequiringIdempotencyKeyV01.walletValueLotCreated,
        WalletEventWire.valueLotCreated,
      );
      expect(
        CanonicalEventTypesRequiringIdempotencyKeyV01.walletLedgerEntryCreated,
        WalletEventWire.ledgerEntryCreated,
      );
      expect(
        CanonicalEventTypesRequiringIdempotencyKeyV01.withdrawalRequested,
        WithdrawalEventWire.requested,
      );
      expect(
        CanonicalEventTypesRequiringIdempotencyKeyV01.conversionCompleted,
        ConversionEventWire.completed,
      );
      expect(
        CanonicalEventTypesRequiringIdempotencyKeyV01.adminWalletAdjustmentCreated,
        AdminEventWire.walletAdjustmentCreated,
      );

      expect(eventTypeRequiresIdempotencyKeyV01(CanonicalAttentionEventTypesV01.sessionStarted), isFalse);
      expect(
        eventTypeRequiresIdempotencyKeyV01(CanonicalEventTypesRequiringIdempotencyKeyV01.rewardCandidateCreated),
        isTrue,
      );

      SystemEventV01 baseMoneyEvent({
        required String eventType,
        String? idempotencyKey,
      }) {
        return SystemEventV01(
          eventId: 'e1',
          eventType: eventType,
          actorType: CanonicalActorTypeV01.system,
          actorId: 'sys',
          subjectType: CanonicalSubjectTypeV01.wallet,
          subjectId: 'w1',
          payload: const <String, Object?>{},
          idempotencyKey: idempotencyKey,
          createdAt: '2026-01-01T00:00:00.000Z',
        );
      }

      expect(
        systemEventV01HasRequiredIdempotencyKey(
          baseMoneyEvent(
            eventType: CanonicalEventTypesRequiringIdempotencyKeyV01.walletLedgerEntryCreated,
            idempotencyKey: null,
          ),
        ),
        isFalse,
      );
      expect(
        systemEventV01HasRequiredIdempotencyKey(
          baseMoneyEvent(
            eventType: CanonicalEventTypesRequiringIdempotencyKeyV01.walletLedgerEntryCreated,
            idempotencyKey: '',
          ),
        ),
        isFalse,
      );
      expect(
        systemEventV01HasRequiredIdempotencyKey(
          baseMoneyEvent(
            eventType: CanonicalEventTypesRequiringIdempotencyKeyV01.walletLedgerEntryCreated,
            idempotencyKey: 'idem-ledger-1',
          ),
        ),
        isTrue,
      );
      expect(
        systemEventV01HasRequiredIdempotencyKey(
          baseMoneyEvent(
            eventType: CanonicalAttentionEventTypesV01.sessionStarted,
            idempotencyKey: null,
          ),
        ),
        isTrue,
      );
    });
  });
}

extension on AttentionVerificationResultV01 {
  AttentionVerificationResultV01 copyWith({
    double? fraudSignalScore,
  }) {
    return AttentionVerificationResultV01(
      sessionId: sessionId,
      userId: userId,
      campaignId: campaignId,
      contentId: contentId,
      passed: passed,
      attentionScore: attentionScore,
      qualityScore: qualityScore,
      fraudSignalScore: fraudSignalScore ?? this.fraudSignalScore,
      watchedMs: watchedMs,
      verifiedMs: verifiedMs,
      reasonCodes: reasonCodes,
      policyVersion: policyVersion,
      modelVersion: modelVersion,
      createdAt: createdAt,
    );
  }
}
