import 'dart:async';

import '../../gaze_fixation.dart';
import '../events/gaze_event.dart';
import '../events/blink_event.dart';
import '../events/voice_event.dart';
import '../system.dart';
import '../../attention_kernel.dart';
import 'context_state.dart';
import 'intent_event.dart';
import 'intent_score.dart';
import 'intent_type.dart';
import 'learning/behavior_profile.dart';
import 'learning/learning_store.dart';
import 'learning/memory_compressor.dart';
import 'signal_router.dart';

class _StateMemory {
  GazeEvent? lastGaze;
  BlinkEvent? lastBlink;
  /// Wall-clock ms of last blink onset; used for double-blink (cancel) window.
  int? lastBlinkMs;
  /// Wall-clock ms when current fixation stint began; cleared when not fixating.
  int? fixationStartMs;
  /// Previous gaze sample for frame-to-frame motion.
  double? lastX;
  double? lastY;
}

/// Canonical **fixation gate** for gaze-driven zone commit (dwell + blink edge, blink-count select).
///
/// Do not add new `if (fixation) { selectZone(); }` in UI layers — pass [IntentEvent.fixation] and
/// extend [process] / [IntentEvent] instead.
///
/// Subscribes to [EventBus.stream]: [GazeEvent] / [BlinkEvent] update [currentIntent] and [_mem]
/// ([_handleBlink] for blink edges, [_updateIntentFromGaze] for fixation/hover).
/// [VoiceEvent] is routed through [resolveIntent] when [subscribeToVoiceEvents] is true (default).
class IntentEngine {
  final _StateMemory _mem = _StateMemory();
  final LearningStore _learning;
  final MemoryCompressor _memoryCompressor = MemoryCompressor();
  final ContextState context;
  final EventBus bus;

  BehaviorProfile get _behavior => _learning.behavior;

  double _sessionFixationSum = 0;
  int _sessionFixationCount = 0;
  double _sessionDwellSum = 0;
  int _sessionDwellCount = 0;

  double get _sessionFixationAvg => _sessionFixationCount > 0
      ? _sessionFixationSum / _sessionFixationCount
      : _behavior.avgFixationMs;

  double get _sessionDwellAvg => _sessionDwellCount > 0
      ? _sessionDwellSum / _sessionDwellCount
      : _behavior.avgDwellMs;

  IntentType _current = IntentType.idle;
  StreamSubscription<Object>? _busSubscription;
  final bool _subscribeVoice;

  IntentEngine(
    this._learning,
    this.bus, {
    ContextState? context,
    bool subscribeToVoiceEvents = true,
  })  : context = context ?? ContextState(),
        _subscribeVoice = subscribeToVoiceEvents {
    _busSubscription = bus.stream.listen(_onEvent);
  }

  IntentType get currentIntent => _current;

  LearningStore get learningStore => _learning;

  void _onEvent(Object e) {
    if (e is VoiceEvent) {
      if (_subscribeVoice) {
        _onVoiceEvent(e);
      }
      return;
    }
    if (e is GazeEvent) {
      _mem.lastGaze = e;
      _updateIntentFromGaze(e, DateTime.now().millisecondsSinceEpoch);
      return;
    }
    if (e is BlinkEvent) {
      _mem.lastBlink = e;
      _handleBlink(e, e.timestamp);
    }
  }

  void _setIntent(IntentType next) {
    _current = next;
  }

