// CLIENT SIMULATION / NON-AUTHORITATIVE
// This module is for client-side preview/simulation UX only.
// It must not be treated as the canonical writer for economy, wallet, trust, fraud, campaign, or POPS economic state.
// Backend/API source-of-truth ownership is documented in:
// docs/source-of-truth-ownership-contract.md
// docs/runtime-wiring-matrix.md

// §27.4 Recompute Trust — aggregates DB-shaped rows into [TrustScoreInputs], runs
// [TrustEngine.computeTrustScoreSnapshot], and emits persistence drafts + canonical
// [SystemEventV01] rows for `system_events`, `trust_scores`, and `trust_score_history`.

import 'dart:math' as math;

import 'package:eye_tracking_app/canonical/build_spec_v01.dart';
import 'package:eye_tracking_app/core/events/system_event.dart';
import 'package:eye_tracking_app/policy_version.dart';
import 'package:eye_tracking_app/trust_engine.dart';

// --- Row shapes (mirror migrations; only fields needed for recompute) ---

final class AttentionVerificationRow {
  const AttentionVerificationRow({
    required this.verified,
    required this.attentionScore,
    required this.qualityScore,
    required this.fraudRisk,
    this.gazeValidRatio,
    this.interactionScore,
  });

  final bool verified;
  final double attentionScore;
  final double qualityScore;
  final double fraudRisk;
  final double? gazeValidRatio;
  final double? interactionScore;
}

final class RewardDecisionRow {
  const RewardDecisionRow({required this.decision, this.rejectionReason});

  final String decision;
  final String? rejectionReason;
}

final class WalletLedgerEntryRow {
  const WalletLedgerEntryRow({required this.entryType});

  final String entryType;
}

final class WithdrawalRow {
  const WithdrawalRow({required this.status});

  final String status;
}

final class FraudFlagRow {
  const FraudFlagRow({
    required this.signal,
    required this.severity,
    required this.status,
  });

  final String signal;
  final String severity;
  final String status;
}

final class DeviceRow {
  const DeviceRow({required this.trustStatus});

  final String trustStatus;
}

/// Prior trust row from `trust_scores` (null on first materialization).
final class TrustScorePersistenceRow {
  const TrustScorePersistenceRow({
    required this.id,
    required this.scoreDb,
    required this.levelWire,
  });

  final String id;
  final double scoreDb;
  final String levelWire;
}

/// Upsert payload for `trust_scores` (score on 0..100 wire scale per migration).
final class TrustScoreUpsertDraft {
  const TrustScoreUpsertDraft({
    required this.id,
    required this.userId,
    required this.scoreDb,
    required this.levelWire,
    required this.payoutDelayHours,
    required this.dailyEarnLimitMinor,
    required this.dailyWithdrawalLimitMinor,
    required this.campaignAccessTier,
    required this.lastRecomputedAtIso,
  });

  final String id;
  final String userId;
  final double scoreDb;
  final String levelWire;
  final int payoutDelayHours;
  final int dailyEarnLimitMinor;
  final int dailyWithdrawalLimitMinor;
  final int campaignAccessTier;
  final String lastRecomputedAtIso;
}

/// Insert draft for `trust_score_history`.
final class TrustScoreHistoryInsertDraft {
  const TrustScoreHistoryInsertDraft({
    required this.userId,
    this.previousScoreDb,
    required this.newScoreDb,
    this.previousLevelWire,
    required this.newLevelWire,
    required this.reasonCodes,
    required this.sourceEventId,
    required this.policyVersion,
    required this.createdAtIso,
  });

  final String userId;
  final double? previousScoreDb;
  final double newScoreDb;
  final String? previousLevelWire;
  final String newLevelWire;
  final List<String> reasonCodes;
  final String sourceEventId;
  final String policyVersion;
  final String createdAtIso;
}

final class TrustRecomputeRequest {
  const TrustRecomputeRequest({
    required this.userId,
    required this.userCreatedAt,
    required this.verificationLevelWire,
    required this.rewardFrozen,
    required this.attentionVerifications,
    required this.rewardDecisions,
    required this.walletLedgerEntries,
    required this.withdrawals,
    required this.fraudFlags,
    required this.devices,
    required this.now,
    required this.activePolicyVersionId,
    required this.correlationId,
    required this.jobId,
    required this.trustScoreRowId,
    this.previousTrustRow,
  });

