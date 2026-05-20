import 'predicted_intent.dart';

/// Preloads likely UI paths based on predicted gaze-driven intent.
final class UIPreloader {
  void preload(PredictedIntent intent) {
    switch (intent.actionType) {
      case 'tap':
        _warmTapTarget(intent.targetZone);
      case 'move':
        _warmZone(intent.targetZone);
      default:
        // Unknown action types are intentionally ignored for forward compatibility.
        return;
    }
  }

  void _warmTapTarget(String zone) {
    // e.g., cache widget tree, prepare animation, prefetch data
  }

  void _warmZone(String zone) {
    // highlight softly, pre-render, cache images/data
  }
}
