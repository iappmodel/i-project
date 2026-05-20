import '../../gaze_fixation.dart' show FixationState;
import 'interaction_frame.dart';
import 'predicted_intent.dart';

/// Lightweight temporal predictor over recent interaction frames.
final class TemporalPredictor {
  final List<InteractionFrame> _buffer = <InteractionFrame>[];

  static const int maxFrames = 30;

  void add(InteractionFrame frame) {
    _buffer.add(frame);
    if (_buffer.length > maxFrames) {
      _buffer.removeAt(0);
    }
  }

  List<PredictedIntent> predict() {
    if (_buffer.length < 5) {
      return <PredictedIntent>[];
    }

    final InteractionFrame last = _buffer.last;
    final double dwellScore = _computeDwellScore();
    final String? nextZone = _mostLikelyNextZone();

    final List<PredictedIntent> intents = <PredictedIntent>[
      PredictedIntent(
        actionType: 'tap',
        targetZone: last.zone,
        probability: dwellScore,
        horizonMs: 150,
      ),
      PredictedIntent(
        actionType: 'move',
        targetZone: nextZone ?? last.zone,
        probability: 1.0 - dwellScore,
        horizonMs: 120,
      ),
    ];

    intents.sort((PredictedIntent a, PredictedIntent b) {
      return b.probability.compareTo(a.probability);
    });
    return intents;
  }

  double _computeDwellScore() {
    final int recentCount = _buffer.length < 10 ? _buffer.length : 10;
    final List<InteractionFrame> recent =
        _buffer.sublist(_buffer.length - recentCount);
    final String targetZone = _buffer.last.zone;

    final int fixationCount = recent.where((InteractionFrame frame) {
      return frame.zone == targetZone &&
          frame.fixation == FixationState.fixation;
    }).length;

    return (fixationCount / recent.length).clamp(0.0, 1.0);
  }

  String? _mostLikelyNextZone() {
    if (_buffer.length < 3) {
      return null;
    }

    final String previousZone = _buffer[_buffer.length - 2].zone;
    final Map<String, int> transitions = <String, int>{};

    for (int i = 0; i < _buffer.length - 1; i++) {
      if (_buffer[i].zone == previousZone) {
        final String next = _buffer[i + 1].zone;
        transitions[next] = (transitions[next] ?? 0) + 1;
      }
    }

    if (transitions.isEmpty) {
      return null;
    }

    return transitions.entries
        .reduce((MapEntry<String, int> a, MapEntry<String, int> b) {
      return a.value >= b.value ? a : b;
    }).key;
  }
}