  final String userId;
  final DateTime userCreatedAt;
  final String verificationLevelWire;
  final bool rewardFrozen;
  final List<AttentionVerificationRow> attentionVerifications;
  final List<RewardDecisionRow> rewardDecisions;
  final List<WalletLedgerEntryRow> walletLedgerEntries;
  final List<WithdrawalRow> withdrawals;
  final List<FraudFlagRow> fraudFlags;
  final List<DeviceRow> devices;
  final DateTime now;
  final String activePolicyVersionId;
  final String correlationId;
  final String jobId;
  final String trustScoreRowId;
  final TrustScorePersistenceRow? previousTrustRow;
}

final class TrustRecomputeResult {
  const TrustRecomputeResult({
    required this.snapshot,
    required this.trustScoreUpsert,
    required this.trustHistoryInsert,
    required this.events,
  });

  final TrustScoreSnapshot snapshot;
  final TrustScoreUpsertDraft trustScoreUpsert;
  final TrustScoreHistoryInsertDraft trustHistoryInsert;
  final List<SystemEventV01> events;
}

int identityVerificationLevelFromUserWire(String wire) {
  return switch (wire) {
    'kyc_full' => 5,
    'kyc_basic' => 3,
    'phone' => 2,
    'email' => 1,
    _ => 0,
  };
}

TrustFlags trustFlagsFromFraudRows(List<FraudFlagRow> rows) {
  var multiAccountDetected = false;
  var scriptedBehavior = false;
  var sensorSpoofing = false;
  var abnormalTiming = false;
  var identicalSessions = false;
  var lowEntropyInteractions = false;
  var recentHardFlag = false;

  for (final f in rows) {
    if (f.status == 'resolved' || f.status == 'dismissed') continue;
    final sig = f.signal.toLowerCase();
    final sev = f.severity;
    if (sev == 'critical') {
      recentHardFlag = true;
      if (sig.contains('multi')) {
        multiAccountDetected = true;
      } else if (sig.contains('script')) {
        scriptedBehavior = true;
      } else {
        sensorSpoofing = true;
      }
    } else if (sev == 'high') {
      recentHardFlag = true;
      abnormalTiming = true;
    } else if (sev == 'medium') {
      abnormalTiming = abnormalTiming || sig.contains('timing');
      identicalSessions = identicalSessions || sig.contains('identical');
      lowEntropyInteractions = lowEntropyInteractions || sig.contains('entropy');
    } else {
      identicalSessions = identicalSessions || sig.contains('identical');
      lowEntropyInteractions = lowEntropyInteractions || sig.contains('entropy');
    }
  }

  return TrustFlags(
    multiAccountDetected: multiAccountDetected,
    scriptedBehavior: scriptedBehavior,
    sensorSpoofing: sensorSpoofing,
    abnormalTiming: abnormalTiming,
    identicalSessions: identicalSessions,
    lowEntropyInteractions: lowEntropyInteractions,
    recentHardFlag: recentHardFlag,
  );
}

double _verifiedAttentionQuality(List<AttentionVerificationRow> v) {
  final good = v.where((e) => e.verified).toList();
  if (good.isEmpty) return 0.42;
  var sum = 0.0;
  for (final r in good) {
    final base = math.sqrt(
      (r.attentionScore * r.qualityScore).clamp(0.0, 1.0),
    );
    final adj = base * (1.0 - 0.35 * r.fraudRisk.clamp(0.0, 1.0));
    sum += adj.clamp(0.0, 1.0);
  }
  return (sum / good.length).clamp(0.0, 1.0);
}

double _rewardClaimHistoryScore(List<RewardDecisionRow> d) {
  if (d.isEmpty) return 0.5;
  var ap = 0, rj = 0, held = 0;
  for (final x in d) {
    switch (x.decision) {
      case 'approved':
        ap++;
      case 'rejected':
        rj++;
      case 'held':
        held++;
    }
  }
  final denom = ap + rj;
  if (denom == 0) {
    return (0.55 - 0.05 * held / math.max(1, d.length)).clamp(0.0, 1.0);
  }
  final ratio = ap / denom;
  return (ratio - 0.08 * held / d.length).clamp(0.0, 1.0);
}

double _deviceConsistency(List<DeviceRow> d) {
  if (d.isEmpty) return 0.55;
  final blocked = d.where((e) => e.trustStatus == 'blocked').length;
  if (blocked > 0) return 0.25;
  final trusted = d.where((e) => e.trustStatus == 'trusted').length;
  final susp = d.where((e) => e.trustStatus == 'suspicious').length;
  final unknown = d.length - trusted - susp;
  return (trusted / d.length * 0.92 + unknown / d.length * 0.62 + susp / d.length * 0.32)
      .clamp(0.0, 1.0);
}

