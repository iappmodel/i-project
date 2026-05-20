import 'pops_models.dart';

/// Creates user-facing receipts describing what was interpreted/stored.
final class PopsPrivacyReceiptService {
  const PopsPrivacyReceiptService();

  PopsPrivacyReceipt create({
    required String receiptId,
    required String verificationId,
    required String userId,
    required String sessionId,
    required DateTime now,
    required PopsSignalSnapshot signals,
  }) {
    return PopsPrivacyReceipt(
      receiptId: receiptId,
      verificationId: verificationId,
      userId: userId,
      sessionId: sessionId,
      createdAtIso: now.toUtc().toIso8601String(),
      usedSignalKinds: <String>[
        'screen_state',
        'foreground_state',
        'content_progress',
        'touch_rhythm',
        'scroll_rhythm',
        'pause_resume',
        'device_motion',
        'orientation',
        if (signals.visualPresenceScore != null) 'optional_visual_presence',
        if (signals.ambienceScore != null) 'optional_ambience_features',
        'device_integrity',
        'session_continuity',
        'campaign_requirements',
        'trust_tier',
        'eligibility',
      ],
      storedFields: const <String>[
        'presence_confidence',
        'attention_confidence',
        'intent_confidence',
        'continuity_confidence',
        'fraud_risk',
        'session_state',
        'reward_eligibility',
        'trust_impact',
        'recommended_action',
      ],
      discardedRawSignals: true,
    );
  }
}