  /// Returns [IntentScore] and current stint [fixationMs] (0 when not fixating).
  (IntentScore, int) _predict(GazeEvent e, int now) {
    final isFixating = e.state == FixationState.fixation;
    if (isFixating) {
      _mem.fixationStartMs ??= now;
    } else {
      if (_mem.fixationStartMs != null) {
        final stint = now - _mem.fixationStartMs!;
        if (stint > 0) {
          _sessionFixationSum += stint;
          _sessionFixationCount++;
          _memoryCompressor.addFixation(stint.toDouble());
        }
      }
      _mem.fixationStartMs = null;
    }

    final fixationMs = isFixating ? now - _mem.fixationStartMs! : 0;

    final scale =
        _behavior.avgFixationMs > 0 ? _behavior.avgFixationMs : 250.0;
    // Same ramp as legacy 600 / 1200 ms at default threshold 250 (×2.4 and ×4.8).
    final focusScore = (fixationMs / (scale * 2.4)).clamp(0.0, 1.0);

    final dwellScore = (fixationMs / (scale * 4.8)).clamp(0.0, 1.0);

    double dx = 0;
    double dy = 0;

    if (_mem.lastX != null && _mem.lastY != null) {
      dx = (e.x - _mem.lastX!).abs();
      dy = (e.y - _mem.lastY!).abs();
    }

    final motion = dx + dy;
    _learning.updateNoise((motion * 10).clamp(0.0, 1.0));
    final stabilityScore = (1.0 - motion * 10).clamp(0.0, 1.0);
    if (isFixating) {
      _memoryCompressor.addStability(stabilityScore);
    }

    final blinkPenalty =
        (_mem.lastBlinkMs != null && now - _mem.lastBlinkMs! < 200)
            ? 0.4
            : 0.0;

    final hoverScore = stabilityScore;

    var selectScore = (focusScore * 0.4) +
        (stabilityScore * 0.4) +
        (dwellScore * 0.2) -
        blinkPenalty;

    final zoneBoost = _learning.collectiveZones.intentSelectBoost(e.gazeBand);
    selectScore = (selectScore * (1.0 + 0.12 * zoneBoost)).clamp(0.0, 1.0);

    final dwellFinal = (focusScore * 0.5) + (stabilityScore * 0.5);

    final score = IntentScore(
      hover: hoverScore,
      focus: focusScore,
      dwell: dwellFinal,
      select: selectScore,
      cancel: blinkPenalty,
    );

    _mem.lastX = e.x;
    _mem.lastY = e.y;
    return (score, fixationMs);
  }

  void _updateIntentFromGaze(GazeEvent e, int now) {
    final (s, fixationMs) = _predict(e, now);
    final fixationThreshold =
        _behavior.avgFixationMs > 0 ? _behavior.avgFixationMs : 250.0;
    final dwellThreshold =
        _behavior.avgDwellMs > 0 ? _behavior.avgDwellMs : 800.0;
    if (_current == IntentType.dwellReady) {
      if (s.hover < 0.48 &&
          (e.state == FixationState.saccade ||
              e.state == FixationState.unstable)) {
        _setIntent(IntentType.hover);
      }
      return;
    }
    if (e.state == FixationState.fixation) {
      if (fixationMs > dwellThreshold) {
        _setIntent(IntentType.dwellReady);
        return;
      }
      if (fixationMs > fixationThreshold && s.focus >= 0.28) {
        _setIntent(IntentType.focus);
        return;
      }
    }
    if (e.state == FixationState.saccade || e.state == FixationState.unstable) {
      _setIntent(IntentType.hover);
    }
  }

  void _handleBlink(BlinkEvent e, int now) {
    _learning.updateBlink(1.0);
    final lastMs = _mem.lastBlinkMs;
    final isDoubleBlink = lastMs != null && now - lastMs < 350;

    _mem.lastBlinkMs = now;

    if (isDoubleBlink) {
      _setIntent(IntentType.cancel);
      return;
    }

    // Single blink = select (only if focused or dwell-ready).
    if (_current == IntentType.focus || _current == IntentType.dwellReady) {
      _setIntent(IntentType.select);
    }
  }

  /// Keeps [IntentType.dwellReady] aligned with UI dwell state from [main] (or other hosts).
  void syncDwellReady(bool satisfied) {
    if (!satisfied) {
      if (_current == IntentType.dwellReady) {
        final g = _mem.lastGaze;
        if (g?.state == FixationState.fixation) {
          _setIntent(IntentType.focus);
        } else {
          _setIntent(IntentType.hover);
        }
      }
      return;
    }
    if (_current == IntentType.focus || _current == IntentType.hover) {
      _setIntent(IntentType.dwellReady);
    }
  }

  void _onVoiceEvent(VoiceEvent e) {
    if (e.text.isEmpty) return;
    final signal = SignalRouter()
      ..voice = e.text
      ..blink = false
      ..dwell = false
      ..stability = e.confidence ?? 0.0;
    resolveIntent(signal);
  }

