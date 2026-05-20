import 'intent_os/intent_action.dart';
import 'intent_os/ui_state_snapshot.dart';
import '../engine/gaze_pipeline.dart';
import '../gaze_fixation.dart';
import '../gaze_zone.dart';

/// Layer 2 — digital twin: outcome of [UISandbox.simulate] (safe + quantitative risk).
final class SandboxSimulation {
  const SandboxSimulation({
    required this.safe,
    required this.riskScore,
    required this.zoneAligned,
  });

  /// Twin finds no hard veto (geometry / stability envelope for this intent).
  final bool safe;

  /// 0 = lowest risk, 1 = highest; gate uses `riskScore < 0.5` with [safe].
  final double riskScore;

  final bool zoneAligned;
}

/// UI-facing snapshot of [GazePipeline] output plus fixation — kept in sync from [main] frame loop.
final class UISandbox {
  double? smoothX;
  double? smoothY;
  double quality = 0;
  double varX = 0;
  double varY = 0;
  FixationState fixation = FixationState.unstable;
  String? zone;
  bool valid = false;

  void syncFromPipeline({
    required GazePipelineOutput result,
    required FixationState fixationState,
    required double smoothGazeXForZone,
  }) {
    if (result.valid && result.x != null && result.y != null) {
      valid = true;
      smoothX = result.x;
      smoothY = result.y;
    } else {
      valid = false;
    }
    quality = (result.quality ?? 0).clamp(0.0, 1.0);
    varX = result.varX ?? 0;
    varY = result.varY ?? 0;
    fixation = fixationState;
    zone = getZone(smoothGazeXForZone);
  }

  void reset() {
    smoothX = null;
    smoothY = null;
    quality = 0;
    varX = 0;
    varY = 0;
    fixation = FixationState.unstable;
    zone = null;
    valid = false;
  }

  /// Layer 2 — digital twin: dry-run risk model (does not mutate UI).
  SandboxSimulation simulate(IntentAction action, UIStateSnapshot state) {
    final active = state.activeZone;
    final zoneAligned =
        active.isNotEmpty && active == action.targetZone;
    final stability = state.stability;
    final conf = action.confidence.clamp(0.0, 1.0);

    var riskScore = 0.0;
    if (!zoneAligned) riskScore += 0.45;
    riskScore += (stability / 0.002).clamp(0.0, 0.35);
    riskScore += (1.0 - conf) * 0.25;
    if (state.motionState != FixationState.fixation) {
      riskScore += 0.15;
    }
    riskScore = riskScore.clamp(0.0, 1.0);

    final safe = zoneAligned && stability < 0.00035;

    return SandboxSimulation(
      safe: safe,
      riskScore: riskScore,
      zoneAligned: zoneAligned,
    );
  }
}
