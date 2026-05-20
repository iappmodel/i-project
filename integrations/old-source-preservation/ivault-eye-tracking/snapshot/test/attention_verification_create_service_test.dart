import 'package:eye_tracking_app/backend/attention_verification_create_service.dart';
import 'package:eye_tracking_app/canonical/build_spec_v01.dart';
import 'package:eye_tracking_app/policy_version.dart';
import 'package:flutter_test/flutter_test.dart';

CampaignV01 _lenientCampaign() {
  return CampaignV01(
    id: 'camp-1',
    brandId: 'brand-1',
    status: CampaignStatusV01.active,
    title: 'Watch',
    actionType: CampaignActionTypeV01.watch,
    rewardAmount: 1,
    rewardCoinType: 'USD',
    minAttentionScore: 0.25,
    minQualityScore: 0.25,
    maxFraudSignalScore: 0.95,
    minVerifiedMs: 500,
    targetingRules: const {},
    budgetId: 'bud-1',
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-12-31T00:00:00.000Z',
    policyVersion: kBootstrapPolicyVersionId,
    createdAt: '2026-01-01T00:00:00.000Z',
  );
}

CampaignV01 _strictCampaign() {
  final c = _lenientCampaign();
  return CampaignV01(
    id: c.id,
    brandId: c.brandId,
    status: c.status,
    title: c.title,
    actionType: c.actionType,
    rewardAmount: c.rewardAmount,
    rewardCoinType: c.rewardCoinType,
    minAttentionScore: c.minAttentionScore,
    minQualityScore: c.minQualityScore,
    maxFraudSignalScore: c.maxFraudSignalScore,
    minVerifiedMs: 1 << 20,
    targetingRules: c.targetingRules,
    budgetId: c.budgetId,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    policyVersion: c.policyVersion,
    createdAt: c.createdAt,
  );
}

List<AttentionRuntimeSampleBackendRow> _goodSamples(String sessionId, String userId) {
  final out = <AttentionRuntimeSampleBackendRow>[];
  var t = 0;
  for (var i = 0; i < 50; i++) {
    t += 50;
    final x = 0.5 + ((i % 5) - 2) * 0.0025;
    final y = 0.45 + ((i % 7) - 3) * 0.002;
    out.add(
      AttentionRuntimeSampleBackendRow(
        id: 'smp-$i',
        sessionId: sessionId,
        userId: userId,
        timestampMs: t,
        gazeX: x,
        gazeY: y,
        confidence: 0.82,
        blink: i % 10 == 0,
        facePresent: true,
        trackingState: 'valid',
      ),
    );
  }
  return out;
}

void main() {
  group('AttentionVerificationCreateService', () {
    test('emits verification.created with idempotency key; no reward types', () {
      const sessionId = 'sess-verify-1';
      const userId = 'user-verify-1';
      final session = AttentionSessionBackendRow(
        id: sessionId,
        userId: userId,
        campaignId: 'camp-1',
        contentId: 'content-1',
        status: 'completed',
        requiredMs: 1200,
      );
      final samples = _goodSamples(sessionId, userId);
      final campaign = _lenientCampaign();

      final r = AttentionVerificationCreateService.create(
        session: session,
        samples: samples,
        campaign: campaign,
        activePolicyVersionId: kBootstrapPolicyVersionId,
        correlationId: 'corr-v1',
        idempotencyKey: 'idem-verify-1',
        verificationIdFactory: () => 'verif-fixed-1',
        eventSeqStart: 0,
      );

      expect(r.verification.id, 'verif-fixed-1');
      expect(r.verification.sessionId, sessionId);
      expect(r.verification.verified, isTrue);
      expect(r.engineVerified, isTrue);
      expect(r.policyPassed, isTrue);
      expect(r.sealed.verified, isTrue);

      expect(r.events, hasLength(1));
      final e = r.events.single;
      expect(e.eventType, CanonicalAttentionEventTypesV01.verificationCreated);
      expect(e.idempotencyKey, 'idem-verify-1');
      expect(systemEventV01HasRequiredIdempotencyKey(e), isTrue);
      expect(e.payload['verificationId'], 'verif-fixed-1');
      expect(e.payload['verified'], isTrue);
      expect(e.payload.containsKey('rewardAmount'), isFalse);
      expect(e.payload.containsKey('walletId'), isFalse);
    });

    test('policy failure emits verification.rejected and verified=false', () {
      const sessionId = 'sess-verify-2';
      const userId = 'user-verify-2';
      final session = AttentionSessionBackendRow(
        id: sessionId,
        userId: userId,
        campaignId: 'camp-1',
        contentId: 'content-1',
        status: 'completed',
        requiredMs: 1200,
      );
      final samples = _goodSamples(sessionId, userId);

      final r = AttentionVerificationCreateService.create(
        session: session,
        samples: samples,
        campaign: _strictCampaign(),
        activePolicyVersionId: kBootstrapPolicyVersionId,
        correlationId: 'corr-v2',
        idempotencyKey: 'idem-verify-2',
        verificationIdFactory: () => 'verif-fixed-2',
      );

      expect(r.verification.verified, isFalse);
      expect(r.engineVerified, isTrue);
      expect(r.policyPassed, isFalse);
      expect(r.sealed.verified, isFalse);
      expect(r.events.single.eventType, CanonicalAttentionEventTypesV01.verificationRejected);
      expect(r.events.single.idempotencyKey, isNull);
    });

    test('rejects incomplete session', () {
      expect(
        () => AttentionVerificationCreateService.create(
          session: AttentionSessionBackendRow(
            id: 's',
            userId: 'u',
            status: 'started',
          ),
          samples: _goodSamples('s', 'u'),
          campaign: _lenientCampaign(),
          activePolicyVersionId: kBootstrapPolicyVersionId,
          correlationId: 'c',
          idempotencyKey: 'k',
        ),
        throwsA(isA<AttentionVerificationCreateFailure>()),
      );
    });

    test('rejects empty samples', () {
      expect(
        () => AttentionVerificationCreateService.create(
          session: AttentionSessionBackendRow(
            id: 's',
            userId: 'u',
            status: 'completed',
          ),
          samples: const <AttentionRuntimeSampleBackendRow>[],
          campaign: _lenientCampaign(),
          activePolicyVersionId: kBootstrapPolicyVersionId,
          correlationId: 'c',
          idempotencyKey: 'k',
        ),
        throwsA(isA<AttentionVerificationCreateFailure>()),
      );
    });

    test('rejects blank idempotency key', () {
      expect(
        () => AttentionVerificationCreateService.create(
          session: AttentionSessionBackendRow(
            id: 's',
            userId: 'u',
            status: 'completed',
          ),
          samples: _goodSamples('s', 'u'),
          campaign: _lenientCampaign(),
          activePolicyVersionId: kBootstrapPolicyVersionId,
          correlationId: 'c',
          idempotencyKey: '   ',
        ),
        throwsA(isA<AttentionVerificationCreateFailure>()),
      );
    });
  });
}