  /// Cancels the bus subscription; call from widget [State.dispose] when this engine is dropped.
  void dispose() {
    final s = _busSubscription;
    _busSubscription = null;
    s?.cancel();
  }

  void _onConfirmedSelect(int now, int fixationMs) {
    _learning.updateDwell(fixationMs.toDouble());
    if (fixationMs > 0) {
      _sessionDwellSum += fixationMs;
      _sessionDwellCount++;
      _memoryCompressor.addDwell(fixationMs.toDouble());
    }
  }

  /// Clears per-session fixation/dwell accumulators (call when a new session starts).
  void startSession() {
    _sessionFixationSum = 0;
    _sessionFixationCount = 0;
    _sessionDwellSum = 0;
    _sessionDwellCount = 0;
  }

  /// Merges session means into [LearningStore.behavior] and increments [BehaviorProfile.totalSessions].
  void endSession() {
    final compact = _memoryCompressor.buildProfile();
    final hasCompressed = _memoryCompressor.fixationSamples.isNotEmpty ||
        _memoryCompressor.dwellSamples.isNotEmpty ||
        _memoryCompressor.stabilitySamples.isNotEmpty;
    if (hasCompressed) {
      _behavior.avgFixationMs =
          _behavior.avgFixationMs * 0.75 + compact.avgFixationMs * 0.25;
      _behavior.avgDwellMs =
          _behavior.avgDwellMs * 0.75 + compact.avgDwellMs * 0.25;
      _behavior.gazeStabilityIndex =
          _behavior.gazeStabilityIndex * 0.75 + compact.gazeStabilityIndex * 0.25;
    }

    _behavior.totalSessions++;

    _behavior.avgFixationMs =
        (_behavior.avgFixationMs + _sessionFixationAvg) / 2;

    _behavior.avgDwellMs =
        (_behavior.avgDwellMs + _sessionDwellAvg) / 2;

    startSession();
  }

  int _fixationDurationMs(int now) {
    final g = _mem.lastGaze;
    if (g?.state != FixationState.fixation || _mem.fixationStartMs == null) {
      return 0;
    }
    return now - _mem.fixationStartMs!;
  }

  /// Gaze dwell + blink: returns a zone id to commit when fixation and preconditions match.
  String? process(IntentEvent event) {
    if (!event.fixation) return null;
    final now = DateTime.now().millisecondsSinceEpoch;
    switch (event.kind) {
      case IntentEventKind.dwellBlinkEdge:
        if (!event.wasBlinking &&
            event.isBlinking &&
            event.dwellSatisfiedForStint &&
            event.currentZone != null &&
            !event.selectedAnnouncedForStint) {
          final z = event.currentZone!;
          if (z.isNotEmpty) {
            _onConfirmedSelect(now, _fixationDurationMs(now));
            return z;
          }
        }
        return null;
      case IntentEventKind.blinkCountSelect:
        if (event.nextBlinkCount > event.prevBlinkCount &&
            event.nextBlinkCount == 1 &&
            event.displaySelectedZone.isNotEmpty) {
          final z = event.displaySelectedZone;
          _onConfirmedSelect(now, _fixationDurationMs(now));
          return z;
        }
        return null;
    }
  }

  String? resolveIntent(SignalRouter signal) {
    final v = signal.voice;
    if (v != null && v.isNotEmpty) {
      context.lastVoice = v;
    }

    // 1. ENTER COMMAND MODE
    if (signal.voice?.contains("command") == true) {
      context.mode = "command";
    }

    // 2. EXIT MODE
    if (signal.voice?.contains("exit") == true) {
      context.reset();
      return null;
    }

    // 3. INTENT MAPPING
    if (context.mode == "command") {
      if (signal.blink) return "blink_action";
      if (signal.dwell) return "dwell_action";
    }

    if (context.mode == "navigation") {
      if (signal.dwell) return "click";
    }

    return null;
  }

  void update(AttentionState state) {
    if (!state.isFixating) return;

    _updateDwell(state);

    if (state.blink) {
      _triggerBlinkAction(state);
    }
  }

  void _updateDwell(AttentionState state) {
    final _ = state;
  }

  void _triggerBlinkAction(AttentionState state) {
    final _ = state;
  }
}
