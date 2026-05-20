// Backend-only attention verification: consumes persisted sessions + runtime samples,
// campaign rules ([CampaignV01]) and policy version id, writes an `attention_verifications`
// row shape plus `system_events` (`attention.verification.created` or `.rejected`).
//
// Does not create rewards, candidates, budget reservations, or wallet ledger entries.

import 'dart:math';
import 'dart:ui';

import 'package:eye_tracking_app/attention_kernel.dart';
import 'package:eye_tracking_app/attention_verification_result.dart';
import 'package:eye_tracking_app/canonical/build_spec_v01.dart';

/// Row shape aligned with `attention_sessions` (subset needed for verification).
final class AttentionSessionBackendRow {
  const AttentionSessionBackendRow({
    required this.id,
    required this.userId,
    this.deviceId,
    this.campaignId,
    this.contentId,
    required this.status,
    this.requiredMs,
    this.watchedMs = 0,
    this.foregroundMs = 0,
    this.visibleMs = 0,
  });

  final String id;
  final String userId;
  final String? deviceId;
  final String? campaignId;
  final String? contentId;
  final String status;
  final int? requiredMs;
  final int watchedMs;
  final int foregroundMs;
  final int visibleMs;
}

/// Row shape aligned with `attention_runtime_samples`.
final class AttentionRuntimeSampleBackendRow {
  const AttentionRuntimeSampleBackendRow({
    required this.id,
    required this.sessionId,
    required this.userId,
    required this.timestampMs,
    this.gazeX,
    this.gazeY,
    this.confidence,
    this.blink = false,
    required this.facePresent,
    required this.trackingState,
  });

  final String id;
  final String sessionId;
  final String userId;
  final int timestampMs;
  final double? gazeX;
  final double? gazeY;
  final double? confidence;
  final bool blink;
  final bool facePresent;

  /// Wire: `valid` | `weak` | `lost` (matches migration check).
  final String trackingState;
}

/// In-memory projection of a row for `attention_verifications`.
final class AttentionVerificationRow {
  const AttentionVerificationRow({
    required this.id,
    required this.sessionId,
    required this.userId,
    this.campaignId,
    this.contentId,
    required this.verified,
    required this.attentionScore,
    required this.qualityScore,
    required this.fraudRisk,
    required this.watchedMs,
    required this.verifiedMs,
    required this.requiredMs,
    this.gazeValidRatio,
    this.facePresentRatio,
    this.blinkNaturalnessScore,
    this.interactionScore,
    this.failureReason,
    required this.policyVersion,
    required this.createdAtIso,
  });

  final String id;
  final String sessionId;
  final String userId;
  final String? campaignId;
  final String? contentId;
  final bool verified;
  final double attentionScore;
  final double qualityScore;
  final double fraudRisk;
  final int watchedMs;
  final int verifiedMs;
  final int requiredMs;
  final double? gazeValidRatio;
  final double? facePresentRatio;
  final double? blinkNaturalnessScore;
  final double? interactionScore;
  final String? failureReason;
  final String policyVersion;
  final String createdAtIso;
}

final class AttentionVerificationCreateResult {
  const AttentionVerificationCreateResult({
    required this.verification,
    required this.events,
    required this.sealed,
    this.engineVerified = false,
    this.policyPassed = false,
  });

  final AttentionVerificationRow verification;
  final List<SystemEventV01> events;

  /// Canonical sealed proof (0–1 scores) for downstream reward issuance (server-side only).
  final AttentionVerificationResult sealed;
  final bool engineVerified;
  final bool policyPassed;
}

final class AttentionVerificationCreateFailure implements Exception {
  const AttentionVerificationCreateFailure(this.message);

  final String message;

  @override
  String toString() => 'AttentionVerificationCreateFailure: $message';
}

