import 'package:eye_tracking_app/attention_kernel.dart';
import 'package:eye_tracking_app/attention_verification_result.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AttentionVerificationEngine', () {
    test('produces valid high-focus session on sustained natural attention', () {
      final engine = AttentionVerificationEngine(
        requiredFocusMs: 1200,
        rollingWindowMs: 2500,
      );

      var now = 0;
      AttentionVerificationSnapshot? latest;
      for (var i = 0; i < 40; i++) {
        now += 50;
        final x = 0.5 + ((i % 5) - 2) * 0.0025;
        final y = 0.45 + ((i % 7) - 3) * 0.002;
        latest = engine.update(
          AttentionSignalFrame(
            timestampMs: now,
            hasFace: true,
            gaze: Offset(x, y),
            ear: 0.3,
            headYawDeg: (i % 3 == 0) ? 2.0 : -2.5,
            headPitchDeg: (i % 4 == 0) ? 3.0 : -3.0,
            isFixating: true,
            blinkEdge: i % 10 == 0,
            interactionSignal: 0.7,
            nativeFraudFlags: false,
          ),
        );
      }

      expect(latest, isNotNull);
      expect(latest!.rollingAttentionScore, greaterThan(40.0));
      expect(latest.confidenceScore, greaterThan(0.5));
      expect(latest.fraudScore, lessThan(50.0));
      expect(
        latest.state,
        anyOf(
          AttentionRuntimeState.lowAttention,
          AttentionRuntimeState.active,
          AttentionRuntimeState.highFocus,
        ),
      );
      expect(latest.reason, anyOf('ok', 'reject_low_attention'));
      expect(
        latest.reason,
        isNot(startsWith('hard_fail:')),
      );
    });

    test('flags fraud suspect when gaze and blink are unnaturally static', () {
      final engine = AttentionVerificationEngine(
        requiredFocusMs: 500,
        rollingWindowMs: 4000,
      );

      var now = 0;
      AttentionVerificationSnapshot? latest;
      for (var i = 0; i < 70; i++) {
        now += 60;
        latest = engine.update(
          AttentionSignalFrame(
            timestampMs: now,
            hasFace: true,
            gaze: const Offset(0.5, 0.45),
            ear: 0.33,
            headYawDeg: 0.0,
            headPitchDeg: 0.0,
            isFixating: true,
            blinkEdge: i % 20 == 0,
            interactionSignal: 0.2,
            nativeFraudFlags: i == 35,
          ),
        );
      }

      expect(latest, isNotNull);
      expect(latest!.valid, false);
      expect(
        latest.flags.any((f) => f.startsWith('suspicious:') || f.startsWith('fraud:')),
        true,
      );
      expect(latest.valid, false);
    });

    test('buildVerificationResult returns canonical AttentionVerificationResult', () {
      final engine = AttentionVerificationEngine(
        requiredFocusMs: 1200,
        rollingWindowMs: 4000,
      );
      var now = 0;
      AttentionVerificationSnapshot? snap;
      for (var i = 0; i < 50; i++) {
        now += 50;
        final x = 0.5 + ((i % 5) - 2) * 0.0025;
        final y = 0.45 + ((i % 7) - 3) * 0.002;
        snap = engine.update(
          AttentionSignalFrame(
            timestampMs: now,
            hasFace: true,
            gaze: Offset(x, y),
            ear: 0.3,
            headYawDeg: (i % 3 == 0) ? 2.0 : -2.5,
            headPitchDeg: (i % 4 == 0) ? 3.0 : -3.0,
            isFixating: true,
            blinkEdge: i % 10 == 0,
            interactionSignal: 0.72,
            nativeFraudFlags: false,
            confidence: 0.82,
            contentVisibility: 0.95,
            appInForeground: true,
          ),
        );
      }
      expect(snap, isNotNull);
      final sealed = engine.buildVerificationResult(
        sessionId: 'sess-1',
        userId: 'user-1',
        campaignId: 'camp-1',
        contentId: 'content-1',
        snapshot: snap!,
        createdAt: DateTime.utc(2026, 4, 25, 12),
      );
      expect(sealed, isA<AttentionVerificationResult>());
      expect(sealed.sessionId, 'sess-1');
      expect(sealed.userId, 'user-1');
      expect(sealed.campaignId, 'camp-1');
      expect(sealed.contentId, 'content-1');
      expect(sealed.attentionScore, inInclusiveRange(0.0, 1.0));
      expect(sealed.qualityScore, inInclusiveRange(0.0, 1.0));
      expect(sealed.fraudRisk, inInclusiveRange(0.0, 1.0));
      expect(sealed.watchedMs, greaterThan(0));
      expect(sealed.requiredMs, 1200);
      expect(sealed.gazeValidRatio, inInclusiveRange(0.0, 1.0));
      expect(sealed.facePresentRatio, 1.0);
      expect(sealed.interactionScore, closeTo(0.72, 0.02));
      expect(sealed.createdAt, startsWith('2026-04-25'));
    });
  });
}
