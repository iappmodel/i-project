import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';

import 'core/intent_os/intent_type.dart';
import 'core/intent_os/learning/collective_zone_stats.dart';

/// Hints expensive zone UI work when [IntentType] suggests imminent dwell/select.
final class UIPreloader {
  final Map<String, bool> _preloaded = {};

  /// Optional short-lived visual hint for prefetch hover (merge with real gaze in UI).
  final ValueNotifier<String?> warmHint = ValueNotifier<String?>(null);

  /// Preloads [zoneId] on focus/dwell; also warms [collectiveLikelyZone] once per session
  /// (collective prior — where people naturally look most often).
  void preload(
    String zoneId,
    IntentType predicted, {
    String? collectiveLikelyZone,
  }) {
    if (predicted == IntentType.focus || predicted == IntentType.dwellReady) {
      _warmIfNeeded(zoneId);
      final hint = collectiveLikelyZone;
      if (hint != null &&
          hint != zoneId &&
          CollectiveZoneStats.kZones.contains(hint)) {
        _warmIfNeeded(hint);
      }
    }
  }

  void _warmIfNeeded(String zoneId) {
    if (_preloaded[zoneId] == true) return;
    _warmZone(zoneId);
    _preloaded[zoneId] = true;
  }

  void invalidate(String zoneId) => _preloaded.remove(zoneId);

  void clear() {
    _preloaded.clear();
    warmHint.value = null;
  }

  void _warmZone(String zoneId) {
    SchedulerBinding.instance.addPostFrameCallback((_) {
      warmHint.value = zoneId;
    });
    unawaited(
      Future<void>.delayed(const Duration(milliseconds: 160), () {
        if (warmHint.value == zoneId) {
          warmHint.value = null;
        }
      }),
    );
  }
}
