import '../core/events/proof_packet_sealed_event.dart';
import '../verification/verification_stability_layer.dart';
import 'proof_packet_emitter.dart';
import 'proof_session_context.dart';

/// Wires live camera/vision loop signals into [ProofSessionCollector].
///
/// Mirrors VSL signal authority (validFrame, processedFps, blinkDetected) and
/// records dwell/stable-gaze milestones from the preview session.
final class ProofLiveLoopBridge {
  ProofLiveLoopBridge({ProofPacketEmitter? emitter})
      : _emitter = emitter ?? ProofPacketEmitter();

  final ProofPacketEmitter _emitter;

  int _sessionStartMs = 0;
  bool _foreground = true;
  int? _stableGazeStartMs;
  String? _stableGazeZone;

  /// Minimum stable fixation duration; matches [GazeFixation.timeThreshMs].
  static const int stableGazeMinMs = 200;

  ProofPacketEmitter get emitter => _emitter;

  bool get isActive => _emitter.isActive;

  int get sessionStartMs => _sessionStartMs;

  void startSession([ProofSessionContext? context]) {
    final ctx = context ??
        ProofSessionContext.start(startedAt: DateTime.now().toUtc());
    _sessionStartMs = ctx.startedAt.millisecondsSinceEpoch;
    _stableGazeStartMs = null;
    _stableGazeZone = null;
    _emitter.startSession(ctx);
  }

  void setForeground(bool foreground) {
    _foreground = foreground;
  }

  /// Per-frame rollup using the same authority as VSL ingestion.
  void onFrame({
    required int timestampMs,
    required bool validFrame,
    required double processedFps,
    required bool blinkDetected,
    required bool likelyFake,
  }) {
    final collector = _emitter.collector;
    if (collector == null) return;
    collector.onFrame(
      timestampMs: timestampMs,
      validFrame: validFrame,
      foreground: _foreground,
      processedFps: processedFps,
      blinkDetected: blinkDetected,
      likelyFake: likelyFake,
    );
  }

  /// Records the prior zone stint when gaze band changes.
  void recordZoneTransition({
    required String? fromZone,
    required int? fromZoneStartMs,
    required int nowMs,
    required bool wasSatisfied,
  }) {
    if (fromZone == null || fromZoneStartMs == null) return;
    final collector = _emitter.collector;
    if (collector == null) return;
    collector.recordDwell(
      zone: fromZone,
      startedAtMs: fromZoneStartMs - _sessionStartMs,
      endedAtMs: nowMs - _sessionStartMs,
      satisfied: wasSatisfied,
    );
  }

  /// Records a satisfied dwell milestone (relative session ms).
  void recordDwellSatisfied({
    required String zone,
    required int zoneStartMs,
    required int nowMs,
  }) {
    final collector = _emitter.collector;
    if (collector == null) return;
    collector.recordDwell(
      zone: zone,
      startedAtMs: zoneStartMs - _sessionStartMs,
      endedAtMs: nowMs - _sessionStartMs,
      satisfied: true,
    );
  }

  /// Tracks stable gaze windows from fixation + low-variance gates.
  void onStableGazeTick({
    required int nowMs,
    required bool stable,
    required String zone,
    required double confidence,
  }) {
    final collector = _emitter.collector;
    if (collector == null) return;

    if (stable) {
      _stableGazeStartMs ??= nowMs;
      _stableGazeZone ??= zone;
      return;
    }

    _finalizeStableGazeWindow(nowMs: nowMs, confidence: confidence);
  }

  void _finalizeStableGazeWindow({
    required int nowMs,
    required double confidence,
  }) {
    final collector = _emitter.collector;
    final startMs = _stableGazeStartMs;
    final zone = _stableGazeZone;
    _stableGazeStartMs = null;
    _stableGazeZone = null;
    if (collector == null || startMs == null || zone == null) return;
    if (nowMs - startMs < stableGazeMinMs) return;

    collector.recordStableGazeWindow(
      startedAtMs: startMs - _sessionStartMs,
      endedAtMs: nowMs - _sessionStartMs,
      zone: zone,
      confidence: confidence,
    );
  }

  /// Builds, validates, and emits [ProofPacketSealedEvent] on [System.bus].
  ProofPacketSealedEvent sealAndEmit({
    required String artifactId,
    required VerificationStabilitySnapshot vslSnapshot,
    DateTime? endedAt,
    double confidence = 0.82,
  }) {
    _finalizeStableGazeWindow(
      nowMs: (endedAt ?? DateTime.now()).millisecondsSinceEpoch,
      confidence: confidence,
    );
    return _emitter.sealAndEmit(
      artifactId: artifactId,
      vslSnapshot: vslSnapshot,
      endedAt: endedAt,
    );
  }
}
