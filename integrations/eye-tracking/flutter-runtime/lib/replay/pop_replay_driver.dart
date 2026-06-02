import '../core/intent_os/autonomous_execution_kernel.dart';
import '../core/intent_os/pop_action_executor.dart';
import '../core/signal_stale_policy.dart';
import '../core/stability/tracking_engine.dart';
import '../core/stability/tracking_state.dart';
import '../engine/gaze_pipeline.dart';
import '../features/gaze/pipeline_tracking_coordinator.dart';
import '../features/intent/zone_dwell_logic.dart';
import '../gaze_coordinate_space.dart';
import '../gaze_fixation.dart';
import 'pop_replay_types.dart';

/// Headless driver: recorded gaze frames → pipeline → zone → dwell → gated commit.
///
/// Mirrors the `main.dart` hot path without camera/native I/O. Use golden
/// [PopReplayResult.digest] lines to lock behavior before refactors.
final class PopReplayDriver {
  PopReplayDriver({
    PopReplayConfig config = const PopReplayConfig(),
    PopActionExecutor? executor,
  })  : _config = config,
        _executor = executor ?? PopActionExecutor();

  final PopReplayConfig _config;
  final PopActionExecutor _executor;

  static double _dwellMultiplier(String _) => 1.0;

  PopReplayResult run(List<PopReplayFrame> frames) {
    final pipeline = GazePipeline();
    final tracking = TrackingEngine();
    final fixation = GazeFixation();
    final milestones = <PopReplayMilestone>[];

    String? currentZone;
    int? zoneStartMs;
    var dwellSatisfiedForStint = false;
    var dwellProgress = 0.0;
    var selectedAnnouncedForStint = false;
    var displaySelectedZone = '';
    var wasBlinking = false;
    var lastFreshGazeMs = 0;
    var zoneCommitCount = 0;
    var lastZone = '';
    var lastFixation = FixationState.unstable.name;
    var lastTracking = tracking.state.name;
    String? prevZone;
    String? prevFixation;
    String? prevTracking;

    for (final frame in frames) {
      if (!frame.faceDetected) {
        pipeline.reset();
        fixation.reset();
        tracking.state = TrackingState.lost;
        currentZone = null;
        zoneStartMs = null;
        dwellSatisfiedForStint = false;
        dwellProgress = 0;
        wasBlinking = false;
        lastFreshGazeMs = 0;
        _executor.reset();
        milestones.add(PopReplayMilestone('face_lost@${frame.tMs}'));
        continue;
      }

      final tick = runPipelineAndTrackingTick(
        pipeline: pipeline,
        tracking: tracking,
        x: frame.gazeX,
        y: frame.gazeY,
        now: frame.tMs,
        blink: frame.blink,
        headYaw: 0,
        headPitch: 0,
        filterAlpha: frame.filterAlpha,
        faceDetected: true,
      );

      if (!tick.isValid) continue;

      if (frame.liveLandmarks) {
        lastFreshGazeMs = frame.tMs;
      }

      final fix = fixation.update(
        buffer: pipeline.buffer,
        varX: tick.result.varX ?? 1,
        varY: tick.result.varY ?? 1,
        now: frame.tMs,
      );
      lastFixation = fix.name;
      if (fix.name != prevFixation) {
        milestones.add(PopReplayMilestone('fixation=${fix.name}@${frame.tMs}'));
        prevFixation = fix.name;
      }

      lastTracking = tracking.state.name;
      if (tracking.state.name != prevTracking) {
        milestones.add(
          PopReplayMilestone('tracking=${tracking.state.name}@${frame.tMs}'),
        );
        prevTracking = tracking.state.name;
      }

      final smoothX = tick.result.x!;
      final zone = resolveZoneFromGaze(
        pipelineSmoothedX: smoothX,
        measuredLeft: _config.measuredLeft,
        measuredRight: _config.measuredRight,
        sessionSamples: _config.sessionSamples,
      );
      lastZone = zone;

      if (zone != prevZone) {
        milestones.add(PopReplayMilestone('zone=$zone@${frame.tMs}'));
        prevZone = zone;
      }

      final effectiveDwellMs = effectiveZoneDwellMs(
        avgDwellMs: _config.avgDwellMs,
        currentZone: currentZone ?? zone,
        dwellMultiplierFor: _dwellMultiplier,
      );

      final dwellStep = resolveZoneDwellAdvance(
        zone: zone,
        currentZone: currentZone,
        zoneStartMs: zoneStartMs,
        nowMs: frame.tMs,
        zoneDwellMs: effectiveDwellMs,
        dwellReleaseMs: _config.dwellReleaseMs,
        dwellSatisfiedForStint: dwellSatisfiedForStint,
        dwellProgress: dwellProgress,
        selectedAnnouncedForStint: selectedAnnouncedForStint,
        displaySelectedZone: displaySelectedZone,
      );

      if (dwellStep.zoneBandChanged) {
        currentZone = dwellStep.nextCurrentZone;
        zoneStartMs = dwellStep.nextZoneStartMs;
        dwellSatisfiedForStint = dwellStep.nextDwellSatisfiedForStint;
        dwellProgress = dwellStep.nextDwellProgress;
        selectedAnnouncedForStint = dwellStep.nextSelectedAnnouncedForStint;
        displaySelectedZone = dwellStep.nextDisplaySelectedZone;
        wasBlinking = false;
      } else {
        currentZone = dwellStep.nextCurrentZone ?? currentZone;
        zoneStartMs = dwellStep.nextZoneStartMs ?? zoneStartMs;
        dwellProgress = dwellStep.nextDwellProgress;
        selectedAnnouncedForStint = dwellStep.nextSelectedAnnouncedForStint;
        displaySelectedZone = dwellStep.nextDisplaySelectedZone;

        if (dwellStep.shouldMarkDwellSatisfied) {
          dwellSatisfiedForStint = true;
          dwellProgress = 1.0;
          displaySelectedZone = zone;
          selectedAnnouncedForStint = true;
          milestones.add(
            PopReplayMilestone('dwell_satisfied=$zone@${frame.tMs}'),
          );
        }
      }

      final blinkEdge = !wasBlinking && frame.blink;
      wasBlinking = frame.blink;

      // Mirrors main: dwell sets displaySelectedZone → blink count 1 commits it.
      if (blinkEdge &&
          dwellSatisfiedForStint &&
          displaySelectedZone.isNotEmpty &&
          fix == FixationState.fixation &&
          tracking.state == TrackingState.tracking) {
        final commitZone = displaySelectedZone;
        final gazeFresh = isGazeFreshForCommit(
          lastFreshGazeMs: lastFreshGazeMs,
          nowMs: frame.tMs,
        );
        var committed = false;
        final gate = _executor.tryZoneSelect(
          zone: commitZone,
          confidence: 0.9,
          fixationState: fix,
          dwellProgress: 1.0,
          dwellMs: dwellProgressMs(
            dwellProgress: 1.0,
            zoneDwellMs: effectiveDwellMs,
          ),
          nowMs: frame.tMs,
          isTracking: true,
          calibrationBusy: false,
          visionError: false,
          userIsDistracted: false,
          autonomyLevel: 0.9,
          stabilityVariance: tick.result.varX ?? 0,
          riskScore: 0,
          likelyFake: false,
          gazeFreshForCommit: gazeFresh,
          onAllowed: () {
            committed = true;
            zoneCommitCount++;
            displaySelectedZone = zone;
          },
        );
        milestones.add(
          PopReplayMilestone(
            'commit@${frame.tMs} zone=$commitZone gate=${gate.name} ok=$committed fresh=$gazeFresh',
          ),
        );
      }
    }

    return PopReplayResult(
      milestones: milestones,
      zoneCommitCount: zoneCommitCount,
      lastZone: lastZone,
      lastFixation: lastFixation,
      lastTrackingState: lastTracking,
    );
  }
}
