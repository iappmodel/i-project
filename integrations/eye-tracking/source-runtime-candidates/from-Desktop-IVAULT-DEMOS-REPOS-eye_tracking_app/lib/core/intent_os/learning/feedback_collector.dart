import 'feedback_signal.dart';

class FeedbackCollector {
  FeedbackType evaluate({
    required bool actionTriggered,
    required bool userReversedAction,
    required bool userRepeatedAction,
    required bool userIgnoredSystem,
  }) {
    if (userReversedAction) {
      return FeedbackType.negative;
    }

    if (userRepeatedAction) {
      return FeedbackType.positive;
    }

    if (userIgnoredSystem) {
      return FeedbackType.negative;
    }

    return FeedbackType.implicit;
  }
}