String _uuidV4() {
  final r = Random.secure();
  final b = List<int>.generate(16, (_) => r.nextInt(256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  final hex = b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-'
      '${hex.substring(16, 20)}-${hex.substring(20)}';
}

int? _intFromConfig(Map<String, Object?>? m, String k) {
  if (m == null) return null;
  final v = m[k];
  if (v is int) return v;
  if (v is num) return v.round();
  return null;
}

double? _doubleFromConfig(Map<String, Object?>? m, String k) {
  if (m == null) return null;
  final v = m[k];
  if (v is double) return v;
  if (v is int) return v.toDouble();
  if (v is num) return v.toDouble();
  return null;
}

AttentionVerificationRejectedReasonV01 _reasonFromEngineFailure(String? reason) {
  final r = (reason ?? '').toLowerCase();
  if (r.contains('fraud') || r.contains('hard_fail:fraud')) {
    return AttentionVerificationRejectedReasonV01.fraudRiskHigh;
  }
  if (r.contains('face') || r.contains('no_face')) {
    return AttentionVerificationRejectedReasonV01.faceNotPresent;
  }
  if (r.contains('gaze') || r.contains('off_screen')) {
    return AttentionVerificationRejectedReasonV01.lowGazeValidity;
  }
  if (r.contains('duration') || r.contains('time')) {
    return AttentionVerificationRejectedReasonV01.insufficientDuration;
  }
  return AttentionVerificationRejectedReasonV01.trackingQualityLow;
}

/// Seals attention verification for one session using only backend inputs.
///
/// [campaign] supplies §2.2 thresholds via [attentionVerificationPassedV01].
/// [policyAttentionConfig] is optional `policy_versions.config` JSON for the
/// `attention` domain (engine tuning only — not a substitute for [CampaignV01] gates).
final class AttentionVerificationCreateService {
  AttentionVerificationCreateService._();

  static const String actorId = 'attention_verification_create';
  static const String modelVersion = 'attention_verification_engine_v1';

  /// Runs verify → row + system event(s). Never calls reward / wallet / budget code.
  static AttentionVerificationCreateResult create({
    required AttentionSessionBackendRow session,
    required List<AttentionRuntimeSampleBackendRow> samples,
    required CampaignV01 campaign,
    required String activePolicyVersionId,
    Map<String, Object?>? policyAttentionConfig,
    required String correlationId,
    required String idempotencyKey,
    DateTime? now,
    String Function()? verificationIdFactory,
    int eventSeqStart = 0,
  }) {
    final trimmedKey = idempotencyKey.trim();
    if (trimmedKey.isEmpty) {
      throw const AttentionVerificationCreateFailure(
        'idempotencyKey is required for attention.verification.created (§19).',
      );
    }
    if (session.status != 'completed') {
      throw AttentionVerificationCreateFailure(
        'session status must be completed, was ${session.status}',
      );
    }
    if (samples.isEmpty) {
      throw const AttentionVerificationCreateFailure('samples must be non-empty');
    }
    for (final s in samples) {
      if (s.sessionId != session.id) {
        throw const AttentionVerificationCreateFailure(
          'sample.sessionId must match session.id',
        );
      }
      if (s.userId != session.userId) {
        throw const AttentionVerificationCreateFailure(
          'sample.userId must match session.userId',
        );
      }
    }

    final verificationId = verificationIdFactory?.call() ?? _uuidV4();
    final clock = (now ?? DateTime.now()).toUtc();
    final nowIso = clock.toIso8601String();
    var seq = eventSeqStart;

    String nextEventId(String prefix) {
      seq += 1;
      return '$prefix-$seq';
    }

    final sorted = List<AttentionRuntimeSampleBackendRow>.of(samples)
      ..sort((a, b) => a.timestampMs.compareTo(b.timestampMs));

    final cfg = policyAttentionConfig;
    final requiredParts = <int>[
      if (session.requiredMs != null) session.requiredMs!,
      campaign.minVerifiedMs,
      if (_intFromConfig(cfg, 'requiredFocusMs') != null)
        _intFromConfig(cfg, 'requiredFocusMs')!,
    ];
    final requiredFocusMs = requiredParts.isEmpty
        ? 3000
        : requiredParts.reduce((a, b) => a > b ? a : b);

    final engine = AttentionVerificationEngine(
      requiredFocusMs: requiredFocusMs,
      rollingWindowMs: _intFromConfig(cfg, 'rollingWindowMs') ?? 5000,
      validAttentionThreshold:
          _doubleFromConfig(cfg, 'validAttentionThreshold') ?? 0.5,
      confidenceThreshold:
          _doubleFromConfig(cfg, 'confidenceThreshold') ?? 0.6,
      fraudThreshold: _doubleFromConfig(cfg, 'fraudThreshold') ?? 0.6,
      faceMissingFailMs: _intFromConfig(cfg, 'faceMissingFailMs') ?? 1500,
      gazeOffScreenFailMs: _intFromConfig(cfg, 'gazeOffScreenFailMs') ?? 2000,
    );

    AttentionVerificationSnapshot? lastSnap;
    var prevBlink = false;
    for (final row in sorted) {
      final gx = row.gazeX;
      final gy = row.gazeY;
      final gaze = (gx != null && gy != null) ? Offset(gx, gy) : null;
      final blinkEdge = row.blink && !prevBlink;
      prevBlink = row.blink;
      final trackingOk = row.trackingState == 'valid';
      final frame = AttentionSignalFrame(
        timestampMs: row.timestampMs,
        hasFace: row.facePresent,
        gaze: gaze,
        ear: null,
        headYawDeg: 0,
        headPitchDeg: 0,
        isFixating: trackingOk && gaze != null,
        blinkEdge: blinkEdge,
        interactionSignal: (row.confidence ?? 0.5).clamp(0.0, 1.0).toDouble(),
        nativeFraudFlags: false,
        confidence: row.confidence,
        contentVisibility: row.trackingState == 'lost' ? 0.55 : 1.0,
        appInForeground: true,
      );
      lastSnap = engine.update(frame);
    }

    if (lastSnap == null) {
      throw const AttentionVerificationCreateFailure('engine produced no snapshot');
    }

    final contentId =
        (session.contentId != null && session.contentId!.trim().isNotEmpty)
            ? session.contentId!.trim()
            : 'unknown';
    final sealedEngine = engine.buildVerificationResult(
      sessionId: session.id,
      userId: session.userId,
      campaignId: session.campaignId ?? campaign.id,
      contentId: contentId,
      snapshot: lastSnap,
      createdAt: clock,
    );

    final v01 = AttentionVerificationResultV01(
      sessionId: sealedEngine.sessionId,
      userId: sealedEngine.userId,
      campaignId: sealedEngine.campaignId,
      contentId: contentId == 'unknown' ? null : contentId,
      passed: sealedEngine.verified,
      attentionScore: sealedEngine.attentionScore,
      qualityScore: sealedEngine.qualityScore,
      fraudSignalScore: sealedEngine.fraudRisk,
      watchedMs: sealedEngine.watchedMs,
      verifiedMs: sealedEngine.verifiedMs,
      reasonCodes: sealedEngine.verified
          ? const <String>[]
          : <String>[
              if (sealedEngine.failureReason != null) sealedEngine.failureReason!,
            ],
      policyVersion: activePolicyVersionId,
      modelVersion: modelVersion,
      createdAt: nowIso,
    );

    final policyOk = sealedEngine.verified &&
        attentionVerificationPassedV01(verification: v01, campaign: campaign);
    final finalVerified = policyOk;
    final failure = finalVerified
        ? null
        : (!sealedEngine.verified
            ? sealedEngine.failureReason
            : 'policy_failed:${campaign.id}');

    final sealed = finalVerified
        ? sealedEngine
        : sealedEngine.copyWith(verified: false, failureReason: failure);

    final row = AttentionVerificationRow(
      id: verificationId,
      sessionId: session.id,
      userId: session.userId,
      campaignId: session.campaignId ?? campaign.id,
      contentId: session.contentId,
      verified: finalVerified,
      attentionScore: sealedEngine.attentionScore,
      qualityScore: sealedEngine.qualityScore,
      fraudRisk: sealedEngine.fraudRisk,
      watchedMs: sealedEngine.watchedMs,
      verifiedMs: sealedEngine.verifiedMs,
      requiredMs: sealedEngine.requiredMs,
      gazeValidRatio: sealedEngine.gazeValidRatio,
      facePresentRatio: sealedEngine.facePresentRatio,
      blinkNaturalnessScore: sealedEngine.blinkNaturalnessScore,
      interactionScore: sealedEngine.interactionScore,
      failureReason: failure,
      policyVersion: activePolicyVersionId,
      createdAtIso: nowIso,
    );

    final events = <SystemEventV01>[];

    if (finalVerified) {
      final payload = AttentionVerificationCreatedPayloadV01(
        verificationId: verificationId,
        sessionId: session.id,
        userId: session.userId,
        contentId: contentId.isEmpty ? '' : contentId,
        campaignId: session.campaignId ?? campaign.id,
        verified: true,
        attentionScore: sealedEngine.attentionScore,
        qualityScore: sealedEngine.qualityScore,
        fraudRisk: sealedEngine.fraudRisk,
        watchedMs: sealedEngine.watchedMs,
        verifiedMs: sealedEngine.verifiedMs,
        requiredMs: sealedEngine.requiredMs,
        gazeValidRatio: sealedEngine.gazeValidRatio,
        facePresentRatio: sealedEngine.facePresentRatio,
        blinkNaturalnessScore: sealedEngine.blinkNaturalnessScore,
        interactionScore: sealedEngine.interactionScore,
        policyVersion: activePolicyVersionId,
        failureReason: null,
      );
      events.add(
        SystemEventV01(
          eventId: nextEventId('evt'),
          eventType: CanonicalAttentionEventTypesV01.verificationCreated,
          actorType: CanonicalActorTypeV01.system,
          actorId: actorId,
          subjectType: CanonicalSubjectTypeV01.attentionResult,
          subjectId: verificationId,
          userId: session.userId,
          campaignId: session.campaignId ?? campaign.id,
          sessionId: session.id,
          payload: payload.toPayloadMap(),
          policyVersion: activePolicyVersionId,
          idempotencyKey: trimmedKey,
          correlationId: correlationId,
          modelVersion: modelVersion,
          createdAt: nowIso,
        ),
      );
    } else {
      final rejectedReason = !sealedEngine.verified
          ? _reasonFromEngineFailure(sealedEngine.failureReason)
          : AttentionVerificationRejectedReasonV01.policyFailed;
      final rejectedPayload = AttentionVerificationRejectedPayloadV01(
        verificationId: verificationId,
        sessionId: session.id,
        userId: session.userId,
        campaignId: session.campaignId ?? campaign.id,
        reason: rejectedReason,
        policyVersion: activePolicyVersionId,
      );
      events.add(
        SystemEventV01(
          eventId: nextEventId('evt'),
          eventType: CanonicalAttentionEventTypesV01.verificationRejected,
          actorType: CanonicalActorTypeV01.system,
          actorId: actorId,
          subjectType: CanonicalSubjectTypeV01.attentionResult,
          subjectId: verificationId,
          userId: session.userId,
          campaignId: session.campaignId ?? campaign.id,
          sessionId: session.id,
          payload: rejectedPayload.toPayloadMap(),
          policyVersion: activePolicyVersionId,
          correlationId: correlationId,
          modelVersion: modelVersion,
          createdAt: nowIso,
        ),
      );
    }

    return AttentionVerificationCreateResult(
      verification: row,
      events: events,
      sealed: sealed,
      engineVerified: sealedEngine.verified,
      policyPassed: policyOk,
    );
  }
}