double _behaviorConsistency(List<AttentionVerificationRow> v) {
  final parts = <double>[];
  for (final r in v) {
    if (r.gazeValidRatio != null) parts.add(r.gazeValidRatio!.clamp(0.0, 1.0));
    if (r.interactionScore != null) parts.add(r.interactionScore!.clamp(0.0, 1.0));
  }
  if (parts.isEmpty) return 0.5;
  return (parts.reduce((a, b) => a + b) / parts.length).clamp(0.0, 1.0);
}

double _withdrawalHistoryScore(List<WithdrawalRow> w) {
  if (w.isEmpty) return 0.55;
  var completed = 0, bad = 0;
  for (final x in w) {
    switch (x.status) {
      case 'completed':
        completed++;
      case 'failed':
      case 'rejected':
        bad++;
    }
  }
  final denom = completed + bad;
  if (denom == 0) return 0.6;
  return (completed / denom).clamp(0.0, 1.0);
}

int _chargebackClawbackCount(List<WalletLedgerEntryRow> ledger) {
  return ledger.where((e) => e.entryType == 'clawback').length;
}

int _campaignAbuseIndicators(List<RewardDecisionRow> d) {
  var n = 0;
  for (final x in d) {
    if (x.decision != 'rejected') continue;
    final reason = x.rejectionReason?.toLowerCase() ?? '';
    if (reason.contains('abuse') ||
        reason.contains('duplicate') ||
        reason.contains('farm')) {
      n++;
    }
  }
  return n + (d.where((e) => e.decision == 'rejected').length ~/ 3);
}

/// Maps [TrustScoreSnapshot.score] (0..1000, 0 when restricted) to `trust_scores.score` (0..100).
double trustSnapshotScoreToDb(TrustScoreSnapshot s) {
  if (s.level == TrustScoreLevel.restricted) return 0;
  return (s.score / 10.0).clamp(0.0, 100.0);
}

/// RFC 4122 UUID v4-shaped string, deterministic from [seed] (Postgres `uuid` columns).
String deterministicTrustEventUuid(String seed) {
  final r = math.Random(seed.hashCode);
  String h(int n) => List.generate(n, (_) => r.nextInt(16).toRadixString(16)).join();
  final p3 = h(3);
  final variantNibble = 8 + r.nextInt(4);
  return '${h(8)}-${h(4)}-4$p3-$variantNibble${h(3)}-${h(12)}';
}

final class TrustRecomputeEngine {
  const TrustRecomputeEngine({TrustEngine trustEngine = const TrustEngine()})
      : _trust = trustEngine;

  final TrustEngine _trust;

  TrustScoreInputs buildInputs(TrustRecomputeRequest r) {
    final flags = trustFlagsFromFraudRows(r.fraudFlags);
    return TrustScoreInputs(
      userId: r.userId,
      accountAge: r.now.difference(r.userCreatedAt),
      verifiedAttentionQuality: _verifiedAttentionQuality(r.attentionVerifications),
      rewardClaimHistoryScore: _rewardClaimHistoryScore(r.rewardDecisions),
      fraudFlags: flags,
      deviceConsistency: _deviceConsistency(r.devices),
      behaviorConsistency: _behaviorConsistency(r.attentionVerifications),
      chargebackClawbackCount: _chargebackClawbackCount(r.walletLedgerEntries),
      withdrawalHistoryScore: _withdrawalHistoryScore(r.withdrawals),
      campaignAbuseIndicatorCount: _campaignAbuseIndicators(r.rewardDecisions),
      identityVerificationLevel: identityVerificationLevelFromUserWire(
        r.verificationLevelWire,
      ),
      rewardFrozen: r.rewardFrozen,
    );
  }

