/// Pure spatial zone-dwell step extracted from `main.dart` `_advanceZoneDwell` (T-09a).
///
/// No [IntentEngine], notifiers, or global state. Callers apply [IntentEngine.syncDwellReady]
/// and [_markDwellSatisfied] when flags indicate.
library;

/// Result of one zone dwell step on the **same clock** as [resolveZoneDwellAdvance]'s [nowMs].
class ZoneDwellAdvanceResult {
  const ZoneDwellAdvanceResult({
    required this.zoneBandChanged,
    required this.zoneOverlayDirty,
    required this.callSyncDwellReadyFalse,
    required this.shouldMarkDwellSatisfied,
    required this.resetWasBlinking,
    required this.nextCurrentZone,
    required this.nextZoneStartMs,
    required this.nextDwellSatisfiedForStint,
    required this.nextDwellProgress,
    required this.nextSelectedAnnouncedForStint,
    required this.nextDisplaySelectedZone,
  });

  /// True when [zone] != [currentZone] on input — caller applies zone-change field order.
  final bool zoneBandChanged;

  /// OR into frame dirty flag; debug zone line in `main` may run separately.
  final bool zoneOverlayDirty;

  /// When true, caller must invoke `syncDwellReady(false)` once before/at state apply order per `main`.
  final bool callSyncDwellReadyFalse;

  /// When true, caller runs `_markDwellSatisfied(zone)` and must **not** overwrite dwell fields from this result.
  final bool shouldMarkDwellSatisfied;

  /// When true, caller sets `_wasBlinking = false` (zone-change path only).
  final bool resetWasBlinking;

  final String? nextCurrentZone;
  final int? nextZoneStartMs;
  final bool nextDwellSatisfiedForStint;
  final double nextDwellProgress;
  final bool nextSelectedAnnouncedForStint;
  final String nextDisplaySelectedZone;
}

/// Effective zone dwell duration (ms). Matches `_zoneDwellMs` in `main.dart` (T-09b).
///
/// Base is [avgDwellMs] when that value is positive, otherwise `1200.0`. The zone passed to
/// [dwellMultiplierFor] is [currentZone] if non-null, otherwise `'CENTER'`.
double effectiveZoneDwellMs({
  required double avgDwellMs,
  required String? currentZone,
  required double Function(String zone) dwellMultiplierFor,
}) {
  final base = avgDwellMs > 0 ? avgDwellMs : 1200.0;
  final zone = currentZone ?? 'CENTER';
  return base * dwellMultiplierFor(zone);
}

/// Active gaze band label for pipeline/sandbox contexts. Matches `_activeZoneForPipeline`
/// in `main.dart` (T-09c).
String activeZoneForPipeline({
  required String displaySelectedZone,
  required String? currentZone,
}) {
  if (displaySelectedZone.isNotEmpty) return displaySelectedZone;
  return currentZone ?? '';
}

/// Elapsed dwell time in milliseconds for UI/sandbox payloads. Matches `_dwellProgressMs`
/// in `main.dart` (T-09d): product rounded then clamped to `[0, 0x7fffffff]`.
int dwellProgressMs({
  required double dwellProgress,
  required double zoneDwellMs,
}) {
  return (dwellProgress * zoneDwellMs).round().clamp(0, 0x7fffffff);
}

/// Dwell completion ratio clamped between `0.0` and `1.0`.
/// Matches `_advanceZoneDwell` progress assignment in `main.dart` (T-09e):
/// `(elapsedMs / zoneDwellMs).clamp(0.0, 1.0)`.
///
/// When the source is integral milliseconds, pass `elapsed.toDouble()` — same value as `elapsed / zoneDwellMs` in `main`.
double zoneDwellProgressRatio({
  required double elapsedMs,
  required double zoneDwellMs,
}) {
  return (elapsedMs / zoneDwellMs).clamp(0.0, 1.0);
}

