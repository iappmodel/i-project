import 'gaze_fixation.dart' show FixationState;

/// Snapshot of inferred human factors for intent / UI adaptation.
class HumanState {
  final double confidence;
  final double stability;
  final double cognitiveLoad;
  final double urgency;
  final double trust;
  final FixationState fixationState;
  final String activeZone;

  HumanState({
    required this.confidence,
    required this.stability,
    required this.cognitiveLoad,
    required this.urgency,
    required this.trust,
    required this.fixationState,
    required this.activeZone,
  });
}