  TrustRecomputeResult recompute(TrustRecomputeRequest r) {
    final inputs = buildInputs(r);
    final snapshot = _trust.computeTrustScoreSnapshot(
      inputs: inputs,
      now: r.now,
      activePolicyVersionId: r.activePolicyVersionId,
    );

    final nowIso = r.now.toUtc().toIso8601String();
    final scoreDb = trustSnapshotScoreToDb(snapshot);

    final idJobStarted = deterministicTrustEventUuid('${r.jobId}|started|${r.userId}');
    final idScore = deterministicTrustEventUuid('${r.jobId}|score|${r.userId}');
    final idJobDone = deterministicTrustEventUuid('${r.jobId}|done|${r.userId}');

    final jobStarted = SystemEventV01(
      eventId: idJobStarted,
      eventType: SystemEventWire.jobStarted,
      actorType: CanonicalActorTypeV01.system,
      actorId: 'trust-recompute',
      subjectType: CanonicalSubjectTypeV01.user,
      subjectId: r.userId,
      userId: r.userId,
      payload: <String, Object?>{
        'jobId': r.jobId,
        'jobType': SystemJobType.trustScoreRecompute.wireValue,
        'correlationId': r.correlationId,
      },
      policyVersion: r.activePolicyVersionId,
      idempotencyKey: 'trust:recompute:job_started:${r.jobId}',
      correlationId: r.correlationId,
      createdAt: nowIso,
    );

    final scoreUpdated = SystemEventV01(
      eventId: idScore,
      eventType: CanonicalTrustEventTypesV01.scoreUpdated,
      actorType: CanonicalActorTypeV01.system,
      actorId: 'trust-recompute',
      subjectType: CanonicalSubjectTypeV01.trustScore,
      subjectId: r.trustScoreRowId,
      userId: r.userId,
      payload: <String, Object?>{
        'jobId': r.jobId,
        'score': snapshot.score,
        'scoreDb': scoreDb,
        'level': snapshot.levelWire,
        'payoutDelayHours': snapshot.payoutDelayHours,
        'dailyEarnLimit': snapshot.dailyEarnLimit,
        'dailyWithdrawalLimit': snapshot.dailyWithdrawalLimit,
        'campaignAccessTier': snapshot.campaignAccessTier,
        'riskFlags': snapshot.riskFlags,
        'positiveSignals': snapshot.positiveSignals,
        'correlationId': r.correlationId,
      },
      policyVersion: r.activePolicyVersionId,
      idempotencyKey: 'trust:recompute:score:${r.jobId}',
      correlationId: r.correlationId,
      createdAt: nowIso,
    );

    final jobCompleted = SystemEventV01(
      eventId: idJobDone,
      eventType: SystemEventWire.jobCompleted,
      actorType: CanonicalActorTypeV01.system,
      actorId: 'trust-recompute',
      subjectType: CanonicalSubjectTypeV01.user,
      subjectId: r.userId,
      userId: r.userId,
      payload: <String, Object?>{
        'jobId': r.jobId,
        'jobType': SystemJobType.trustScoreRecompute.wireValue,
        'processedCount': 1,
        'failedCount': 0,
        'correlationId': r.correlationId,
      },
      policyVersion: r.activePolicyVersionId,
      idempotencyKey: 'trust:recompute:job_completed:${r.jobId}',
      correlationId: r.correlationId,
      createdAt: nowIso,
    );

    final prev = r.previousTrustRow;
    final reasonCodes = <String>{
      ...snapshot.riskFlags,
      ...snapshot.positiveSignals,
      'trust_recompute',
    }.toList()
      ..sort();

    final upsert = TrustScoreUpsertDraft(
      id: r.trustScoreRowId,
      userId: r.userId,
      scoreDb: scoreDb,
      levelWire: snapshot.levelWire,
      payoutDelayHours: snapshot.payoutDelayHours.round(),
      dailyEarnLimitMinor: (snapshot.dailyEarnLimit * 100).round(),
      dailyWithdrawalLimitMinor: (snapshot.dailyWithdrawalLimit * 100).round(),
      campaignAccessTier: snapshot.campaignAccessTier,
      lastRecomputedAtIso: nowIso,
    );

    final history = TrustScoreHistoryInsertDraft(
      userId: r.userId,
      previousScoreDb: prev?.scoreDb,
      newScoreDb: scoreDb,
      previousLevelWire: prev?.levelWire,
      newLevelWire: snapshot.levelWire,
      reasonCodes: reasonCodes,
      sourceEventId: scoreUpdated.eventId,
      policyVersion: r.activePolicyVersionId.isNotEmpty
          ? r.activePolicyVersionId
          : kBootstrapPolicyVersionId,
      createdAtIso: nowIso,
    );

    return TrustRecomputeResult(
      snapshot: snapshot,
      trustScoreUpsert: upsert,
      trustHistoryInsert: history,
      events: <SystemEventV01>[jobStarted, scoreUpdated, jobCompleted],
    );
  }
}