/// Mirrors `_advanceZoneDwell` inner state machine only (not debug notifier zone line).
ZoneDwellAdvanceResult resolveZoneDwellAdvance({
  required String zone,
  required String? currentZone,
  required int? zoneStartMs,
  required int nowMs,
  required double zoneDwellMs,
  required int dwellReleaseMs,
  required bool dwellSatisfiedForStint,
  required double dwellProgress,
  required bool selectedAnnouncedForStint,
  required String displaySelectedZone,
}) {
  if (zone != currentZone) {
    return ZoneDwellAdvanceResult(
      zoneBandChanged: true,
      zoneOverlayDirty: true,
      callSyncDwellReadyFalse: true,
      shouldMarkDwellSatisfied: false,
      resetWasBlinking: true,
      nextCurrentZone: zone,
      nextZoneStartMs: nowMs,
      nextDwellSatisfiedForStint: false,
      nextDwellProgress: 0,
      nextSelectedAnnouncedForStint: false,
      nextDisplaySelectedZone: '',
    );
  }

  if (zoneStartMs == null) {
    return ZoneDwellAdvanceResult(
      zoneBandChanged: false,
      zoneOverlayDirty: false,
      callSyncDwellReadyFalse: false,
      shouldMarkDwellSatisfied: false,
      resetWasBlinking: false,
      nextCurrentZone: currentZone,
      nextZoneStartMs: zoneStartMs,
      nextDwellSatisfiedForStint: dwellSatisfiedForStint,
      nextDwellProgress: dwellProgress,
      nextSelectedAnnouncedForStint: selectedAnnouncedForStint,
      nextDisplaySelectedZone: displaySelectedZone,
    );
  }

  final elapsed = nowMs - zoneStartMs;

  if (dwellSatisfiedForStint) {
    if (elapsed < dwellReleaseMs) {
      final nextProg = zoneDwellProgressRatio(
        elapsedMs: elapsed.toDouble(),
        zoneDwellMs: zoneDwellMs,
      );
      return ZoneDwellAdvanceResult(
        zoneBandChanged: false,
        zoneOverlayDirty: true,
        callSyncDwellReadyFalse: true,
        shouldMarkDwellSatisfied: false,
        resetWasBlinking: false,
        nextCurrentZone: currentZone,
        nextZoneStartMs: zoneStartMs,
        nextDwellSatisfiedForStint: false,
        nextDwellProgress: nextProg,
        nextSelectedAnnouncedForStint: selectedAnnouncedForStint,
        nextDisplaySelectedZone: displaySelectedZone,
      );
    }
    return ZoneDwellAdvanceResult(
      zoneBandChanged: false,
      zoneOverlayDirty: false,
      callSyncDwellReadyFalse: false,
      shouldMarkDwellSatisfied: false,
      resetWasBlinking: false,
      nextCurrentZone: currentZone,
      nextZoneStartMs: zoneStartMs,
      nextDwellSatisfiedForStint: dwellSatisfiedForStint,
      nextDwellProgress: dwellProgress,
      nextSelectedAnnouncedForStint: selectedAnnouncedForStint,
      nextDisplaySelectedZone: displaySelectedZone,
    );
  }

  if (elapsed > zoneDwellMs) {
    return ZoneDwellAdvanceResult(
      zoneBandChanged: false,
      zoneOverlayDirty: true,
      callSyncDwellReadyFalse: false,
      shouldMarkDwellSatisfied: true,
      resetWasBlinking: false,
      nextCurrentZone: currentZone,
      nextZoneStartMs: zoneStartMs,
      nextDwellSatisfiedForStint: dwellSatisfiedForStint,
      nextDwellProgress: dwellProgress,
      nextSelectedAnnouncedForStint: selectedAnnouncedForStint,
      nextDisplaySelectedZone: displaySelectedZone,
    );
  }

  final nextProgress = zoneDwellProgressRatio(
    elapsedMs: elapsed.toDouble(),
    zoneDwellMs: zoneDwellMs,
  );
  final dirty =
      (nextProgress - dwellProgress).abs() >= 0.02 || nextProgress == 0;
  if (!dirty) {
    return ZoneDwellAdvanceResult(
      zoneBandChanged: false,
      zoneOverlayDirty: false,
      callSyncDwellReadyFalse: false,
      shouldMarkDwellSatisfied: false,
      resetWasBlinking: false,
      nextCurrentZone: currentZone,
      nextZoneStartMs: zoneStartMs,
      nextDwellSatisfiedForStint: dwellSatisfiedForStint,
      nextDwellProgress: dwellProgress,
      nextSelectedAnnouncedForStint: selectedAnnouncedForStint,
      nextDisplaySelectedZone: displaySelectedZone,
    );
  }

  return ZoneDwellAdvanceResult(
    zoneBandChanged: false,
    zoneOverlayDirty: true,
    callSyncDwellReadyFalse: false,
    shouldMarkDwellSatisfied: false,
    resetWasBlinking: false,
    nextCurrentZone: currentZone,
    nextZoneStartMs: zoneStartMs,
    nextDwellSatisfiedForStint: dwellSatisfiedForStint,
    nextDwellProgress: nextProgress,
    nextSelectedAnnouncedForStint: selectedAnnouncedForStint,
    nextDisplaySelectedZone: displaySelectedZone,
  );
}
