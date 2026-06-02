import 'package:flutter_test/flutter_test.dart';

import '../lib/core/intent_os/autonomous_execution_kernel.dart';
import '../lib/core/intent_os/pop_action_executor.dart';
import '../lib/gaze_fixation.dart';

void main() {
  group('PopActionExecutor', () {
    test('governance/audit see the real confidence, not a floored constant', () {
      // CRITICAL-1 regression: previously the real confidence was floored to
      // kMinGovernanceConfidence (0.86) before reaching governance and the audit
      // trail, masking the true signal. It must now flow through unchanged.
      double? auditedConfidence;
      final kernel = AutonomousExecutionKernel()
        ..auditSink = (_, confidence, __, ___) => auditedConfidence = confidence;
      final executor = PopActionExecutor(kernel: kernel);

      var called = false;
      final gate = executor.tryZoneSelect(
        zone: 'CENTER',
        confidence: 0.70,
        fixationState: FixationState.fixation,
        dwellProgress: 1.0,
        dwellMs: 1200,
        nowMs: 9000,
        isTracking: true,
        calibrationBusy: false,
        visionError: false,
        userIsDistracted: false,
        autonomyLevel: 0.9,
        stabilityVariance: 0.01,
        riskScore: 0.0,
        likelyFake: false,
        gazeFreshForCommit: true,
        onAllowed: () => called = true,
      );

      expect(gate, AutonomousActionGateResult.allowed);
      expect(called, isTrue);
      expect(auditedConfidence, closeTo(0.70, 1e-9));
    });

    test('blocks likelyFake anti-spoof signal', () {
      final executor = PopActionExecutor();
      var called = false;
      final gate = executor.tryZoneSelect(
        zone: 'CENTER',
        confidence: 0.9,
        fixationState: FixationState.fixation,
        dwellProgress: 1.0,
        dwellMs: 1200,
        nowMs: 1000,
        isTracking: true,
        calibrationBusy: false,
        visionError: false,
        userIsDistracted: false,
        autonomyLevel: 0.9,
        stabilityVariance: 0.01,
        riskScore: 0.0,
        likelyFake: true,
        gazeFreshForCommit: true,
        onAllowed: () => called = true,
      );
      expect(gate, AutonomousActionGateResult.blockedPrefilter);
      expect(called, isFalse);
    });

    test('double-fire same timestamp allows one commit', () {
      final executor = PopActionExecutor();
      var count = 0;
      const t = 20_000;
      for (var i = 0; i < 2; i++) {
        executor.tryZoneSelect(
          zone: 'LEFT',
          confidence: 0.9,
          fixationState: FixationState.fixation,
          dwellProgress: 1.0,
          dwellMs: 1200,
          nowMs: t,
          isTracking: true,
          calibrationBusy: false,
          visionError: false,
          userIsDistracted: false,
          autonomyLevel: 0.9,
          stabilityVariance: 0.01,
          riskScore: 0.0,
          likelyFake: false,
          gazeFreshForCommit: true,
          onAllowed: () => count++,
        );
      }
      expect(count, 1);
    });

    test('rate limits rapid zone commits', () {
      final executor = PopActionExecutor();
      var count = 0;
      for (var i = 0; i < 3; i++) {
        executor.tryZoneSelect(
          zone: 'CENTER',
          confidence: 0.9,
          fixationState: FixationState.fixation,
          dwellProgress: 1.0,
          dwellMs: 1200,
          nowMs: 1000 + i * 100,
          isTracking: true,
          calibrationBusy: false,
          visionError: false,
          userIsDistracted: false,
          autonomyLevel: 0.9,
          stabilityVariance: 0.01,
          riskScore: 0.0,
        likelyFake: false,
        gazeFreshForCommit: true,
        onAllowed: () => count++,
        );
      }
      expect(count, lessThan(3));
    });

    test('allows first zone commit when gates pass', () {
      final executor = PopActionExecutor();
      var called = false;
      final gate = executor.tryZoneSelect(
        zone: 'LEFT',
        confidence: 0.9,
        fixationState: FixationState.fixation,
        dwellProgress: 1.0,
        dwellMs: 1200,
        nowMs: 5000,
        isTracking: true,
        calibrationBusy: false,
        visionError: false,
        userIsDistracted: false,
        autonomyLevel: 0.9,
        stabilityVariance: 0.01,
        riskScore: 0.0,
        likelyFake: false,
        gazeFreshForCommit: true,
        onAllowed: () => called = true,
      );
      expect(gate, AutonomousActionGateResult.allowed);
      expect(called, isTrue);
    });

    test('blocks zone commit when gaze is stale during face hold', () {
      final executor = PopActionExecutor();
      var called = false;
      final gate = executor.tryZoneSelect(
        zone: 'CENTER',
        confidence: 0.9,
        fixationState: FixationState.fixation,
        dwellProgress: 1.0,
        dwellMs: 1200,
        nowMs: 10_000,
        isTracking: true,
        calibrationBusy: false,
        visionError: false,
        userIsDistracted: false,
        autonomyLevel: 0.9,
        stabilityVariance: 0.01,
        riskScore: 0.0,
        likelyFake: false,
        gazeFreshForCommit: false,
        onAllowed: () => called = true,
      );
      expect(gate, AutonomousActionGateResult.blockedHighRisk);
      expect(called, isFalse);
    });
  });
}
