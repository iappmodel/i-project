import 'package:eye_tracking_app/canonical/build_spec_v01.dart';
import 'package:eye_tracking_app/core/events/system_event.dart';
import 'package:eye_tracking_app/policy_version.dart';
import 'package:eye_tracking_app/trust_engine.dart';
import 'package:eye_tracking_app/trust_recompute_engine.dart';
import 'package:flutter_test/flutter_test.dart';

TrustRecomputeRequest _baseRequest({
  List<AttentionVerificationRow>? verifications,
  List<RewardDecisionRow>? decisions,
  List<FraudFlagRow>? fraud,
  List<DeviceRow>? devices,
  List<WithdrawalRow>? withdrawals,
  List<WalletLedgerEntryRow>? ledger,
  bool rewardFrozen = false,
  TrustScorePersistenceRow? previous,
}) {
  return TrustRecomputeRequest(
    userId: 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee',
    userCreatedAt: DateTime.utc(2025, 1, 1),
    verificationLevelWire: 'kyc_basic',
    rewardFrozen: rewardFrozen,
    attentionVerifications: verifications ??
        const [
          AttentionVerificationRow(
            verified: true,
            attentionScore: 0.9,
            qualityScore: 0.88,
            fraudRisk: 0.08,
            gazeValidRatio: 0.9,
            interactionScore: 0.85,
          ),
        ],
    rewardDecisions: decisions ??
        const [
          RewardDecisionRow(decision: 'approved'),
          RewardDecisionRow(decision: 'approved'),
          RewardDecisionRow(decision: 'rejected', rejectionReason: 'budget'),
        ],
    walletLedgerEntries: ledger ?? const [],
    withdrawals: withdrawals ??
        const [
          WithdrawalRow(status: 'completed'),
          WithdrawalRow(status: 'completed'),
        ],
    fraudFlags: fraud ?? const [],
    devices: devices ??
        const [
          DeviceRow(trustStatus: 'trusted'),
        ],
    now: DateTime.utc(2026, 4, 25, 12),
    activePolicyVersionId: kBootstrapPolicyVersionId,
    correlationId: 'corr-1',
    jobId: 'job-trust-1',
    trustScoreRowId: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    previousTrustRow: previous,
  );
}

void main() {
  group('TrustRecomputeEngine', () {
    const engine = TrustRecomputeEngine();

    test('consumes six sources and produces snapshot + upsert + history + events', () {
      final req = _baseRequest();
      final r = engine.recompute(req);

      expect(r.snapshot.userId, req.userId);
      expect(r.snapshot.policyVersionId, kBootstrapPolicyVersionId);
      expect(r.trustScoreUpsert.userId, req.userId);
      expect(r.trustScoreUpsert.id, req.trustScoreRowId);
      expect(r.trustScoreUpsert.scoreDb, greaterThanOrEqualTo(0));
      expect(r.trustScoreUpsert.scoreDb, lessThanOrEqualTo(100));
      expect(r.trustScoreUpsert.dailyEarnLimitMinor, greaterThan(0));

      expect(r.trustHistoryInsert.userId, req.userId);
      expect(r.trustHistoryInsert.newLevelWire, r.snapshot.levelWire);
      expect(r.trustHistoryInsert.sourceEventId, isNotEmpty);
      expect(r.trustHistoryInsert.reasonCodes, contains('trust_recompute'));

      expect(r.events, hasLength(3));
      expect(r.events[0].eventType, SystemEventWire.jobStarted);
      expect(r.events[1].eventType, CanonicalTrustEventTypesV01.scoreUpdated);
      expect(r.events[2].eventType, SystemEventWire.jobCompleted);
      expect(r.events[1].subjectType, CanonicalSubjectTypeV01.trustScore);
      expect(r.events[1].idempotencyKey, 'trust:recompute:score:${req.jobId}');
    });

    test('open critical fraud flag drives restricted / zero DB score', () {
      final req = _baseRequest(
        fraud: const [
          FraudFlagRow(
            signal: 'multi_account_ring',
            severity: 'critical',
            status: 'open',
          ),
        ],
      );
      final r = engine.recompute(req);

      expect(r.snapshot.level, TrustScoreLevel.restricted);
      expect(r.trustScoreUpsert.scoreDb, 0);
      expect(r.snapshot.riskFlags, isNotEmpty);
    });

    test('wallet clawbacks increase abuse-side penalties via inputs', () {
      final ledger = List<WalletLedgerEntryRow>.generate(
        3,
        (_) => const WalletLedgerEntryRow(entryType: 'clawback'),
      );
      final r1 = engine.recompute(_baseRequest(ledger: ledger));
      final r2 = engine.recompute(_baseRequest(ledger: const []));
      expect(r1.snapshot.score, lessThan(r2.snapshot.score));
    });

    test('history carries previous row when provided', () {
      const prev = TrustScorePersistenceRow(
        id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
        scoreDb: 40,
        levelWire: 'low',
      );
      final r = engine.recompute(_baseRequest(previous: prev));
      expect(r.trustHistoryInsert.previousScoreDb, 40);
      expect(r.trustHistoryInsert.previousLevelWire, 'low');
    });
  });
}
