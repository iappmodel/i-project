import 'package:flutter_test/flutter_test.dart';

import '../lib/core/intent_os/autonomous_execution_kernel.dart';
import '../lib/core/intent_os/pop_action_executor.dart';
import '../lib/gaze_fixation.dart';

void main() {
  group('PopActionExecutor', () {
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
        onAllowed: () => called = true,
      );
      expect(gate, AutonomousActionGateResult.blockedPrefilter);
      expect(called, isFalse);
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
        onAllowed: () => called = true,
      );
      expect(gate, AutonomousActionGateResult.allowed);
      expect(called, isTrue);
    });
  });
}
